"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import AuthShell from "./AuthShell";
import Button from "@/components/Button";
import { equipeExemplo } from "@/lib/mockData";
import { setSessaoBarbeiroDemo } from "@/lib/barbeiroSession";

export default function LoginDemo() {
  const router = useRouter();
  const [quemEntra, setQuemEntra] = useState(equipeExemplo[0].id);

  function entrar(evento) {
    evento.preventDefault();
    const personagem = equipeExemplo.find((pessoa) => pessoa.id === quemEntra);
    setSessaoBarbeiroDemo(personagem);
    router.push("/barbeiro/dashboard");
  }

  return (
    <AuthShell
      titulo="Painel demonstrativo"
      descricao="Fallback local ativo porque este ambiente ainda não possui as chaves públicas do Supabase."
    >
      <form onSubmit={entrar} className="flex flex-col gap-4">
        <div className="rounded-xl border border-brass/35 bg-brass/10 p-4" role="note">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 shrink-0 text-brass" size={18} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-parchment">Demonstração sem autenticação</p>
              <p className="mt-1 text-xs leading-relaxed text-steel">
                Use apenas personagens e dados fictícios. Esta seleção não protege identidade, papel ou dados.
              </p>
            </div>
          </div>
        </div>

        <label className="text-sm text-steel">
          Quem está entrando?
          <select
            value={quemEntra}
            onChange={(evento) => setQuemEntra(evento.target.value)}
            className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-4 py-3 text-parchment outline-none focus:border-brass"
          >
            {equipeExemplo.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome} — {pessoa.papel === "dono" ? "dono" : "barbeiro"}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Entrar na demonstração</Button>
      </form>
    </AuthShell>
  );
}
