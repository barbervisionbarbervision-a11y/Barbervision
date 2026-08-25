"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ProgressSteps from "@/components/ProgressSteps";
import TurnstileWidget from "@/components/TurnstileWidget";
import { setFluxo } from "@/lib/clienteFlow";

export default function Cadastro() {
  const router = useRouter();
  const { barbearia } = useParams();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aceiteCadastro, setAceiteCadastro] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  async function continuar(e) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !whatsapp.trim() || !aceiteCadastro || !turnstileToken) return;

    setEnviando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbeariaSlug: barbearia,
          nome,
          email,
          whatsapp,
          aceiteCadastro,
          turnstileToken
        })
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível salvar o cadastro.");

      setFluxo({
        barbeariaSlug: barbearia,
        etapa: "selfie",
        clienteId: resultado.clienteId,
        nome,
        email: email.trim().toLocaleLowerCase("pt-BR"),
        whatsapp,
        codigoIndicacao: codigoIndicacao.trim() || null
      });
      router.push(`/b/${encodeURIComponent(barbearia)}/selfie`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o cadastro.");
      setTurnstileResetKey((valor) => valor + 1);
      setEnviando(false);
    }
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

        <label className="flex items-start gap-3 text-sm text-steel leading-relaxed">
          <input
            type="checkbox"
            checked={aceiteCadastro}
            onChange={(e) => setAceiteCadastro(e.target.checked)}
            required
            className="mt-1 h-4 w-4 accent-brass"
          />
          <span>
            Li e autorizo o uso dos dados acima para meu cadastro e para continuar esta experiência.
            Este aceite não autoriza mensagens de marketing nem o armazenamento da selfie.
          </span>
        </label>

        <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />

        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}

        <Button type="submit" disabled={enviando || !aceiteCadastro || !turnstileToken} className="mt-4">
          {enviando ? "Salvando..." : "Continuar"}
        </Button>
      </form>
    </main>
  );
}
