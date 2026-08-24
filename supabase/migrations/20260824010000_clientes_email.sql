begin;

alter table public.clientes
  add column email text,
  add column email_normalizado text;

alter table public.clientes
  add constraint clientes_email_preenchido check (
    email is not null
    and email_normalizado is not null
  ) not valid,
  add constraint clientes_email_valido check (
    char_length(email_normalizado) between 6 and 254
    and email_normalizado = lower(btrim(email_normalizado))
    and email_normalizado ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) not valid,
  add constraint clientes_email_coerente check (
    email_normalizado = lower(btrim(email))
  ) not valid;

create index clientes_tenant_email_idx
  on public.clientes (barbearia_id, email_normalizado);

comment on column public.clientes.email is
  'E-mail informado pelo cliente no fluxo público.';
comment on column public.clientes.email_normalizado is
  'E-mail em minúsculas usado para busca e validação.';

commit;
