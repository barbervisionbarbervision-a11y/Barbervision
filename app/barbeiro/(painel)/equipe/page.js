import EquipeClient from "@/components/auth/EquipeClient";
import { exigirDono } from "@/lib/auth/context";
import { equipeExemplo } from "@/lib/mockData";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export default async function Equipe() {
  if (!supabaseEstaConfigurado()) {
    return (
      <EquipeClient
        modoDemo
        membros={equipeExemplo.map((pessoa) => ({
          usuarioId: pessoa.id,
          nome: pessoa.nome,
          papel: pessoa.papel,
          status: "ativo"
        }))}
        convites={[]}
      />
    );
  }

  const { sessao } = await exigirDono();
  const supabase = await criarClienteSupabaseServer();
  const [resultadoMembros, resultadoConvites] = await Promise.all([
    supabase
      .from("membros_barbearia")
      .select("usuario_id,papel,status")
      .eq("barbearia_id", sessao.barbeariaId)
      .order("created_at", { ascending: true }),
    supabase
      .from("convites_barbearia")
      .select("id,nome,email_normalizado,status,created_at")
      .eq("barbearia_id", sessao.barbeariaId)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (resultadoMembros.error || resultadoConvites.error) {
    throw new Error("Não foi possível carregar a equipe.");
  }

  const ids = (resultadoMembros.data ?? []).map((membro) => membro.usuario_id);
  const [resultadoPerfis, resultadoConvitesAceitos] = ids.length
    ? await Promise.all([
        supabase.from("perfis").select("usuario_id,nome").in("usuario_id", ids),
        supabase
          .from("convites_barbearia")
          .select("aceito_por,nome,email_normalizado,aceito_em")
          .eq("barbearia_id", sessao.barbeariaId)
          .eq("status", "aceito")
          .in("aceito_por", ids)
          .order("aceito_em", { ascending: false })
      ])
    : [
        { data: [], error: null },
        { data: [], error: null }
      ];

  if (resultadoPerfis.error) throw new Error("Não foi possível carregar os perfis da equipe.");
  if (resultadoConvitesAceitos.error) throw new Error("Não foi possível carregar os nomes aceitos da equipe.");
  const nomes = new Map((resultadoPerfis.data ?? []).map((perfil) => [perfil.usuario_id, perfil.nome]));
  const identidadesDosConvites = new Map();
  for (const convite of resultadoConvitesAceitos.data ?? []) {
    if (convite.aceito_por && !identidadesDosConvites.has(convite.aceito_por)) {
      identidadesDosConvites.set(convite.aceito_por, {
        nome: convite.nome,
        email: convite.email_normalizado
      });
    }
  }

  return (
    <EquipeClient
      membros={(resultadoMembros.data ?? []).map((membro) => ({
        usuarioId: membro.usuario_id,
        nome: membro.papel === "funcionario"
          ? identidadesDosConvites.get(membro.usuario_id)?.nome ?? nomes.get(membro.usuario_id) ?? "Funcionário"
          : nomes.get(membro.usuario_id) ?? "Dono",
        email: membro.papel === "funcionario"
          ? identidadesDosConvites.get(membro.usuario_id)?.email ?? ""
          : sessao.email,
        papel: membro.papel,
        status: membro.status
      }))}
      convites={(resultadoConvites.data ?? []).map((convite) => ({
        id: convite.id,
        nome: convite.nome,
        email: convite.email_normalizado,
        status: convite.status
      }))}
    />
  );
}
