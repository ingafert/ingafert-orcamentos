"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  FilePlus2,
  UserPlus,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  Package,
  Boxes,
  Settings,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: any;
  group: string;
  onSelect: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<{ orcamentos: any[]; clientes: any[]; produtos: any[] }>({
    orcamentos: [],
    clientes: [],
    produtos: [],
  });

  // Atalho global Cmd+K / Ctrl+K abre e fecha a paleta
  useEffect(() => {
    function handleAtalho(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleAtalho);
    return () => window.removeEventListener("keydown", handleAtalho);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const termo = query.trim();
    if (termo.length < 2) {
      setResultados({ orcamentos: [], clientes: [], produtos: [] });
      return;
    }
    setBuscando(true);
    const t = setTimeout(async () => {
      const [clientesRes, produtosRes, orcamentosPorClienteRes] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, empresa")
          .or(`nome.ilike.%${termo}%,empresa.ilike.%${termo}%`)
          .limit(5),
        supabase
          .from("produtos")
          .select("id, nome, codigo_ingafert")
          .or(`nome.ilike.%${termo}%,codigo_ingafert.ilike.%${termo}%`)
          .limit(5),
        supabase
          .from("orcamentos")
          .select("id, numero, total, clientes!inner(nome)")
          .ilike("clientes.nome", `%${termo}%`)
          .limit(5),
      ]);

      let orcamentosPorNumero: any[] = [];
      if (/^\d+$/.test(termo)) {
        const { data } = await supabase
          .from("orcamentos")
          .select("id, numero, total, clientes(nome)")
          .eq("numero", Number(termo))
          .limit(5);
        orcamentosPorNumero = data ?? [];
      }

      const orcamentosCombinados = [...(orcamentosPorClienteRes.data ?? []), ...orcamentosPorNumero].filter(
        (o, idx, arr) => arr.findIndex((x) => x.id === o.id) === idx
      );

      setResultados({
        clientes: (clientesRes.data as any[]) ?? [],
        produtos: (produtosRes.data as any[]) ?? [],
        orcamentos: orcamentosCombinados,
      });
      setBuscando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function fechar() {
    setOpen(false);
    setQuery("");
  }

  function ir(destino: string) {
    router.push(destino);
    fechar();
  }

  const NAVEGACAO: PaletteItem[] = [
    { id: "nav-dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Navegar", onSelect: () => ir("/dashboard") },
    { id: "nav-orcamentos", label: "Orçamentos", icon: FileText, group: "Navegar", onSelect: () => ir("/orcamentos") },
    { id: "nav-pedidos", label: "Pedidos", icon: ShoppingCart, group: "Navegar", onSelect: () => ir("/pedidos") },
    { id: "nav-clientes", label: "Clientes", icon: Users, group: "Navegar", onSelect: () => ir("/clientes") },
    { id: "nav-produtos", label: "Produtos", icon: Package, group: "Navegar", onSelect: () => ir("/produtos") },
    { id: "nav-estoque", label: "Estoque", icon: Boxes, group: "Navegar", onSelect: () => ir("/estoque") },
    { id: "nav-admin", label: "Admin", icon: Settings, group: "Navegar", onSelect: () => ir("/admin") },
  ];

  const ACOES: PaletteItem[] = [
    {
      id: "acao-novo-orcamento",
      label: "Novo orçamento",
      icon: FilePlus2,
      group: "Ações rápidas",
      onSelect: () => ir("/orcamentos/novo"),
    },
    {
      id: "acao-novo-cliente",
      label: "Novo cliente",
      icon: UserPlus,
      group: "Ações rápidas",
      onSelect: () => ir("/clientes?novo=1"),
    },
  ];

  const itensResultado: PaletteItem[] = useMemo(() => {
    const lista: PaletteItem[] = [];
    resultados.orcamentos.forEach((o) =>
      lista.push({
        id: `orc-${o.id}`,
        label: `#${String(o.numero).padStart(6, "0")}`,
        sublabel: o.clientes?.nome,
        icon: FileText,
        group: "Orçamentos",
        onSelect: () => ir(`/orcamentos/${o.id}`),
      })
    );
    resultados.clientes.forEach((c) =>
      lista.push({
        id: `cli-${c.id}`,
        label: c.nome,
        sublabel: c.empresa,
        icon: Users,
        group: "Clientes",
        onSelect: () => ir(`/clientes/${c.id}`),
      })
    );
    resultados.produtos.forEach((p) =>
      lista.push({
        id: `prod-${p.id}`,
        label: p.codigo_ingafert,
        sublabel: p.nome,
        icon: Package,
        group: "Produtos",
        onSelect: () => ir(`/produtos?busca=${encodeURIComponent(p.codigo_ingafert ?? p.nome)}`),
      })
    );
    return lista;
  }, [resultados]);

  const itens: PaletteItem[] = query.trim().length >= 2 ? itensResultado : [...ACOES, ...NAVEGACAO];

  useEffect(() => {
    setSelectedIndex(0);
  }, [itens.length, query]);

  // Navegação por teclado dentro da paleta (setas + Enter)
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, itens.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        itens[selectedIndex]?.onSelect();
      } else if (e.key === "Escape") {
        fechar();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itens, selectedIndex]);

  // Agrupa mantendo a ordem de inserção
  const grupos = useMemo(() => {
    const mapa = new Map<string, PaletteItem[]>();
    itens.forEach((item) => {
      if (!mapa.has(item.group)) mapa.set(item.group, []);
      mapa.get(item.group)!.push(item);
    });
    return Array.from(mapa.entries());
  }, [itens]);

  return (
    <>
      {/* Botão-gatilho no cabeçalho (desktop: barra com texto) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-400 transition-colors hover:border-gray-200 hover:bg-gray-50 sm:flex sm:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar ou executar...</span>
        <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
          ⌘K
        </kbd>
      </button>

      {/* Botão-gatilho no cabeçalho (mobile: só o ícone, sem atalho de teclado disponível) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="flex items-center justify-center rounded-xl border border-gray-100 p-2.5 text-gray-500 transition-colors hover:bg-gray-50 sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[8vh] backdrop-blur-sm sm:pt-[12vh]"
          onClick={fechar}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar orçamento, cliente, produto ou comando..."
                className="flex-1 border-none text-sm outline-none placeholder:text-gray-400"
              />
              {buscando && <span className="text-xs text-gray-300">buscando...</span>}
            </div>

            <div className="max-h-96 overflow-y-auto py-2">
              {itens.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  Nenhum resultado para &quot;{query}&quot;
                </p>
              )}

              {grupos.map(([grupo, itensDoGrupo]) => (
                <div key={grupo} className="mb-1">
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase text-gray-400">{grupo}</p>
                  {itensDoGrupo.map((item) => {
                    const idxGlobal = itens.findIndex((i) => i.id === item.id);
                    const Icon = item.icon;
                    const ativo = idxGlobal === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(idxGlobal)}
                        onClick={item.onSelect}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          ativo ? "bg-ingafert-verde/10 text-ingafert-verde-escuro" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${ativo ? "text-ingafert-verde" : "text-gray-400"}`} />
                        <span className="flex-1 truncate">
                          <span className="font-medium">{item.label}</span>
                          {item.sublabel && <span className="ml-2 text-gray-400">{item.sublabel}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" /> navegar
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> selecionar
              </span>
              <span className="ml-auto">esc fechar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
