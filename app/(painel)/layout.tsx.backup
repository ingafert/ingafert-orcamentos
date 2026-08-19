"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Boxes,
  Settings,
  Menu,
  X,
  Search,
  Bell,
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

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  const paginaAtual =
    NAV.find((item) => pathname?.startsWith(item.href))?.label ?? "Ingafert Orçamentos";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - fixa em telas grandes, drawer sobreposto no celular */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-100 bg-white px-4 py-6
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-ingafert-verde text-white shadow-card"
                    : "text-gray-500 hover:bg-ingafert-verde/5 hover:text-ingafert-verde-escuro"
                }`}
              >
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
      </aside>

      {/* Fundo escurecido atrás do menu no celular, fecha ao tocar fora */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMenuAberto(false)} />
      )}

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/80 px-4 py-4 backdrop-blur md:px-6">
          <button onClick={() => setMenuAberto(true)} className="text-gray-500 md:hidden">
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden md:block">
            <p className="text-sm font-bold text-ingafert-verde-escuro">{paginaAtual}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar orçamento, cliente ou produto"
                className="input w-64 py-2 pl-9 text-sm"
              />
            </div>
            <button
              type="button"
              className="relative rounded-xl border border-gray-100 p-2.5 text-gray-500 transition-colors hover:bg-gray-50"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ingafert-ouro" />
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
