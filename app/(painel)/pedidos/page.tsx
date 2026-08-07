"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye } from "lucide-react";
import type { StatusPedido } from "@/types/database";
import { SkeletonTableRows } from "@/components/Skeleton";

const STATUS_LABELS: Record<StatusPedido, string> = {
  separacao: "Separação",
  faturado: "Faturado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_CORES: Record<StatusPedido, string> = {
  separacao: "bg-gray-100 text-gray-600",
  faturado: "bg-blue-50 text-blue-600",
  enviado: "bg-yellow-50 text-yellow-700",
  entregue: "bg-green-50 text-green-600",
  cancelado: "bg-red-50 text-red-600",
};

export default function PedidosPage() {
  const supabase = createClient();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<StatusPedido | "todos">("todos");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      let query = supabase
        .from("pedidos")
        .select("id, numero, valor_total, status, created_at, clientes(nome, empresa)")
        .order("created_at", { ascending: false });

      if (filtro !== "todos") query = query.eq("status", filtro);

      const { data } = await query;
      setPedidos(data ?? []);
      setCarregando(false);
    })();
  }, [filtro]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ingafert-verde-escuro">Pedidos</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["todos", "separacao", "faturado", "enviado", "entregue", "cancelado"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filtro === s ? "bg-ingafert-verde text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {s === "todos" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
            <tr>
              <th className="px-5 py-3">Número</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <SkeletonTableRows rows={6} cols={6} />}
            {!carregando && pedidos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-gray-400">Nenhum pedido encontrado.</td>
              </tr>
            )}
            {pedidos.map((p) => (
              <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-800">#{String(p.numero).padStart(6, "0")}</td>
                <td className="px-5 py-3 text-gray-600">{p.clientes?.nome}</td>
                <td className="px-5 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CORES[p.status as StatusPedido]}`}>
                    {STATUS_LABELS[p.status as StatusPedido]}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium">
                  {Number(p.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/pedidos/${p.id}`} className="inline-flex text-gray-400 hover:text-ingafert-verde">
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
