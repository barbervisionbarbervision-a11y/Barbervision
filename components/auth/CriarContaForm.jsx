"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "./AuthShell";
import Button from "@/components/Button";

export default function CriarContaForm() {
  const [dados, setDados] = useState({ nome: "", barbearia: "", email: "", website: "" });
  const [erro, setErro] = useState("");
  const [linkCriado, setLinkCriado] = useState("");
  const [enviando, setEnviando] = useState(false);

  function alterar(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setErro("");
    setEnviando(true);

    try {
      const resposta = await fetch("/api/donos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado?.erro || "Não foi possível criar a conta agora.");
      setLinkCriado(resultado?.link || window.location.origin);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar a conta agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthShell
      titulo="Crie sua barbearia"
      descricao="Cadastre a primeira conta de dono. Você receberá um e-mail para confirmar o endereço e definir sua senha."
      rodape={<Link href="/barbeiro/login" className="text-brass hover:underline">Já tenho conta</Link>}
    >
      {linkCriado ? (
        <div className="rounded-xl border border-brass/35 bg-brass/10 p-4 text-sm leading-relaxed text-parchment" role="status">
          <p>Cadastro iniciado. Abra o e-mail enviado pela Barber Vision para confirmar sua conta e definir a senha. Verifique também o spam.</p>
          <p className="mt-3 break-all text-brass">Sua página: {linkCriado}</p>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <label className="text-sm text-steel">Seu nome
            <input required minLength={2} maxLength={120} autoComplete="name" value={dados.nome} onChange={(e) => alterar("nome", e.target.value)} className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass" />
          </label>
          <label className="text-sm text-steel">Qual é o nome da barbearia?
            <input required minLength={2} maxLength={120} autoComplete="organization" value={dados.barbearia} onChange={(e) => alterar("barbearia", e.target.value)} className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass" />
            <span className="mt-2 block text-xs leading-relaxed text-steel">Sua página no Barber Vision será criada automaticamente. Você não precisa ter um site.</span>
          </label>
          <label className="text-sm text-steel">E-mail
            <input required type="email" maxLength={254} autoComplete="email" value={dados.email} onChange={(e) => alterar("email", e.target.value)} className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass" />
          </label>
          <label className="hidden" aria-hidden="true">Website
            <input tabIndex={-1} autoComplete="off" value={dados.website} onChange={(e) => alterar("website", e.target.value)} />
          </label>
          {erro && <p className="rounded-lg border border-barber/50 bg-barber/10 p-3 text-sm text-parchment" role="alert">{erro}</p>}
          <Button type="submit" disabled={enviando}>{enviando ? "Criando..." : "Criar conta"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
