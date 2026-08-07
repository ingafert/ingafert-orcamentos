"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

const VAZIO = {
  codigo_ingafert: "",
  codigo_erp: "",
  codigo_industria: "",
  sku: "",
  nome: "",
  modelo: "",
  marca_nome: "",
  categoria_nome: "",
  subcategoria_nome: "",
  preco_custo: "",
  preco_venda: "",
  estoque: "",
  peso: "",
  altura: "",
  largura: "",
  comprimento: "",
  ncm: "",
  imagem_url: "",
  descricao: "",
  seo_url: "",
  meta_title: "",
  meta_description: "",
  palavras_chave: "",
  alt_imagem: "",
};

export default function NovoProdutoForm({ onConcluido }: { onConcluido: () => void }) {
  const supabase = createClient();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(VAZIO);

  function campo(chave: keyof typeof VAZIO, valor: string) {
    setForm((f) => ({ ...f, [chave]: valor }));
  }

  async function resolverMarcaId(nome: string): Promise<string | null> {
    if (!nome.trim()) return null;
    const { data: existente } = await supabase
      .from("marcas")
      .select("id")
      .eq("tipo", "peca")
      .ilike("nome", nome.trim())
      .maybeSingle();
    if (existente) return existente.id;
    const { data: criado } = await supabase.from("marcas").insert({ nome: nome.trim(), tipo: "peca" }).select("id").single();
    return criado?.id ?? null;
  }

  async function resolverCategoriaId(nome: string): Promise<string | null> {
    if (!nome.trim()) return null;
    const { data: existente } = await supabase.from("categorias").select("id").ilike("nome", nome.trim()).maybeSingle();
    if (existente) return existente.id;
    const { data: criado } = await supabase.from("categorias").insert({ nome: nome.trim() }).select("id").single();
    return criado?.id ?? null;
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo_ingafert.trim() || !form.nome.trim() || !form.preco_venda) {
      toast.error("Código Ingafert, nome e preço de venda são obrigatórios.");
      return;
    }
    setSalvando(true);

    const marca_peca_id = await resolverMarcaId(form.marca_nome);
    const categoria_id = await resolverCategoriaId(form.categoria_nome);
    const subcategoria_id = await resolverCategoriaId(form.subcategoria_nome);

    const registro = {
      codigo_ingafert: form.codigo_ingafert.trim(),
      codigo_erp: form.codigo_erp || null,
      codigo_industria: form.codigo_industria || null,
      sku: form.sku || null,
      nome: form.nome.trim(),
      modelo: form.modelo || null,
      marca_peca_id,
      categoria_id,
      subcategoria_id,
      preco_custo: Number(form.preco_custo) || 0,
      preco_venda: Number(form.preco_venda) || 0,
      estoque: Number(form.estoque) || 0,
      peso: Number(form.peso) || 0,
      altura: Number(form.altura) || 0,
      largura: Number(form.largura) || 0,
      comprimento: Number(form.comprimento) || 0,
      ncm: form.ncm || null,
      imagem_url: form.imagem_url || null,
      descricao: form.descricao || null,
      seo_url: form.seo_url || null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      palavras_chave: form.palavras_chave || null,
      alt_imagem: form.alt_imagem || null,
    };

    const { error } = await supabase.from("produtos").insert(registro);
    setSalvando(false);

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Já existe um produto com esse Código Ingafert.");
      } else {
        toast.error("Erro ao cadastrar: " + error.message);
      }
      return;
    }

    toast.success("Produto cadastrado!");
    setForm(VAZIO);
    setAberto(false);
    onConcluido();
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Novo produto
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ingafert-verde-escuro">Novo produto</h2>
              <button onClick={() => setAberto(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={salvar} className="space-y-6">
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase text-gray-400">Dados do produto</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Código Ingafert *" value={form.codigo_ingafert} onChange={(v) => campo("codigo_ingafert", v)} />
                  <Campo label="Nome *" value={form.nome} onChange={(v) => campo("nome", v)} />
                  <Campo label="SKU" value={form.sku} onChange={(v) => campo("sku", v)} />
                  <Campo label="Código ERP" value={form.codigo_erp} onChange={(v) => campo("codigo_erp", v)} />
                  <Campo label="Código da Indústria" value={form.codigo_industria} onChange={(v) => campo("codigo_industria", v)} />
                  <Campo label="Modelo" value={form.modelo} onChange={(v) => campo("modelo", v)} />
                  <Campo label="Marca" value={form.marca_nome} onChange={(v) => campo("marca_nome", v)} />
                  <Campo label="NCM" value={form.ncm} onChange={(v) => campo("ncm", v)} />
                  <Campo label="Categoria" value={form.categoria_nome} onChange={(v) => campo("categoria_nome", v)} />
                  <Campo label="Subcategoria" value={form.subcategoria_nome} onChange={(v) => campo("subcategoria_nome", v)} />
                  <Campo label="Preço de Custo (R$)" value={form.preco_custo} onChange={(v) => campo("preco_custo", v)} tipo="number" />
                  <Campo label="Preço de Venda (R$) *" value={form.preco_venda} onChange={(v) => campo("preco_venda", v)} tipo="number" />
                  <Campo label="Estoque" value={form.estoque} onChange={(v) => campo("estoque", v)} tipo="number" />
                  <Campo label="Peso (kg)" value={form.peso} onChange={(v) => campo("peso", v)} tipo="number" />
                  <Campo label="Altura (cm)" value={form.altura} onChange={(v) => campo("altura", v)} tipo="number" />
                  <Campo label="Largura (cm)" value={form.largura} onChange={(v) => campo("largura", v)} tipo="number" />
                  <Campo label="Comprimento (cm)" value={form.comprimento} onChange={(v) => campo("comprimento", v)} tipo="number" />
                  <Campo label="Imagem (URL)" value={form.imagem_url} onChange={(v) => campo("imagem_url", v)} />
                </div>
                <div className="mt-4">
                  <label className="label">Descrição</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => campo("descricao", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase text-gray-400">SEO (opcional)</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="URL amigável" value={form.seo_url} onChange={(v) => campo("seo_url", v)} />
                  <Campo label="Meta Title" value={form.meta_title} onChange={(v) => campo("meta_title", v)} />
                  <Campo label="Meta Description" value={form.meta_description} onChange={(v) => campo("meta_description", v)} />
                  <Campo label="Palavras-chave" value={form.palavras_chave} onChange={(v) => campo("palavras_chave", v)} />
                  <Campo label="Alt da imagem" value={form.alt_imagem} onChange={(v) => campo("alt_imagem", v)} />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setAberto(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="btn-primary">
                  {salvando ? "Salvando..." : "Salvar produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Campo({
  label,
  value,
  onChange,
  tipo = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tipo?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={tipo} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
