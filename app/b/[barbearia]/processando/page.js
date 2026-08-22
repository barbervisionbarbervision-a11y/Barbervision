"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Logo from "@/components/Logo";
import PoleDivider from "@/components/PoleDivider";

const ETAPAS = [
  "Carregando sua foto...",
  "Abrindo o catálogo da barbearia...",
  "Preparando o provador de cortes..."
];

export default function Processando() {
  const router = useRouter();
  const { barbearia } = useParams();
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    if (passo >= ETAPAS.length - 1) {
      const fim = setTimeout(() => router.replace(`/b/${barbearia}/simulacao`), 1200);
      return () => clearTimeout(fim);
    }
    const t = setTimeout(() => setPasso((p) => p + 1), 1100);
    return () => clearTimeout(t);
  }, [passo, barbearia, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-10 bg-ink">
      <Logo size="md" />
      <PoleDivider animate className="max-w-xs" />
      <p className="font-display text-xl uppercase tracking-widest2 text-parchment text-center animate-fadeUp" key={passo}>
        {ETAPAS[passo]}
      </p>
    </main>
  );
}
