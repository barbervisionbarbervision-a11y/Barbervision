begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(112);

-- Estrutura, RLS, ACLs e contratos da migration 5.
select has_table('public', 'convites_barbearia', 'convites_barbearia existe');
select has_table('public', 'eventos_auditoria', 'eventos_auditoria existe');
select function_privs_are(
  'public',
  'localizar_usuario_auth_por_email',
  array['text'],
  'service_role',
  array['EXECUTE'],
  'somente service_role resolve identidade Auth por e-mail'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.convites_barbearia'::regclass),
  'RLS habilitado em convites_barbearia'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.eventos_auditoria'::regclass),
  'RLS habilitado em eventos_auditoria'
);
select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'convites_barbearia_select_dono',
        'eventos_auditoria_select_dono'
      )
  ),
  2::bigint,
  'as duas policies de leitura privilegiada existem'
);

select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario',
        'revogar_convite_barbearia',
        'aceitar_convite_barbearia',
        'marcar_convite_enviado',
        'marcar_convite_falhou',
        'provisionar_dono_controlado',
        'suspender_funcionario',
        'reativar_funcionario',
        'revogar_funcionario'
      )
  ),
  9::bigint,
  'as nove RPCs estreitas existem'
);
select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario',
        'revogar_convite_barbearia',
        'aceitar_convite_barbearia',
        'marcar_convite_enviado',
        'marcar_convite_falhou',
        'provisionar_dono_controlado',
        'suspender_funcionario',
        'reativar_funcionario',
        'revogar_funcionario'
      )
      and procedimento.prorettype = 'uuid'::regtype
  ),
  9::bigint,
  'as nove RPCs retornam UUID'
);
select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario',
        'revogar_convite_barbearia',
        'aceitar_convite_barbearia',
        'marcar_convite_enviado',
        'marcar_convite_falhou',
        'provisionar_dono_controlado',
        'suspender_funcionario',
        'reativar_funcionario',
        'revogar_funcionario'
      )
      and procedimento.prosecdef
  ),
  9::bigint,
  'as nove RPCs usam SECURITY DEFINER'
);
select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario',
        'revogar_convite_barbearia',
        'aceitar_convite_barbearia',
        'marcar_convite_enviado',
        'marcar_convite_falhou',
        'provisionar_dono_controlado',
        'suspender_funcionario',
        'reativar_funcionario',
        'revogar_funcionario'
      )
      and exists (
        select 1
        from unnest(procedimento.proconfig) as configuracao(valor)
        where split_part(configuracao.valor, '=', 1) = 'search_path'
          and split_part(configuracao.valor, '=', 2) in ('', '""')
      )
  ),
  9::bigint,
  'as nove RPCs fixam search_path vazio'
);

select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario', 'revogar_convite_barbearia',
        'aceitar_convite_barbearia', 'marcar_convite_enviado',
        'marcar_convite_falhou', 'provisionar_dono_controlado',
        'suspender_funcionario', 'reativar_funcionario',
        'revogar_funcionario'
      )
      and has_function_privilege('public', procedimento.oid, 'EXECUTE')
  ),
  0::bigint,
  'PUBLIC não executa RPCs privilegiadas'
);
select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario', 'revogar_convite_barbearia',
        'aceitar_convite_barbearia', 'marcar_convite_enviado',
        'marcar_convite_falhou', 'provisionar_dono_controlado',
        'suspender_funcionario', 'reativar_funcionario',
        'revogar_funcionario'
      )
      and has_function_privilege('anon', procedimento.oid, 'EXECUTE')
  ),
  0::bigint,
  'anon não executa RPCs privilegiadas'
);
select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario', 'revogar_convite_barbearia',
        'aceitar_convite_barbearia', 'marcar_convite_enviado',
        'marcar_convite_falhou', 'provisionar_dono_controlado',
        'suspender_funcionario', 'reativar_funcionario',
        'revogar_funcionario'
      )
      and has_function_privilege('authenticated', procedimento.oid, 'EXECUTE')
  ),
  6::bigint,
  'authenticated executa somente as seis RPCs de usuário'
);
select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'public'
      and procedimento.proname in (
        'criar_convite_funcionario', 'revogar_convite_barbearia',
        'aceitar_convite_barbearia', 'marcar_convite_enviado',
        'marcar_convite_falhou', 'provisionar_dono_controlado',
        'suspender_funcionario', 'reativar_funcionario',
        'revogar_funcionario'
      )
      and has_function_privilege('service_role', procedimento.oid, 'EXECUTE')
  ),
  3::bigint,
  'service_role executa somente as três RPCs de sistema'
);

select ok(not has_table_privilege('authenticated', 'public.convites_barbearia', 'INSERT'), 'authenticated não insere convite diretamente');
select ok(not has_table_privilege('authenticated', 'public.convites_barbearia', 'UPDATE'), 'authenticated não atualiza convite diretamente');
select ok(not has_table_privilege('authenticated', 'public.eventos_auditoria', 'DELETE'), 'authenticated não apaga auditoria');
select ok(has_table_privilege('authenticated', 'public.convites_barbearia', 'SELECT'), 'authenticated recebe SELECT de convite sob RLS');
select ok(has_table_privilege('authenticated', 'public.eventos_auditoria', 'SELECT'), 'authenticated recebe SELECT de auditoria sob RLS');
select ok(not has_table_privilege('service_role', 'public.convites_barbearia', 'INSERT'), 'service_role não insere convite diretamente');
select ok(not has_table_privilege('service_role', 'public.eventos_auditoria', 'INSERT'), 'service_role não insere auditoria diretamente');
select ok(not has_table_privilege('service_role', 'public.membros_barbearia', 'INSERT'), 'service_role não insere membership diretamente');
select ok(not has_table_privilege('service_role', 'public.membros_barbearia', 'UPDATE'), 'service_role não atualiza membership diretamente');
select ok(not has_column_privilege('authenticated', 'public.atribuicoes_cliente', 'usuario_id', 'UPDATE'), 'authenticated não reatribui cliente diretamente');
select ok(not has_table_privilege('service_role', 'public.atribuicoes_cliente', 'UPDATE'), 'service_role não atualiza atribuição diretamente');

select is(
  (
    select count(*)::bigint
    from pg_constraint
    where conname in (
      'barbearias_criado_por_fkey',
      'clientes_criado_por_fkey',
      'membros_barbearia_convidado_por_fkey',
      'atribuicoes_cliente_atribuido_por_fkey'
    )
  ),
  0::bigint,
  'as quatro proveniências são UUIDs históricos sem FK destrutiva'
);
select is(
  (
    select count(*)::bigint
    from pg_type as tipo
    join pg_namespace as esquema on esquema.oid = tipo.typnamespace
    where esquema.nspname = 'public'
      and tipo.typname in (
        'status_convite_barbearia',
        'origem_evento_auditoria',
        'acao_evento_auditoria'
      )
      and has_type_privilege('public', tipo.oid, 'USAGE')
  ),
  0::bigint,
  'PUBLIC não recebe USAGE nos tipos novos'
);
select is(
  (
    select count(*)::bigint
    from pg_type as tipo
    join pg_namespace as esquema on esquema.oid = tipo.typnamespace
    where esquema.nspname = 'public'
      and tipo.typname in (
        'status_convite_barbearia',
        'origem_evento_auditoria',
        'acao_evento_auditoria'
      )
      and has_type_privilege('authenticated', tipo.oid, 'USAGE')
  ),
  3::bigint,
  'authenticated recebe USAGE nos três tipos necessários'
);
select is(
  (
    select count(*)::bigint
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'convites_barbearia_definir_updated_at',
        'eventos_auditoria_append_only',
        'eventos_auditoria_bloquear_truncate',
        'membros_00_travar_tenant',
        'perfis_proteger_dono_ativo'
      )
  ),
  5::bigint,
  'as cinco guardas por trigger existem'
);
select ok(
  to_regclass('public.convites_barbearia_aberto_email_unico_idx') is not null,
  'índice parcial impede convite aberto duplicado'
);

-- Fixtures isoladas; o ROLLBACK final remove tudo.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-step3@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'employee-step3@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'invitee-step3@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'unconfirmed-step3@test.invalid', '', null, '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'outsider-step3@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'owner-b-step3@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'employee-b-step3@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'expired-step3@test.invalid', '', now(), '{}', '{}', now(), now());

insert into public.perfis (usuario_id, nome)
values
  ('94000000-0000-4000-8000-000000000001', 'Owner Step 3'),
  ('94000000-0000-4000-8000-000000000002', 'Employee Step 3'),
  ('94000000-0000-4000-8000-000000000006', 'Owner B Step 3'),
  ('94000000-0000-4000-8000-000000000007', 'Employee B Step 3');

insert into public.barbearias (id, nome, slug, status, criado_por)
values
  ('95000000-0000-4000-8000-000000000001', 'Tenant Step 3 A', 'tenant-step3-a', 'ativa', '94000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000002', 'Tenant Step 3 B', 'tenant-step3-b', 'ativa', '94000000-0000-4000-8000-000000000006');

insert into public.membros_barbearia (barbearia_id, usuario_id, papel, status, convidado_por)
values
  ('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000001', 'dono', 'ativo', '94000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002', 'funcionario', 'ativo', '94000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000006', 'dono', 'ativo', '94000000-0000-4000-8000-000000000006'),
  ('95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000007', 'funcionario', 'ativo', '94000000-0000-4000-8000-000000000006');

insert into public.clientes (id, barbearia_id, nome, email, email_normalizado, whatsapp, whatsapp_normalizado, criado_por)
values
  ('96000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'Cliente Step 3 A', 'cliente-step3-a@teste.invalid', 'cliente-step3-a@teste.invalid', '5585900000301', '5585900000301', '94000000-0000-4000-8000-000000000001'),
  ('96000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', 'Cliente Step 3 B', 'cliente-step3-b@teste.invalid', 'cliente-step3-b@teste.invalid', '5585900000302', '5585900000302', '94000000-0000-4000-8000-000000000006');

insert into public.atribuicoes_cliente (barbearia_id, cliente_id, usuario_id, atribuido_por)
values
  ('95000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000002', '96000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000007', '94000000-0000-4000-8000-000000000006');

-- Dono confirmado em AAL1: MFA opcional preserva o acesso do dono.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal1"}';

select ok(private.usuario_tem_aal2(), 'compatibilidade libera dono permanente sem exigir TOTP');
select is((select count(*)::bigint from public.barbearias), 1::bigint, 'dono AAL1 vê o próprio tenant');
select is((select count(*)::bigint from public.clientes), 1::bigint, 'dono AAL1 vê clientes do próprio tenant');
select is((select count(*)::bigint from public.atribuicoes_cliente), 1::bigint, 'dono AAL1 vê atribuições do próprio tenant');
select is((select count(*)::bigint from public.membros_barbearia), 2::bigint, 'dono AAL1 vê memberships do próprio tenant');
select ok(
  private.usuario_eh_dono_do_storage_path(
    '95000000-0000-4000-8000-000000000001/97000000-0000-4000-8000-000000000001/cutout.webp'
  ),
  'dono AAL1 usa Storage privado do próprio tenant'
);
select lives_ok(
  $$select private.usuario_tem_aal2()$$,
  'dono AAL1 satisfaz a autorização usada para criar convite'
);

-- Claim aal ausente também é aceito para dono permanente.
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}';
select ok(private.usuario_tem_aal2(), 'claim aal ausente não torna TOTP obrigatório');

-- Funcionário confirmado continua operando em AAL1 no próprio escopo.
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}';
select is((select count(*)::bigint from public.barbearias), 1::bigint, 'funcionário AAL1 vê o próprio tenant');
select is((select count(*)::bigint from public.clientes), 1::bigint, 'funcionário AAL1 vê somente cliente atribuído');

-- E-mail não confirmado corta negócio sem impedir a leitura mínima de bootstrap.
reset role;
update auth.users
set email_confirmed_at = null
where id = '94000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select ok(not private.usuario_email_confirmado(), 'estado autoritativo nega e-mail não confirmado');
select is((select count(*)::bigint from public.barbearias), 0::bigint, 'e-mail não confirmado não acessa negócio');
select is((select count(*)::bigint from public.membros_barbearia), 1::bigint, 'e-mail não confirmado ainda lê a própria membership de bootstrap');

reset role;
update auth.users
set email_confirmed_at = now()
where id = '94000000-0000-4000-8000-000000000001';

-- Dono confirmado em AAL2.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select ok(private.usuario_tem_aal2(), 'AAL2 satisfaz step-up do dono');
select ok(private.usuario_email_confirmado(), 'dono possui e-mail confirmado no Auth');
select is((select count(*)::bigint from public.barbearias), 1::bigint, 'dono AAL2 vê somente o próprio tenant');
select is((select count(*)::bigint from public.clientes), 1::bigint, 'dono AAL2 vê os clientes do próprio tenant');
select ok(
  private.usuario_eh_dono_do_storage_path(
    '95000000-0000-4000-8000-000000000001/97000000-0000-4000-8000-000000000001/cutout.webp'
  ),
  'dono AAL2 usa path privado do próprio tenant'
);

-- Convite destinado ao usuário confirmado.
select lives_ok(
  $$
    select set_config(
      'barbervision_test.convite_aceite',
      public.criar_convite_funcionario(
        '95000000-0000-4000-8000-000000000001',
        '  INVITEE-STEP3@TEST.INVALID  ',
        'Convidado Step 3'
      )::text,
      true
    )
  $$,
  'dono AAL2 cria convite e preserva o UUID para o aceite'
);
select is(
  (
    select status::text || ':' || email_normalizado
    from public.convites_barbearia
    where id = current_setting('barbervision_test.convite_aceite')::uuid
  ),
  'pendente_envio:invitee-step3@test.invalid',
  'convite nasce pendente e com e-mail normalizado'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_aceite')::uuid
      and acao = 'convite.criado'
  ),
  1::bigint,
  'criação efetiva gera um evento'
);
select throws_ok(
  $$select public.criar_convite_funcionario('95000000-0000-4000-8000-000000000001', 'invitee-step3@test.invalid', 'Duplicado')$$,
  '23505',
  'Já existe convite aberto para esse e-mail.',
  'convite aberto duplicado é rejeitado'
);

-- Convite que será enviado e revogado.
select lives_ok(
  $$
    select set_config(
      'barbervision_test.convite_revogado',
      public.criar_convite_funcionario(
        '95000000-0000-4000-8000-000000000001',
        'revoked-step3@test.invalid',
        'Revogado Step 3'
      )::text,
      true
    )
  $$,
  'dono cria segundo convite para testar envio e revogação'
);
select throws_ok(
  $$select public.marcar_convite_enviado(current_setting('barbervision_test.convite_revogado')::uuid)$$,
  '42501',
  'permission denied for function marcar_convite_enviado',
  'authenticated não chama RPC service-only'
);

reset role;
set local role service_role;
select lives_ok(
  $$select public.marcar_convite_enviado(current_setting('barbervision_test.convite_revogado')::uuid)$$,
  'service_role marca convite como enviado'
);
select is(
  (
    select status::text
    from public.convites_barbearia
    where id = current_setting('barbervision_test.convite_revogado')::uuid
  ),
  'enviado',
  'convite transiciona para enviado'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_revogado')::uuid
      and acao = 'convite.enviado'
  ),
  1::bigint,
  'envio efetivo gera um evento de sistema'
);
select lives_ok(
  $$select public.marcar_convite_enviado(current_setting('barbervision_test.convite_revogado')::uuid)$$,
  'replay de envio é no-op idempotente'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_revogado')::uuid
      and acao = 'convite.enviado'
  ),
  1::bigint,
  'replay de envio não duplica auditoria'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select lives_ok(
  $$select public.revogar_convite_barbearia(current_setting('barbervision_test.convite_revogado')::uuid)$$,
  'dono revoga convite enviado'
);
select is(
  (
    select status::text
    from public.convites_barbearia
    where id = current_setting('barbervision_test.convite_revogado')::uuid
  ),
  'revogado',
  'convite fica revogado'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_revogado')::uuid
      and acao = 'convite.revogado'
  ),
  1::bigint,
  'revogação efetiva gera um evento'
);
select lives_ok(
  $$select public.revogar_convite_barbearia(current_setting('barbervision_test.convite_revogado')::uuid)$$,
  'replay da revogação é no-op idempotente'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_revogado')::uuid
      and acao = 'convite.revogado'
  ),
  1::bigint,
  'replay da revogação não duplica auditoria'
);

-- Convite de conta ainda não confirmada: mismatch e confirmação são autoritativos.
select lives_ok(
  $$
    select set_config(
      'barbervision_test.convite_nao_confirmado',
      public.criar_convite_funcionario(
        '95000000-0000-4000-8000-000000000001',
        'unconfirmed-step3@test.invalid',
        'Não Confirmado Step 3'
      )::text,
      true
    )
  $$,
  'dono cria convite para conta ainda não confirmada'
);

set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000005","role":"authenticated","is_anonymous":false}';
select throws_ok(
  $$select public.aceitar_convite_barbearia(current_setting('barbervision_test.convite_nao_confirmado')::uuid)$$,
  '42501',
  'A conta confirmada não corresponde ao e-mail do convite.',
  'conta confirmada com outro e-mail não aceita convite'
);

set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}';
select throws_ok(
  $$select public.aceitar_convite_barbearia(current_setting('barbervision_test.convite_nao_confirmado')::uuid)$$,
  '42501',
  'A conta precisa ter um e-mail confirmado.',
  'conta correta sem confirmação não aceita convite'
);

-- Expiração é validada sem depender apenas do token do Auth.
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select lives_ok(
  $$
    select set_config(
      'barbervision_test.convite_expirado',
      public.criar_convite_funcionario(
        '95000000-0000-4000-8000-000000000001',
        'expired-step3@test.invalid',
        'Expirado Step 3'
      )::text,
      true
    )
  $$,
  'dono cria convite que será vencido pelo teste'
);

reset role;
update public.convites_barbearia
set
  created_at = now() - interval '8 days',
  expira_em = now() - interval '1 day'
where id = current_setting('barbervision_test.convite_expirado')::uuid;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000008","role":"authenticated","is_anonymous":false}';
select throws_ok(
  $$select public.aceitar_convite_barbearia(current_setting('barbervision_test.convite_expirado')::uuid)$$,
  '55000',
  'Este convite expirou.',
  'aceite rejeita convite vencido'
);

set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select lives_ok(
  $$select public.revogar_convite_barbearia(current_setting('barbervision_test.convite_expirado')::uuid)$$,
  'toque do dono materializa convite vencido como expirado'
);
select is(
  (
    select status::text
    from public.convites_barbearia
    where id = current_setting('barbervision_test.convite_expirado')::uuid
  ),
  'expirado',
  'convite vencido fica expirado, não revogado'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_expirado')::uuid
      and acao = 'convite.expirado'
  ),
  1::bigint,
  'materialização da expiração gera um evento'
);

-- Aceite válido cria perfil e membership atomicamente; replay não duplica evento.
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}';
select lives_ok(
  $$select public.aceitar_convite_barbearia(current_setting('barbervision_test.convite_aceite')::uuid)$$,
  'conta confirmada aceita o próprio convite sem exigir AAL2'
);
select is(
  (
    select nome
    from public.perfis
    where usuario_id = '94000000-0000-4000-8000-000000000003'
  ),
  'Convidado Step 3',
  'aceite cria perfil usando o nome autoritativo do convite'
);
select is(
  (
    select papel::text || ':' || status::text
    from public.membros_barbearia
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and usuario_id = '94000000-0000-4000-8000-000000000003'
  ),
  'funcionario:ativo',
  'aceite cria membership ativa de funcionário'
);

reset role;
select is(
  (
    select status::text || ':' || aceito_por::text
    from public.convites_barbearia
    where id = current_setting('barbervision_test.convite_aceite')::uuid
  ),
  'aceito:94000000-0000-4000-8000-000000000003',
  'convite registra estado e identidade histórica do aceite'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_aceite')::uuid
      and acao = 'convite.aceito'
  ),
  1::bigint,
  'aceite efetivo gera um evento'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}';
select lives_ok(
  $$select public.aceitar_convite_barbearia(current_setting('barbervision_test.convite_aceite')::uuid)$$,
  'replay do aceite pela mesma conta é idempotente'
);
reset role;
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where entidade_id = current_setting('barbervision_test.convite_aceite')::uuid
      and acao = 'convite.aceito'
  ),
  1::bigint,
  'replay do aceite não duplica auditoria'
);

-- Lifecycle do funcionário: AAL2, transições estreitas, atribuições e replay.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal1"}';
select ok(
  private.usuario_tem_aal2(),
  'dono AAL1 satisfaz a autorização usada no lifecycle de funcionário'
);

set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select lives_ok(
  $$select public.suspender_funcionario('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')$$,
  'dono AAL2 suspende funcionário ativo'
);
select is(
  (
    select status::text
    from public.membros_barbearia
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and usuario_id = '94000000-0000-4000-8000-000000000002'
  ),
  'suspenso',
  'membership fica suspensa'
);
select is(
  (select nome from public.perfis where usuario_id = '94000000-0000-4000-8000-000000000002'),
  'Employee Step 3',
  'dono AAL2 mantém leitura do perfil do funcionário suspenso'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and alvo_usuario_id = '94000000-0000-4000-8000-000000000002'
      and acao = 'funcionario.suspenso'
  ),
  1::bigint,
  'suspensão efetiva gera um evento'
);
select lives_ok(
  $$select public.suspender_funcionario('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')$$,
  'replay da suspensão é no-op'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and alvo_usuario_id = '94000000-0000-4000-8000-000000000002'
      and acao = 'funcionario.suspenso'
  ),
  1::bigint,
  'replay da suspensão não duplica auditoria'
);
select lives_ok(
  $$select public.reativar_funcionario('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')$$,
  'dono reativa funcionário suspenso e confirmado'
);
select is(
  (
    select status::text
    from public.membros_barbearia
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and usuario_id = '94000000-0000-4000-8000-000000000002'
  ),
  'ativo',
  'membership volta a ativa'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and alvo_usuario_id = '94000000-0000-4000-8000-000000000002'
      and acao = 'funcionario.reativado'
  ),
  1::bigint,
  'reativação efetiva gera um evento'
);
select lives_ok(
  $$select public.reativar_funcionario('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')$$,
  'replay da reativação é no-op'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and alvo_usuario_id = '94000000-0000-4000-8000-000000000002'
      and acao = 'funcionario.reativado'
  ),
  1::bigint,
  'replay da reativação não duplica auditoria'
);
select throws_ok(
  $$select public.suspender_funcionario('95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000007')$$,
  '42501',
  'Somente o dono em AAL2 pode suspender funcionários.',
  'dono não gerencia funcionário de outro tenant'
);
select lives_ok(
  $$select public.revogar_funcionario('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')$$,
  'dono revoga funcionário ativo'
);
select is(
  (
    select status::text
    from public.membros_barbearia
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and usuario_id = '94000000-0000-4000-8000-000000000002'
  ),
  'revogado',
  'membership fica revogada'
);
select is(
  (select nome from public.perfis where usuario_id = '94000000-0000-4000-8000-000000000002'),
  'Employee Step 3',
  'dono AAL2 mantém leitura do perfil do funcionário revogado'
);
select is(
  (
    select count(*)::bigint
    from public.atribuicoes_cliente
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and usuario_id = '94000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'revogação remove todas as atribuições do funcionário'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and alvo_usuario_id = '94000000-0000-4000-8000-000000000002'
      and acao = 'funcionario.revogado'
  ),
  1::bigint,
  'revogação efetiva gera um evento'
);
select is(
  (
    select (metadados ->> 'atribuicoes_removidas')::integer
    from public.eventos_auditoria
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and alvo_usuario_id = '94000000-0000-4000-8000-000000000002'
      and acao = 'funcionario.revogado'
  ),
  1,
  'auditoria registra quantas atribuições foram removidas'
);
select lives_ok(
  $$select public.revogar_funcionario('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')$$,
  'replay da revogação é no-op'
);
select is(
  (
    select count(*)::bigint
    from public.eventos_auditoria
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
      and alvo_usuario_id = '94000000-0000-4000-8000-000000000002'
      and acao = 'funcionario.revogado'
  ),
  1::bigint,
  'replay da revogação não duplica auditoria'
);
select throws_ok(
  $$select public.reativar_funcionario('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000002')$$,
  '55000',
  'Somente funcionário suspenso pode ser reativado diretamente.',
  'membership revogada não é reativada sem novo convite'
);

reset role;
select throws_ok(
  $$
    insert into public.atribuicoes_cliente (
      barbearia_id, cliente_id, usuario_id, atribuido_por
    ) values (
      '95000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000002',
      '94000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  'O responsável precisa ser um membro ativo, com perfil ativo, da mesma barbearia ativa.',
  'atribuição não reaparece para membership revogada'
);
select throws_ok(
  $$
    update public.perfis
    set ativo = false
    where usuario_id = '94000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'Transfira ou encerre as memberships de dono antes de desativar o perfil.',
  'perfil de dono ativo não é desativado sem transferência'
);

-- Auditoria: RLS por tenant, append-only e bloqueio de segredos top-level.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select ok((select count(*) from public.eventos_auditoria) > 0, 'dono AAL2 lê auditoria do próprio tenant');

set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal1"}';
select ok((select count(*) from public.eventos_auditoria) > 0, 'dono AAL1 lê auditoria do próprio tenant');

set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000006","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select is((select count(*)::bigint from public.eventos_auditoria), 0::bigint, 'dono B não lê auditoria do tenant A');

set local "request.jwt.claims" = '{"sub":"94000000-0000-4000-8000-000000000007","role":"authenticated","is_anonymous":false}';
select is((select count(*)::bigint from public.eventos_auditoria), 0::bigint, 'funcionário não lê auditoria privilegiada');

reset role;
select throws_ok(
  $$
    update public.eventos_auditoria
    set metadados = metadados
    where barbearia_id = '95000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'Eventos de auditoria são append-only.',
  'nem postgres atualiza evento append-only'
);
select throws_ok(
  $$delete from public.eventos_auditoria where barbearia_id = '95000000-0000-4000-8000-000000000001'$$,
  '55000',
  'Eventos de auditoria são append-only.',
  'nem postgres apaga evento append-only'
);
select throws_ok(
  $$truncate table public.eventos_auditoria$$,
  '55000',
  'Eventos de auditoria são append-only.',
  'TRUNCATE também é bloqueado'
);
select throws_ok(
  $$
    insert into public.eventos_auditoria (
      barbearia_id, ator_usuario_id, origem, acao,
      entidade, entidade_id, metadados
    ) values (
      '95000000-0000-4000-8000-000000000001',
      null,
      'sistema',
      'convite.falhou',
      'convite',
      '98000000-0000-4000-8000-000000000001',
      '{"token":"segredo"}'::jsonb
    )
  $$,
  '23514',
  'new row for relation "eventos_auditoria" violates check constraint "eventos_auditoria_sem_segredos_obvios"',
  'chave sensível top-level é recusada na auditoria'
);
select throws_ok(
  $$
    insert into public.eventos_auditoria (
      barbearia_id, ator_usuario_id, origem, acao,
      entidade, entidade_id, metadados
    ) values (
      '95000000-0000-4000-8000-000000000001',
      null,
      'usuario',
      'convite.revogado',
      'convite',
      '98000000-0000-4000-8000-000000000002',
      '{}'::jsonb
    )
  $$,
  '23514',
  'new row for relation "eventos_auditoria" violates check constraint "eventos_auditoria_origem_coerente"',
  'evento de usuário exige ator histórico'
);

select * from finish();
rollback;
