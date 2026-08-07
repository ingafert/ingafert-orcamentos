import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Ingafert Orçamentos",
  description: "Sistema de orçamentos e pedidos — Ingafert Peças Agrícolas",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#2E5E3E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegisterSW />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
