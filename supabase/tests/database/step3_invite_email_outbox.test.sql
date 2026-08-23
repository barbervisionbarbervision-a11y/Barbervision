begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(21);

select has_table('public', 'convite_email_outbox', 'outbox de convite existe');
select ok((select relrowsecurity from pg_class where oid='public.convite_email_outbox'::regclass), 'RLS habilitado');
select ok(not has_table_privilege('authenticated','public.convite_email_outbox','SELECT'), 'authenticated não lê outbox');
select ok(not has_table_privilege('service_role','public.convite_email_outbox','SELECT'), 'service_role usa somente RPC');
select function_privs_are('public','reivindicar_convites_email',array['uuid','integer'],'service_role',array['EXECUTE'],'claim é server-only');
select function_privs_are('public','concluir_convite_email',array['uuid','uuid','boolean','boolean','text'],'service_role',array['EXECUTE'],'conclusão é server-only');

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','99000000-0000-4000-8000-000000000001','authenticated','authenticated','outbox-owner@test.invalid','',now(),'{}','{}',now(),now());
insert into public.perfis(usuario_id,nome) values ('99000000-0000-4000-8000-000000000001','Owner Outbox');
insert into public.barbearias(id,nome,slug,status,criado_por)
values ('99100000-0000-4000-8000-000000000001','Tenant Outbox','tenant-outbox','ativa','99000000-0000-4000-8000-000000000001');
insert into public.membros_barbearia(barbearia_id,usuario_id,papel,status,convidado_por)
values ('99100000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000001','dono','ativo','99000000-0000-4000-8000-000000000001');
insert into public.convites_barbearia(id,barbearia_id,nome,email_normalizado,papel,status,criado_por,expira_em)
values ('99200000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000001','Invite Outbox','invite@test.invalid','funcionario','pendente_envio','99000000-0000-4000-8000-000000000001',now()+interval '7 days');

select is((select count(*)::bigint from public.convite_email_outbox),1::bigint,'trigger enfileira atomicamente');
set local role authenticated;
select throws_ok($$select * from public.reivindicar_convites_email('99300000-0000-4000-8000-000000000001',1)$$,'42501','permission denied for function reivindicar_convites_email','authenticated não reivindica');
reset role;
set local role service_role;
select is((select count(*)::bigint from public.reivindicar_convites_email('99300000-0000-4000-8000-000000000001',1)),1::bigint,'worker reivindica um item');
reset role;
select is((select status::text||':'||tentativas from public.convite_email_outbox),'processando:1','claim cria lease e incrementa tentativa');
select lives_ok($$select set_config('barbervision_test.outbox_id',(select id::text from public.convite_email_outbox),true)$$,'teste preserva o ID da outbox');
set local role service_role;
select is(public.concluir_convite_email(current_setting('barbervision_test.outbox_id')::uuid,'99300000-0000-4000-8000-000000000001',false,true,'smtp_timeout')::text,'pendente','falha retentável volta à fila');
reset role;
select is((select status::text from public.convites_barbearia where id='99200000-0000-4000-8000-000000000001'),'pendente_envio','retry mantém convite aberto');
update public.convite_email_outbox set proxima_tentativa_em=now()-interval '1 second';
set local role service_role;
select is((select count(*)::bigint from public.reivindicar_convites_email('99300000-0000-4000-8000-000000000002',1)),1::bigint,'novo worker reivindica retry disponível');
select is(public.concluir_convite_email(current_setting('barbervision_test.outbox_id')::uuid,'99300000-0000-4000-8000-000000000002',true,false,null)::text,'enviado','sucesso encerra outbox');
reset role;
select is((select status::text from public.convites_barbearia where id='99200000-0000-4000-8000-000000000001'),'enviado','sucesso marca convite enviado');
set local role service_role;
select is(public.concluir_convite_email(current_setting('barbervision_test.outbox_id')::uuid,'99300000-0000-4000-8000-000000000002',true,false,null)::text,'enviado','replay da conclusão é idempotente');
reset role;

insert into public.convites_barbearia(id,barbearia_id,nome,email_normalizado,papel,status,criado_por,created_at,expira_em)
values ('99200000-0000-4000-8000-000000000002','99100000-0000-4000-8000-000000000001','Expired Outbox','expired@test.invalid','funcionario','pendente_envio','99000000-0000-4000-8000-000000000001',now()-interval '8 days',now()-interval '1 day');
set local role service_role;
select is((select count(*)::bigint from public.reivindicar_convites_email('99300000-0000-4000-8000-000000000003',10)),0::bigint,'convite vencido não é reivindicado');
reset role;
select is((select status::text from public.convites_barbearia where id='99200000-0000-4000-8000-000000000002'),'expirado','claim reconcilia expiração');
select is((select status::text from public.convite_email_outbox where convite_id='99200000-0000-4000-8000-000000000002'),'cancelado','outbox vencida é cancelada');
select is((select count(*)::bigint from public.eventos_auditoria where entidade_id='99200000-0000-4000-8000-000000000002' and acao='convite.expirado'),1::bigint,'expiração reconciliada é auditada uma vez');

select * from finish();
rollback;
