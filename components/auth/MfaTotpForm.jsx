"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import AuthShell from "./AuthShell";
import Button from "@/components/Button";
import SairButton from "./SairButton";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

export default function MfaTotpForm() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [modo, setModo] = useState("enrollment");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [segredo, setSegredo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function preparar() {
      const supabase = criarClienteSupabaseBrowser();
      const nivel = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (!ativo) return;
      if (nivel.error) {
        setErro("Não foi possível verificar o segundo fator.");
        setCarregando(false);
        return;
      }

      if (nivel.data.currentLevel === "aal2") {
        router.replace("/barbeiro/dashboard");
        router.refresh();
        return;
      }

      const fatores = await supabase.auth.mfa.listFactors();
      if (!ativo) return;

      if (fatores.error) {
        setErro("Não foi possível carregar o aplicativo autenticador.");
        setCarregando(false);
        return;
      }

      const verificado = fatores.data.totp[0];
      if (verificado) {
        setModo("challenge");
        setFactorId(verificado.id);
        setCarregando(false);
        return;
      }

      const incompletos = fatores.data.all.filter(
        (fator) => fator.factor_type === "totp" && fator.status !== "verified"
      );
      await Promise.all(incompletos.map((fator) => supabase.auth.mfa.unenroll({ factorId: fator.id })));

      const enrollment = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Barber Vision"
      });

      if (!ativo) return;
      if (enrollment.error) {
        setErro("Não foi possível iniciar o cadastro do autenticador.");
        setCarregando(false);
        return;
      }

      setFactorId(enrollment.data.id);
      setQrCode(enrollment.data.totp.qr_code);
      setSegredo(enrollment.data.totp.secret);
      setCarregando(false);
    }

    preparar();
    return () => {
      ativo = false;
    };
  }, [router]);

  async function confirmar(evento) {
    evento.preventDefault();
    if (verificando || codigo.trim().length !== 6) return;

    setErro("");
    setVerificando(true);
    const supabase = criarClienteSupabaseBrowser();
    const desafio = await supabase.auth.mfa.challenge({ factorId });

    if (desafio.error) {
      setErro("Não foi possível iniciar a validação. Tente novamente.");
      setVerificando(false);
      return;
    }

    const verificacao = await supabase.auth.mfa.verify({
      factorId,
      challengeId: desafio.data.id,
      code: codigo.trim()
    });

    if (verificacao.error) {
      setErro("Código inválido ou expirado. Confira o aplicativo e tente novamente.");
      setCodigo("");
      setVerificando(false);
      return;
    }

    router.replace("/barbeiro/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      titulo={modo === "challenge" ? "Confirmar segundo fator" : "Proteger conta do dono"}
      descricao={
        modo === "challenge"
          ? "Digite o código atual do seu aplicativo autenticador."
          : "Escaneie o QR Code no Google Authenticator ou em outro aplicativo TOTP."
      }
    >
      {carregando ? (
        <p className="text-center text-sm text-steel" role="status">Preparando autenticação...</p>
      ) : (
        <form onSubmit={confirmar} className="flex flex-col gap-4">
          {modo === "enrollment" && qrCode && (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-parchment p-4 text-ink">
              {/* O Supabase gera este QR Code como data:image/svg+xml, formato intencionalmente bloqueado por next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code para configurar o autenticador" width={220} height={220} />
              <p className="text-center text-xs">Se não puder escanear, use esta chave:</p>
              <code className="max-w-full break-all rounded bg-black/10 px-2 py-1 text-center text-xs">{segredo}</code>
            </div>
          )}

          <label className="text-sm text-steel">
            Código de 6 dígitos
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-center text-xl tracking-[0.35em] text-parchment outline-none focus:border-brass"
            />
          </label>

          {erro && (
            <p className="rounded-lg border border-barber/50 bg-barber/10 p-3 text-sm text-parchment" role="alert">
              {erro}
            </p>
          )}

          <Button type="submit" disabled={verificando || codigo.length !== 6}>
            <span className="flex items-center justify-center gap-2">
              <ShieldCheck size={18} /> {verificando ? "Validando..." : "Confirmar código"}
            </span>
          </Button>
          <SairButton />
        </form>
      )}
    </AuthShell>
  );
}
