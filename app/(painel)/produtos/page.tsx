"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Produto } from "@/types/database";
import { Search, ImageOff, Pencil, Check, X } from "lucide-react";
import ImportarExcel from "./ImportarExcel";
import ExportarMfRural from "./ExportarMfRural";
import NovoProdutoForm from "./NovoProdutoForm";
import { SkeletonCards } from "@/components/Skeleton";
import { toast } from "sonner";

type TipoBusca = "geral" | "codigo_ingafert" | "codigo_industria" | "nome";

export default function ProdutosPage() {
  const supabase = createClient();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [tipoBusca, setTipoBusca] = useState<TipoBusca>("geral");
  const [carregando, setCarregando] = useState(true);
  const [somenteSemPreco, setSomenteSemPreco] = useState(false);

  // --- estado de edição de preço ---
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [precoTemp, setPrecoTemp] = useState("");
  const [salvando, setSalvando] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    let query = supabase.from("produtos").select("*").eq("ativo", true).limit(60);

    const termo = busca.trim();
    if (termo) {
      if (tipoBusca === "codigo_ingafert") {
        query = query.ilike("codigo_ingafert", `%${termo}%`);
      } else if (tipoBusca === "codigo_industria") {
        query = query.ilike("codigo_industria", `%${termo}%`);
      } else if (tipoBusca === "nome") {
        query = query.ilike("nome", `%${termo}%`);
      } else {
        query = query.or(
          `codigo_ingafert.ilike.%${termo}%,codigo_industria.ilike.%${termo}%,nome.ilike.%${termo}%,sku.ilike.%${termo}%`
        );
      }
    }

    if (somenteSemPreco) {
      query = query.or("preco_venda.eq.0,preco_venda.is.null");
    }

    const { data, error } = await query.order("nome");
    if (error) {
      console.error("Erro na busca de produtos:", error);
      toast.error("Erro na busca: " + error.message);
      setProdutos([]);
      setCarregando(false);
      return;
    }
    setProdutos((data as Produto[]) ?? []);
    setCarregando(false);
  }, [busca, tipoBusca, somenteSemPreco]);

  useEffect(() => {
    const t = setTimeout(buscar, 250);
    return () => clearTimeout(t);
  }, [buscar]);

  function iniciarEdicao(p: Produto) {
    setEditandoId(p.id);
    setPrecoTemp(String(p.preco_venda ?? 0).replace(".", ","));
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setPrecoTemp("");
  }

  async function salvarPreco(id: string) {
    const novoPreco = parseFloat(precoTemp.replace(",", "."));
    if (isNaN(novoPreco) || novoPreco < 0) {
      toast.error("Preço inválido");
      return;
    }

    setSalvando(true);
    const { error } = await supabase
      .from("produtos")
      .update({ preco_venda: novoPreco })
      .eq("id", id);
    setSalvando(false);

    if (error) {
      console.error("Erro ao atualizar preço:", error);
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, preco_venda: novoPreco } : p))
    );
    toast.success("Preço atualizado!");
    setEditandoId(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ingafert-verde-escuro">Produtos</h1>
        <div className="flex flex-wrap gap-3">
          <ImportarExcel onConcluido={buscar} />
          <ExportarMfRural />
          <NovoProdutoForm onConcluido={buscar} />
        </div>
      </div>

      <div className="card mb-4 flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full border-none text-sm outline-none"
          />
        </div>
        <select
          value={tipoBusca}
          onChange={(e) => setTipoBusca(e.target.value as TipoBusca)}
          className="input sm:w-56"
        >
          <option value="geral">Busca geral</option>
          <option value="codigo_ingafert">Código Ingafert</option>
          <option value="codigo_industria">Código da indústria</option>
          <option value="nome">Nome</option>
        </select>
      </div>

      <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={somenteSemPreco}
          onChange={(e) => setSomenteSemPreco(e.target.checked)}
          className="h-4 w-4"
        />
        Mostrar só produtos sem preço (R$ 0,00)
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {carregando && <SkeletonCards count={8} />}
        {!carregando && produtos.length === 0 && (
          <p className="col-span-full text-center text-gray-400">Nenhum produto encontrado.</p>
        )}
        {produtos.map((p) => {
          const semPreco = !p.preco_venda || Number(p.preco_venda) === 0;
          const editando = editandoId === p.id;

          return (
            <div
              key={p.id}
              className={`card flex flex-col gap-3 p-4 ${
                semPreco ? "border-2 border-red-400" : ""
              }`}
            >
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                {p.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagem_url} alt={p.alt_imagem ?? p.nome} className="h-full w-full object-contain" />
                ) : (
                  <ImageOff className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-ingafert-verde">{p.codigo_ingafert}</p>
                <p className="line-clamp-2 text-sm font-semibold text-gray-800">{p.nome}</p>
              </div>

              <div className="flex items-center justify-between gap-2">
                {editando ? (
                  <div className="flex flex-1 items-center gap-1">
                    <span className="text-sm text-gray-500">R$</span>
                    <input
                      autoFocus
                      value={precoTemp}
                      onChange={(e) => setPrecoTemp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") salvarPreco(p.id);
                        if (e.key === "Escape") cancelarEdicao();
                      }}
                      disabled={salvando}
                      inputMode="decimal"
                      className="w-full rounded border border-ingafert-verde px-2 py-1 text-sm outline-none"
                    />
                    <button
                      onClick={() => salvarPreco(p.id)}
                      disabled={salvando}
                      className="rounded bg-ingafert-verde p-1 text-white disabled:opacity-50"
                      title="Salvar"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelarEdicao}
                      disabled={salvando}
                      className="rounded bg-gray-200 p-1 text-gray-600 disabled:opacity-50"
                      title="Cancelar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => iniciarEdicao(p)}
                    className="group flex items-center gap-1 text-left"
                    title="Clique para alterar o preço"
                  >
                    <p
                      className={`text-lg font-bold ${
                        semPreco ? "text-red-500" : "text-ingafert-verde-escuro"
                      }`}
                    >
                      {Number(p.preco_venda).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                    <Pencil className="h-3 w-3 text-gray-300 group-hover:text-ingafert-verde" />
                  </button>
                )}

                {!editando && (
                  <p className={`text-xs font-medium ${p.estoque > 0 ? "text-gray-400" : "text-red-500"}`}>
                    {p.estoque > 0 ? `${p.estoque} em estoque` : "Sem estoque"}
                  </p>
                )}
              </div>
              {semPreco && !editando && (
                <p className="text-xs font-medium text-red-500">⚠ Preço não definido</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
