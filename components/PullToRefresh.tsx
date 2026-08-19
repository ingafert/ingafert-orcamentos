"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { RotateCw } from "lucide-react";

const LIMIAR = 70; // px que precisa puxar pra soltar e atualizar

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [distancia, setDistancia] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const inicioY = useRef<number | null>(null);
  const puxando = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    // Só ativa o gesto se a página já estiver no topo (senão atrapalharia rolagem normal)
    if (window.scrollY === 0 && !atualizando) {
      inicioY.current = e.touches[0].clientY;
      puxando.current = true;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!puxando.current || inicioY.current === null) return;
    const delta = e.touches[0].clientY - inicioY.current;
    if (delta > 0) {
      setDistancia(Math.min(delta * 0.5, 100));
    }
  }

  async function handleTouchEnd() {
    if (!puxando.current) return;
    puxando.current = false;
    inicioY.current = null;

    if (distancia >= LIMIAR) {
      setAtualizando(true);
      setDistancia(56);
      router.refresh();
      setTimeout(() => {
        setAtualizando(false);
        setDistancia(0);
      }, 700);
    } else {
      setDistancia(0);
    }
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200 md:hidden"
        style={{ height: distancia }}
      >
        <RotateCw className={`h-5 w-5 text-ingafert-verde ${atualizando ? "animate-spin" : ""}`} />
      </div>
      {children}
    </div>
  );
}
