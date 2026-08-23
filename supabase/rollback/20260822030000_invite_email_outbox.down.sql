drop function if exists public.concluir_convite_email(uuid, uuid, boolean, boolean, text);
drop function if exists public.reivindicar_convites_email(uuid, integer);
drop trigger if exists convites_barbearia_enfileirar_email on public.convites_barbearia;
drop function if exists private.enfileirar_convite_email();
drop table if exists public.convite_email_outbox;
drop type if exists public.status_convite_email_outbox;
