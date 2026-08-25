begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(59);

-- Estrutura e RLS.
select has_table('public', 'barbearias', 'barbearias existe');
select has_table('public', 'perfis', 'perfis existe');
select has_table('public', 'membros_barbearia', 'membros_barbearia existe');
select has_table('public', 'clientes', 'clientes existe');
select has_table('public', 'atribuicoes_cliente', 'atribuicoes_cliente existe');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.barbearias'::regclass),
  'RLS habilitado em barbearias'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.perfis'::regclass),
  'RLS habilitado em perfis'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.membros_barbearia'::regclass),
  'RLS habilitado em membros_barbearia'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.clientes'::regclass),
  'RLS habilitado em clientes'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.atribuicoes_cliente'::regclass),
  'RLS habilitado em atribuicoes_cliente'
);

select is(
  (
    select count(*)::bigint
    from storage.buckets
    where id in (
      'barbervision-hair-sources',
      'barbervision-hair-cutouts',
      'barbervision-selfies'
    )
      and public = false
  ),
  3::bigint,
  'os três buckets do passo 2 são privados'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'barbervision_storage_%'
  ),
  4::bigint,
  'Storage possui policies de select/insert/update/delete'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'barbervision_storage_%'
      and (
        coalesce(qual, '') like '%barbervision-selfies%'
        or coalesce(with_check, '') like '%barbervision-selfies%'
      )
  ),
  0::bigint,
  'bucket de selfies não recebe policy antes do passo de privacidade'
);

select ok(
  not has_table_privilege('anon', 'public.clientes', 'SELECT'),
  'anon não recebe grant de leitura em clientes'
);
select ok(
  not has_table_privilege('authenticated', 'public.membros_barbearia', 'INSERT'),
  'authenticated não cria membership diretamente'
);
select ok(
  not has_column_privilege('authenticated', 'public.barbearias', 'status', 'UPDATE'),
  'authenticated não altera status da barbearia'
);
select ok(
  not has_column_privilege('authenticated', 'public.perfis', 'ativo', 'UPDATE'),
  'authenticated não reativa o próprio perfil'
);

select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'private'
      and procedimento.proname in (
        'usuario_eh_membro',
        'usuario_eh_dono',
        'usuario_conta_ativa',
        'usuario_pode_gerenciar_tenant',
        'usuario_pode_ver_perfil',
        'usuario_pode_ver_cliente',
        'usuario_eh_dono_do_storage_path',
        'validar_responsavel_atribuicao',
        'proteger_ultimo_dono'
      )
      and procedimento.prosecdef
  ),
  9::bigint,
  'helpers de autorização e invariantes usam SECURITY DEFINER'
);

select is(
  (
    select count(*)::bigint
    from pg_proc as procedimento
    join pg_namespace as esquema on esquema.oid = procedimento.pronamespace
    where esquema.nspname = 'private'
      and procedimento.prosecdef
      and has_function_privilege('public', procedimento.oid, 'EXECUTE')
  ),
  0::bigint,
  'PUBLIC não executa helpers privados de autorização'
);

-- Fixtures isoladas deste teste; o rollback ao final remove tudo.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'employee-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'owner-b@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'suspended-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '90000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'outsider@test.invalid', '', now(), '{}', '{}', now(), now());

insert into public.perfis (usuario_id, nome)
values
  ('90000000-0000-4000-8000-000000000001', 'Owner A Test'),
  ('90000000-0000-4000-8000-000000000002', 'Employee A Test'),
  ('90000000-0000-4000-8000-000000000003', 'Owner B Test'),
  ('90000000-0000-4000-8000-000000000004', 'Suspended A Test'),
  ('90000000-0000-4000-8000-000000000005', 'Outsider Test');

insert into public.barbearias (id, nome, slug, status, criado_por)
values
  ('91000000-0000-4000-8000-000000000001', 'Tenant A Test', 'tenant-a-test', 'ativa', '90000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000002', 'Tenant B Test', 'tenant-b-test', 'ativa', '90000000-0000-4000-8000-000000000003');

insert into public.membros_barbearia (barbearia_id, usuario_id, papel, status)
values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'dono', 'ativo'),
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', 'funcionario', 'ativo'),
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000004', 'funcionario', 'suspenso'),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000003', 'dono', 'ativo');

insert into public.clientes (id, barbearia_id, nome, email, email_normalizado, whatsapp, whatsapp_normalizado)
values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Cliente A1', 'cliente-a1@teste.invalid', 'cliente-a1@teste.invalid', '5585900000101', '5585900000101'),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', 'Cliente A2', 'cliente-a2@teste.invalid', 'cliente-a2@teste.invalid', '5585900000102', '5585900000102'),
  ('92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000002', 'Cliente B1', 'cliente-b1@teste.invalid', 'cliente-b1@teste.invalid', '5585900000201', '5585900000201');

insert into public.atribuicoes_cliente (barbearia_id, cliente_id, usuario_id)
values (
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000002'
);

set local role anon;
select throws_ok(
  $$select count(*) from public.clientes$$,
  '42501',
  'permission denied for table clientes',
  'anon não consulta clientes'
);
reset role;

-- Dono do tenant A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal2"}';

select is((select count(*)::bigint from public.barbearias), 1::bigint, 'dono A vê somente a barbearia A');
select is((select count(*)::bigint from public.clientes), 2::bigint, 'dono A vê todos os clientes do tenant A');
select is((select count(*)::bigint from public.membros_barbearia), 3::bigint, 'dono A vê a equipe do tenant A');
select is((select count(*)::bigint from public.perfis), 3::bigint, 'dono A vê perfis vinculados ao tenant A, inclusive membership inativa');
select is((select count(*)::bigint from public.atribuicoes_cliente), 1::bigint, 'dono A vê atribuições do tenant A');

select throws_ok(
  $$
    insert into public.clientes (
      id,
      barbearia_id,
      nome,
      email,
      email_normalizado,
      whatsapp,
      whatsapp_normalizado
    ) values (
      '92000000-0000-4000-8000-000000000004',
      '91000000-0000-4000-8000-000000000001',
      'Cliente A3',
      'cliente-a3@teste.invalid',
      'cliente-a3@teste.invalid',
      '5585900000103',
      '5585900000103'
    )
  $$,
  '42501',
  'permission denied for table clientes',
  'dono não insere cliente diretamente; cadastro usa endpoint server-only'
);

select throws_ok(
  $$
    insert into public.clientes (
      id,
      barbearia_id,
      nome,
      email,
      email_normalizado,
      whatsapp,
      whatsapp_normalizado
    ) values (
      '92000000-0000-4000-8000-000000000005',
      '91000000-0000-4000-8000-000000000002',
      'Tentativa Cross Tenant',
      'cross-tenant@teste.invalid',
      'cross-tenant@teste.invalid',
      '5585900000991',
      '5585900000991'
    )
  $$,
  '42501',
  'permission denied for table clientes',
  'dono A não cria cliente no tenant B'
);

select lives_ok(
  $$
    do $teste$
    declare
      quantidade_alterada integer;
    begin
      update public.clientes
      set observacoes = 'Atualizado pelo dono A'
      where id = '92000000-0000-4000-8000-000000000001';

      get diagnostics quantidade_alterada = row_count;
      if quantidade_alterada <> 1 then
        raise exception 'esperava alterar 1 cliente, alterou %', quantidade_alterada;
      end if;
    end
    $teste$
  $$,
  'dono A altera cliente do próprio tenant'
);

select lives_ok(
  $$
    do $teste$
    declare
      quantidade_alterada integer;
    begin
      update public.clientes
      set observacoes = 'Tentativa cross tenant'
      where id = '92000000-0000-4000-8000-000000000003';

      get diagnostics quantidade_alterada = row_count;
      if quantidade_alterada <> 0 then
        raise exception 'esperava alterar 0 clientes, alterou %', quantidade_alterada;
      end if;
    end
    $teste$
  $$,
  'dono A não altera cliente do tenant B'
);

select throws_ok(
  $$
    insert into public.membros_barbearia (
      barbearia_id,
      usuario_id,
      papel,
      status
    ) values (
      '91000000-0000-4000-8000-000000000001',
      '90000000-0000-4000-8000-000000000005',
      'dono',
      'ativo'
    )
  $$,
  '42501',
  'permission denied for table membros_barbearia',
  'nem o dono promove membership diretamente pela Data API'
);
reset role;

-- Funcionário ativo do tenant A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}';

select is((select count(*)::bigint from public.clientes), 1::bigint, 'funcionário vê somente o cliente atribuído');
select is((select count(*)::bigint from public.membros_barbearia), 1::bigint, 'funcionário vê somente a própria membership');
select is((select count(*)::bigint from public.perfis), 1::bigint, 'funcionário vê somente o próprio perfil');
select is((select count(*)::bigint from public.atribuicoes_cliente), 1::bigint, 'funcionário vê somente a própria atribuição');

select lives_ok(
  $$
    do $teste$
    declare
      quantidade_alterada integer;
    begin
      update public.clientes
      set observacoes = 'Funcionário tentou alterar'
      where id = '92000000-0000-4000-8000-000000000001';

      get diagnostics quantidade_alterada = row_count;
      if quantidade_alterada <> 0 then
        raise exception 'esperava alterar 0 clientes, alterou %', quantidade_alterada;
      end if;
    end
    $teste$
  $$,
  'funcionário não altera nem o cliente atribuído'
);

select throws_ok(
  $$
    insert into public.clientes (
      id,
      barbearia_id,
      nome,
      email,
      email_normalizado,
      whatsapp,
      whatsapp_normalizado
    ) values (
      '92000000-0000-4000-8000-000000000006',
      '91000000-0000-4000-8000-000000000001',
      'Tentativa do funcionário',
      'funcionario@teste.invalid',
      'funcionario@teste.invalid',
      '5585900000992',
      '5585900000992'
    )
  $$,
  '42501',
  'permission denied for table clientes',
  'funcionário não cria cliente'
);
reset role;

-- Membership suspensa perde acesso ao domínio de negócio.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}';
select is((select count(*)::bigint from public.clientes), 0::bigint, 'membro suspenso não vê clientes');
reset role;

-- Usuário autenticado sem membership.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000005","role":"authenticated","is_anonymous":false}';
select is((select count(*)::bigint from public.clientes), 0::bigint, 'outsider autenticado não vê clientes');
reset role;

-- Anonymous Auth usa o role authenticated, mas é negado pelo claim.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}';
select is((select count(*)::bigint from public.clientes), 0::bigint, 'Auth anônimo não herda a membership do UUID informado');
reset role;

-- user_metadata adulterado nunca concede papel.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000005","role":"authenticated","is_anonymous":false,"user_metadata":{"role":"dono"}}';
select is((select count(*)::bigint from public.clientes), 0::bigint, 'user_metadata adulterado não promove outsider');
reset role;

-- Dono do tenant B.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select is((select count(*)::bigint from public.clientes), 1::bigint, 'dono B vê somente o cliente B');

select ok(
  private.usuario_eh_dono_do_storage_path(
    '91000000-0000-4000-8000-000000000002/93000000-0000-4000-8000-000000000001/cutout.webp'
  ),
  'dono B é autorizado no próprio path privado'
);
select ok(
  not private.usuario_eh_dono_do_storage_path(
    '91000000-0000-4000-8000-000000000001/93000000-0000-4000-8000-000000000001/cutout.webp'
  ),
  'dono B é negado no path do tenant A'
);
select ok(
  not private.usuario_eh_dono_do_storage_path('../segredo.webp'),
  'path de Storage malformado é negado sem cast inseguro'
);
select ok(
  not private.usuario_eh_dono_do_storage_path(
    '91000000-0000-4000-8000-000000000002/93000000-0000-4000-8000-000000000001/pasta/cutout.webp'
  ),
  'path com nível extra é negado'
);
reset role;

-- Perfil inativo perde acesso de negócio mesmo com membership ativa. O alvo é
-- funcionário porque um perfil com papel de dono precisa encerrar ou transferir
-- essa responsabilidade antes de ser desativado.
update public.perfis
set ativo = false
where usuario_id = '90000000-0000-4000-8000-000000000002';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select is((select count(*)::bigint from public.barbearias), 0::bigint, 'perfil inativo não vê barbearia');
select is((select count(*)::bigint from public.clientes), 0::bigint, 'perfil inativo não vê clientes');
select ok(
  not private.usuario_conta_ativa(),
  'perfil inativo não é considerado uma conta de negócio ativa'
);
reset role;

update public.perfis
set ativo = true
where usuario_id = '90000000-0000-4000-8000-000000000002';

-- Tenant suspenso perde leitura, gestão e Storage.
update public.barbearias
set status = 'suspensa'
where id = '91000000-0000-4000-8000-000000000002';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false,"aal":"aal2"}';
select is((select count(*)::bigint from public.barbearias), 0::bigint, 'tenant suspenso não aparece ao dono');
select is((select count(*)::bigint from public.clientes), 0::bigint, 'tenant suspenso não expõe clientes');
select ok(
  not private.usuario_eh_dono_do_storage_path(
    '91000000-0000-4000-8000-000000000002/93000000-0000-4000-8000-000000000001/cutout.webp'
  ),
  'tenant suspenso não usa Storage'
);
reset role;

update public.barbearias
set status = 'ativa'
where id = '91000000-0000-4000-8000-000000000002';

-- Constraints compostas e validação básica independem da interface.
select throws_ok(
  $$
    insert into public.atribuicoes_cliente (
      barbearia_id,
      cliente_id,
      usuario_id
    ) values (
      '91000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000002',
      '90000000-0000-4000-8000-000000000003'
    )
  $$,
  '23514',
  'O responsável precisa ser um membro ativo, com perfil ativo, da mesma barbearia ativa.',
  'validação rejeita responsável de outro tenant antes da FK composta'
);

select throws_ok(
  $$
    insert into public.atribuicoes_cliente (
      barbearia_id,
      cliente_id,
      usuario_id
    ) values (
      '91000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000002',
      '90000000-0000-4000-8000-000000000004'
    )
  $$,
  '23514',
  'O responsável precisa ser um membro ativo, com perfil ativo, da mesma barbearia ativa.',
  'atribuição rejeita membership suspensa'
);

select throws_ok(
  $$
    update public.membros_barbearia
    set papel = 'funcionario'
    where barbearia_id = '91000000-0000-4000-8000-000000000001'
      and usuario_id = '90000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  'Uma barbearia ativa precisa manter ao menos um dono ativo com perfil ativo.',
  'não é possível rebaixar o último dono ativo'
);

select throws_ok(
  $$
    insert into public.barbearias (nome, slug)
    values ('Slug inválido', 'Slug Com Espaço')
  $$,
  '23514',
  'new row for relation "barbearias" violates check constraint "barbearias_slug_normalizado"',
  'slug não normalizado é rejeitado'
);

select throws_ok(
  $$
    insert into public.clientes (
      barbearia_id,
      nome,
      email,
      email_normalizado,
      whatsapp,
      whatsapp_normalizado
    ) values (
      '91000000-0000-4000-8000-000000000001',
      'Telefone inválido',
      'telefone-invalido@teste.invalid',
      'telefone-invalido@teste.invalid',
      '123',
      '123'
    )
  $$,
  '23514',
  'new row for relation "clientes" violates check constraint "clientes_whatsapp_normalizado_valido"',
  'telefone normalizado inválido é rejeitado'
);

select throws_ok(
  $$
    insert into public.clientes (
      barbearia_id,
      nome,
      email,
      email_normalizado,
      whatsapp,
      whatsapp_normalizado
    ) values (
      '91000000-0000-4000-8000-000000000001',
      'Telefone divergente',
      'telefone-divergente@teste.invalid',
      'telefone-divergente@teste.invalid',
      '5585900000777',
      '5585900000888'
    )
  $$,
  '23514',
  'new row for relation "clientes" violates check constraint "clientes_whatsapp_coerente"',
  'telefone exibido e normalizado precisam representar o mesmo número'
);

select throws_ok(
  $$
    insert into public.clientes (
      barbearia_id,
      nome,
      email,
      email_normalizado,
      whatsapp,
      whatsapp_normalizado
    ) values (
      '91000000-0000-4000-8000-000000000001',
      'Telefone duplicado',
      'telefone-duplicado@teste.invalid',
      'telefone-duplicado@teste.invalid',
      '5585900000101',
      '5585900000101'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "clientes_tenant_whatsapp_unico"',
  'telefone normalizado é único dentro do tenant'
);

select ok(
  (select rolbypassrls from pg_roles where rolname = 'service_role'),
  'service_role possui bypass esperado e não é usado como prova das policies'
);

select * from finish();
rollback;
