"use client";

import { clientesExemplo } from "@/lib/mockData";
import { useSessaoBarbeiro } from "@/lib/barbeiroSession";

export default function Simulacoes() {
  const sessao = useSessaoBarbeiro();

  if (!sessao) return null;

  const ehDono = sessao.papel === "dono";
  const clientes = ehDono ? clientesExemplo : clientesExemplo.filter((c) => c.barbeiroId === sessao.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Simulações</h1>
      <p className="text-sm text-steel -mt-4">
        Cada card representa uma simulação enviada pelo cliente na Página 7 (Escolha Final).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes.map((c) => (
          <div key={c.id} className="bg-white/5 border border-steel/20 rounded-xl p-5 flex flex-col gap-2">
            <p className="text-parchment font-semibold">{c.nome}</p>
            <p className="text-sm text-steel">Corte: <span className="text-brass">{c.ultimoCorte}</span></p>
            <p className="text-xs text-steel">{c.ultimaVisita}</p>
          </div>
        ))}
        {clientes.length === 0 && <p className="text-sm text-steel/60">Nenhuma simulação ainda.</p>}
      </div>
    </div>
  );
}
