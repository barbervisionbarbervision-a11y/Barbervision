"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import AuthShell from "./AuthShell";
import Button from "@/components/Button";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginReal({ proximo = "/barbeiro/dashboard", aviso = "" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento) {
    evento.preventDefault();
    if (enviando) return;

    setErro("");
    setEnviando(true);

    const supabase = criarClienteSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLocaleLowerCase("pt-BR"),
      password: senha
    });

    if (error) {
      setErro("Não foi possível entrar. Confira e-mail, senha e a confirmação da conta.");
      setEnviando(false);
      return;
    }

    router.replace(proximo);
    router.refresh();
  }

  return (
    <AuthShell
      titulo="Entrar no painel"
      descricao="Use a conta individual enviada pela Barber Vision ou pelo dono da barbearia."
      rodape={
        <>
          Esqueceu a senha?{" "}
          <Link href="/barbeiro/esqueci-senha" className="text-brass hover:underline">
            Recuperar acesso
          </Link>
        </>
      }
    >
      <form onSubmit={entrar} className="flex flex-col gap-4">
        {aviso && (
          <p className="rounded-lg border border-brass/40 bg-brass/10 p-3 text-sm text-parchment" role="status">
            {aviso}
          </p>
        )}
        <div className="flex items-start gap-3 rounded-xl border border-steel/25 bg-black/30 p-4 text-xs leading-relaxed text-steel">
          <LockKeyhole size={17} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />
          <p>O endereço precisa estar confirmado. Donos também concluem o código do aplicativo autenticador.</p>
        </div>

        <label className="text-sm text-steel">
          E-mail
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass"
          />
        </label>

        <label className="text-sm text-steel">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass"
          />
        </label>

        {erro && (
          <p className="rounded-lg border border-barber/50 bg-barber/10 p-3 text-sm text-parchment" role="alert">
            {erro}
          </p>
        )}

        <Button type="submit" disabled={enviando}>
          {enviando ? "Validando..." : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
