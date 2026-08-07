"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Download } from "lucide-react";
import { toast } from "sonner";

// Cabeçalho EXATO exigido pelo modelo do MF Rural — não alterar nomes nem ordem
// (repare que "peso " tem um espaço no final, é assim no modelo original).
const CABECALHO = [
  "codigo",
  "titulo",
  "subtitulo",
  "quantidade",
  "unidade",
  "valor",
  "estado",
  "cidade",
  "descricao",
  "categoria",
  "subcategoria",
  "ceporigem",
  "peso ",
  "altura",
  "largura",
  "comprimento",
  "foto",
];

export default function ExportarMfRural() {
  const supabase = createClient();
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const [marcasRes, categoriasRes, empresaRes] = await Promise.all([
        supabase.from("marcas").select("id, nome"),
        supabase.from("categorias").select("id, nome"),
        supabase.from("configuracoes_empresa").select("*").eq("id", true).maybeSingle(),
      ]);

      const marcaMap = new Map((marcasRes.data ?? []).map((m: any) => [m.id, m.nome]));
      const categoriaMap = new Map((categoriasRes.data ?? []).map((c: any) => [c.id, c.nome]));
      const empresa = empresaRes.data;

      // Busca todos os produtos em lotes de 1000 (limite padrão do Supabase por consulta)
      let todos: any[] = [];
      let from = 0;
      const tamanhoLote = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("produtos")
          .select(
            "codigo_ingafert, nome, descricao, estoque, preco_venda, peso, altura, largura, comprimento, imagem_url, marca_peca_id, categoria_id, subcategoria_id"
          )
          .eq("ativo", true)
          .range(from, from + tamanhoLote - 1);

        if (error) {
          toast.error("Erro ao buscar produtos: " + error.message);
          setExportando(false);
          return;
        }
        if (!data || data.length === 0) break;
        todos = todos.concat(data);
        if (data.length < tamanhoLote) break;
        from += tamanhoLote;
      }

      if (todos.length === 0) {
        toast.error("Nenhum produto ativo encontrado para exportar.");
        setExportando(false);
        return;
      }

      const linhas = todos.map((p) => [
        p.codigo_ingafert ?? "",
        p.nome ?? "",
        marcaMap.get(p.marca_peca_id) ?? "",
        p.estoque ?? 0,
        "unidade",
        Number(p.preco_venda ?? 0),
        empresa?.estado ?? "",
        empresa?.cidade ?? "",
        (p.descricao ?? "").slice(0, 3000),
        categoriaMap.get(p.categoria_id) ?? "",
        categoriaMap.get(p.subcategoria_id) ?? "",
        empresa?.cep ?? "",
        Number(p.peso ?? 0),
        Number(p.altura ?? 0),
        Number(p.largura ?? 0),
        Number(p.comprimento ?? 0),
        p.imagem_url ?? "",
      ]);

      const planilha = XLSX.utils.aoa_to_sheet([CABECALHO, ...linhas]);
      const livro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(livro, planilha, "Planilha1");
      XLSX.writeFile(livro, `mf-rural-produtos-${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast.success(`${todos.length} produtos exportados no formato MF Rural!`);
    } catch (err: any) {
      toast.error("Erro ao exportar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setExportando(false);
    }
  }

  return (
    <button onClick={exportar} disabled={exportando} className="btn-secondary">
      <Download className="h-4 w-4" /> {exportando ? "Exportando..." : "Exportar MF Rural"}
    </button>
  );
}
