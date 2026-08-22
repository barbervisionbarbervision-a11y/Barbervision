"use client";

import Link from "next/link";
import { Users, Wand2, Gift, ArrowRight } from "lucide-react";
import { clientesExemplo, etapasFunil, barbeariaExemplo } from "@/lib/mockData";
import { useSessaoBarbeiro } from "@/lib/barbeiroSession";

export default function Dashboard() {
  const sessao = useSessaoBarbeiro();

  if (!sessao) return null;

  const ehDono = sessao.papel === "dono";
  const clientes = ehDono ? clientesExemplo : clientesExemplo.filter((c) => c.barbeiroId === sessao.id);

  const totalClientes = clientes.length;
  const totalSimulacoes = clientes.filter((c) => c.etapaFunil !== "novo_lead").length;
  const fidelidadeCompleta = clientes.filter(
    (c) => c.cortesRegistrados >= barbeariaExemplo.regrasFidelidade.visitasParaDesconto
  ).length;

  const cards = [
    { icon: Users, label: ehDono ? "Clientes cadastrados" : "Meus clientes", valor: totalClientes },
    { icon: Wand2, label: "Simulações feitas", valor: totalSimulacoes },
    { icon: Gift, label: "Fidelidades completas", valor: fidelidadeCompleta }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">
          {ehDono ? "Dashboard" : `Olá, ${sessao.nome}`}
        </h1>
        {!ehDono && <p className="text-sm text-steel mt-1">Aqui você acompanha só a sua carteira de clientes.</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ icon: Icon, label, valor }) => (
          <div key={label} className="bg-white/5 border border-steel/20 rounded-xl p-5">
            <Icon className="text-brass mb-3" size={22} />
            <p className="text-3xl font-display text-parchment">{valor}</p>
            <p className="text-sm text-steel">{label}</p>
          </div>
        ))}
      </div>

      {ehDono && (
        <div className="bg-white/5 border border-steel/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm uppercase tracking-widest2 text-steel">Funil de vendas</h2>
            <Link href="/barbeiro/funil" className="text-xs text-brass flex items-center gap-1 hover:underline">
              Ver funil completo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {etapasFunil.map((etapa) => {
              const total = clientesExemplo.filter((c) => c.etapaFunil === etapa.chave).length;
              return (
                <div key={etapa.chave} className="bg-ink/60 border border-steel/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-display text-parchment">{total}</p>
                  <p className="text-xs text-steel mt-1">{etapa.titulo}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-steel/20 rounded-xl p-5">
        <h2 className="font-display text-sm uppercase tracking-widest2 text-steel mb-4">
          {ehDono ? "Últimos clientes" : "Meus últimos clientes"}
        </h2>
        <ul className="flex flex-col gap-3">
          {clientes.map((c) => (
            <li key={c.id} className="flex justify-between text-sm border-b border-steel/10 pb-2 last:border-0">
              <span className="text-parchment">{c.nome}</span>
              <span className="text-steel">{c.ultimoCorte} · {c.ultimaVisita}</span>
            </li>
          ))}
          {clientes.length === 0 && <p className="text-sm text-steel/60">Nenhum cliente ainda.</p>}
        </ul>
      </div>
    </div>
  );
}
