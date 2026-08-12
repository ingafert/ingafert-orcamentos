import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Users,
  Package,
  FileText,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import VendasChart from "@/components/VendasChart";

async function getVendasPorMes() {
  const supabase = createClient();
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
  seisMesesAtras.setDate(1);
  seisMesesAtras.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("pedidos")
    .select("valor_total, created_at, status")
    .gte("created_at", seisMesesAtras.toISOString())
    .neq("status", "cancelado");

  const nomesMes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const meses: { chave: string; mes: string; valor: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    meses.push({
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      mes: nomesMes[d.getMonth()],
      valor: 0,
    });
  }

  for (const pedido of data ?? []) {
    const d = new Date(pedido.created_at as string);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const mes = meses.find((m) => m.chave === chave);
    if (mes) mes.valor += Number(pedido.valor_total ?? 0);
  }

  return meses.map(({ mes, valor }) => ({ mes, valor }));
}

async function getMetrics() {
  const supabase = createClient();
  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

  const [clientes, produtos, orcamentosHoje, pedidos, semEstoque, vendasMes] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("produtos").select("id", { count: "exact", head: true }),
    supabase.from("orcamentos").select("id", { count: "exact", head: true }).gte("created_at", inicioDia),
    supabase.from("pedidos").select("id", { count: "exact", head: true }),
    supabase.from("produtos").select("id", { count: "exact", head: true }).eq("estoque", 0),
    supabase.from("pedidos").select("valor_total").gte("created_at", inicioMes),
  ]);

  const valorVendidoMes = (vendasMes.data ?? []).reduce((acc, p: any) => acc + Number(p.valor_total ?? 0), 0);

  return {
    clientes: clientes.count ?? 0,
    produtos: produtos.count ?? 0,
    orcamentosHoje: orcamentosHoje.count ?? 0,
    pedidos: pedidos.count ?? 0,
    semEstoque: semEstoque.count ?? 0,
    valorVendidoMes,
  };
}

async function getUltimosOrcamentos() {
  const supabase = createClient();
  const { data } = await supabase
    .from("orcamentos")
    .select("id, numero, total, status, created_at, clientes(nome)")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
  convertido: "Convertido",
};

const STATUS_BADGE: Record<string, string> = {
  aberto: "badge-neutro",
  enviado: "badge-alerta",
  aprovado: "badge-sucesso",
  recusado: "bg-red-50 text-red-600",
  expirado: "badge-alerta",
  convertido: "badge-sucesso",
};

export default async function DashboardPage() {
  const [m, vendasPorMes, ultimosOrcamentos] = await Promise.all([
    getMetrics(),
    getVendasPorMes(),
    getUltimosOrcamentos(),
  ]);

  const cards = [
    { label: "Clientes cadastrados", value: m.clientes, icon: Users },
    { label: "Produtos", value: m.produtos, icon: Package },
    { label: "Orçamentos hoje", value: m.orcamentosHoje, icon: FileText },
    { label: "Pedidos", value: m.pedidos, icon: ShoppingCart },
    {
      label: "Vendido no mês",
      value: m.valorVendidoMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      icon: TrendingUp,
    },
    { label: "Produtos sem estoque", value: m.semEstoque, icon: AlertTriangle, alerta: m.semEstoque > 0 },
  ];

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ingafert-verde-escuro">Dashboard</h1>
        <p className="text-sm capitalize text-gray-400">{hoje}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, alerta }) => (
          <div key={label} className="card flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                alerta ? "bg-red-50 text-red-500" : "bg-ingafert-verde/10 text-ingafert-verde"
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">{label}</p>
              <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card min-w-0 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold text-gray-700">Vendas nos últimos 6 meses</h2>
          <VendasChart dados={vendasPorMes} />
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Últimos orçamentos</h2>
            <Link
              href="/orcamentos"
              className="inline-flex items-center gap-1 text-xs font-medium text-ingafert-verde hover:underline"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {ultimosOrcamentos.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">Nenhum orçamento ainda.</p>
          )}

          <div className="space-y-1">
            {ultimosOrcamentos.map((o: any) => (
              <Link
                key={o.id}
                href={`/orcamentos/${o.id}`}
                className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    #{String(o.numero).padStart(6, "0")} · {o.clientes?.nome}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={`badge shrink-0 ${STATUS_BADGE[o.status] ?? "badge-neutro"}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
