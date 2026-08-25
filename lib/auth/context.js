import "server-only";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

function metadadosBarberVision(claims) {
  const metadados = claims?.user_metadata;
  return metadados && typeof metadados === "object" ? metadados : {};
}

function selecionarMembership({ claims, membros }) {
  const metadados = metadadosBarberVision(claims);
  const barbeariaDoConvite = typeof metadados.barbervision_barbearia_id === "string"
    ? metadados.barbervision_barbearia_id
    : "";
  const possuiConvite = typeof metadados.barbervision_convite_id === "string"
    && metadados.barbervision_convite_id.length > 0;

  // Metadados apenas indicam qual membership real deve ser usada. Papel e
  // status continuam vindo exclusivamente do banco sob RLS.
  if (barbeariaDoConvite) {
    const membershipDoConvite = membros.find((membro) => (
      membro.barbearia_id === barbeariaDoConvite && membro.papel === "funcionario"
    ));
    if (membershipDoConvite) return membershipDoConvite;
  }

  // Compatibilidade com convites antigos que ainda não gravavam o tenant.
  if (possuiConvite) {
    const membershipDeFuncionario = [...membros]
      .reverse()
      .find((membro) => membro.papel === "funcionario");
    if (membershipDeFuncionario) return membershipDeFuncionario;
  }

  return membros[0];
}

function montarSessao({ claims, perfil, membro, barbearia }) {
  const metadados = metadadosBarberVision(claims);
  const nomeDoConvite = membro.papel === "funcionario" && typeof metadados.nome === "string"
    ? metadados.nome.trim()
    : "";

  return {
    id: claims.sub,
    usuarioId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    nome: nomeDoConvite || perfil.nome,
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
    console.error("[auth-context] falha ao consultar bootstrap da sessão", {
      membros: resultadoMembros.error?.code ?? null,
      perfil: resultadoPerfil.error?.code ?? null
    });
    throw new Error("Não foi possível validar o perfil e a membership da conta.");
  }

  const perfil = resultadoPerfil.data;
  const membros = resultadoMembros.data ?? [];

  if (!perfil?.ativo || membros.length === 0) {
    return { claims, sessao: null, motivo: "sem_membership_ativa" };
  }

  // Até o seletor de unidade existir, usa a membership ativa mais antiga.
  // O valor nunca é aceito sem nova validação RLS no servidor.
  const membro = selecionarMembership({ claims, membros });

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

export async function exigirSessaoBarbearia() {
  const contexto = await obterContextoAuth();

  if (!contexto?.claims?.sub) redirect("/barbeiro/login");
  if (!contexto.sessao) redirect("/barbeiro/sem-acesso");

  return contexto;
}

export async function exigirDono() {
  const contexto = await exigirSessaoBarbearia();
  if (contexto.sessao.papel !== "dono") redirect("/barbeiro/dashboard");
  return contexto;
}
