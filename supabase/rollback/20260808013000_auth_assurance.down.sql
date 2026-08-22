-- Rollback manual da garantia de e-mail confirmado e AAL2 do passo 3.
-- Execute somente depois de reverter onboarding/lifecycle/auditoria (migration 5).
-- Este rollback não remove linhas, buckets ou objetos do Storage; ele restaura
-- os helpers, ACLs e policies ao estado exato deixado pelas migrations 2 e 3.

begin;

-- Evita que um downgrade operacional fique esperando indefinidamente por
-- writers concorrentes. Execute em janela de manutenção, com os writers
-- parados, e repita depois se algum lock não puder ser obtido em dez segundos.
set local lock_timeout = '10s';

do $$
declare
  v_ausentes text;
  v_policies_ausentes text;
  v_policies_inesperadas text;
begin
  -- A migration 5 depende semanticamente do AAL2 fornecido pela migration 4.
  -- Rebaixar a assurance enquanto seus comandos ainda existem abriria uma
  -- janela de autorização indevida, mesmo que o PostgreSQL não registre todas
  -- as dependências contidas em corpos SQL textuais.
  if to_regclass('public.convites_barbearia') is not null
     or to_regclass('public.eventos_auditoria') is not null
     or to_regtype('public.status_convite_barbearia') is not null
     or to_regtype('public.origem_evento_auditoria') is not null
     or to_regtype('public.acao_evento_auditoria') is not null
     or to_regprocedure('public.criar_convite_funcionario(uuid,text,text)') is not null
     or to_regprocedure('public.revogar_convite_barbearia(uuid)') is not null
     or to_regprocedure('public.marcar_convite_enviado(uuid)') is not null
     or to_regprocedure('public.marcar_convite_falhou(uuid,text)') is not null
     or to_regprocedure('public.aceitar_convite_barbearia(uuid)') is not null
     or to_regprocedure('public.provisionar_dono_controlado(uuid,text,text,text)') is not null
     or to_regprocedure('public.suspender_funcionario(uuid,uuid)') is not null
     or to_regprocedure('public.reativar_funcionario(uuid,uuid)') is not null
     or to_regprocedure('public.revogar_funcionario(uuid,uuid)') is not null
     or to_regprocedure('private.normalizar_email_convite(text)') is not null
     or to_regprocedure('private.definir_updated_at_e_versao_convite()') is not null
     or to_regprocedure('private.bloquear_mutacao_evento_auditoria()') is not null
     or to_regprocedure('private.travar_tenant_membership()') is not null
     or to_regprocedure('private.proteger_perfil_dono_ativo()') is not null then
    raise exception using
      errcode = '2BP01',
      message = 'Rollback recusado: a migration de onboarding/lifecycle/auditoria ainda está presente. Reverta a migration 5 antes da auth_assurance.';
  end if;

  select string_agg(esperado.objeto, ', ' order by esperado.objeto)
  into v_ausentes
  from (
    values
      ('tabela public.barbearias', to_regclass('public.barbearias') is not null),
      ('tabela public.perfis', to_regclass('public.perfis') is not null),
      ('tabela public.membros_barbearia', to_regclass('public.membros_barbearia') is not null),
      ('tabela public.clientes', to_regclass('public.clientes') is not null),
      ('tabela public.atribuicoes_cliente', to_regclass('public.atribuicoes_cliente') is not null),
      ('tabela storage.objects', to_regclass('storage.objects') is not null),
      ('tabela storage.buckets', to_regclass('storage.buckets') is not null),
      ('função private.usuario_auth_permanente()', to_regprocedure('private.usuario_auth_permanente()') is not null),
      ('função private.usuario_email_confirmado()', to_regprocedure('private.usuario_email_confirmado()') is not null),
      ('função private.usuario_tem_aal2()', to_regprocedure('private.usuario_tem_aal2()') is not null),
      ('função private.usuario_conta_ativa()', to_regprocedure('private.usuario_conta_ativa()') is not null),
      ('função private.usuario_eh_membro(uuid)', to_regprocedure('private.usuario_eh_membro(uuid)') is not null),
      ('função private.usuario_eh_dono(uuid)', to_regprocedure('private.usuario_eh_dono(uuid)') is not null),
      ('função private.usuario_pode_gerenciar_tenant(uuid)', to_regprocedure('private.usuario_pode_gerenciar_tenant(uuid)') is not null),
      ('função private.usuario_pode_ver_perfil(uuid)', to_regprocedure('private.usuario_pode_ver_perfil(uuid)') is not null),
      ('função private.usuario_pode_ver_cliente(uuid,uuid)', to_regprocedure('private.usuario_pode_ver_cliente(uuid,uuid)') is not null),
      ('função private.validar_responsavel_atribuicao()', to_regprocedure('private.validar_responsavel_atribuicao()') is not null),
      ('função private.storage_path_valido(text)', to_regprocedure('private.storage_path_valido(text)') is not null),
      ('função private.usuario_eh_dono_do_storage_path(text)', to_regprocedure('private.usuario_eh_dono_do_storage_path(text)') is not null)
  ) as esperado(objeto, presente)
  where not esperado.presente;

  if v_ausentes is not null then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: o estado esperado das migrations 1–4 está incompleto.',
      detail = 'Objetos ausentes: ' || v_ausentes;
  end if;

  if position(
    'A conta Auth do responsável não existe.' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.validar_responsavel_atribuicao()'))
  ) > 0 then
    raise exception using
      errcode = '2BP01',
      message = 'Rollback recusado: o helper de atribuição ainda possui a versão da migration 5. Reverta onboarding/lifecycle/auditoria primeiro.';
  end if;

  if position(
    'email_confirmed_at' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_email_confirmado()'))
  ) = 0
  or position(
    '''aal2''' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_tem_aal2()'))
  ) = 0
  or position(
    'private.usuario_email_confirmado()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_conta_ativa()'))
  ) = 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_eh_membro(uuid)'))
  ) = 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_eh_dono(uuid)'))
  ) = 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_pode_ver_perfil(uuid)'))
  ) = 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_pode_ver_cliente(uuid,uuid)'))
  ) = 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_eh_dono_do_storage_path(text)'))
  ) = 0 then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: os helpers não correspondem ao estado íntegro da migration auth_assurance.';
  end if;

  select string_agg(esperado.politica, ', ' order by esperado.politica)
  into v_policies_ausentes
  from (
    values
      ('public', 'barbearias', 'barbearias_select_membro'),
      ('public', 'barbearias', 'barbearias_update_dono'),
      ('public', 'perfis', 'perfis_select_proprio_ou_equipe_do_dono'),
      ('public', 'perfis', 'perfis_insert_proprio'),
      ('public', 'perfis', 'perfis_update_proprio'),
      ('public', 'membros_barbearia', 'membros_select_proprio_ou_dono'),
      ('public', 'clientes', 'clientes_select_escopo'),
      ('public', 'clientes', 'clientes_insert_dono'),
      ('public', 'clientes', 'clientes_update_dono'),
      ('public', 'clientes', 'clientes_delete_dono'),
      ('public', 'atribuicoes_cliente', 'atribuicoes_select_escopo'),
      ('public', 'atribuicoes_cliente', 'atribuicoes_insert_dono'),
      ('public', 'atribuicoes_cliente', 'atribuicoes_update_dono'),
      ('public', 'atribuicoes_cliente', 'atribuicoes_delete_dono'),
      ('storage', 'objects', 'barbervision_storage_select_dono'),
      ('storage', 'objects', 'barbervision_storage_insert_dono'),
      ('storage', 'objects', 'barbervision_storage_update_dono'),
      ('storage', 'objects', 'barbervision_storage_delete_dono')
  ) as esperado(esquema, tabela, politica)
  where not exists (
    select 1
    from pg_catalog.pg_policies as policy
    where policy.schemaname = esperado.esquema
      and policy.tablename = esperado.tabela
      and policy.policyname = esperado.politica
  );

  if v_policies_ausentes is not null then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: policies da baseline estão ausentes.',
      detail = 'Policies ausentes: ' || v_policies_ausentes;
  end if;

  select string_agg(policy.policyname, ', ' order by policy.policyname)
  into v_policies_inesperadas
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'public'
    and policy.tablename in (
      'barbearias',
      'perfis',
      'membros_barbearia',
      'clientes',
      'atribuicoes_cliente'
    )
    and policy.policyname not in (
      'barbearias_select_membro',
      'barbearias_update_dono',
      'perfis_select_proprio_ou_equipe_do_dono',
      'perfis_insert_proprio',
      'perfis_update_proprio',
      'membros_select_proprio_ou_dono',
      'clientes_select_escopo',
      'clientes_insert_dono',
      'clientes_update_dono',
      'clientes_delete_dono',
      'atribuicoes_select_escopo',
      'atribuicoes_insert_dono',
      'atribuicoes_update_dono',
      'atribuicoes_delete_dono'
    );

  if v_policies_inesperadas is not null then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: existem policies públicas fora da baseline conhecida.',
      detail = 'Policies inesperadas: ' || v_policies_inesperadas;
  end if;

  if (
    select count(*)
    from storage.buckets as bucket
    where bucket.id in (
      'barbervision-hair-sources',
      'barbervision-hair-cutouts',
      'barbervision-selfies'
    )
      and bucket.public = false
  ) <> 3 then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: os três buckets privados da migration 3 não estão íntegros.';
  end if;
end;
$$;

-- Bloqueia mudanças concorrentes nas relações protegidas enquanto policies e
-- helpers são trocados. Nenhuma linha é removida ou reescrita.
lock table public.barbearias in access exclusive mode;
lock table public.perfis in access exclusive mode;
lock table public.membros_barbearia in access exclusive mode;
lock table public.clientes in access exclusive mode;
lock table public.atribuicoes_cliente in access exclusive mode;
lock table storage.buckets in share row exclusive mode;
lock table storage.objects in access exclusive mode;

drop policy atribuicoes_delete_dono on public.atribuicoes_cliente;
drop policy atribuicoes_update_dono on public.atribuicoes_cliente;
drop policy atribuicoes_insert_dono on public.atribuicoes_cliente;
drop policy atribuicoes_select_escopo on public.atribuicoes_cliente;

drop policy clientes_delete_dono on public.clientes;
drop policy clientes_update_dono on public.clientes;
drop policy clientes_insert_dono on public.clientes;
drop policy clientes_select_escopo on public.clientes;

drop policy membros_select_proprio_ou_dono on public.membros_barbearia;
drop policy perfis_update_proprio on public.perfis;
drop policy perfis_insert_proprio on public.perfis;
drop policy perfis_select_proprio_ou_equipe_do_dono on public.perfis;
drop policy barbearias_update_dono on public.barbearias;
drop policy barbearias_select_membro on public.barbearias;

drop policy barbervision_storage_delete_dono on storage.objects;
drop policy barbervision_storage_update_dono on storage.objects;
drop policy barbervision_storage_insert_dono on storage.objects;
drop policy barbervision_storage_select_dono on storage.objects;

create or replace function private.usuario_conta_ativa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_auth_permanente()
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
          membro.papel = 'dono'::public.papel_membro_barbearia
          or exists (
            select 1
            from public.atribuicoes_cliente as atribuicao
            where atribuicao.barbearia_id = p_barbearia_id
              and atribuicao.cliente_id = p_cliente_id
              and atribuicao.usuario_id = (select auth.uid())
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

-- Os seis helpers acima já não dependem dos dois objetos criados pela
-- auth_assurance; removê-los agora não exige CASCADE e não atinge dados.
drop function private.usuario_email_confirmado();
drop function private.usuario_tem_aal2();

revoke all on function private.usuario_conta_ativa() from public, anon, authenticated;
revoke all on function private.usuario_eh_membro(uuid) from public, anon, authenticated;
revoke all on function private.usuario_eh_dono(uuid) from public, anon, authenticated;
revoke all on function private.usuario_pode_ver_perfil(uuid) from public, anon, authenticated;
revoke all on function private.usuario_pode_ver_cliente(uuid, uuid) from public, anon, authenticated;
revoke all on function private.usuario_eh_dono_do_storage_path(text) from public, anon, authenticated;

grant execute on function private.usuario_conta_ativa() to authenticated, service_role;
grant execute on function private.usuario_eh_membro(uuid) to authenticated, service_role;
grant execute on function private.usuario_eh_dono(uuid) to authenticated, service_role;
grant execute on function private.usuario_pode_ver_perfil(uuid) to authenticated, service_role;
grant execute on function private.usuario_pode_ver_cliente(uuid, uuid) to authenticated, service_role;
grant execute on function private.usuario_eh_dono_do_storage_path(text) to authenticated, service_role;

create policy barbearias_select_membro
on public.barbearias
for select
to authenticated
using (private.usuario_eh_membro(id));

create policy barbearias_update_dono
on public.barbearias
for update
to authenticated
using (private.usuario_eh_dono(id))
with check (private.usuario_eh_dono(id));

create policy perfis_select_proprio_ou_equipe_do_dono
on public.perfis
for select
to authenticated
using (
  private.usuario_auth_permanente()
  and (
    usuario_id = (select auth.uid())
    or private.usuario_pode_ver_perfil(usuario_id)
  )
);

create policy perfis_insert_proprio
on public.perfis
for insert
to authenticated
with check (
  private.usuario_auth_permanente()
  and usuario_id = (select auth.uid())
);

create policy perfis_update_proprio
on public.perfis
for update
to authenticated
using (
  private.usuario_auth_permanente()
  and usuario_id = (select auth.uid())
)
with check (
  private.usuario_auth_permanente()
  and usuario_id = (select auth.uid())
);

create policy membros_select_proprio_ou_dono
on public.membros_barbearia
for select
to authenticated
using (
  private.usuario_auth_permanente()
  and (
    usuario_id = (select auth.uid())
    or private.usuario_eh_dono(barbearia_id)
  )
);

create policy clientes_select_escopo
on public.clientes
for select
to authenticated
using (private.usuario_pode_ver_cliente(barbearia_id, id));

create policy clientes_insert_dono
on public.clientes
for insert
to authenticated
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy clientes_update_dono
on public.clientes
for update
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id))
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy clientes_delete_dono
on public.clientes
for delete
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy atribuicoes_select_escopo
on public.atribuicoes_cliente
for select
to authenticated
using (
  private.usuario_pode_gerenciar_tenant(barbearia_id)
  or (
    private.usuario_auth_permanente()
    and usuario_id = (select auth.uid())
    and private.usuario_pode_ver_cliente(barbearia_id, cliente_id)
  )
);

create policy atribuicoes_insert_dono
on public.atribuicoes_cliente
for insert
to authenticated
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy atribuicoes_update_dono
on public.atribuicoes_cliente
for update
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id))
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy atribuicoes_delete_dono
on public.atribuicoes_cliente
for delete
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy barbervision_storage_select_dono
on storage.objects
for select
to authenticated
using (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

create policy barbervision_storage_insert_dono
on storage.objects
for insert
to authenticated
with check (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

create policy barbervision_storage_update_dono
on storage.objects
for update
to authenticated
using (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
)
with check (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

create policy barbervision_storage_delete_dono
on storage.objects
for delete
to authenticated
using (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

comment on function private.usuario_eh_membro(uuid) is
  'Helper SECURITY DEFINER mínimo para evitar recursão de policies em membros_barbearia.';
comment on function private.usuario_eh_dono(uuid) is
  'Autoriza pelo papel/status persistido da membership; não lê user_metadata ou app_metadata.';
comment on function private.usuario_eh_dono_do_storage_path(text) is
  'Valida owner ativo pelo primeiro segmento UUID do path; owner_id do objeto não é autorização de tenant.';

do $$
declare
  v_total_policies integer;
  v_total_policies_publicas integer;
  v_funcao text;
begin
  if to_regprocedure('private.usuario_email_confirmado()') is not null
     or to_regprocedure('private.usuario_tem_aal2()') is not null then
    raise exception using
      errcode = '55000',
      message = 'Rollback incompleto: helpers exclusivos da auth_assurance ainda existem.';
  end if;

  if position(
    'private.usuario_email_confirmado()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_conta_ativa()'))
  ) > 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_eh_membro(uuid)'))
  ) > 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_eh_dono(uuid)'))
  ) > 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_pode_ver_perfil(uuid)'))
  ) > 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_pode_ver_cliente(uuid,uuid)'))
  ) > 0
  or position(
    'private.usuario_tem_aal2()' in
    pg_catalog.pg_get_functiondef(to_regprocedure('private.usuario_eh_dono_do_storage_path(text)'))
  ) > 0 then
    raise exception using
      errcode = '55000',
      message = 'Rollback incompleto: um helper restaurado ainda referencia e-mail confirmado ou AAL2.';
  end if;

  select count(*)
  into v_total_policies
  from pg_catalog.pg_policies as policy
  where (policy.schemaname, policy.tablename, policy.policyname) in (
    ('public', 'barbearias', 'barbearias_select_membro'),
    ('public', 'barbearias', 'barbearias_update_dono'),
    ('public', 'perfis', 'perfis_select_proprio_ou_equipe_do_dono'),
    ('public', 'perfis', 'perfis_insert_proprio'),
    ('public', 'perfis', 'perfis_update_proprio'),
    ('public', 'membros_barbearia', 'membros_select_proprio_ou_dono'),
    ('public', 'clientes', 'clientes_select_escopo'),
    ('public', 'clientes', 'clientes_insert_dono'),
    ('public', 'clientes', 'clientes_update_dono'),
    ('public', 'clientes', 'clientes_delete_dono'),
    ('public', 'atribuicoes_cliente', 'atribuicoes_select_escopo'),
    ('public', 'atribuicoes_cliente', 'atribuicoes_insert_dono'),
    ('public', 'atribuicoes_cliente', 'atribuicoes_update_dono'),
    ('public', 'atribuicoes_cliente', 'atribuicoes_delete_dono'),
    ('storage', 'objects', 'barbervision_storage_select_dono'),
    ('storage', 'objects', 'barbervision_storage_insert_dono'),
    ('storage', 'objects', 'barbervision_storage_update_dono'),
    ('storage', 'objects', 'barbervision_storage_delete_dono')
  );

  if v_total_policies <> 18 then
    raise exception using
      errcode = '55000',
      message = 'Rollback incompleto: a baseline deveria possuir 18 policies conhecidas.',
      detail = 'Policies encontradas: ' || v_total_policies::text;
  end if;

  select count(*)
  into v_total_policies_publicas
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'public'
    and policy.tablename in (
      'barbearias',
      'perfis',
      'membros_barbearia',
      'clientes',
      'atribuicoes_cliente'
    );

  if v_total_policies_publicas <> 14 then
    raise exception using
      errcode = '55000',
      message = 'Rollback incompleto: existem policies públicas fora da baseline restaurada.',
      detail = 'Policies públicas encontradas: ' || v_total_policies_publicas::text;
  end if;

  if (
    select count(*)
    from storage.buckets as bucket
    where bucket.id in (
      'barbervision-hair-sources',
      'barbervision-hair-cutouts',
      'barbervision-selfies'
    )
      and bucket.public = false
  ) <> 3 then
    raise exception using
      errcode = '55000',
      message = 'Rollback incompleto: os três buckets da baseline não permanecem privados.';
  end if;

  foreach v_funcao in array array[
    'private.usuario_conta_ativa()',
    'private.usuario_eh_membro(uuid)',
    'private.usuario_eh_dono(uuid)',
    'private.usuario_pode_ver_perfil(uuid)',
    'private.usuario_pode_ver_cliente(uuid,uuid)',
    'private.usuario_eh_dono_do_storage_path(text)'
  ] loop
    if not pg_catalog.has_function_privilege(
      'authenticated',
      v_funcao,
      'EXECUTE'
    )
    or not pg_catalog.has_function_privilege(
      'service_role',
      v_funcao,
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      v_funcao,
      'EXECUTE'
    ) then
      raise exception using
        errcode = '55000',
        message = 'Rollback incompleto: ACL de helper não corresponde à baseline.',
        detail = 'Helper: ' || v_funcao;
    end if;
  end loop;
end;
$$;

commit;
