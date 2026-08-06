"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";

// Mapeia o cabeçalho da planilha Ingafert -> colunas da tabela produtos.
// Ajuste os nomes à esquerda se o cabeçalho real da planilha for diferente.
const MAPA_COLUNAS: Record<string, string> = {
  "Código Ingafert": "codigo_ingafert",
  "Código da Indústria": "codigo_industria",
  "Código ERP": "codigo_erp",
  SKU: "sku",
  Nome: "nome",
  Descrição: "descricao",
  "Marca da Peça": "marca_peca_nome",
  "Marca da Máquina": "marca_maquina_nome",
  Modelo: "modelo",
  Categoria: "categoria_nome",
  Subcategoria: "subcategoria_nome",
  "Preço de Custo": "preco_custo",
  "Preço de Venda": "preco_venda",
  Peso: "peso",
  NCM: "ncm",
  Estoque: "estoque",
  Imagem: "imagem_url",
  "URL": "seo_url",
  "Meta Title": "meta_title",
  "Meta Description": "meta_description",
  "Palavras-chave": "palavras_chave",
  "Alt da Imagem": "alt_imagem",
};

interface Relatorio {
  total: number;
  novos: number;
  atualizados: number;
  ignorados: number;
  erros: string[];
}

export default function ImportarExcel({ onConcluido }: { onConcluido: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const supabase = createClient();

  async function resolverMarcaId(nome: string | undefined, tipo: "peca" | "maquina", cache: Map<string, string>) {
    if (!nome) return null;
    const chave = `${tipo}:${nome.trim().toLowerCase()}`;
    if (cache.has(chave)) return cache.get(chave)!;

    const { data: existente } = await supabase
      .from("marcas")
      .select("id")
      .eq("tipo", tipo)
      .ilike("nome", nome.trim())
      .maybeSingle();

    if (existente) {
      cache.set(chave, existente.id);
      return existente.id;
    }

    const { data: criado } = await supabase
      .from("marcas")
      .insert({ nome: nome.trim(), tipo })
      .select("id")
      .single();

    if (criado) cache.set(chave, criado.id);
    return criado?.id ?? null;
  }

  async function resolverCategoriaId(nome: string | undefined, cache: Map<string, string>) {
    if (!nome) return null;
    const chave = nome.trim().toLowerCase();
    if (cache.has(chave)) return cache.get(chave)!;

    const { data: existente } = await supabase.from("categorias").select("id").ilike("nome", nome.trim()).maybeSingle();
    if (existente) {
      cache.set(chave, existente.id);
      return existente.id;
    }
    const { data: criado } = await supabase.from("categorias").insert({ nome: nome.trim() }).select("id").single();
    if (criado) cache.set(chave, criado.id);
    return criado?.id ?? null;
  }

  async function processarArquivo(file: File) {
    setProcessando(true);
    setRelatorio(null);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const linhas: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const marcaCache = new Map<string, string>();
    const categoriaCache = new Map<string, string>();

    const rel: Relatorio = { total: linhas.length, novos: 0, atualizados: 0, ignorados: 0, erros: [] };

    for (const [index, linha] of linhas.entries()) {
      try {
        const registro: Record<string, any> = {};
        for (const [colunaPlanilha, campoBanco] of Object.entries(MAPA_COLUNAS)) {
          if (linha[colunaPlanilha] !== undefined && linha[colunaPlanilha] !== "") {
            registro[campoBanco] = linha[colunaPlanilha];
          }
        }

        if (!registro.codigo_ingafert || !registro.nome) {
          rel.ignorados++;
          rel.erros.push(`Linha ${index + 2}: código Ingafert ou nome ausente.`);
          continue;
        }

        registro.marca_peca_id = await resolverMarcaId(registro.marca_peca_nome, "peca", marcaCache);
        registro.marca_maquina_id = await resolverMarcaId(registro.marca_maquina_nome, "maquina", marcaCache);
        registro.categoria_id = await resolverCategoriaId(registro.categoria_nome, categoriaCache);
        registro.subcategoria_id = await resolverCategoriaId(registro.subcategoria_nome, categoriaCache);
        delete registro.marca_peca_nome;
        delete registro.marca_maquina_nome;
        delete registro.categoria_nome;
        delete registro.subcategoria_nome;

        registro.preco_custo = Number(registro.preco_custo) || 0;
        registro.preco_venda = Number(registro.preco_venda) || 0;
        registro.peso = Number(registro.peso) || 0;
        registro.estoque = Number(registro.estoque) || 0;

        const { data: existente } = await supabase
          .from("produtos")
          .select("id")
          .eq("codigo_ingafert", registro.codigo_ingafert)
          .maybeSingle();

        if (existente) {
          await supabase.from("produtos").update(registro).eq("id", existente.id);
          rel.atualizados++;
        } else {
          await supabase.from("produtos").insert(registro);
          rel.novos++;
        }
      } catch (err: any) {
        rel.ignorados++;
        rel.erros.push(`Linha ${index + 2}: ${err.message ?? "erro desconhecido"}`);
      }
    }

    setRelatorio(rel);
    setProcessando(false);
    onConcluido();
  }

  return (
    <>
      <button onClick={() => setModalAberto(true)} className="btn-secondary">
        <Upload className="h-4 w-4" /> Importar Excel
      </button>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ingafert-verde-escuro">Importar produtos (Excel)</h2>
              <button onClick={() => setModalAberto(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500">
              Selecione a planilha .xlsx da Ingafert. Produtos existentes (mesmo Código Ingafert) serão
              atualizados; novos códigos serão cadastrados.
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="input"
              disabled={processando}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processarArquivo(file);
              }}
            />

            {processando && <p className="mt-4 text-sm text-ingafert-verde">Processando planilha, aguarde...</p>}

            {relatorio && (
              <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-ingafert-verde" /> Total processado: {relatorio.total}
                </p>
                <p className="text-gray-600">Novos: {relatorio.novos}</p>
                <p className="text-gray-600">Atualizados: {relatorio.atualizados}</p>
                <p className="text-gray-600">Ignorados: {relatorio.ignorados}</p>
                {relatorio.erros.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-red-50 p-2 text-xs text-red-600">
                    {relatorio.erros.map((e, i) => (
                      <p key={i} className="flex items-start gap-1">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {e}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
