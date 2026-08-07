"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/types/database";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { SkeletonTableRows } from "@/components/Skeleton";
import { toast } from "sonner";

const CAMPOS_VAZIOS: Omit<Cliente, "id" | "created_at" | "updated_at"> = {
  nome: "",
  empresa: "",
  cpf_cnpj: "",
  inscricao_estadual: "",
  telefone: "",
  whatsapp: "",
  email: "",
  cep: "",
  endereco: "",
  numero: "",
  cidade: "",
  estado: "",
  observacoes: "",
};

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(CAMPOS_VAZIOS);

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes((data as Cliente[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        c.empresa?.toLowerCase().includes(termo) ||
        c.cpf_cnpj?.includes(termo) ||
        c.email?.toLowerCase().includes(termo)
    );
  }, [busca, clientes]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(CAMPOS_VAZIOS);
    setModalAberto(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditandoId(c.id);
    setForm(c);
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (editandoId) {
      const { error } = await supabase.from("clientes").update(form).eq("id", editandoId);
      if (error) {
        toast.error("Erro ao atualizar cliente: " + error.message);
        return;
      }
      toast.success("Cliente atualizado!");
    } else {
      const { error } = await supabase.from("clientes").insert(form);
      if (error) {
        toast.error("Erro ao cadastrar cliente: " + error.message);
        return;
      }
      toast.success("Cliente cadastrado!");
    }
    setModalAberto(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Cliente excluído.");
    carregar();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ingafert-verde-escuro">Clientes</h1>
        <button onClick={abrirNovo} className="btn-primary">
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      </div>

      <div className="card mb-4 flex items-center gap-3 py-3">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, empresa, CPF/CNPJ ou e-mail..."
          className="w-full border-none text-sm outline-none"
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Empresa</th>
              <th className="px-5 py-3">CPF/CNPJ</th>
              <th className="px-5 py-3">WhatsApp</th>
              <th className="px-5 py-3">Cidade/UF</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <SkeletonTableRows rows={6} cols={6} />}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-gray-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-800">{c.nome}</td>
                <td className="px-5 py-3 text-gray-500">{c.empresa || "-"}</td>
                <td className="px-5 py-3 text-gray-500">{c.cpf_cnpj || "-"}</td>
                <td className="px-5 py-3 text-gray-500">{c.whatsapp || "-"}</td>
                <td className="px-5 py-3 text-gray-500">
                  {c.cidade ? `${c.cidade}/${c.estado ?? ""}` : "-"}
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => abrirEdicao(c)} className="mr-2 text-gray-400 hover:text-ingafert-verde">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => excluir(c.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ingafert-verde-escuro">
                {editandoId ? "Editar cliente" : "Novo cliente"}
              </h2>
              <button onClick={() => setModalAberto(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Nome *" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
              <Campo label="Empresa" value={form.empresa ?? ""} onChange={(v) => setForm({ ...form, empresa: v })} />
              <Campo label="CPF/CNPJ" value={form.cpf_cnpj ?? ""} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} />
              <Campo
                label="Inscrição Estadual"
                value={form.inscricao_estadual ?? ""}
                onChange={(v) => setForm({ ...form, inscricao_estadual: v })}
              />
              <Campo label="Telefone" value={form.telefone ?? ""} onChange={(v) => setForm({ ...form, telefone: v })} />
              <Campo label="WhatsApp" value={form.whatsapp ?? ""} onChange={(v) => setForm({ ...form, whatsapp: v })} />
              <Campo label="E-mail" value={form.email ?? ""} onChange={(v) => setForm({ ...form, email: v })} />
              <Campo label="CEP" value={form.cep ?? ""} onChange={(v) => setForm({ ...form, cep: v })} />
              <Campo label="Endereço" value={form.endereco ?? ""} onChange={(v) => setForm({ ...form, endereco: v })} />
              <Campo label="Número" value={form.numero ?? ""} onChange={(v) => setForm({ ...form, numero: v })} />
              <Campo label="Cidade" value={form.cidade ?? ""} onChange={(v) => setForm({ ...form, cidade: v })} />
              <Campo label="Estado" value={form.estado ?? ""} onChange={(v) => setForm({ ...form, estado: v })} />
              <div className="sm:col-span-2">
                <label className="label">Observações</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.observacoes ?? ""}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
