"use client";

import { clientesExemplo } from "@/lib/mockData";
import { useSessaoBarbeiro } from "@/lib/barbeiroSession";

export default function Historico() {
  const sessao = useSessaoBarbeiro();

  if (!sessao) return null;

  const ehDono = sessao.papel === "dono";
  const clientes = ehDono ? clientesExemplo : clientesExemplo.filter((c) => c.barbeiroId === sessao.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Histórico</h1>

      <ol className="flex flex-col gap-4">
        {clientes.map((c) => (
          <li key={c.id} className="bg-white/5 border border-steel/20 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-parchment font-semibold">{c.nome}</p>
              <p className="text-sm text-steel">{c.observacoes || "Sem observações registradas."}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-brass">{c.ultimoCorte}</p>
              <p className="text-steel">{c.ultimaVisita}</p>
            </div>
          </li>
        ))}
        {clientes.length === 0 && <p className="text-sm text-steel/60">Nenhum histórico ainda.</p>}
      </ol>
    </div>
  );
}
