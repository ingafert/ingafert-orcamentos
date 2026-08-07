cat > "app/(painel)/produtos/ImportarExcel.tsx" << 'PARTEFINAL'
"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";

// Cada campo do banco aceita vários "apelidos" de cabeçalho de planilha,
// para reconhecer tanto o modelo próprio da Ingafert quanto planilhas
// exportadas de outras plataformas (ex: Yampi, Mercado Livre, etc).
// A normalização remove acentos/maiúsculas antes de comparar, então
// "Código Ingafert", "codigo_ingafert" e "CÓDIGO INGAFERT" são equivalentes.
const CAMPOS: { campo: string; aliases: string[] }[] = [
  { campo: "codigo_ingafert", aliases: ["codigo ingafert", "codigo_ingafert", "codigo produto", "codigo_produto", "id"] },
  { campo: "codigo_industria", aliases: ["codigo da industria", "codigo_industria", "codigo fabricante"] },
  { campo: "codigo_erp", aliases: ["codigo erp", "codigo_erp"] },
  { campo: "sku", aliases: ["sku"] },
  { campo: "nome", aliases: ["nome", "nome do produto", "nome_do_produto", "titulo"] },
  { campo: "descricao", aliases: ["descricao", "descricao_do_produto"] },
  { campo: "marca_peca_nome", aliases: ["marca da peca", "marca_da_peca", "marca"] },
  { campo: "marca_maquina_nome", aliases: ["marca da maquina", "marca_da_maquina"] },
  { campo: "modelo", aliases: ["modelo"] },
  { campo: "categoria_nome", aliases: ["categoria", "categorias"] },
  { campo: "subcategoria_nome", aliases: ["subcategoria"] },
  { campo: "preco_custo", aliases: ["preco de custo", "preco_custo"] },
  { campo: "preco_venda", aliases: ["preco de venda", "preco_venda", "preco"] },
  { campo: "peso", aliases: ["peso", "peso_em_kg", "peso em kg"] },
  { campo: "ncm", aliases: ["ncm"] },
  { campo: "estoque", aliases: ["estoque", "quantidade", "estoque_disponivel"] },
  { campo: "imagem_url", aliases: ["imagem", "imagem_url", "foto", "url_da_imagem", "link_foto_principal"] },
  { campo: "seo_url", aliases: ["url", "link", "url_amigavel", "slug"] },
  { campo: "meta_title", aliases: ["meta title", "meta_title", "seo_titulo_pagina"] },
  { campo: "meta_description", aliases: ["meta description", "meta_description", "seo_descricao"] },
  { campo: "palavras_chave", aliases: ["palavras-chave", "palavras chave", "palavras_chave", "tags", "seo_palavras_chave"] },
  { campo: "alt_imagem", aliases: ["alt da imagem", "alt_da_imagem", "alt_imagem"] },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

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

  // Constrói um registro para o banco a partir de uma linha da planilha,
  // não importa qual o cabeçalho original usado (Ingafert, Yampi, etc).
  function mapearLinha(linha: Record<string, any>): Record<string, any> {
    const linhaNormalizada: Record<string, any> = {};
    for (const [cabecalho, valor] of Object.entries(linha)) {
      linhaNormalizada[normalizar(cabecalho)] = valor;
    }

    const registro: Record<string, any> = {};
    for (const { campo, aliases } of CAMPOS) {
      for (const alias of aliases) {
        const valor = linhaNormalizada[normalizar(alias)];
        if (valor !== undefined && valor !== "") {
          registro[campo] = valor;
          break;
        }
      }
    }

    // A Yampi exporta várias categorias separadas por ";" numa única célula
    // (ex: "Colheitadeiras;NEW HOLLAND;NEW HOLLAND > COLHEITADEIRA").
    // Usamos apenas a primeira como categoria principal do produto.
    if (typeof registro.categoria_nome === "string" && registro.categoria_nome.includes(";")) {
      registro.categoria_nome = registro.categoria_nome.split(";")[0].trim();
    }

    // A descrição da Yampi vem em HTML (<p>, <ul>, <strong>...). Removemos as
    // tags pra guardar só o texto — pode reformatar depois se quiser manter HTML.
    if (typeof registro.descricao === "string") {
      registro.descricao = registro.descricao
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    return registro;
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
        const registro = mapearLinha(linha);

        // Se a planilha não tem "Código Ingafert" (ex: planilhas de outras
        // plataformas), usa o SKU como identificador único de fallback.
        if (!registro.codigo_ingafert && registro.sku) {
          registro.codigo_ingafert = String(registro.sku);
        }

        if (!registro.codigo_ingafert || !registro.nome) {
          rel.ignorados++;
          rel.erros.push(`Linha ${index + 2}: código (ou SKU) e nome são obrigatórios.`);
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

        registro.preco_custo = Number(String(registro.preco_custo ?? "0").replace(",", ".")) || 0;
        registro.preco_venda = Number(String(registro.preco_venda ?? "0").replace(",", ".")) || 0;
        registro.peso = Number(String(registro.peso ?? "0").replace(",", ".")) || 0;
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
              Aceita o modelo de planilha da Ingafert ou planilhas exportadas de outras plataformas (Yampi,
              Mercado Livre, etc) — o sistema reconhece os cabeçalhos automaticamente. Produtos com o mesmo
              código serão atualizados; novos códigos serão cadastrados.
              <br />
              <br />
              <strong>Vindo da Yampi:</strong> a exportação de &quot;Produtos&quot; traz nome, descrição, marca e SEO,
              mas não preço/estoque. Depois de importar essa, exporte também o modelo &quot;SKUs&quot; e importe-o
              aqui em seguida — ele será mesclado automaticamente aos mesmos produtos (preço, estoque, peso).
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