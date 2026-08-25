import "server-only";

import { randomUUID } from "node:crypto";
import { obterUrlBaseAplicacao } from "./site-url";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

function erroRetentavel(erro) {
  const status = Number(erro?.status ?? 0);
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function codigoErro(erro) {
  const codigo = String(erro?.code || `auth_${erro?.status || "unknown"}`)
    .toLowerCase().replace(/[^a-z0-9._-]+/g, "_").slice(0, 120);
  return /^[a-z0-9]/.test(codigo) ? codigo : "auth_unknown";
}

function usuarioJaExiste(erro) {
  const texto = `${erro?.code ?? ""} ${erro?.message ?? ""}`.toLowerCase();
  return Number(erro?.status) === 422 && (texto.includes("already") || texto.includes("exists") || texto.includes("registered"));
}

export async function processarConvitesEmail({ limite = 10 } = {}) {
  const admin = criarClienteSupabaseAdmin();
  const workerId = randomUUID();
  const { data: itens, error } = await admin.rpc("reivindicar_convites_email", {
    p_worker_id: workerId,
    p_limite: limite
  });
  if (error) throw new Error("Não foi possível reivindicar a outbox de convites.");

  const redirectBase = obterUrlBaseAplicacao();
  const resultados = [];
  for (const item of itens ?? []) {
    // A tela de conclusao ja usa /barbeiro/ativar-conta como destino padrao.
    // Uma unica query evita perda de parametros durante o redirecionamento.
    const redirectTo = `${redirectBase}/auth/complete?convite=${encodeURIComponent(item.convite_id)}`;
    const envio = await admin.auth.admin.inviteUserByEmail(item.email, {
      redirectTo,
      data: { nome: item.nome, barbervision_convite_id: item.convite_id }
    });
    // Se a primeira entrega venceu após o Auth aceitar o convite, o retry pode
    // receber "usuário já existe". A partir da segunda tentativa isso confirma
    // o efeito anterior; na primeira tentativa continua sendo conflito real.
    const sucesso = !envio.error || (item.tentativa > 1 && usuarioJaExiste(envio.error));
    const { data: status, error: erroConclusao } = await admin.rpc("concluir_convite_email", {
      p_outbox_id: item.outbox_id,
      p_worker_id: workerId,
      p_sucesso: sucesso,
      p_retentavel: sucesso ? false : erroRetentavel(envio.error),
      p_codigo_erro: sucesso ? null : codigoErro(envio.error)
    });
    if (erroConclusao) {
      console.error("[invite-outbox] falha ao concluir item", {
        codigo: erroConclusao.code ?? null,
        outboxId: item.outbox_id
      });
    }
    resultados.push({ outboxId: item.outbox_id, status: erroConclusao ? "inconsistente" : status });
  }
  return resultados;
}
