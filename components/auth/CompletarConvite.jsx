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

function conviteSeguro(valor) {
  return typeof valor === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
    ? valor
    : "";
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
      const erroCodigo = fragmento.get("error_code") || parametros.get("error_code");

      if (!accessToken || !refreshToken) {
        window.history.replaceState(null, "", window.location.pathname);
        if (ativo) {
          setErro(erroCodigo === "otp_expired"
            ? "Este link expirou ou já foi utilizado. Solicite um novo e-mail e abra somente a mensagem mais recente."
            : "Este link é inválido. Solicite um novo e-mail.");
        }
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

      const { data: usuarioAtual, error: erroUsuario } = await supabase.auth.getUser();
      if (erroUsuario) {
        if (ativo) setErro("Não foi possível validar os dados desta conta. Solicite um novo e-mail.");
        return;
      }

      const conviteId = conviteSeguro(parametros.get("convite"))
        || conviteSeguro(usuarioAtual.user?.user_metadata?.barbervision_convite_id);
      if (conviteId) {
        const { error: erroConvite } = await supabase.rpc("aceitar_convite_barbearia", {
          p_convite_id: conviteId
        });

        if (erroConvite) {
          if (ativo) setErro("Não foi possível associar esta conta à barbearia. Solicite um novo convite.");
          return;
        }
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
