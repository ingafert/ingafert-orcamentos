"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin", label: "Admin", icon: Settings },
];

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);

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
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuAberto(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-ingafert-verde/5 hover:text-ingafert-verde-escuro"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
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
          <div className="text-sm font-bold text-ingafert-verde-escuro md:hidden">Ingafert Orçamentos</div>
          <div className="ml-auto text-sm text-gray-400">Bem-vindo(a) de volta 👋</div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
