-- Restaura a leitura de perfil somente para memberships ativas.
begin;

set local lock_timeout = '10s';

create or replace function private.usuario_pode_ver_perfil(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_conta_ativa()
    and private.usuario_tem_aal2()
    and exists (
      select 1
      from public.membros_barbearia as dono
      join public.barbearias as barbearia
        on barbearia.id = dono.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      join public.membros_barbearia as alvo
        on alvo.barbearia_id = dono.barbearia_id
       and alvo.status = 'ativo'::public.status_membro_barbearia
      join public.perfis as perfil_alvo
        on perfil_alvo.usuario_id = alvo.usuario_id
       and perfil_alvo.ativo
      where dono.usuario_id = (select auth.uid())
        and dono.papel = 'dono'::public.papel_membro_barbearia
        and dono.status = 'ativo'::public.status_membro_barbearia
        and alvo.usuario_id = p_usuario_id
    );
$$;

revoke all on function private.usuario_pode_ver_perfil(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.usuario_pode_ver_perfil(uuid)
  to authenticated, service_role;

commit;
