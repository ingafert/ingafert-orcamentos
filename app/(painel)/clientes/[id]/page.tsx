"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/types/database";
import { ArrowLeft, Home, Pencil, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { SkeletonDetail } from "@/components/Skeleton";

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

export default function DetalheClientePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const [{ data: cli }, { data: orcs }] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", id).single(),
        supabase
          .from("orcamentos")
          .select("id, numero, total, status, created_at")
          .eq("cliente_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setCliente((cli as Cliente) ?? null);
      setOrcamentos(orcs ?? []);
      setCarregando(false);
    }
    carregar();
  }, [id]);

  if (carregando) return <SkeletonDetail />;
  if (!cliente) return <p className="text-gray-400">Cliente não encontrado.</p>;

  const convertidos = orcamentos.filter((o) => o.status === "convertido");
  const totalComprado = convertidos.reduce((soma, o) => soma + Number(o.total ?? 0), 0);
  const ticketMedio = convertidos.length ? totalComprado / convertidos.length : 0;

  const temContato = cliente.email || cliente.whatsapp || cliente.telefone || cliente.endereco;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-ingafert-verde">
          <Home className="h-4 w-4" /> Menu principal
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ingafert-verde-escuro">{cliente.nome}</h1>
          {cliente.empresa && <p className="text-sm text-gray-400">{cliente.empresa}</p>}
        </div>
        <Link href={`/clientes?editar=${cliente.id}`} className="btn-secondary">
          <Pencil className="h-4 w-4" /> Editar cliente
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <span className="rotulo">Total comprado</span>
          <span className="valor">
            {totalComprado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <div className="stat-card">
          <span className="rotulo">Ticket médio</span>
          <span className="valor">
            {ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <div className="stat-card">
          <span className="rotulo">Orçamentos no total</span>
          <span className="valor">{orcamentos.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card overflow-x-auto p-0 lg:col-span-2">
          <div className="border-b border-gray-50 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-700">Histórico de orçamentos</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
              <tr>
                <th className="px-5 py-3">Número</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                    Esse cliente ainda não tem nenhum orçamento.
                  </td>
                </tr>
              )}
              {orcamentos.map((o) => (
                <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <Link href={`/orcamentos/${o.id}`} className="font-medium text-gray-800 hover:text-ingafert-verde">
                      #{String(o.numero).padStart(6, "0")}
                    </Link>
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="text-sm font-bold text-gray-700">Contato</h2>
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 shrink-0 text-gray-400" /> {cliente.email}
              </div>
            )}
            {(cliente.whatsapp || cliente.telefone) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" /> {cliente.whatsapp || cliente.telefone}
              </div>
            )}
            {cliente.cpf_cnpj && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4 shrink-0 text-gray-400" /> {cliente.cpf_cnpj}
              </div>
            )}
            {cliente.endereco && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span>
                  {cliente.endereco}
                  {cliente.numero ? `, ${cliente.numero}` : ""}
                  {cliente.cidade ? ` — ${cliente.cidade}/${cliente.estado ?? ""}` : ""}
                </span>
              </div>
            )}
            {!temContato && <p className="text-sm text-gray-400">Nenhuma informação de contato cadastrada.</p>}
          </div>

          {cliente.observacoes && (
            <div className="card">
              <h2 className="mb-2 text-sm font-bold text-gray-700">Observações</h2>
              <p className="text-sm text-gray-600">{cliente.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
