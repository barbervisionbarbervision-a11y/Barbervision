-- Rollback manual de policies, grants e helpers do passo 2.
-- Execute depois do rollback de Storage e antes do rollback do core.

begin;

do $$
begin
  if exists (select 1 from public.atribuicoes_cliente)
     or exists (select 1 from public.clientes)
     or exists (select 1 from public.membros_barbearia)
     or exists (select 1 from public.perfis)
     or exists (select 1 from public.barbearias) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado antes de remover RLS: existem dados nas tabelas do passo 2. Exporte e remova-os explicitamente primeiro.';
  end if;
end;
$$;

drop policy if exists atribuicoes_delete_dono on public.atribuicoes_cliente;
drop policy if exists atribuicoes_update_dono on public.atribuicoes_cliente;
drop policy if exists atribuicoes_insert_dono on public.atribuicoes_cliente;
drop policy if exists atribuicoes_select_escopo on public.atribuicoes_cliente;

drop policy if exists clientes_delete_dono on public.clientes;
drop policy if exists clientes_update_dono on public.clientes;
drop policy if exists clientes_insert_dono on public.clientes;
drop policy if exists clientes_select_escopo on public.clientes;

drop policy if exists membros_select_proprio_ou_dono on public.membros_barbearia;
drop policy if exists perfis_update_proprio on public.perfis;
drop policy if exists perfis_insert_proprio on public.perfis;
drop policy if exists perfis_select_proprio_ou_equipe_do_dono on public.perfis;
drop policy if exists barbearias_update_dono on public.barbearias;
drop policy if exists barbearias_select_membro on public.barbearias;

drop trigger if exists atribuicoes_registrar_autor on public.atribuicoes_cliente;
drop trigger if exists atribuicoes_validar_responsavel on public.atribuicoes_cliente;
drop trigger if exists membros_proteger_ultimo_dono on public.membros_barbearia;
drop trigger if exists clientes_registrar_criador on public.clientes;

drop function if exists private.proteger_ultimo_dono();
drop function if exists private.validar_responsavel_atribuicao();
drop function if exists private.registrar_autor_atribuicao();
drop function if exists private.registrar_criador_cliente();
drop function if exists private.usuario_pode_ver_cliente(uuid, uuid);
drop function if exists private.usuario_pode_ver_perfil(uuid);
drop function if exists private.usuario_pode_gerenciar_tenant(uuid);
drop function if exists private.usuario_eh_dono(uuid);
drop function if exists private.usuario_eh_membro(uuid);
drop function if exists private.usuario_conta_ativa();
drop function if exists private.usuario_auth_permanente();

revoke all on table public.atribuicoes_cliente from authenticated;
revoke all on table public.clientes from authenticated;
revoke all on table public.membros_barbearia from authenticated;
revoke all on table public.perfis from authenticated;
revoke all on table public.barbearias from authenticated;

commit;
