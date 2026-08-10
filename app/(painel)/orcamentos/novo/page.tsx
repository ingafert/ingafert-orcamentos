"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente, Produto, OrcamentoItem, ConfiguracaoEmpresa } from "@/types/database";
import { gerarOrcamentoPdf } from "@/lib/pdf/gerarOrcamentoPdf";
import { Search, Plus, Trash2, FileDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  desconto_percentual: number;
}

export default function NovoOrcamentoPage() {
  const supabase = createClient();

  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtosEncontrados, setProdutosEncontrados] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const [descontoGeral, setDescontoGeral] = useState(0);
  const [frete, setFrete] = useState(0);
  const [outrosCustos, setOutrosCustos] = useState(0);
  const [garantia, setGarantia] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (buscaCliente.trim().length < 2) {
      setClientesEncontrados([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .or(`nome.ilike.%${buscaCliente}%,empresa.ilike.%${buscaCliente}%,cpf_cnpj.ilike.%${buscaCliente}%`)
        .limit(8);
      setClientesEncontrados((data as Cliente[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  useEffect(() => {
    if (buscaProduto.trim().length < 2) {
      setProdutosEncontrados([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("produtos")
        .select("*")
        .or(`codigo_ingafert.ilike.%${buscaProduto}%,codigo_industria.ilike.%${buscaProduto}%,nome.ilike.%${buscaProduto}%`)
        .limit(8);
      setProdutosEncontrados((data as Produto[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [buscaProduto]);

  function adicionarItem(produto: Produto) {
    setItens((prev) => {
      const existe = prev.find((i) => i.produto.id === produto.id);
      if (existe) {
        return prev.map((i) => (i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [...prev, { produto, quantidade: 1, desconto_percentual: 0 }];
    });
    setBuscaProduto("");
    setProdutosEncontrados([]);
  }

  function atualizarItem(id: string, campo: "quantidade" | "desconto_percentual", valor: number) {
    setItens((prev) => prev.map((i) => (i.produto.id === id ? { ...i, [campo]: valor } : i)));
  }

  function removerItem(id: string) {
    setItens((prev) => prev.filter((i) => i.produto.id !== id));
  }

  const subtotal = itens.reduce((acc, i) => acc + i.produto.preco_venda * i.quantidade, 0);
  const descontoItens = itens.reduce(
    (acc, i) => acc + (i.produto.preco_venda * i.quantidade * i.desconto_percentual) / 100,
    0
  );
  const descontoValorGeral = ((subtotal - descontoItens) * descontoGeral) / 100;
  const total = subtotal - descontoItens - descontoValorGeral + frete + outrosCustos;

  async function salvarOrcamento(): Promise<{ orcamentoId: string; numero: number; itensCompletos: OrcamentoItem[] } | null> {
    if (!clienteSelecionado || itens.length === 0) return null;
    setSalvando(true);

    const { data: orcamento, error } = await supabase
      .from("orcamentos")
      .insert({
        cliente_id: clienteSelecionado.id,
        subtotal,
        desconto_percentual: descontoGeral,
        desconto_valor: descontoItens + descontoValorGeral,
        frete_valor: frete,
        outros_custos: outrosCustos,
        garantia,
        total,
        observacoes,
        status: "aberto",
      })
      .select("id, numero")
      .single();

    if (error || !orcamento) {
      setSalvando(false);
      toast.error("Erro ao salvar orçamento: " + error?.message);
      return null;
    }

    const itensParaInserir = itens.map((i) => ({
      orcamento_id: orcamento.id,
      produto_id: i.produto.id,
      quantidade: i.quantidade,
      preco_unitario: i.produto.preco_venda,
      desconto_percentual: i.desconto_percentual,
      total: i.produto.preco_venda * i.quantidade * (1 - i.desconto_percentual / 100),
    }));

    await supabase.from("orcamento_itens").insert(itensParaInserir);
    setSalvando(false);

    const itensCompletos: OrcamentoItem[] = itensParaInserir.map((it, idx) => ({
      id: String(idx),
      orcamento_id: orcamento.id,
      produto_id: it.produto_id,
      quantidade: it.quantidade,
      preco_unitario: it.preco_unitario,
      desconto_percentual: it.desconto_percentual,
      total: it.total,
      produto: itens[idx].produto,
    }));

    return { orcamentoId: orcamento.id, numero: orcamento.numero, itensCompletos };
  }

  async function handleGerarPdf() {
    const resultado = await salvarOrcamento();
    if (!resultado || !clienteSelecionado) return;

    const { data: empresa } = await supabase.from("configuracoes_empresa").select("*").eq("id", true).maybeSingle();

    const doc = gerarOrcamentoPdf({
      numero: resultado.numero,
      cliente: clienteSelecionado,
      itens: resultado.itensCompletos,
      subtotal,
      descontoValor: descontoItens + descontoValorGeral,
      freteValor: frete,
      outrosCustos,
      garantia,
      total,
      observacoes,
      empresa: empresa as ConfiguracaoEmpresa | null,
    });
    doc.save(`orcamento-${resultado.numero}.pdf`);
    toast.success(`Orçamento nº ${resultado.numero} salvo e PDF gerado!`);
  }

  async function handleEnviarWhatsapp() {
    const resultado = await salvarOrcamento();
    if (!resultado || !clienteSelecionado) return;

    const numero = clienteSelecionado.whatsapp?.replace(/\D/g, "");
    const linkAprovacao = `${window.location.origin}/orcamento/${resultado.orcamentoId}`;
    const mensagem = encodeURIComponent(
      `Olá ${clienteSelecionado.nome}, segue o orçamento nº ${resultado.numero} da Ingafert Peças Agrícolas.\n` +
        `Total: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n` +
        (garantia ? `Garantia: ${garantia}\n` : "") +
        `\nVeja os itens e aprove online: ${linkAprovacao}`
    );
    const url = numero ? `https://wa.me/55${numero}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    window.open(url, "_blank");
    toast.success(`Orçamento nº ${resultado.numero} salvo! Abrindo WhatsApp...`);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ingafert-verde-escuro">Novo orçamento</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Cliente */}
          <div className="card">
            <h2 className="mb-3 text-sm font-bold text-gray-700">Cliente</h2>
            {clienteSelecionado ? (
              <div className="flex items-center justify-between rounded-xl bg-ingafert-verde/5 p-3">
                <div>
                  <p className="font-semibold text-gray-800">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-gray-500">{clienteSelecionado.empresa}</p>
                </div>
                <button onClick={() => setClienteSelecionado(null)} className="text-xs text-red-500">
                  Trocar
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder="Buscar cliente por nome, empresa ou CPF/CNPJ..."
                    className="input pl-10"
                  />
                </div>
                {clientesEncontrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
                    {clientesEncontrados.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClienteSelecionado(c);
                          setBuscaCliente("");
                          setClientesEncontrados([]);
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{c.nome}</span>{" "}
                        <span className="text-gray-400">{c.empresa}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Produtos */}
          <div className="card">
            <h2 className="mb-3 text-sm font-bold text-gray-700">Produtos</h2>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Buscar por código Ingafert, código da indústria ou nome..."
                className="input pl-10"
              />
              {produtosEncontrados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg">
                  {produtosEncontrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => adicionarItem(p)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                    >
                      <span>
                        <span className="font-medium">{p.codigo_ingafert}</span> — {p.nome}
                      </span>
                      <span className="text-ingafert-verde">
                        {Number(p.preco_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {itens.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Nenhum produto adicionado ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-medium uppercase text-gray-400">
                  <tr>
                    <th className="py-2">Produto</th>
                    <th className="py-2 w-20">Qtd</th>
                    <th className="py-2 w-20">Desc.%</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.produto.id} className="border-t border-gray-50">
                      <td className="py-2">
                        <p className="font-medium text-gray-800">{i.produto.nome}</p>
                        <p className="text-xs text-gray-400">{i.produto.codigo_ingafert}</p>
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={1}
                          value={i.quantidade}
                          onChange={(e) => atualizarItem(i.produto.id, "quantidade", Number(e.target.value))}
                          className="input py-1.5"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={i.desconto_percentual}
                          onChange={(e) => atualizarItem(i.produto.id, "desconto_percentual", Number(e.target.value))}
                          className="input py-1.5"
                        />
                      </td>
                      <td className="py-2 text-right font-medium">
                        {(i.produto.preco_venda * i.quantidade * (1 - i.desconto_percentual / 100)).toLocaleString(
                          "pt-BR",
                          { style: "currency", currency: "BRL" }
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => removerItem(i.produto.id)} className="text-gray-300 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <label className="label">Garantia</label>
            <input
              type="text"
              placeholder="Ex: 90 dias contra defeito de fabricação"
              className="input"
              value={garantia}
              onChange={(e) => setGarantia(e.target.value)}
            />
          </div>

          <div className="card">
            <label className="label">Observações</label>
            <textarea className="input" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>

        {/* Resumo */}
        <div className="card h-fit space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Resumo</h2>

          <div>
            <label className="label">Desconto geral (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={descontoGeral}
              onChange={(e) => setDescontoGeral(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Frete (R$)</label>
            <input type="number" min={0} value={frete} onChange={(e) => setFrete(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="label">Outros custos (R$)</label>
            <input
              type="number"
              min={0}
              value={outrosCustos}
              onChange={(e) => setOutrosCustos(Number(e.target.value))}
              className="input"
            />
          </div>

          <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Descontos</span>
              <span>-{(descontoItens + descontoValorGeral).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Frete</span>
              <span>{frete.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Outros custos</span>
              <span>{outrosCustos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-ingafert-verde-escuro">
              <span>Total</span>
              <span>{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          </div>

          <button
            onClick={handleGerarPdf}
            disabled={!clienteSelecionado || itens.length === 0 || salvando}
            className="btn-primary w-full"
          >
            <FileDown className="h-4 w-4" /> Salvar e gerar PDF
          </button>
          <button
            onClick={handleEnviarWhatsapp}
            disabled={!clienteSelecionado || itens.length === 0 || salvando}
            className="btn-gold w-full"
          >
            <MessageCircle className="h-4 w-4" /> Salvar e enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}