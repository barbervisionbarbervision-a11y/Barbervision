"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "./AuthShell";
import Button from "@/components/Button";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

export default function RecuperarSenhaForm() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando) return;

    setEnviando(true);
    const supabase = criarClienteSupabaseBrowser();
    await supabase.auth.resetPasswordForEmail(email.trim().toLocaleLowerCase("pt-BR"), {
      redirectTo: `${window.location.origin}/auth/callback?next=/barbeiro/redefinir-senha`
    });
    setConcluido(true);
    setEnviando(false);
  }

  return (
    <AuthShell
      titulo="Recuperar acesso"
      descricao="Enviaremos as instruções ao endereço informado quando ele pertencer a uma conta."
      rodape={
        <Link href="/barbeiro/login" className="text-brass hover:underline">
          Voltar ao login
        </Link>
      }
    >
      {concluido ? (
        <div className="rounded-xl border border-brass/35 bg-brass/10 p-4 text-sm leading-relaxed text-parchment" role="status">
          Se existir uma conta para esse endereço, o e-mail de recuperação será enviado. Verifique também a pasta de spam.
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <label className="text-sm text-steel">
            E-mail da conta
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass"
            />
          </label>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Solicitando..." : "Enviar instruções"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
