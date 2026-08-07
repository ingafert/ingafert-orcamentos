import { createClient } from "@/lib/supabase/server";
import { Users, Package, FileText, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
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
    meses.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, mes: nomesMes[d.getMonth()], valor: 0 });
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

export default async function DashboardPage() {
  const [m, vendasPorMes] = await Promise.all([getMetrics(), getVendasPorMes()]);

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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ingafert-verde-escuro">Dashboard</h1>

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

      <div className="card mt-6">
        <h2 className="mb-4 text-sm font-bold text-gray-700">Vendas nos últimos 6 meses</h2>
        <VendasChart dados={vendasPorMes} />
      </div>
    </div>
  );
}
