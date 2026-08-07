"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Produto } from "@/types/database";
import { Search, ArrowDownCircle, ArrowUpCircle, Settings2 } from "lucide-react";
import { SkeletonTableRows } from "@/components/Skeleton";
import { toast } from "sonner";

type TipoMovimento = "entrada" | "saida" | "ajuste";

export default function EstoquePage() {
  const supabase = createClient();

  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  const [tipo, setTipo] = useState<TipoMovimento>("entrada");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [historico, setHistorico] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  const carregarHistorico = useCallback(async () => {
    setCarregandoHistorico(true);
    const { data } = await supabase
      .from("estoque_movimentos")
      .select("*, produto:produtos(nome, codigo_ingafert)")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistorico(data ?? []);
    setCarregandoHistorico(false);
  }, []);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("produtos")
        .select("*")
        .or(`codigo_ingafert.ilike.%${busca}%,nome.ilike.%${busca}%`)
        .limit(8);
      setResultados((data as Produto[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [busca]);

  async function registrarMovimento(e: React.FormEvent) {
    e.preventDefault();
    if (!produtoSelecionado) return;
    setSalvando(true);

    const estoqueAtual = produtoSelecionado.estoque;
    let novoEstoque = estoqueAtual;
    if (tipo === "entrada") novoEstoque = estoqueAtual + quantidade;
    else if (tipo === "saida") novoEstoque = Math.max(0, estoqueAtual - quantidade);
    else novoEstoque = quantidade; // ajuste = define o saldo absoluto

    await supabase.from("produtos").update({ estoque: novoEstoque }).eq("id", produtoSelecionado.id);
    await supabase.from("estoque_movimentos").insert({
      produto_id: produtoSelecionado.id,
      tipo,
      quantidade: tipo === "ajuste" ? Math.abs(novoEstoque - estoqueAtual) : quantidade,
      saldo_resultante: novoEstoque,
      motivo: motivo || null,
    });

    setSalvando(false);
    setProdutoSelecionado({ ...produtoSelecionado, estoque: novoEstoque });
    setQuantidade(1);
    setMotivo("");
    toast.success(`Movimentação de ${tipo} registrada!`);
    carregarHistorico();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ingafert-verde-escuro">Estoque</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold text-gray-700">Nova movimentação</h2>

          {produtoSelecionado ? (
            <div className="mb-4 rounded-xl bg-ingafert-verde/5 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{produtoSelecionado.nome}</p>
                  <p className="text-xs text-gray-500">{produtoSelecionado.codigo_ingafert}</p>
                </div>
                <button onClick={() => setProdutoSelecionado(null)} className="text-xs text-red-500">
                  Trocar
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Estoque atual: <span className="font-bold">{produtoSelecionado.estoque}</span>
              </p>
            </div>
          ) : (
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                className="input pl-10"
              />
              {resultados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
                  {resultados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProdutoSelecionado(p);
                        setBusca("");
                        setResultados([]);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{p.codigo_ingafert}</span> — {p.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={registrarMovimento} className="space-y-4">
            <div>
              <label className="label">Tipo de movimento</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo("entrada")}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium ${
                    tipo === "entrada" ? "border-ingafert-verde bg-ingafert-verde/5 text-ingafert-verde" : "border-gray-200 text-gray-500"
                  }`}
                >
                  <ArrowDownCircle className="h-4 w-4" /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("saida")}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium ${
                    tipo === "saida" ? "border-red-400 bg-red-50 text-red-500" : "border-gray-200 text-gray-500"
                  }`}
                >
                  <ArrowUpCircle className="h-4 w-4" /> Saída
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("ajuste")}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium ${
                    tipo === "ajuste" ? "border-ingafert-ouro bg-ingafert-ouro/10 text-ingafert-verde-escuro" : "border-gray-200 text-gray-500"
                  }`}
                >
                  <Settings2 className="h-4 w-4" /> Ajuste
                </button>
              </div>
            </div>

            <div>
              <label className="label">{tipo === "ajuste" ? "Novo saldo de estoque" : "Quantidade"}</label>
              <input
                type="number"
                min={0}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Motivo (opcional)</label>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="input" placeholder="Ex: compra do fornecedor X" />
            </div>

            <button type="submit" disabled={!produtoSelecionado || salvando} className="btn-primary w-full">
              {salvando ? "Salvando..." : "Registrar movimentação"}
            </button>
          </form>
        </div>

        <div className="card lg:col-span-2 overflow-x-auto p-0">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-bold text-gray-700">Histórico recente</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
              <tr>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Qtd</th>
                <th className="px-5 py-3">Saldo</th>
                <th className="px-5 py-3">Motivo</th>
                <th className="px-5 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {carregandoHistorico && <SkeletonTableRows rows={6} cols={6} />}
              {!carregandoHistorico && historico.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-gray-400">Nenhuma movimentação ainda.</td>
                </tr>
              )}
              {historico.map((h) => (
                <tr key={h.id} className="border-t border-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{h.produto?.nome}</p>
                    <p className="text-xs text-gray-400">{h.produto?.codigo_ingafert}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        h.tipo === "entrada"
                          ? "bg-green-50 text-green-600"
                          : h.tipo === "saida"
                          ? "bg-red-50 text-red-500"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {h.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3">{h.quantidade}</td>
                  <td className="px-5 py-3">{h.saldo_resultante}</td>
                  <td className="px-5 py-3 text-gray-500">{h.motivo || "-"}</td>
                  <td className="px-5 py-3 text-gray-400">{new Date(h.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
