"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "./AuthShell";
import Button from "@/components/Button";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

export default function DefinirSenhaForm({ ativacao = false }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar(evento) {
    evento.preventDefault();
    if (enviando) return;

    if (senha.length < 10) {
      setErro("Use pelo menos 10 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      setErro("As duas senhas precisam ser iguais.");
      return;
    }

    setErro("");
    setEnviando(true);
    const { error } = await criarClienteSupabaseBrowser().auth.updateUser({ password: senha });

    if (error) {
      setErro("Não foi possível salvar a senha. Solicite um novo link e tente novamente.");
      setEnviando(false);
      return;
    }

    router.replace("/barbeiro/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      titulo={ativacao ? "Ativar minha conta" : "Criar nova senha"}
      descricao={
        ativacao
          ? "Defina sua senha individual para concluir o convite."
          : "A nova senha será aplicada à sua conta confirmada."
      }
    >
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <label className="text-sm text-steel">
          Nova senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass"
          />
        </label>
        <label className="text-sm text-steel">
          Repetir nova senha
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass"
          />
        </label>
        {erro && (
          <p className="rounded-lg border border-barber/50 bg-barber/10 p-3 text-sm text-parchment" role="alert">
            {erro}
          </p>
        )}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : ativacao ? "Ativar conta" : "Salvar nova senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
