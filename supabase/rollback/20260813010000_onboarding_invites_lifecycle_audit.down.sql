-- Rollback manual e defensivo da migration de onboarding/lifecycle/auditoria.
--
-- Este downgrade remove contratos operacionais e restaura exatamente a
-- superfície anterior da migration 20260813010000. Ele só é seguro quando a
-- migration ainda não foi usada: convites e auditoria precisam estar vazios e
-- os UUIDs históricos precisam continuar presentes em auth.users para que as
-- FKs antigas voltem. Estados de membership já existiam antes desta migration
-- e, por isso, são preservados pelo downgrade.
--
-- Pare todos os writers antes de executar. Se o preflight recusar, exporte e
-- reconcilie explicitamente convites, eventos, memberships e atribuições; não
-- desabilite as guardas apenas para forçar perda de dados.

begin;

set local lock_timeout = '10s';

do $preflight_schema$
begin
  if to_regclass('public.convites_barbearia') is null
     or to_regclass('public.eventos_auditoria') is null
     or to_regprocedure('public.criar_convite_funcionario(uuid,text,text)') is null
     or to_regprocedure('public.provisionar_dono_controlado(uuid,text,text,text)') is null then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: a migration 20260813010000 não está íntegra ou já foi parcialmente revertida.';
  end if;
end;
$preflight_schema$;

-- Bloqueia novas mutations entre o preflight e a restauração do schema. O lock
-- em auth.users também impede que um UUID validado desapareça antes das FKs.
lock table auth.users in share row exclusive mode;
lock table public.perfis in access exclusive mode;
lock table public.atribuicoes_cliente in access exclusive mode;
lock table public.barbearias in access exclusive mode;
lock table public.clientes in access exclusive mode;
lock table public.membros_barbearia in access exclusive mode;
lock table public.convites_barbearia in access exclusive mode;
lock table public.eventos_auditoria in access exclusive mode;

do $preflight_data$
begin
  if exists (select 1 from public.convites_barbearia) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: existem convites. Exporte e reconcilie cada convite explicitamente antes do downgrade.';
  end if;

  if exists (select 1 from public.eventos_auditoria) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: existem eventos de auditoria. Eles podem representar provisionamento, aceite ou lifecycle irreversível; exporte e reconcilie antes do downgrade.';
  end if;

  if exists (
    select 1
    from public.barbearias as barbearia
    where barbearia.status = 'ativa'::public.status_barbearia
      and not exists (
        select 1
        from public.membros_barbearia as membro
        join public.perfis as perfil
          on perfil.usuario_id = membro.usuario_id
         and perfil.ativo
        where membro.barbearia_id = barbearia.id
          and membro.papel = 'dono'::public.papel_membro_barbearia
          and membro.status = 'ativo'::public.status_membro_barbearia
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: existe barbearia ativa sem dono ativo e perfil ativo.';
  end if;

  if exists (
    select 1
    from public.barbearias as barbearia
    where barbearia.criado_por is not null
      and not exists (
        select 1 from auth.users as usuario
        where usuario.id = barbearia.criado_por
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: barbearias.criado_por contém UUID histórico sem conta Auth; a FK anterior não pode ser restaurada sem alterar dados.';
  end if;

  if exists (
    select 1
    from public.clientes as cliente
    where cliente.criado_por is not null
      and not exists (
        select 1 from auth.users as usuario
        where usuario.id = cliente.criado_por
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: clientes.criado_por contém UUID histórico sem conta Auth; a FK anterior não pode ser restaurada sem alterar dados.';
  end if;

  if exists (
    select 1
    from public.membros_barbearia as membro
    where membro.convidado_por is not null
      and not exists (
        select 1 from auth.users as usuario
        where usuario.id = membro.convidado_por
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: membros_barbearia.convidado_por contém UUID histórico sem conta Auth; a FK anterior não pode ser restaurada sem alterar dados.';
  end if;

  if exists (
    select 1
    from public.atribuicoes_cliente as atribuicao
    where atribuicao.atribuido_por is not null
      and not exists (
        select 1 from auth.users as usuario
        where usuario.id = atribuicao.atribuido_por
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: atribuicoes_cliente.atribuido_por contém UUID histórico sem conta Auth; a FK anterior não pode ser restaurada sem alterar dados.';
  end if;
end;
$preflight_data$;

-- Fecha a API antes de remover as implementações SECURITY DEFINER.
revoke all on function public.criar_convite_funcionario(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.revogar_convite_barbearia(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.aceitar_convite_barbearia(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.marcar_convite_enviado(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.marcar_convite_falhou(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.provisionar_dono_controlado(uuid, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.suspender_funcionario(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.reativar_funcionario(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.revogar_funcionario(uuid, uuid)
  from public, anon, authenticated, service_role;

revoke all on table public.convites_barbearia
  from public, anon, authenticated, service_role;
revoke all on table public.eventos_auditoria
  from public, anon, authenticated, service_role;

revoke all on type public.status_convite_barbearia
  from public, anon, authenticated, service_role;
revoke all on type public.origem_evento_auditoria
  from public, anon, authenticated, service_role;
revoke all on type public.acao_evento_auditoria
  from public, anon, authenticated, service_role;

drop policy convites_barbearia_select_dono
  on public.convites_barbearia;
drop policy eventos_auditoria_select_dono
  on public.eventos_auditoria;

drop trigger convites_barbearia_definir_updated_at
  on public.convites_barbearia;
drop trigger eventos_auditoria_append_only
  on public.eventos_auditoria;
drop trigger eventos_auditoria_bloquear_truncate
  on public.eventos_auditoria;
drop trigger membros_00_travar_tenant
  on public.membros_barbearia;
drop trigger perfis_proteger_dono_ativo
  on public.perfis;

drop function public.criar_convite_funcionario(uuid, text, text);
drop function public.revogar_convite_barbearia(uuid);
drop function public.aceitar_convite_barbearia(uuid);
drop function public.marcar_convite_enviado(uuid);
drop function public.marcar_convite_falhou(uuid, text);
drop function public.provisionar_dono_controlado(uuid, text, text, text);
drop function public.suspender_funcionario(uuid, uuid);
drop function public.reativar_funcionario(uuid, uuid);
drop function public.revogar_funcionario(uuid, uuid);

drop function private.registrar_evento_auditoria(
  uuid,
  uuid,
  uuid,
  public.origem_evento_auditoria,
  public.acao_evento_auditoria,
  text,
  uuid,
  jsonb
);
drop function private.bloquear_mutacao_evento_auditoria();
drop function private.definir_updated_at_e_versao_convite();
drop function private.normalizar_email_convite(text);
drop function private.travar_tenant_membership();
drop function private.proteger_perfil_dono_ativo();

drop table public.eventos_auditoria;
drop table public.convites_barbearia;

drop type public.acao_evento_auditoria;
drop type public.origem_evento_auditoria;
drop type public.status_convite_barbearia;

-- Restaura exatamente o validador da migration 20260808011000. A versão da
-- migration 5 adicionava locks e a checagem direta de auth.users.
create or replace function private.validar_responsavel_atribuicao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.membros_barbearia as membro
    join public.perfis as perfil
      on perfil.usuario_id = membro.usuario_id
     and perfil.ativo
    join public.barbearias as barbearia
      on barbearia.id = membro.barbearia_id
     and barbearia.status = 'ativa'::public.status_barbearia
    where membro.barbearia_id = new.barbearia_id
      and membro.usuario_id = new.usuario_id
      and membro.status = 'ativo'::public.status_membro_barbearia
  ) then
    raise exception using
      errcode = '23514',
      message = 'O responsável precisa ser um membro ativo, com perfil ativo, da mesma barbearia ativa.';
  end if;

  return new;
end;
$$;

revoke all on function private.validar_responsavel_atribuicao()
  from public, anon, authenticated;

-- As quatro FKs existiam no core com ON DELETE SET NULL. O preflight garante
-- que a validação não exige apagar ou reescrever UUID histórico.
alter table public.barbearias
  add constraint barbearias_criado_por_fkey
  foreign key (criado_por)
  references auth.users(id)
  on delete set null;

alter table public.clientes
  add constraint clientes_criado_por_fkey
  foreign key (criado_por)
  references auth.users(id)
  on delete set null;

alter table public.membros_barbearia
  add constraint membros_barbearia_convidado_por_fkey
  foreign key (convidado_por)
  references auth.users(id)
  on delete set null;

alter table public.atribuicoes_cliente
  add constraint atribuicoes_cliente_atribuido_por_fkey
  foreign key (atribuido_por)
  references auth.users(id)
  on delete set null;

-- Restaura somente os privilégios retirados pela migration 5.
grant insert, update, delete, truncate
  on table public.membros_barbearia
  to service_role;

grant update (usuario_id)
  on table public.atribuicoes_cliente
  to authenticated;

grant update
  on table public.atribuicoes_cliente
  to service_role;

-- Os enums do core nasceram com USAGE para PUBLIC; a migration 5 removeu esse
-- default antes de restringir seus próprios enums.
grant usage on type public.status_barbearia to public;
grant usage on type public.papel_membro_barbearia to public;
grant usage on type public.status_membro_barbearia to public;

commit;
