import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";

const STATUS_CORES: Record<string, string> = {
  aberto: "bg-gray-100 text-gray-600",
  enviado: "bg-blue-50 text-blue-600",
  aprovado: "bg-green-50 text-green-600",
  recusado: "bg-red-50 text-red-600",
  expirado: "bg-yellow-50 text-yellow-700",
  convertido: "bg-ingafert-verde/10 text-ingafert-verde",
};

export default async function OrcamentosPage() {
  const supabase = createClient();
  const { data: orcamentos } = await supabase
    .from("orcamentos")
    .select("id, numero, total, status, created_at, clientes(nome, empresa)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ingafert-verde-escuro">Orçamentos</h1>
        <Link href="/orcamentos/novo" className="btn-primary">
          <Plus className="h-4 w-4" /> Novo orçamento
        </Link>
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
            </tr>
          </thead>
          <tbody>
            {(orcamentos ?? []).map((o: any) => (
              <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-800">#{String(o.numero).padStart(6, "0")}</td>
                <td className="px-5 py-3 text-gray-600">{o.clientes?.nome}</td>
                <td className="px-5 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CORES[o.status]}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium">
                  {Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
