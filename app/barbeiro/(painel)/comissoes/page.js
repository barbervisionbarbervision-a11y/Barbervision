"use client";

import { Trophy, DollarSign } from "lucide-react";
import { clientesExemplo, equipeExemplo, avaliacoesExemplo, barbeariaExemplo } from "@/lib/mockData";
import { useSessaoDono } from "@/lib/useSessaoDono";

export default function Comissoes() {
  const sessao = useSessaoDono();
  if (!sessao) return null;

  const { ticketMedio, percentualComissao } = barbeariaExemplo;
  const funcionarios = equipeExemplo.filter((b) => b.papel === "funcionario");

  const dados = funcionarios
    .map((b) => {
      const clientesDoBarbeiro = clientesExemplo.filter((c) => c.barbeiroId === b.id);
      const totalCortes = clientesDoBarbeiro.reduce((soma, c) => soma + c.cortesRegistrados, 0);
      const totalIndicacoes = clientesDoBarbeiro.reduce((soma, c) => soma + c.indicacoes, 0);
      const avaliacoesDoBarbeiro = avaliacoesExemplo.filter((a) => a.barbeiroId === b.id);
      const mediaAvaliacao = avaliacoesDoBarbeiro.length
        ? avaliacoesDoBarbeiro.reduce((s, a) => s + a.nota, 0) / avaliacoesDoBarbeiro.length
        : null;
      const faturamentoEstimado = totalCortes * ticketMedio;
      const comissaoEstimada = faturamentoEstimado * (percentualComissao / 100);
      // Pontuação simples pro ranking: cortes + (indicações valem mais) + avaliação.
      const pontuacao = totalCortes + totalIndicacoes * 3 + (mediaAvaliacao || 0) * 2;
      return { ...b, totalCortes, totalIndicacoes, mediaAvaliacao, faturamentoEstimado, comissaoEstimada, pontuacao };
    })
    .sort((a, b) => b.pontuacao - a.pontuacao);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Comissões & Ranking</h1>
        <p className="text-sm text-steel mt-1">
          Estimativa com base no ticket médio (R$ {ticketMedio}) e {percentualComissao}% de comissão.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {dados.map((b, i) => (
          <div key={b.id} className="bg-white/5 border border-steel/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-3 sm:w-48">
              {i === 0 && <Trophy className="text-brass shrink-0" size={22} />}
              <div>
                <p className="text-parchment font-semibold">{b.nome}</p>
                {i === 0 && <p className="text-xs text-brass">Barbeiro do mês 🏆</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 text-sm">
              <div>
                <p className="text-steel text-xs">Cortes</p>
                <p className="text-parchment font-medium">{b.totalCortes}</p>
              </div>
              <div>
                <p className="text-steel text-xs">Indicações</p>
                <p className="text-parchment font-medium">{b.totalIndicacoes}</p>
              </div>
              <div>
                <p className="text-steel text-xs">Avaliação média</p>
                <p className="text-parchment font-medium">{b.mediaAvaliacao ? b.mediaAvaliacao.toFixed(1) + " ⭐" : "—"}</p>
              </div>
              <div>
                <p className="text-steel text-xs flex items-center gap-1"><DollarSign size={12} /> Comissão est.</p>
                <p className="text-brass font-semibold">R$ {b.comissaoEstimada.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-steel/60">
        (Cálculo estimado a partir dos cortes registrados no mock — quando o Supabase estiver conectado, isso
        passa a refletir cortes e valores reais lançados pela equipe.)
      </p>
    </div>
  );
}
