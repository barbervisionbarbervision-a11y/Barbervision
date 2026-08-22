"use client";

import { Star } from "lucide-react";
import { avaliacoesExemplo, equipeExemplo } from "@/lib/mockData";
import { useSessaoBarbeiro } from "@/lib/barbeiroSession";

function nomeBarbeiro(id) {
  return equipeExemplo.find((b) => b.id === id)?.nome || "—";
}

export default function Avaliacoes() {
  const sessao = useSessaoBarbeiro();

  if (!sessao) return null;

  const ehDono = sessao.papel === "dono";
  const avaliacoes = ehDono ? avaliacoesExemplo : avaliacoesExemplo.filter((a) => a.barbeiroId === sessao.id);
  const media = avaliacoes.length
    ? (avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length).toFixed(1)
    : "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Avaliações</h1>
        <p className="text-sm text-steel mt-1">Nota média: <span className="text-brass font-semibold">{media} ⭐</span></p>
      </div>

      <div className="flex flex-col gap-3">
        {avaliacoes.map((a) => (
          <div key={a.id} className="bg-white/5 border border-steel/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-parchment font-medium">{a.clienteNome}</p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} className={n <= a.nota ? "fill-brass text-brass" : "text-steel/30"} />
                ))}
              </div>
            </div>
            {ehDono && <p className="text-xs text-steel mt-1">Atendido por {nomeBarbeiro(a.barbeiroId)}</p>}
            {a.comentario && <p className="text-sm text-parchment/80 mt-2">&ldquo;{a.comentario}&rdquo;</p>}
          </div>
        ))}
        {avaliacoes.length === 0 && <p className="text-sm text-steel/60">Nenhuma avaliação ainda.</p>}
      </div>

      <p className="text-xs text-steel/60">
        Link para o cliente avaliar depois do corte: <code className="text-brass">/b/{"{sua-barbearia}"}/avaliacao</code>
        {" "}(envie por WhatsApp depois do atendimento).
      </p>
    </div>
  );
}
