import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ShoppingCart,
  Boxes,
  Settings,
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
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-100 bg-white px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ingafert-verde text-sm font-bold text-ingafert-ouro">
            IF
          </div>
          <div>
            <p className="text-sm font-bold text-ingafert-verde-escuro">Ingafert</p>
            <p className="text-xs text-gray-400">Orçamentos</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-ingafert-verde/5 hover:text-ingafert-verde-escuro"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-6 py-4 backdrop-blur">
          <div className="md:hidden text-sm font-bold text-ingafert-verde-escuro">Ingafert Orçamentos</div>
          <div className="ml-auto text-sm text-gray-400">Bem-vindo(a) de volta 👋</div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
