"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cliente, Produto, OrcamentoItem } from "@/types/database";
import { FORMAS_PAGAMENTO } from "@/lib/constants/formaPagamento";
import { Search, Trash2, ArrowLeft, Save, Home } from "lucide-react";
import { toast } from "sonner";
import { SkeletonDetail } from "@/components/Skeleton";

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
}

export default function EditarOrcamentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [statusOriginal, setStatusOriginal] = useState<string>("aberto");
  const [numero, setNumero] = useState<number | null>(null);

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
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const { data: orc } = await supabase.from("orcamentos").select("*").eq("id", id).single();
      if (!orc) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }

      const { data: cli } = await supabase.from("clientes").select("*").eq("id", orc.cliente_id).single();
      const { data: itensData } = await supabase
        .from("orcamento_itens")
        .select("*, produto:produtos(*)")
        .eq("orcamento_id", id);

      setClienteSelecionado((cli as Cliente) ?? null);
      setItens(
        ((itensData as OrcamentoItem[]) ?? [])
          .filter((i) => i.produto)
          .map((i) => ({
            produto: i.produto as Produto,
            quantidade: i.quantidade,
            preco_unitario: Number(i.preco_unitario),
            desconto_percentual: Number(i.desconto_percentual),
          }))
      );
      setDescontoGeral(Number(orc.desconto_percentual) || 0);
      setFrete(Number(orc.frete_valor) || 0);
      setOutrosCustos(Number(orc.outros_custos) || 0);
      setGarantia(orc.garantia ?? "");
      setFormaPagamento(orc.forma_pagamento ?? "");
      setObservacoes(orc.observacoes ?? "");
      setStatusOriginal(orc.status);
      setNumero(orc.numero);
      setCarregando(false);
    }
    carregar();
  }, [id]);

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
      return [...prev, { produto, quantidade: 1, preco_unitario: Number(produto.preco_venda), desconto_percentual: 0 }];
    });
    setBuscaProduto("");
    setProdutosEncontrados([]);
  }

  function atualizarItem(
    produtoId: string,
    campo: "quantidade" | "preco_unitario" | "desconto_percentual",
    valor: number
  ) {
    setItens((prev) => prev.map((i) => (i.produto.id === produtoId ? { ...i, [campo]: valor } : i)));
  }

  function removerItem(produtoId: string) {
    setItens((prev) => prev.filter((i) => i.produto.id !== produtoId));
  }

  const subtotal = itens.reduce((acc, i) => acc + i.preco_unitario * i.quantidade, 0);
  const descontoItens = itens.reduce(
    (acc, i) => acc + (i.preco_unitario * i.quantidade * i.desconto_percentual) / 100,
    0
  );
  const descontoValorGeral = ((subtotal - descontoItens) * descontoGeral) / 100;
  const total = subtotal - descontoItens - descontoValorGeral + frete + outrosCustos;

  async function salvarAlteracoes() {
    if (!clienteSelecionado || itens.length === 0) {
      toast.error("Selecione um cliente e adicione ao menos um produto.");
      return;
    }
    setSalvando(true);

    const { error: erroUpdate } = await supabase
      .from("orcamentos")
      .update({
        cliente_id: clienteSelecionado.id,
        subtotal,
        desconto_percentual: descontoGeral,
        desconto_valor: descontoItens + descontoValorGeral,
        frete_valor: frete,
        outros_custos: outrosCustos,
        garantia,
        forma_pagamento: formaPagamento || null,
        total,
        observacoes,
      })
      .eq("id", id);

    if (erroUpdate) {
      setSalvando(false);
      toast.error("Erro ao salvar orçamento: " + erroUpdate.message);
      return;
    }

    const { error: erroDelete } = await supabase.from("orcamento_itens").delete().eq("orcamento_id", id);
    if (erroDelete) {
      setSalvando(false);
      toast.error("Erro ao atualizar itens: " + erroDelete.message);
      return;
    }

    const { error: erroInsert } = await supabase.from("orcamento_itens").insert(
      itens.map((i) => ({
        orcamento_id: id,
        produto_id: i.produto.id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        desconto_percentual: i.desconto_percentual,
        total: i.preco_unitario * i.quantidade * (1 - i.desconto_percentual / 100),
      }))
    );

    setSalvando(false);

    if (erroInsert) {
      toast.error("Erro ao salvar itens: " + erroInsert.message);
      return;
    }

    toast.success("Orçamento atualizado com sucesso!");
    router.push(`/orcamentos/${id}`);
  }

  if (carregando) return <SkeletonDetail />;
  if (naoEncontrado) return <p className="text-gray-400">Orçamento não encontrado.</p>;

  if (statusOriginal === "convertido") {
    return (
      <div>
        <div className="mb-4 flex items-center gap-4">
          <Link
            href={`/orcamentos/${id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde">
            <Home className="h-4 w-4" /> Menu principal
          </Link>
        </div>
        <div className="card mt-4 text-center text-sm text-gray-500">
          Este orçamento já foi convertido em pedido e não pode mais ser editado.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Link
          href={`/orcamentos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde">
          <Home className="h-4 w-4" /> Menu principal
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-ingafert-verde-escuro">
        Editar orçamento {numero ? `#${String(numero).padStart(6, "0")}` : ""}
      </h1>

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
              <p className="py-6 text-center text-sm text-gray-400">Nenhum produto adicionado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-medium uppercase text-gray-400">
                  <tr>
                    <th className="py-2">Produto</th>
                    <th className="py-2 w-20">Qtd</th>
                    <th className="py-2 w-28">Preço unit.</th>
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
                          step={0.01}
                          value={i.preco_unitario}
                          onChange={(e) => atualizarItem(i.produto.id, "preco_unitario", Number(e.target.value))}
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
                        {(i.preco_unitario * i.quantidade * (1 - i.desconto_percentual / 100)).toLocaleString(
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
            <label className="label">Forma de pagamento</label>
            <select className="input" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="">Selecione...</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
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
            <input
              type="number"
              min={0}
              value={frete}
              onChange={(e) => setFrete(Number(e.target.value))}
              className="input"
            />
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
              <span>
                -{(descontoItens + descontoValorGeral).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
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
            onClick={salvarAlteracoes}
            disabled={!clienteSelecionado || itens.length === 0 || salvando}
            className="btn-primary w-full"
          >
            <Save className="h-4 w-4" /> {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
          <Link href={`/orcamentos/${id}`} className="btn-secondary w-full justify-center">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}
