"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConfiguracaoEmpresa } from "@/types/database";
import { Building2, CheckCircle2 } from "lucide-react";

const VAZIO: Omit<ConfiguracaoEmpresa, "id" | "updated_at"> = {
  nome: "Ingafert Peças Agrícolas",
  cnpj: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  telefone: "",
  email: "",
  pix_chave: "",
  logo_url: "",
};

export default function AdminPage() {
  const supabase = createClient();
  const [form, setForm] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("configuracoes_empresa").select("*").eq("id", true).maybeSingle();
      if (data) setForm(data);
      setCarregando(false);
    })();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    await supabase.from("configuracoes_empresa").upsert({ id: true, ...form });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  }

  if (carregando) return <p className="text-gray-400">Carregando...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ingafert-verde-escuro">Admin</h1>

      <div className="card max-w-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-ingafert-verde" />
          <h2 className="text-sm font-bold text-gray-700">Dados da empresa</h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Essas informações aparecem automaticamente no cabeçalho e rodapé de todo PDF de orçamento gerado.
        </p>

        <form onSubmit={salvar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome da empresa *</label>
            <input
              className="input"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <label className="label">CNPJ</label>
            <input
              className="input"
              value={form.cnpj ?? ""}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
            />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.telefone ?? ""}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(44) 0000-0000"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">E-mail</label>
            <input
              className="input"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Endereço</label>
            <input
              className="input"
              value={form.endereco ?? ""}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Rua, número, bairro"
            />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input
              className="input"
              value={form.cidade ?? ""}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <input
              className="input"
              value={form.estado ?? ""}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              placeholder="PR"
            />
          </div>
          <div>
            <label className="label">CEP</label>
            <input
              className="input"
              value={form.cep ?? ""}
              onChange={(e) => setForm({ ...form, cep: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Chave PIX</label>
            <input
              className="input"
              value={form.pix_chave ?? ""}
              onChange={(e) => setForm({ ...form, pix_chave: e.target.value })}
              placeholder="CNPJ, e-mail, telefone ou chave aleatória"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">URL do logo (opcional)</label>
            <input
              className="input"
              value={form.logo_url ?? ""}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? "Salvando..." : "Salvar configurações"}
            </button>
            {salvo && (
              <span className="flex items-center gap-1 text-sm font-medium text-ingafert-verde">
                <CheckCircle2 className="h-4 w-4" /> Salvo!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
