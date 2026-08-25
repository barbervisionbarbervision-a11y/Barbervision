begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

select has_column('public', 'clientes', 'consentimento_cadastro_versao', 'cliente registra versão do aceite');
select has_column('public', 'clientes', 'consentimento_cadastro_em', 'cliente registra instante do aceite');
select has_table('public', 'api_rate_limits', 'contador distribuído existe');
select ok((select relrowsecurity from pg_class where oid='public.api_rate_limits'::regclass), 'RLS habilitado no contador');
select ok(not has_table_privilege('anon','public.api_rate_limits','SELECT'), 'anon não lê contadores');
select ok(not has_table_privilege('authenticated','public.api_rate_limits','SELECT'), 'authenticated não lê contadores');
select function_privs_are('public','consumir_limite_api',array['text','integer','integer'],'service_role',array['EXECUTE'],'rate limit é server-only');

set local role service_role;
select is((select permitido from public.consumir_limite_api(repeat('a',64),2,60)),true,'primeira tentativa permitida');
select is((select restante from public.consumir_limite_api(repeat('a',64),2,60)),0,'segunda tentativa consome o restante');
select is((select permitido from public.consumir_limite_api(repeat('a',64),2,60)),false,'terceira tentativa bloqueada');
select ok((select tentar_novamente_em > 0 from public.consumir_limite_api(repeat('a',64),2,60)),'bloqueio informa retry');
reset role;

select throws_ok(
  $$insert into public.clientes (barbearia_id,nome,email,email_normalizado,whatsapp,whatsapp_normalizado,consentimento_cadastro_versao)
    values ('11111111-1111-4111-8111-111111111111','Sem instante','sem-instante@test.invalid','sem-instante@test.invalid','48999990000','48999990000','cadastro-v1')$$,
  '23514', null, 'aceite parcial é recusado'
);
select lives_ok($$select public.consumir_limite_api(repeat('b',64),3,60)$$,'função aceita identificador HMAC válido');

select * from finish();
rollback;

