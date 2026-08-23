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
  const resultadoPerfis = ids.length
    ? await supabase.from("perfis").select("usuario_id,nome").in("usuario_id", ids)
    : { data: [], error: null };

  if (resultadoPerfis.error) throw new Error("Não foi possível carregar os perfis da equipe.");
  const nomes = new Map((resultadoPerfis.data ?? []).map((perfil) => [perfil.usuario_id, perfil.nome]));

  return (
    <EquipeClient
      membros={(resultadoMembros.data ?? []).map((membro) => ({
        usuarioId: membro.usuario_id,
        nome: nomes.get(membro.usuario_id) ?? "Membro",
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
