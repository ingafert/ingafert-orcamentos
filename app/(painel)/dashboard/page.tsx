import { createClient } from "@/lib/supabase/server";
import { Users, Package, FileText, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";

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
  const m = await getMetrics();

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
    </div>
  );
}
