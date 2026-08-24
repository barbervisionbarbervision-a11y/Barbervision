begin;

drop index if exists public.clientes_tenant_email_idx;
alter table public.clientes
  drop constraint if exists clientes_email_coerente,
  drop constraint if exists clientes_email_valido,
  drop constraint if exists clientes_email_preenchido,
  drop column if exists email_normalizado,
  drop column if exists email;

commit;
