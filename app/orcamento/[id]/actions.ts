"use server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function responderOrcamento(id: string, resposta: "aprovado" | "recusado") {
  const supabase = createServiceClient();

  const { data: orcamento } = await supabase
    .from("orcamentos")
    .select("*, clientes(nome)")
    .eq("id", id)
    .single();

  if (!orcamento) {
    revalidatePath(`/orcamento/${id}`);
    return;
  }

  const nomeCliente = (orcamento as any).clientes?.nome ?? "Cliente";
  const numeroFormatado = String(orcamento.numero).padStart(6, "0");

  if (resposta === "recusado") {
    await supabase.from("orcamentos").update({ status: "recusado" }).eq("id", id);
    await supabase.from("notificacoes").insert({
      tipo: "orcamento_recusado",
      titulo: `Orçamento #${numeroFormatado} recusado`,
      mensagem: `${nomeCliente} recusou o orçamento nº ${numeroFormatado}.`,
      orcamento_id: id,
    });
    revalidatePath(`/orcamento/${id}`);
    return;
  }

  // Aprovado pelo cliente: converte automaticamente em pedido, já baixando o estoque.
  if (orcamento.status === "convertido") {
    revalidatePath(`/orcamento/${id}`);
    return;
  }

  const { data: itens } = await supabase.from("orcamento_itens").select("*").eq("orcamento_id", id);
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
    revalidatePath(`/orcamento/${id}`);
    return;
  }

  await supabase.from("pedido_itens").insert(
    (itens ?? []).map((i) => ({
      pedido_id: pedido.id,
      produto_id: i.produto_id,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      total: i.total,
    }))
  );

  for (const item of itens ?? []) {
    const { data: produto } = await supabase.from("produtos").select("estoque").eq("id", item.produto_id).single();
    const estoqueAtual = produto?.estoque ?? 0;
    const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
    await supabase.from("produtos").update({ estoque: novoEstoque }).eq("id", item.produto_id);
    await supabase.from("estoque_movimentos").insert({
      produto_id: item.produto_id,
      tipo: "saida",
      quantidade: item.quantidade,
      saldo_resultante: novoEstoque,
      motivo: `Pedido nº ${pedido.numero} (aprovado online pelo cliente)`,
    });
  }

  await supabase.from("orcamentos").update({ status: "convertido" }).eq("id", id);

  await supabase.from("notificacoes").insert({
    tipo: "orcamento_aprovado",
    titulo: `Orçamento #${numeroFormatado} aprovado`,
    mensagem: `${nomeCliente} aprovou o orçamento nº ${numeroFormatado}. Pedido nº ${pedido.numero} criado automaticamente.`,
    orcamento_id: id,
  });

  revalidatePath(`/orcamento/${id}`);
}
