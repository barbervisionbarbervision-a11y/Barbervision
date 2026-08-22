"use client";

import { useRouter, useParams } from "next/navigation";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ProgressSteps from "@/components/ProgressSteps";
import { gerarRecomendacoesMock } from "@/lib/mockData";

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default function Recomendacao() {
  const router = useRouter();
  const { barbearia } = useParams();
  const recomendacoes = gerarRecomendacoesMock();

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10 gap-6 bg-ink">
      <Logo size="sm" />
      <ProgressSteps atual={6} />

      <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment text-center">
        Mais estilos para testar
      </h1>
      <p className="text-xs text-steel text-center max-w-sm -mt-3">
        Sugestões populares do catálogo demonstrativo. Elas não analisam seu rosto e servem apenas como ponto de
        partida — a escolha final é sempre sua e do seu barbeiro.
      </p>

      <div className="w-full max-w-md flex flex-col gap-3">
        {recomendacoes.map((r) => (
          <div key={r.posicao} className="flex gap-4 bg-white/5 border border-steel/20 rounded-xl p-4">
            <span className="text-2xl leading-none">{MEDALHAS[r.posicao - 1]}</span>
            <div>
              <p className="font-semibold text-parchment">{r.corte}</p>
              <p className="text-sm text-steel">{r.explicacao}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => router.push(`/b/${barbearia}/escolha`)} className="w-full max-w-md mt-2">
        Continuar para a escolha final
      </Button>
    </main>
  );
}
