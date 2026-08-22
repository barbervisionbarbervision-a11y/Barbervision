"use client";

import { Gift, Users2 } from "lucide-react";
import LoyaltyBar from "@/components/LoyaltyBar";
import { clientesExemplo, barbeariaExemplo } from "@/lib/mockData";
import { useSessaoDono } from "@/lib/useSessaoDono";

export default function Fidelidade() {
  const sessao = useSessaoDono();
  const { visitasParaDesconto, descricaoDesconto, indicacoesParaBonus, descricaoBonusIndicacao } =
    barbeariaExemplo.regrasFidelidade;

  if (!sessao) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Programa de fidelidade</h1>
        <p className="text-sm text-steel mt-1">
          Defina as regras da sua barbearia e acompanhe quem já está perto de ganhar um benefício.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-steel/20 rounded-xl p-5 flex gap-4 items-start">
          <Gift className="text-brass shrink-0" size={22} />
          <div>
            <p className="text-sm text-steel">A cada</p>
            <p className="text-2xl font-display text-parchment">{visitasParaDesconto} visitas</p>
            <p className="text-sm text-parchment/80 mt-1">{descricaoDesconto}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-steel/20 rounded-xl p-5 flex gap-4 items-start">
          <Users2 className="text-brass shrink-0" size={22} />
          <div>
            <p className="text-sm text-steel">A cada</p>
            <p className="text-2xl font-display text-parchment">{indicacoesParaBonus} indicações</p>
            <p className="text-sm text-parchment/80 mt-1">{descricaoBonusIndicacao}</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-steel/70 -mt-3">
        (Essas regras ainda são fixas nesta fase do projeto — na próxima etapa você vai poder editá-las aqui
        mesmo, sem precisar mexer em código.)
      </p>

      <div className="flex flex-col gap-5">
        {clientesExemplo.map((c) => {
          const desbloqueouDesconto = c.cortesRegistrados >= visitasParaDesconto;
          const desbloqueouIndicacao = c.indicacoes >= indicacoesParaBonus;
          return (
            <div key={c.id} className="bg-white/5 border border-steel/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-parchment font-semibold">{c.nome}</p>
                <span className="text-xs text-steel">{c.indicacoes} indicação(ões)</span>
              </div>
              <LoyaltyBar atual={c.cortesRegistrados} meta={visitasParaDesconto} />
              {desbloqueouDesconto && (
                <p className="text-xs text-brass mt-2">🎉 Já desbloqueou: {descricaoDesconto}</p>
              )}
              {desbloqueouIndicacao && (
                <p className="text-xs text-brass mt-1">🎉 Já desbloqueou: {descricaoBonusIndicacao}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
