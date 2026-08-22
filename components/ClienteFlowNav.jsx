"use client";

import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { limparFluxo } from "@/lib/clienteFlow";

export default function ClienteFlowNav() {
  const pathname = usePathname();
  const { barbearia } = useParams();
  const inicioBarbearia = `/b/${barbearia}`;
  const estaNaEntrada = pathname === inicioBarbearia;

  return (
    <nav
      aria-label="Navegação do atendimento"
      className="fixed left-3 top-3 z-50 flex items-center gap-2 sm:left-5 sm:top-5"
    >
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-steel/30 bg-ink/90 px-3 text-xs font-semibold text-parchment shadow-lg backdrop-blur transition-colors hover:border-brass hover:text-brass"
      >
        <Home size={15} aria-hidden="true" />
        <span className="hidden sm:inline">Tela inicial</span>
      </Link>

      {!estaNaEntrada && (
        <Link
          href={inicioBarbearia}
          onClick={limparFluxo}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-steel/30 bg-ink/90 px-3 text-xs font-semibold text-parchment shadow-lg backdrop-blur transition-colors hover:border-brass hover:text-brass"
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Recomeçar</span>
        </Link>
      )}
    </nav>
  );
}
