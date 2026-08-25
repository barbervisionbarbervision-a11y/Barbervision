"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "./AuthShell";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

function destinoSeguro(valor) {
  return typeof valor === "string" && valor.startsWith("/barbeiro/") && !valor.startsWith("//")
    ? valor
    : "/barbeiro/ativar-conta";
}

export default function CompletarConvite() {
  const router = useRouter();
  const parametros = useSearchParams();
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function concluir() {
      const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = fragmento.get("access_token");
      const refreshToken = fragmento.get("refresh_token");

      if (!accessToken || !refreshToken) {
        if (ativo) setErro("Este link é inválido ou já expirou. Solicite um novo cadastro.");
        return;
      }

      const supabase = criarClienteSupabaseBrowser();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

      if (error) {
        if (ativo) setErro("Não foi possível confirmar este acesso. Solicite um novo e-mail.");
        return;
      }

      router.replace(destinoSeguro(parametros.get("next")));
      router.refresh();
    }

    concluir();
    return () => { ativo = false; };
  }, [parametros, router]);

  return (
    <AuthShell titulo="Confirmando sua conta" descricao="Estamos validando seu e-mail com segurança.">
      {erro ? (
        <p className="rounded-lg border border-barber/50 bg-barber/10 p-4 text-sm text-parchment" role="alert">{erro}</p>
      ) : (
        <p className="rounded-lg border border-brass/35 bg-brass/10 p-4 text-center text-sm text-parchment" role="status">Aguarde um instante...</p>
      )}
    </AuthShell>
  );
}
