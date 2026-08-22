import "server-only";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

function montarSessao({ claims, perfil, membro, barbearia }) {
  return {
    id: claims.sub,
    usuarioId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    nome: perfil.nome,
    papel: membro.papel,
    barbeariaId: membro.barbearia_id,
    barbeariaNome: barbearia?.nome ?? "",
    barbeariaSlug: barbearia?.slug ?? "",
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
    origem: "supabase"
  };
}

export async function obterContextoAuth() {
  if (!supabaseEstaConfigurado()) return null;

  const supabase = await criarClienteSupabaseServer();
  const { data: dadosClaims, error: erroClaims } = await supabase.auth.getClaims();
  const claims = erroClaims ? null : dadosClaims?.claims;

  if (!claims?.sub) return null;

  const [resultadoPerfil, resultadoMembros] = await Promise.all([
    supabase
      .from("perfis")
      .select("usuario_id,nome,ativo")
      .eq("usuario_id", claims.sub)
      .maybeSingle(),
    supabase
      .from("membros_barbearia")
      .select("barbearia_id,papel,status,created_at")
      .eq("usuario_id", claims.sub)
      .eq("status", "ativo")
      .order("created_at", { ascending: true })
  ]);

  if (resultadoPerfil.error || resultadoMembros.error) {
    throw new Error("Não foi possível validar o perfil e a membership da conta.");
  }

  const perfil = resultadoPerfil.data;
  const membros = resultadoMembros.data ?? [];

  if (!perfil?.ativo || membros.length === 0) {
    return { claims, sessao: null, motivo: "sem_membership_ativa" };
  }

  // Até o seletor de unidade existir, usa a membership ativa mais antiga.
  // O valor nunca é aceito sem nova validação RLS no servidor.
  const membro = membros[0];

  // A policy do banco bloqueia o domínio do dono em AAL1. Ainda assim, a
  // própria membership permanece legível para que a aplicação reconheça que
  // a conta precisa concluir o TOTP, sem liberar dados da barbearia.
  if (membro.papel === "dono" && claims.aal !== "aal2") {
    return {
      claims,
      sessao: montarSessao({ claims, perfil, membro, barbearia: null }),
      membershipsAtivas: membros.length,
      motivo: "mfa_pendente"
    };
  }

  const { data: barbearia, error: erroBarbearia } = await supabase
    .from("barbearias")
    .select("id,nome,slug,status")
    .eq("id", membro.barbearia_id)
    .eq("status", "ativa")
    .maybeSingle();

  if (erroBarbearia) {
    throw new Error("Não foi possível validar a barbearia da sessão.");
  }

  if (!barbearia) {
    return { claims, sessao: null, motivo: "barbearia_inativa" };
  }

  return {
    claims,
    sessao: montarSessao({ claims, perfil, membro, barbearia }),
    membershipsAtivas: membros.length,
    motivo: null
  };
}

export async function exigirSessaoBarbearia({ permitirAal1DoDono = false } = {}) {
  const contexto = await obterContextoAuth();

  if (!contexto?.claims?.sub) redirect("/barbeiro/login");
  if (!contexto.sessao) redirect("/barbeiro/sem-acesso");

  if (
    contexto.sessao.papel === "dono" &&
    contexto.sessao.aal !== "aal2" &&
    !permitirAal1DoDono
  ) {
    redirect("/barbeiro/mfa");
  }

  return contexto;
}

export async function exigirDono() {
  const contexto = await exigirSessaoBarbearia();
  if (contexto.sessao.papel !== "dono") redirect("/barbeiro/dashboard");
  return contexto;
}
