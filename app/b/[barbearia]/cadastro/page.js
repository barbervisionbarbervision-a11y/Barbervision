"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ProgressSteps from "@/components/ProgressSteps";
import { setFluxo } from "@/lib/clienteFlow";

export default function Cadastro() {
  const router = useRouter();
  const { barbearia } = useParams();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState("");

  function continuar(e) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !whatsapp.trim()) return;
    // Fase futura: gravar cliente na tabela `clientes` do Supabase aqui, e
    // creditar a indicação para quem tem esse código, se preenchido.
    setFluxo({
      barbeariaSlug: barbearia,
      etapa: "selfie",
      nome,
      email: email.trim().toLocaleLowerCase("pt-BR"),
      whatsapp,
      codigoIndicacao: codigoIndicacao.trim() || null
    });
    router.push(`/b/${barbearia}/selfie`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 bg-ink">
      <Logo size="md" />
      <ProgressSteps atual={2} />

      <form onSubmit={continuar} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment text-center mb-2">
          Antes de começar
        </h1>

        <label className="text-sm text-steel">
          Nome
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Seu nome completo"
            className="mt-1 w-full bg-white/5 border border-steel/30 rounded-lg px-4 py-3 text-parchment placeholder:text-steel/60 focus:border-brass outline-none"
          />
        </label>

        <label className="text-sm text-steel">
          E-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="voce@exemplo.com"
            className="mt-1 w-full bg-white/5 border border-steel/30 rounded-lg px-4 py-3 text-parchment placeholder:text-steel/60 focus:border-brass outline-none"
          />
        </label>

        <label className="text-sm text-steel">
          WhatsApp
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
            placeholder="(00) 00000-0000"
            className="mt-1 w-full bg-white/5 border border-steel/30 rounded-lg px-4 py-3 text-parchment placeholder:text-steel/60 focus:border-brass outline-none"
          />
        </label>

        <label className="text-sm text-steel">
          Código de indicação <span className="text-steel/50">(opcional)</span>
          <input
            value={codigoIndicacao}
            onChange={(e) => setCodigoIndicacao(e.target.value)}
            placeholder="Ex: BARBER-CARL1"
            className="mt-1 w-full bg-white/5 border border-steel/30 rounded-lg px-4 py-3 text-parchment placeholder:text-steel/60 focus:border-brass outline-none"
          />
        </label>

        <Button type="submit" className="mt-4">Continuar</Button>
      </form>
    </main>
  );
}
