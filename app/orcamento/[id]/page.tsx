import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { responderOrcamento } from "./actions";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function OrcamentoPublicoPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const { data: orcamento } = await supabase.from("orcamentos").select("*").eq("id", params.id).maybeSingle();
  if (!orcamento) return notFound();

  const [{ data: cliente }, { data: itens }, { data: empresa }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", orcamento.cliente_id).maybeSingle(),
    supabase
      .from("orcamento_itens")
      .select("*, produto:produtos(nome, codigo_ingafert)")
      .eq("orcamento_id", orcamento.id),
    supabase.from("configuracoes_empresa").select("*").eq("id", true).maybeSingle(),
  ]);

  const jaRespondeu = ["aprovado", "recusado", "convertido"].includes(orcamento.status);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ingafert-verde text-lg font-bold text-ingafert-ouro">
            IF
          </div>
          <div>
            <p className="font-bold text-ingafert-verde-escuro">{empresa?.nome ?? "Ingafert Peças Agrícolas"}</p>
            <p className="text-xs text-gray-400">Orçamento nº {String(orcamento.numero).padStart(6, "0")}</p>
          </div>
        </div>

        <div className="card mb-4">
          <p className="text-sm text-gray-500">
            Olá, <span className="font-semibold text-gray-800">{cliente?.nome}</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">Confira os itens do seu orçamento abaixo.</p>
        </div>

        <div className="card mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="pb-2">Produto</th>
                <th className="pb-2">Qtd</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(itens ?? []).map((i: any) => (
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

          <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{Number(orcamento.subtotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            {Number(orcamento.desconto_valor) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Desconto</span>
                <span>-{Number(orcamento.desconto_valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            )}
            {Number(orcamento.frete_valor) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Frete</span>
                <span>{Number(orcamento.frete_valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-lg font-bold text-ingafert-verde-escuro">
              <span>Total</span>
              <span>{Number(orcamento.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          </div>
        </div>

        {jaRespondeu ? (
          <div
            className={`card text-center font-semibold ${
              orcamento.status === "recusado" ? "text-red-500" : "text-ingafert-verde"
            }`}
          >
            {orcamento.status === "aprovado" && "✅ Você já aprovou este orçamento. Em breve entraremos em contato."}
            {orcamento.status === "recusado" && "❌ Você recusou este orçamento."}
            {orcamento.status === "convertido" && "✅ Orçamento aprovado! Seu pedido já está sendo preparado."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <form action={responderOrcamento.bind(null, orcamento.id, "aprovado")}>
              <button type="submit" className="btn-primary w-full">
                <CheckCircle2 className="h-4 w-4" /> Aprovar
              </button>
            </form>
            <form action={responderOrcamento.bind(null, orcamento.id, "recusado")}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" /> Recusar
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Dúvidas? Entre em contato: {empresa?.telefone || empresa?.email || "fale com nosso time"}
        </p>
      </div>
    </div>
  );
}
