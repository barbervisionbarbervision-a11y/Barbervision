"use server";

import { revalidatePath } from "next/cache";
import { exigirDono } from "@/lib/auth/context";
import { processarConvitesEmail } from "@/lib/auth/invite-outbox";
import { obterUrlBaseAplicacao } from "@/lib/auth/site-url";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

function entradaConviteValida({ nome, email }) {
  const nomeLimpo = String(nome ?? "").trim();
  const emailLimpo = String(email ?? "").trim().toLocaleLowerCase("pt-BR");
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo);
  if (nomeLimpo.length < 2 || nomeLimpo.length > 120 || !emailValido || emailLimpo.length > 254) return null;
  return { nome: nomeLimpo, email: emailLimpo };
}

async function lerEstadoConvite(cliente, conviteId, barbeariaId) {
  const { data, error } = await cliente.from("convites_barbearia").select("status")
    .eq("id", conviteId).eq("barbearia_id", barbeariaId).maybeSingle();
  if (error || !data?.status) {
    console.error("[equipe] não foi possível confirmar o estado do convite", {
      codigo: error?.code ?? null,
      conviteId
    });
    return null;
  }
  return data.status;
}

async function executarTransicaoEConfirmar({ cliente, rpc, argumentos, conviteId, barbeariaId }) {
  const { error } = await cliente.rpc(rpc, argumentos);
  const status = await lerEstadoConvite(cliente, conviteId, barbeariaId);
  if (error) {
    console.error("[equipe] transição de convite retornou erro", {
      codigo: error.code ?? null,
      conviteId,
      rpc,
      statusConfirmado: status
    });
  }
  return { status };
}

export async function convidarFuncionarioAction(entrada) {
  const validada = entradaConviteValida(entrada ?? {});
  if (!validada) return { ok: false, mensagem: "Informe nome e e-mail válidos." };

  try {
    criarClienteSupabaseAdmin();
    obterUrlBaseAplicacao();
  } catch {
    return { ok: false, mensagem: "O servidor de convites ainda não está configurado." };
  }

  const { sessao } = await exigirDono();
  const supabase = await criarClienteSupabaseServer();
  const { data: conviteId, error: erroCriacao } = await supabase.rpc("criar_convite_funcionario", {
    p_barbearia_id: sessao.barbeariaId,
    p_email: validada.email,
    p_nome: validada.nome
  });
  if (erroCriacao || !conviteId) {
    return { ok: false, mensagem: "Não foi possível abrir o convite. Confira se já existe um convite ou membro com esse e-mail." };
  }

  let resultados;
  try {
    resultados = await processarConvitesEmail({ limite: 10 });
  } catch (error) {
    console.error("[invite-outbox] tentativa imediata falhou", {
      mensagem: error instanceof Error ? error.message : "erro"
    });
  }
  revalidatePath("/barbeiro/equipe");
  const entrega = resultados?.find((item) => item.status === "enviado");
  if (!entrega) {
    return {
      ok: false,
      statusConvite: "falhou",
      mensagem: "O convite foi registrado, mas o e-mail não pôde ser enviado agora. Aguarde um minuto e tente novamente."
    };
  }
  return {
    ok: true,
    statusConvite: "enviado",
    mensagem: "Convite enviado. Peça para a pessoa abrir somente o e-mail mais recente."
  };
}

export async function revogarConviteAction(conviteId) {
  if (typeof conviteId !== "string" || !/^[0-9a-f-]{36}$/i.test(conviteId)) {
    return { ok: false, mensagem: "Convite inválido." };
  }
  const { sessao } = await exigirDono();
  const supabase = await criarClienteSupabaseServer();
  const confirmacao = await executarTransicaoEConfirmar({
    cliente: supabase,
    rpc: "revogar_convite_barbearia",
    argumentos: { p_convite_id: conviteId },
    conviteId,
    barbeariaId: sessao.barbeariaId
  });
  revalidatePath("/barbeiro/equipe");
  if (confirmacao.status === "revogado") {
    return { ok: true, statusConvite: confirmacao.status, mensagem: "Convite revogado." };
  }
  if (confirmacao.status === "expirado") {
    return { ok: true, statusConvite: confirmacao.status, mensagem: "O convite já estava expirado e foi reconciliado como expirado." };
  }
  return {
    ok: false,
    statusConvite: confirmacao.status,
    mensagem: "Não foi possível confirmar que este convite deixou de estar ativo. Recarregue a equipe antes de tentar novamente."
  };
}

const COMANDOS_FUNCIONARIO = {
  suspender: { rpc: "suspender_funcionario", sucesso: "Funcionário suspenso. O acesso foi interrompido." },
  reativar: { rpc: "reativar_funcionario", sucesso: "Funcionário reativado. O acesso foi restaurado." },
  revogar: { rpc: "revogar_funcionario", sucesso: "Funcionário revogado. O acesso foi encerrado definitivamente." }
};

export async function alterarStatusFuncionarioAction({ usuarioId, comando } = {}) {
  const configuracao = COMANDOS_FUNCIONARIO[comando];
  if (!configuracao || typeof usuarioId !== "string" || !/^[0-9a-f-]{36}$/i.test(usuarioId)) {
    return { ok: false, mensagem: "Comando de funcionário inválido." };
  }
  const { sessao } = await exigirDono();
  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.rpc(configuracao.rpc, {
    p_barbearia_id: sessao.barbeariaId,
    p_usuario_id: usuarioId
  });
  if (error) {
    console.error("[equipe] falha no lifecycle do funcionário", { codigo: error.code ?? null, comando });
    return { ok: false, mensagem: "Não foi possível atualizar este funcionário. Recarregue a equipe e tente novamente." };
  }
  revalidatePath("/barbeiro/equipe");
  return { ok: true, mensagem: configuracao.sucesso };
}
