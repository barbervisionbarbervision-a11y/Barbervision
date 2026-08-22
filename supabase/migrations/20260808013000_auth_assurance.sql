-- Passo 3 — confirmação de e-mail e step-up MFA para todo acesso de dono.
-- E-mail confirmado habilita a conta; donos só acessam dados de negócio em AAL2.

begin;

create function private.usuario_email_confirmado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_auth_permanente()
    and exists (
      select 1
      from auth.users as usuario
      where usuario.id = (select auth.uid())
        and usuario.email is not null
        and usuario.email_confirmed_at is not null
    );
$$;

create function private.usuario_tem_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.usuario_auth_permanente()
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

create or replace function private.usuario_conta_ativa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_email_confirmado()
    and exists (
      select 1
      from public.perfis as perfil
      where perfil.usuario_id = (select auth.uid())
        and perfil.ativo
    );
$$;

create or replace function private.usuario_eh_membro(p_barbearia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_conta_ativa()
    and exists (
      select 1
      from public.membros_barbearia as membro
      join public.barbearias as barbearia
        on barbearia.id = membro.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      where membro.barbearia_id = p_barbearia_id
        and membro.usuario_id = (select auth.uid())
        and membro.status = 'ativo'::public.status_membro_barbearia
        and (
          membro.papel = 'funcionario'::public.papel_membro_barbearia
          or (
            membro.papel = 'dono'::public.papel_membro_barbearia
            and private.usuario_tem_aal2()
          )
        )
    );
$$;

create or replace function private.usuario_eh_dono(p_barbearia_id uuid)
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
      from public.membros_barbearia as membro
      join public.barbearias as barbearia
        on barbearia.id = membro.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      where membro.barbearia_id = p_barbearia_id
        and membro.usuario_id = (select auth.uid())
        and membro.papel = 'dono'::public.papel_membro_barbearia
        and membro.status = 'ativo'::public.status_membro_barbearia
    );
$$;

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

create or replace function private.usuario_pode_ver_cliente(
  p_barbearia_id uuid,
  p_cliente_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_conta_ativa()
    and exists (
      select 1
      from public.barbearias as barbearia
      join public.membros_barbearia as membro
        on membro.barbearia_id = barbearia.id
       and membro.usuario_id = (select auth.uid())
       and membro.status = 'ativo'::public.status_membro_barbearia
      where barbearia.id = p_barbearia_id
        and barbearia.status = 'ativa'::public.status_barbearia
        and (
          (
            membro.papel = 'dono'::public.papel_membro_barbearia
            and private.usuario_tem_aal2()
          )
          or (
            membro.papel = 'funcionario'::public.papel_membro_barbearia
            and exists (
              select 1
              from public.atribuicoes_cliente as atribuicao
              where atribuicao.barbearia_id = p_barbearia_id
                and atribuicao.cliente_id = p_cliente_id
                and atribuicao.usuario_id = (select auth.uid())
            )
          )
        )
    );
$$;

create or replace function private.usuario_eh_dono_do_storage_path(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.storage_path_valido(p_nome)
    and private.usuario_conta_ativa()
    and private.usuario_tem_aal2()
    and exists (
      select 1
      from public.membros_barbearia as membro
      join public.barbearias as barbearia
        on barbearia.id = membro.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      where membro.barbearia_id::text = (storage.foldername(p_nome))[1]
        and membro.usuario_id = (select auth.uid())
        and membro.papel = 'dono'::public.papel_membro_barbearia
        and membro.status = 'ativo'::public.status_membro_barbearia
    );
$$;

revoke all on function private.usuario_email_confirmado() from public, anon, authenticated;
revoke all on function private.usuario_tem_aal2() from public, anon, authenticated;
grant execute on function private.usuario_email_confirmado() to authenticated, service_role;
grant execute on function private.usuario_tem_aal2() to authenticated, service_role;

comment on function private.usuario_email_confirmado() is
  'Confere o estado autoritativo de confirmação em auth.users; não confia em metadata do cliente.';
comment on function private.usuario_tem_aal2() is
  'Aceita somente JWT com claim aal2; claim ausente é tratado como aal1.';
comment on function private.usuario_eh_dono(uuid) is
  'Autoriza dono ativo somente com conta confirmada e sessão elevada a AAL2.';

commit;
