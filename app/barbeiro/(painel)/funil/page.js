"use client";

import { clientesExemplo, etapasFunil } from "@/lib/mockData";
import { useSessaoDono } from "@/lib/useSessaoDono";

export default function Funil() {
  const sessao = useSessaoDono();
  if (!sessao) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Funil de vendas</h1>
        <p className="text-sm text-steel mt-1">
          Acompanhe em qual etapa cada cliente está, do primeiro acesso até virar indicador da sua barbearia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {etapasFunil.map((etapa) => {
          const clientesDaEtapa = clientesExemplo.filter((c) => c.etapaFunil === etapa.chave);
          return (
            <div key={etapa.chave} className="bg-white/5 border border-steel/20 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <p className="font-display text-sm uppercase tracking-widest2 text-brass">{etapa.titulo}</p>
                <p className="text-xs text-steel mt-1">{etapa.descricao}</p>
              </div>
              <p className="text-3xl font-display text-parchment">{clientesDaEtapa.length}</p>
              <div className="flex flex-col gap-2">
                {clientesDaEtapa.map((c) => (
                  <div key={c.id} className="bg-ink/60 border border-steel/10 rounded-lg px-3 py-2">
                    <p className="text-sm text-parchment font-medium">{c.nome}</p>
                    <p className="text-xs text-steel">{c.ultimoCorte !== "—" ? c.ultimoCorte : "Sem corte ainda"}</p>
                  </div>
                ))}
                {clientesDaEtapa.length === 0 && (
                  <p className="text-xs text-steel/50 italic">Nenhum cliente aqui ainda.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
