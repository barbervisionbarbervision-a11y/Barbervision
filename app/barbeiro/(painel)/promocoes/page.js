"use client";

import { useState } from "react";
import { Plus, Trash2, Percent } from "lucide-react";
import { promocoesExemplo } from "@/lib/mockData";
import { useSessaoDono } from "@/lib/useSessaoDono";
import Button from "@/components/Button";

export default function Promocoes() {
  const sessao = useSessaoDono();
  const [promocoes, setPromocoes] = useState(promocoesExemplo);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  if (!sessao) return null;

  function adicionar() {
    if (!titulo.trim()) return;
    setPromocoes((atual) => [
      ...atual,
      { id: String(Date.now()), titulo, descricao, ativa: true }
    ]);
    setTitulo("");
    setDescricao("");
  }

  function alternarAtiva(id) {
    setPromocoes((atual) => atual.map((p) => (p.id === id ? { ...p, ativa: !p.ativa } : p)));
  }

  function remover(id) {
    setPromocoes((atual) => atual.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Promoções</h1>
        <p className="text-sm text-steel mt-1">
          As promoções marcadas como ativas aparecem para os clientes na tela inicial do app.
        </p>
      </div>

      <div className="bg-white/5 border border-steel/20 rounded-xl p-5 flex flex-col gap-3">
        <h2 className="font-display text-sm uppercase tracking-widest2 text-steel">Nova promoção</h2>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título (ex: Terça é dia de desconto)"
          className="bg-ink border border-steel/30 rounded-lg px-3 py-2 text-sm text-parchment placeholder:text-steel/50 outline-none focus:border-brass"
        />
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição (ex: 20% de desconto em qualquer corte)"
          rows={2}
          className="bg-ink border border-steel/30 rounded-lg px-3 py-2 text-sm text-parchment placeholder:text-steel/50 outline-none focus:border-brass resize-none"
        />
        <Button onClick={adicionar} className="self-start flex items-center gap-2">
          <Plus size={16} /> Adicionar promoção
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {promocoes.map((p) => (
          <div
            key={p.id}
            className="bg-white/5 border border-steel/20 rounded-xl p-4 flex items-start justify-between gap-4"
          >
            <div className="flex gap-3 items-start">
              <Percent className="text-brass shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-parchment font-medium">{p.titulo}</p>
                <p className="text-sm text-steel mt-0.5">{p.descricao}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => alternarAtiva(p.id)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  p.ativa ? "border-brass text-brass" : "border-steel/30 text-steel"
                }`}
              >
                {p.ativa ? "Ativa" : "Inativa"}
              </button>
              <button onClick={() => remover(p.id)} className="text-steel hover:text-barber">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-steel/60">
        (Por enquanto essas mudanças ficam só nesta aba do navegador — quando o Supabase for conectado, elas
        passam a valer para todos os clientes de verdade.)
      </p>
    </div>
  );
}
