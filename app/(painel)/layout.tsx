"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CommandPalette from "@/components/CommandPalette";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Boxes,
  Settings,
  MoreHorizontal,
  ChevronLeft,
  X,
  Bell,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin", label: "Admin", icon: Settings },
];

// Itens de maior uso, sempre ao alcance do polegar na barra inferior (mobile)
const BOTTOM_NAV = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
];

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const paginaAtual =
    NAV.find((item) => pathname?.startsWith(item.href))?.label ?? "Ingafert Orçamentos";

  // Está "dentro" de alguma coisa (detalhe, edição) e não numa das 7 seções principais?
  const ehSubpagina = !NAV.some((item) => item.href === pathname);

  async function handleSair() {
    setSaindo(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Notificações
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function carregarNotificacoes() {
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    setNotificacoes(data ?? []);
  }

  useEffect(() => {
    carregarNotificacoes();
    const intervalo = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(intervalo);
  }, []);

  async function abrirNotificacao(n: any) {
    if (!n.lida) {
      await supabase.from("notificacoes").update({ lida: true }).eq("id", n.id);
      setNotificacoes((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    }
    setMostrarNotificacoes(false);
    if (n.orcamento_id) {
      router.push(`/orcamentos/${n.orcamento_id}`);
    }
  }

  async function marcarTodasComoLidas() {
    const idsNaoLidos = notificacoes.filter((n) => !n.lida).map((n) => n.id);
    if (idsNaoLidos.length === 0) return;
    await supabase.from("notificacoes").update({ lida: true }).in("id", idsNaoLidos);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - fixa em telas grandes, drawer sobreposto no celular */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-100 bg-white px-4
          pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]
          transition-transform duration-200 md:translate-x-0
          ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ingafert-verde text-sm font-bold text-ingafert-ouro">
              IF
            </div>
            <div>
              <p className="text-sm font-bold text-ingafert-verde-escuro">Ingafert</p>
              <p className="text-xs text-gray-400">Orçamentos</p>
            </div>
          </div>
          <button onClick={() => setMenuAberto(false)} className="text-gray-400 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const ativo = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuAberto(false)}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-ingafert-verde/10 text-ingafert-verde-escuro"
                    : "text-gray-500 hover:bg-gray-50 hover:text-ingafert-verde-escuro"
                }`}
              >
                {ativo && (
                  <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-ingafert-verde" />
                )}
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Cartão de identificação da empresa no rodapé do menu */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ingafert-ouro/20 text-xs font-bold text-ingafert-verde-escuro">
            IN
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-700">Ingafert Peças Agrícolas</p>
            <p className="truncate text-xs text-gray-400">contato@ingafert.com.br</p>
          </div>
        </div>

        {/* Botão de sair (logout) */}
        <button
          onClick={handleSair}
          disabled={saindo}
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {saindo ? "Saindo..." : "Sair"}
        </button>
      </aside>

      {/* Fundo escurecido atrás do menu no celular, fecha ao tocar fora */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMenuAberto(false)} />
      )}

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/80 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-1 md:flex-none">
            {ehSubpagina && (
              <button
                onClick={() => router.back()}
                aria-label="Voltar"
                className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50 md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <p className="truncate text-sm font-bold text-ingafert-verde-escuro">{paginaAtual}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <CommandPalette />

            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarNotificacoes((v) => !v)}
                className="relative rounded-xl border border-gray-100 p-2.5 text-gray-500 transition-colors hover:bg-gray-50"
              >
                <Bell className="h-4 w-4" />
                {naoLidas > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ingafert-ouro px-1 text-[10px] font-bold text-white">
                    {naoLidas > 9 ? "9+" : naoLidas}
                  </span>
                )}
              </button>

              {mostrarNotificacoes && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMostrarNotificacoes(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
                      <p className="text-sm font-bold text-gray-700">Notificações</p>
                      {naoLidas > 0 && (
                        <button onClick={marcarTodasComoLidas} className="text-xs text-ingafert-verde hover:underline">
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificacoes.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma notificação ainda.</p>
                      ) : (
                        notificacoes.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => abrirNotificacao(n)}
                            className={`block w-full border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50 ${
                              n.lida ? "" : "bg-ingafert-verde/5"
                            }`}
                          >
                            <p className="text-sm font-medium text-gray-800">{n.titulo}</p>
                            {n.mensagem && <p className="mt-0.5 text-xs text-gray-500">{n.mensagem}</p>}
                            <p className="mt-1 text-[11px] text-gray-400">
                              {new Date(n.created_at).toLocaleString("pt-BR")}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Barra de navegação inferior - só no celular, sempre ao alcance do polegar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-gray-200 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
      >
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const ativo = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                ativo ? "font-semibold text-ingafert-verde" : "font-medium text-gray-500"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  ativo ? "bg-ingafert-verde/15" : ""
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={ativo ? 2.4 : 2} />
              </span>
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium text-gray-500"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full">
            <MoreHorizontal className="h-6 w-6" strokeWidth={2} />
          </span>
          Mais
        </button>
      </nav>
    </div>
  );
}
