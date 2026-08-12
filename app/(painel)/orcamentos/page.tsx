import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, Eye, Search } from "lucide-react";

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

const ABAS = [
  { valor: "todos", label: "Todos" },
  { valor: "aberto", label: "Aberto" },
  { valor: "enviado", label: "Enviado" },
  { valor: "aprovado", label: "Aprovado" },
  { valor: "recusado", label: "Recusado" },
  { valor: "expirado", label: "Expirado" },
];

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams?: { status?: string; busca?: string };
}) {
  const supabase = createClient();
  const { data: orcamentos } = await supabase
    .from("orcamentos")
    .select("id, numero, total, status, created_at, clientes(nome, empresa)")
    .order("created_at", { ascending: false })
    .limit(200);

  const lista = orcamentos ?? [];

  const abaAtiva = searchParams?.status ?? "todos";
  const busca = searchParams?.busca?.toLowerCase().trim() ?? "";

  const abertos = lista.filter((o: any) => o.status === "aberto" || o.status === "enviado");
  const valorEmAberto = abertos.reduce((soma: number, o: any) => soma + Number(o.total ?? 0), 0);
  const convertidos = lista.filter(
    (o: any) => o.status === "convertido" || o.status === "aprovado"
  ).length;
  const taxaConversao = lista.length ? Math.round((convertidos / lista.length) * 100) : 0;

  const filtrados = lista.filter((o: any) => {
    const passaStatus = abaAtiva === "todos" || o.status === abaAtiva;
    const passaBusca =
      !busca ||
      String(o.numero).includes(busca) ||
      (o.clientes?.nome ?? "").toLowerCase().includes(busca);
    return passaStatus && passaBusca;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ingafert-verde-escuro">Orçamentos</h1>
        <Link href="/orcamentos/novo" className="btn-primary">
          <Plus className="h-4 w-4" /> Novo orçamento
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <span className="rotulo">Orçamentos em aberto</span>
          <span className="valor">{abertos.length}</span>
        </div>
        <div className="stat-card">
          <span className="rotulo">Valor em aberto</span>
          <span className="valor">
            {valorEmAberto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <div className="stat-card">
          <span className="rotulo">Taxa de conversão</span>
          <span className="valor">{taxaConversao}%</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ABAS.map((aba) => (
            <Link
              key={aba.valor}
              href={aba.valor === "todos" ? "/orcamentos" : `/orcamentos?status=${aba.valor}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                abaAtiva === aba.valor
                  ? "bg-ingafert-verde text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {aba.label}
            </Link>
          ))}
        </div>

        <form className="relative" action="/orcamentos">
          {abaAtiva !== "todos" && <input type="hidden" name="status" value={abaAtiva} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="busca"
            defaultValue={searchParams?.busca ?? ""}
            placeholder="Buscar por número ou cliente"
            className="input w-64 py-2 pl-9 text-sm"
          />
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
            <tr>
              <th className="px-5 py-3">Número</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((o: any) => (
              <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-800">
                  #{String(o.numero).padStart(6, "0")}
                </td>
                <td className="px-5 py-3 text-gray-600">{o.clientes?.nome}</td>
                <td className="px-5 py-3 text-gray-500">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-5 py-3">
                  <span className={`badge ${STATUS_BADGE[o.status] ?? "badge-neutro"}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium">
                  {Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/orcamentos/${o.id}`}
                    className="inline-flex text-gray-400 hover:text-ingafert-verde"
                  >
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
