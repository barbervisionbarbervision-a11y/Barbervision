"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import Button from "@/components/Button";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

export default function SegurancaConta({ sessao }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState("");

  async function sairDeTodos() {
    if (saindo) return;
    setErroSaida("");
    setSaindo(true);
    const { error } = await criarClienteSupabaseBrowser().auth.signOut({ scope: "global" });
    if (error) {
      setErroSaida("Não foi possível encerrar todas as sessões. Tente novamente antes de considerar a conta protegida.");
      setSaindo(false);
      return;
    }
    router.replace("/barbeiro/login");
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Segurança da conta</h1>
        <p className="mt-1 text-sm text-steel">Sessão validada para {sessao.email || "esta conta"}.</p>
      </div>

      <section className="rounded-xl border border-steel/20 bg-white/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 text-brass" size={20} />
          <div>
            <h2 className="font-semibold text-parchment">Segundo fator</h2>
            <p className="mt-1 text-sm text-steel">
              {sessao.papel === "dono"
                ? "O painel do dono exige uma sessão TOTP no nível AAL2."
                : "O segundo fator do funcionário ainda não é obrigatório nesta etapa."}
            </p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-brass/30 px-3 py-1 text-xs text-brass">
              <KeyRound size={13} /> Sessão {sessao.aal.toUpperCase()}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-barber/30 bg-barber/5 p-5">
        <h2 className="font-semibold text-parchment">Encerrar todas as sessões</h2>
        <p className="mt-1 text-sm text-steel">
          Use se perdeu um aparelho ou suspeita de acesso indevido. Será necessário entrar novamente em todos os dispositivos.
        </p>
        <Button type="button" variant="danger" className="mt-4" onClick={sairDeTodos} disabled={saindo}>
          <span className="flex items-center gap-2"><LogOut size={17} /> {saindo ? "Encerrando..." : "Sair de todos os aparelhos"}</span>
        </Button>
        {erroSaida && <p className="mt-3 text-sm text-parchment" role="alert">{erroSaida}</p>}
      </section>
    </div>
  );
}
