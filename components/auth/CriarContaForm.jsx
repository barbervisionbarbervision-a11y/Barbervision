"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "./AuthShell";
import Button from "@/components/Button";

function criarSlug(valor) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function CriarContaForm() {
  const [dados, setDados] = useState({ nome: "", barbearia: "", slug: "", email: "", website: "" });
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function alterar(campo, valor) {
    setDados((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === "barbearia" && !atual.slug ? { slug: criarSlug(valor) } : {})
    }));
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
      setConcluido(true);
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
      {concluido ? (
        <div className="rounded-xl border border-brass/35 bg-brass/10 p-4 text-sm leading-relaxed text-parchment" role="status">
          Cadastro iniciado. Abra o e-mail enviado pela Barber Vision para confirmar sua conta e definir a senha. Verifique também o spam.
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <label className="text-sm text-steel">Seu nome
            <input required minLength={2} maxLength={120} autoComplete="name" value={dados.nome} onChange={(e) => alterar("nome", e.target.value)} className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass" />
          </label>
          <label className="text-sm text-steel">Nome da barbearia
            <input required minLength={2} maxLength={120} autoComplete="organization" value={dados.barbearia} onChange={(e) => alterar("barbearia", e.target.value)} className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass" />
          </label>
          <label className="text-sm text-steel">Endereço público
            <div className="mt-1 flex items-center rounded-lg border border-steel/30 bg-black/40 focus-within:border-brass">
              <span className="pl-4 text-xs text-steel">/b/</span>
              <input required minLength={3} maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={dados.slug} onChange={(e) => alterar("slug", criarSlug(e.target.value))} className="min-w-0 flex-1 bg-transparent px-2 py-3 text-parchment outline-none" />
            </div>
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
