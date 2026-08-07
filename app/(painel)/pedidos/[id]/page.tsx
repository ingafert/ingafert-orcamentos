"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cliente, StatusPedido } from "@/types/database";
import { ArrowLeft, XCircle } from "lucide-react";
import { SkeletonDetail } from "@/components/Skeleton";
import { toast } from "sonner";

const ETAPAS: StatusPedido[] = ["separacao", "faturado", "enviado", "entregue"];
const STATUS_LABELS: Record<StatusPedido, string> = {
  separacao: "Separação",
  faturado: "Faturado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function DetalhePedidoPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [pedido, setPedido] = useState<any>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data: ped } = await supabase.from("pedidos").select("*").eq("id", id).single();
    if (!ped) {
      setCarregando(false);
      return;
    }
    const { data: cli } = await supabase.from("clientes").select("*").eq("id", ped.cliente_id).single();
    const { data: itensData } = await supabase
      .from("pedido_itens")
      .select("*, produto:produtos(nome, codigo_ingafert)")
      .eq("pedido_id", id);

    setPedido(ped);
    setCliente(cli as Cliente);
    setItens(itensData ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, [id]);

  async function atualizarStatus(novoStatus: StatusPedido) {
    setAtualizando(true);
    const { error } = await supabase.from("pedidos").update({ status: novoStatus }).eq("id", id);
    setAtualizando(false);
    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }
    toast.success(`Status atualizado para "${STATUS_LABELS[novoStatus]}"`);
    carregar();
  }

  async function cancelarComEstorno() {
    if (!confirm("Cancelar este pedido? O estoque dos itens será estornado automaticamente.")) return;
    setAtualizando(true);

    for (const item of itens) {
      const { data: produto } = await supabase.from("produtos").select("estoque").eq("id", item.produto_id).single();
      const novoEstoque = (produto?.estoque ?? 0) + Number(item.quantidade);
      await supabase.from("produtos").update({ estoque: novoEstoque }).eq("id", item.produto_id);
      await supabase.from("estoque_movimentos").insert({
        produto_id: item.produto_id,
        tipo: "entrada",
        quantidade: item.quantidade,
        saldo_resultante: novoEstoque,
        motivo: `Cancelamento do pedido nº ${pedido.numero}`,
      });
    }

    await supabase.from("pedidos").update({ status: "cancelado" }).eq("id", id);
    setAtualizando(false);
    toast.success("Pedido cancelado e estoque estornado.");
    carregar();
  }

  if (carregando) return <SkeletonDetail />;
  if (!pedido || !cliente) return <p className="text-gray-400">Pedido não encontrado.</p>;

  const etapaAtual = ETAPAS.indexOf(pedido.status);

  return (
    <div>
      <Link href="/pedidos" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ingafert-verde-escuro">
          Pedido #{String(pedido.numero).padStart(6, "0")}
        </h1>
        {pedido.status !== "cancelado" && (
          <button onClick={cancelarComEstorno} disabled={atualizando} className="btn-secondary text-red-500">
            <XCircle className="h-4 w-4" /> Cancelar pedido
          </button>
        )}
      </div>

      {/* Timeline de status */}
      {pedido.status === "cancelado" ? (
        <div className="card mb-6 bg-red-50 text-center text-sm font-semibold text-red-500">
          Este pedido foi cancelado — estoque estornado.
        </div>
      ) : (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            {ETAPAS.map((etapa, idx) => (
              <div key={etapa} className="flex flex-1 flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    idx <= etapaAtual ? "bg-ingafert-verde text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {idx + 1}
                </div>
                <p className={`mt-2 text-xs ${idx <= etapaAtual ? "font-semibold text-ingafert-verde-escuro" : "text-gray-400"}`}>
                  {STATUS_LABELS[etapa]}
                </p>
                {idx < ETAPAS.length - 1 && (
                  <div className={`mt-4 h-0.5 w-full ${idx < etapaAtual ? "bg-ingafert-verde" : "bg-gray-100"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {ETAPAS.map((etapa) => (
              <button
                key={etapa}
                onClick={() => atualizarStatus(etapa)}
                disabled={atualizando || pedido.status === etapa}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  pedido.status === etapa
                    ? "bg-ingafert-verde text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                Marcar como {STATUS_LABELS[etapa]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-gray-700">Itens</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase text-gray-400">
              <tr>
                <th className="py-2">Produto</th>
                <th className="py-2">Qtd</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id} className="border-t border-gray-50">
                  <td className="py-2">
                    <p className="font-medium text-gray-800">{i.produto?.nome}</p>
                    <p className="text-xs text-gray-400">{i.produto?.codigo_ingafert}</p>
                  </td>
                  <td className="py-2">{i.quantidade}</td>
                  <td className="py-2 text-right font-medium">
                    {Number(i.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-2 text-sm font-bold text-gray-700">Cliente</h2>
          <p className="font-medium text-gray-800">{cliente.nome}</p>
          <p className="text-sm text-gray-500">{cliente.empresa}</p>
          <p className="text-sm text-gray-500">{cliente.whatsapp ?? cliente.telefone}</p>
          <div className="mt-4 border-t border-gray-100 pt-4 text-base font-bold text-ingafert-verde-escuro">
            Total: {Number(pedido.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
      </div>
    </div>
  );
}
