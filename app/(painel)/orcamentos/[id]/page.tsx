"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { gerarOrcamentoPdf } from "@/lib/pdf/gerarOrcamentoPdf";
import type { Cliente, OrcamentoItem, ConfiguracaoEmpresa } from "@/types/database";
import { FileDown, MessageCircle, PackageCheck, ArrowLeft, Link as LinkIcon } from "lucide-react";
import { SkeletonDetail } from "@/components/Skeleton";
import { toast } from "sonner";
import Link from "next/link";

const STATUS_CORES: Record<string, string> = {
  aberto: "bg-gray-100 text-gray-600",
  enviado: "bg-blue-50 text-blue-600",
  aprovado: "bg-green-50 text-green-600",
  recusado: "bg-red-50 text-red-600",
  expirado: "bg-yellow-50 text-yellow-700",
  convertido: "bg-ingafert-verde/10 text-ingafert-verde",
};

export default function DetalheOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [orcamento, setOrcamento] = useState<any>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<OrcamentoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [convertendo, setConvertendo] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data: orc } = await supabase.from("orcamentos").select("*").eq("id", id).single();
    if (!orc) {
      setCarregando(false);
      return;
    }
    const { data: cli } = await supabase.from("clientes").select("*").eq("id", orc.cliente_id).single();
    const { data: itensData } = await supabase
      .from("orcamento_itens")
      .select("*, produto:produtos(*)")
      .eq("orcamento_id", id);

    setOrcamento(orc);
    setCliente(cli as Cliente);
    setItens((itensData as OrcamentoItem[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, [id]);

  async function handleGerarPdf() {
    if (!orcamento || !cliente) return;
    const { data: empresa } = await supabase.from("configuracoes_empresa").select("*").eq("id", true).maybeSingle();
    const doc = gerarOrcamentoPdf({
      numero: orcamento.numero,
      cliente,
      itens,
      subtotal: orcamento.subtotal,
      descontoValor: orcamento.desconto_valor,
      freteValor: orcamento.frete_valor,
      total: orcamento.total,
      observacoes: orcamento.observacoes,
      empresa: empresa as ConfiguracaoEmpresa | null,
    });
    doc.save(`orcamento-${orcamento.numero}.pdf`);
    toast.success("PDF gerado com sucesso!");
  }

  function handleEnviarWhatsapp() {
    if (!orcamento || !cliente) return;
    const numero = cliente.whatsapp?.replace(/\D/g, "");
    const linkAprovacao = `${window.location.origin}/orcamento/${orcamento.id}`;
    const mensagem = encodeURIComponent(
      `Olá ${cliente.nome}, segue o orçamento nº ${orcamento.numero} da Ingafert Peças Agrícolas.\n` +
        `Total: ${Number(orcamento.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n\n` +
        `Veja os itens e aprove online: ${linkAprovacao}`
    );
    const url = numero ? `https://wa.me/55${numero}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    window.open(url, "_blank");
    toast.success("Abrindo WhatsApp...");
  }

  function handleCopiarLink() {
    if (!orcamento) return;
    const link = `${window.location.origin}/orcamento/${orcamento.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de aprovação copiado!");
  }

  async function handleConverterEmPedido() {
    if (!orcamento || itens.length === 0) return;
    if (!confirm("Converter este orçamento em pedido? O estoque dos produtos será baixado automaticamente.")) return;

    setConvertendo(true);

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        orcamento_id: orcamento.id,
        cliente_id: orcamento.cliente_id,
        valor_total: orcamento.total,
        status: "separacao",
      })
      .select("id, numero")
      .single();

    if (error || !pedido) {
      setConvertendo(false);
      toast.error("Erro ao criar pedido: " + error?.message);
      return;
    }

    await supabase.from("pedido_itens").insert(
      itens.map((i) => ({
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        total: i.total,
      }))
    );

    // Baixa de estoque + histórico de movimentação
    for (const item of itens) {
      const estoqueAtual = item.produto?.estoque ?? 0;
      const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
      await supabase.from("produtos").update({ estoque: novoEstoque }).eq("id", item.produto_id);
      await supabase.from("estoque_movimentos").insert({
        produto_id: item.produto_id,
        tipo: "saida",
        quantidade: item.quantidade,
        saldo_resultante: novoEstoque,
        motivo: `Pedido nº ${pedido.numero}`,
      });
    }

    await supabase.from("orcamentos").update({ status: "convertido" }).eq("id", orcamento.id);

    setConvertendo(false);
    toast.success(`Pedido nº ${pedido.numero} criado com sucesso!`);
    router.push(`/pedidos/${pedido.id}`);
  }

  if (carregando) return <SkeletonDetail />;
  if (!orcamento || !cliente) return <p className="text-gray-400">Orçamento não encontrado.</p>;

  return (
    <div>
      <Link href="/orcamentos" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ingafert-verde-escuro">
            Orçamento #{String(orcamento.numero).padStart(6, "0")}
          </h1>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CORES[orcamento.status]}`}>
            {orcamento.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleGerarPdf} className="btn-secondary">
            <FileDown className="h-4 w-4" /> PDF
          </button>
          <button onClick={handleEnviarWhatsapp} className="btn-secondary">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button onClick={handleCopiarLink} className="btn-secondary">
            <LinkIcon className="h-4 w-4" /> Copiar link
          </button>
          {orcamento.status !== "convertido" && (
            <button onClick={handleConverterEmPedido} disabled={convertendo} className="btn-primary">
              <PackageCheck className="h-4 w-4" /> {convertendo ? "Convertendo..." : "Converter em pedido"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-gray-700">Itens</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase text-gray-400">
              <tr>
                <th className="py-2">Produto</th>
                <th className="py-2">Qtd</th>
                <th className="py-2">Preço</th>
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
                  <td className="py-2">
                    {Number(i.preco_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {Number(i.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 text-sm font-bold text-gray-700">Cliente</h2>
            <p className="font-medium text-gray-800">{cliente.nome}</p>
            <p className="text-sm text-gray-500">{cliente.empresa}</p>
            <p className="text-sm text-gray-500">{cliente.whatsapp ?? cliente.telefone}</p>
          </div>
          <div className="card space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{Number(orcamento.subtotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Desconto</span>
              <span>-{Number(orcamento.desconto_valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Frete</span>
              <span>{Number(orcamento.frete_valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-ingafert-verde-escuro">
              <span>Total</span>
              <span>{Number(orcamento.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
