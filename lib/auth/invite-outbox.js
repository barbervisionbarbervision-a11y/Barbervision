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

async function localizarUsuarioPorEmail(admin, email) {
  for (let pagina = 1; pagina <= 10; pagina += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) return { usuario: null, error };
    const usuario = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (usuario) return { usuario, error: null };
    if (data.users.length < 1000) break;
  }
  return { usuario: null, error: new Error("Usuário existente não localizado.") };
}

async function enviarOuReenviarConvite(admin, item, redirectTo) {
  const dados = {
    nome: item.nome,
    barbervision_convite_id: item.convite_id,
    barbervision_barbearia_id: item.barbearia_id,
    barbervision_papel: "funcionario"
  };
  const envio = await admin.auth.admin.inviteUserByEmail(item.email, { redirectTo, data: dados });
  if (!usuarioJaExiste(envio.error)) return envio;

  const localizado = await localizarUsuarioPorEmail(admin, item.email);
  if (!localizado.usuario) return { data: null, error: localizado.error };

  const atualizacao = await admin.auth.admin.updateUserById(localizado.usuario.id, {
    user_metadata: { ...localizado.usuario.user_metadata, ...dados }
  });
  if (atualizacao.error) return atualizacao;

  return admin.auth.signInWithOtp({
    email: item.email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo }
  });
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
    const envio = await enviarOuReenviarConvite(admin, item, redirectTo);
    const sucesso = !envio.error;
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
