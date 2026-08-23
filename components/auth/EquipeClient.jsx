"use client";

import { useState } from "react";
import { MailPlus, PauseCircle, PlayCircle, UserRoundCheck, XCircle } from "lucide-react";
import Button from "@/components/Button";
import {
  convidarFuncionarioAction,
  alterarStatusFuncionarioAction,
  revogarConviteAction
} from "@/app/barbeiro/(painel)/equipe/actions";

const ROTULOS_STATUS = {
  pendente_envio: "Preparando envio",
  enviado: "Aguardando aceite",
  aceito: "Aceito",
  revogado: "Revogado",
  expirado: "Expirado",
  falhou: "Falha no envio"
};

const ROTULOS_MEMBRO = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  revogado: "Revogado"
};

export default function EquipeClient({ membros, convites, modoDemo = false }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  async function convidar(evento) {
    evento.preventDefault();
    if (processando) return;

    setProcessando(true);
    setMensagem(null);
    const resultado = await convidarFuncionarioAction({ nome, email });
    setMensagem(resultado);
    if (resultado.ok) {
      setNome("");
      setEmail("");
    }
    setProcessando(false);
  }

  async function revogar(id) {
    setProcessando(true);
    setMensagem(await revogarConviteAction(id));
    setProcessando(false);
  }

  async function alterarFuncionario(usuarioId, comando) {
    if (processando) return;
    if (comando === "revogar" && !window.confirm("Revogar este funcionário definitivamente? As atribuições atuais serão removidas.")) return;

    setProcessando(true);
    setMensagem(await alterarStatusFuncionarioAction({ usuarioId, comando }));
    setProcessando(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Equipe</h1>
        <p className="mt-1 text-sm text-steel">Convide contas individuais; nunca compartilhe a senha do dono.</p>
      </div>

      <section className="rounded-xl border border-steel/20 bg-white/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-widest2 text-parchment">
          <MailPlus size={18} className="text-brass" /> Convidar funcionário
        </h2>
        {modoDemo && (
          <p className="mt-4 rounded-lg border border-brass/35 bg-brass/10 p-3 text-sm text-parchment">
            No fallback demonstrativo, o envio fica desativado. Configure o Supabase e a chave secreta do servidor para convidar contas reais.
          </p>
        )}
        <form onSubmit={convidar} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-sm text-steel">
            Nome
            <input
              required
              disabled={modoDemo}
              minLength={2}
              maxLength={120}
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass"
            />
          </label>
          <label className="text-sm text-steel">
            E-mail
            <input
              type="email"
              required
              disabled={modoDemo}
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-black/40 px-4 py-3 text-parchment outline-none focus:border-brass"
            />
          </label>
          <Button type="submit" disabled={processando || modoDemo}>
            {processando ? "Processando..." : "Enviar convite"}
          </Button>
        </form>
        {mensagem && (
          <p
            className={`mt-4 rounded-lg border p-3 text-sm ${mensagem.ok ? "border-brass/40 bg-brass/10" : "border-barber/50 bg-barber/10"}`}
            role="status"
          >
            {mensagem.mensagem}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-steel/20 bg-white/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-widest2 text-parchment">
          <UserRoundCheck size={18} className="text-brass" /> Membros da equipe
        </h2>
        <div className="mt-4 divide-y divide-steel/15">
          {membros.map((membro) => (
            <div key={membro.usuarioId} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-parchment">{membro.nome}</p>
                <p className="text-xs uppercase tracking-widest2 text-steel">{membro.papel === "dono" ? "Dono" : "Funcionário"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brass/30 px-3 py-1 text-xs text-brass">
                  {ROTULOS_MEMBRO[membro.status] ?? membro.status}
                </span>
                {!modoDemo && membro.papel === "funcionario" && membro.status === "ativo" && (
                  <button type="button" disabled={processando} onClick={() => alterarFuncionario(membro.usuarioId, "suspender")} className="flex items-center gap-2 rounded-lg border border-brass/40 px-3 py-2 text-xs text-parchment hover:bg-brass/10 disabled:opacity-50">
                    <PauseCircle size={15} /> Suspender
                  </button>
                )}
                {!modoDemo && membro.papel === "funcionario" && membro.status === "suspenso" && (
                  <button type="button" disabled={processando} onClick={() => alterarFuncionario(membro.usuarioId, "reativar")} className="flex items-center gap-2 rounded-lg border border-brass/40 px-3 py-2 text-xs text-parchment hover:bg-brass/10 disabled:opacity-50">
                    <PlayCircle size={15} /> Reativar
                  </button>
                )}
                {!modoDemo && membro.papel === "funcionario" && membro.status !== "revogado" && (
                  <button type="button" disabled={processando} onClick={() => alterarFuncionario(membro.usuarioId, "revogar")} className="flex items-center gap-2 rounded-lg border border-barber/50 px-3 py-2 text-xs text-parchment hover:bg-barber/10 disabled:opacity-50">
                    <XCircle size={15} /> Revogar funcionário
                  </button>
                )}
              </div>
            </div>
          ))}
          {membros.length === 0 && <p className="py-4 text-sm text-steel">Nenhum membro registrado.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-steel/20 bg-white/5 p-5">
        <h2 className="font-display text-sm uppercase tracking-widest2 text-parchment">Convites recentes</h2>
        <div className="mt-4 divide-y divide-steel/15">
          {convites.map((convite) => {
            const podeRevogar = convite.status === "enviado" || convite.status === "pendente_envio";
            return (
              <div key={convite.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-parchment">{convite.nome}</p>
                  <p className="text-xs text-steel">{convite.email}</p>
                  <p className="mt-1 text-xs text-brass">{ROTULOS_STATUS[convite.status] ?? convite.status}</p>
                </div>
                {podeRevogar && (
                  <button
                    type="button"
                    disabled={processando}
                    onClick={() => revogar(convite.id)}
                    className="flex items-center gap-2 self-start rounded-lg border border-barber/50 px-3 py-2 text-xs text-parchment hover:bg-barber/10 disabled:opacity-50"
                  >
                    <XCircle size={15} /> Revogar
                  </button>
                )}
              </div>
            );
          })}
          {convites.length === 0 && <p className="py-4 text-sm text-steel">Nenhum convite registrado.</p>}
        </div>
      </section>
    </div>
  );
}
