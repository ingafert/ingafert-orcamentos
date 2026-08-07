"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Produto } from "@/types/database";
import { Search, Plus, ImageOff } from "lucide-react";
import ImportarExcel from "./ImportarExcel";
import { SkeletonCards } from "@/components/Skeleton";

type TipoBusca = "geral" | "codigo_ingafert" | "codigo_industria" | "nome";

export default function ProdutosPage() {
  const supabase = createClient();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [tipoBusca, setTipoBusca] = useState<TipoBusca>("geral");
  const [carregando, setCarregando] = useState(true);

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
        // busca geral: código Ingafert OU código indústria OU nome
        query = query.or(
          `codigo_ingafert.ilike.%${termo}%,codigo_industria.ilike.%${termo}%,nome.ilike.%${termo}%,sku.ilike.%${termo}%`
        );
      }
    }

    const { data } = await query.order("nome");
    setProdutos((data as Produto[]) ?? []);
    setCarregando(false);
  }, [busca, tipoBusca]);

  useEffect(() => {
    const t = setTimeout(buscar, 250); // busca instantânea com debounce
    return () => clearTimeout(t);
  }, [buscar]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ingafert-verde-escuro">Produtos</h1>
        <div className="flex gap-3">
          <ImportarExcel onConcluido={buscar} />
          <button className="btn-primary">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {carregando && <SkeletonCards count={8} />}
        {!carregando && produtos.length === 0 && (
          <p className="col-span-full text-center text-gray-400">Nenhum produto encontrado.</p>
        )}
        {produtos.map((p) => (
          <div key={p.id} className="card flex flex-col gap-3 p-4">
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
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-ingafert-verde-escuro">
                {Number(p.preco_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className={`text-xs font-medium ${p.estoque > 0 ? "text-gray-400" : "text-red-500"}`}>
                {p.estoque > 0 ? `${p.estoque} em estoque` : "Sem estoque"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
