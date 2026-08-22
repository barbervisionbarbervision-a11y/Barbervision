"use server";

import { revalidatePath } from "next/cache";
import { exigirDono } from "@/lib/auth/context";
import { obterUrlBaseAplicacao } from "@/lib/auth/site-url";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

function entradaConviteValida({ nome, email }) {
  const nomeLimpo = String(nome ?? "").trim();
  const emailLimpo = String(email ?? "").trim().toLocaleLowerCase("pt-BR");
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo);

  if (nomeLimpo.length < 2 || nomeLimpo.length > 120 || !emailValido || emailLimpo.length > 254) {
    return null;
  }

  return { nome: nomeLimpo, email: emailLimpo };
}

export async function convidarFuncionarioAction(entrada) {
  const validada = entradaConviteValida(entrada ?? {});
  if (!validada) return { ok: false, mensagem: "Informe nome e e-mail válidos." };

  const { sessao } = await exigirDono();
  const supabase = await criarClienteSupabaseServer();
  const { data: conviteId, error: erroCriacao } = await supabase.rpc("criar_convite_funcionario", {
    p_barbearia_id: sessao.barbeariaId,
    p_email: validada.email,
    p_nome: validada.nome
  });

  if (erroCriacao || !conviteId) {
    return {
      ok: false,
      mensagem: "Não foi possível abrir o convite. Confira se já existe um convite ou membro com esse e-mail."
    };
  }

  let admin;
  let redirectTo;
  try {
    admin = criarClienteSupabaseAdmin();
    redirectTo = `${obterUrlBaseAplicacao()}/auth/callback?next=/barbeiro/ativar-conta&convite=${encodeURIComponent(conviteId)}`;
  } catch {
    await supabase.rpc("revogar_convite_barbearia", { p_convite_id: conviteId });
    return {
      ok: false,
      mensagem: "O servidor de convites ainda não está configurado; nenhum convite ficou ativo."
    };
  }

  const { error: erroEnvio } = await admin.auth.admin.inviteUserByEmail(validada.email, {
    redirectTo,
    data: {
      nome: validada.nome,
      barbervision_convite_id: conviteId
    }
  });

  if (erroEnvio) {
    await admin.rpc("marcar_convite_falhou", {
      p_convite_id: conviteId,
      p_codigo_erro: "auth_admin_invite_failed"
    });
    revalidatePath("/barbeiro/equipe");
    return {
      ok: false,
      mensagem: "O convite foi registrado, mas o e-mail não saiu. Tente novamente após revisar o serviço de e-mail."
    };
  }

  const { error: erroMarcacao } = await admin.rpc("marcar_convite_enviado", {
    p_convite_id: conviteId
  });
  if (erroMarcacao) {
    revalidatePath("/barbeiro/equipe");
    return {
      ok: false,
      mensagem: "O e-mail saiu, mas o status não foi confirmado no banco. Não envie outro convite antes da revisão."
    };
  }
  revalidatePath("/barbeiro/equipe");
  return { ok: true, mensagem: "Convite enviado. O funcionário precisa confirmar o e-mail e criar a senha." };
}

export async function revogarConviteAction(conviteId) {
  if (typeof conviteId !== "string" || !/^[0-9a-f-]{36}$/i.test(conviteId)) {
    return { ok: false, mensagem: "Convite inválido." };
  }

  await exigirDono();
  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.rpc("revogar_convite_barbearia", {
    p_convite_id: conviteId
  });

  if (error) return { ok: false, mensagem: "Não foi possível revogar este convite." };
  revalidatePath("/barbeiro/equipe");
  return { ok: true, mensagem: "Convite revogado." };
}
