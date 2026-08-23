create type public.status_convite_email_outbox as enum (
  'pendente', 'processando', 'enviado', 'falhou', 'cancelado'
);

create table public.convite_email_outbox (
  id uuid primary key default gen_random_uuid(),
  convite_id uuid not null unique references public.convites_barbearia(id) on delete cascade,
  barbearia_id uuid not null references public.barbearias(id) on delete cascade,
  status public.status_convite_email_outbox not null default 'pendente',
  tentativas integer not null default 0 check (tentativas between 0 and 20),
  proxima_tentativa_em timestamptz not null default now(),
  bloqueado_ate timestamptz,
  worker_id uuid,
  ultimo_codigo_erro text,
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint convite_email_outbox_erro_valido check (
    ultimo_codigo_erro is null or ultimo_codigo_erro ~ '^[a-z0-9][a-z0-9._-]{0,119}$'
  ),
  constraint convite_email_outbox_estado_coerente check (
    (status = 'processando' and bloqueado_ate is not null and worker_id is not null)
    or (status <> 'processando' and bloqueado_ate is null and worker_id is null)
  )
);

create index convite_email_outbox_disponivel_idx
  on public.convite_email_outbox (proxima_tentativa_em, created_at)
  where status in ('pendente', 'processando');

create trigger convite_email_outbox_updated_at
before update on public.convite_email_outbox
for each row execute function private.definir_updated_at();

create function private.enfileirar_convite_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.convite_email_outbox (convite_id, barbearia_id)
  values (new.id, new.barbearia_id)
  on conflict (convite_id) do nothing;
  return new;
end;
$$;

revoke all on function private.enfileirar_convite_email() from public, anon, authenticated, service_role;

create trigger convites_barbearia_enfileirar_email
after insert on public.convites_barbearia
for each row execute function private.enfileirar_convite_email();

alter table public.convite_email_outbox enable row level security;
revoke all on table public.convite_email_outbox from public, anon, authenticated, service_role;
revoke all on type public.status_convite_email_outbox from public, anon, authenticated, service_role;
grant usage on type public.status_convite_email_outbox to service_role;

create function public.reivindicar_convites_email(
  p_worker_id uuid,
  p_limite integer default 10
)
returns table (
  outbox_id uuid,
  convite_id uuid,
  barbearia_id uuid,
  email text,
  nome text,
  tentativa integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expirado record;
begin
  if p_worker_id is null or p_limite not between 1 and 50 then
    raise exception using errcode = '22023', message = 'Worker e limite válidos são obrigatórios.';
  end if;

  for v_expirado in
    select convite.id, convite.barbearia_id
    from public.convites_barbearia as convite
    where convite.status in ('pendente_envio', 'enviado') and convite.expira_em <= now()
    for update skip locked
  loop
    update public.convites_barbearia
    set status = 'expirado', expirado_em = coalesce(expirado_em, now())
    where id = v_expirado.id;
    perform private.registrar_evento_auditoria(
      v_expirado.barbearia_id, null, null, 'sistema', 'convite.expirado',
      'convite', v_expirado.id, '{}'::jsonb
    );
  end loop;

  update public.convite_email_outbox as fila
  set status = 'cancelado', bloqueado_ate = null, worker_id = null
  from public.convites_barbearia as convite
  where convite.id = fila.convite_id
    and fila.status in ('pendente', 'processando')
    and convite.status in ('aceito', 'revogado', 'expirado', 'falhou');

  return query
  with candidatos as (
    select fila.id
    from public.convite_email_outbox as fila
    join public.convites_barbearia as convite on convite.id = fila.convite_id
    where convite.status = 'pendente_envio'
      and fila.proxima_tentativa_em <= now()
      and (
        fila.status = 'pendente'
        or (fila.status = 'processando' and fila.bloqueado_ate <= now())
      )
    order by fila.proxima_tentativa_em, fila.created_at
    for update of fila skip locked
    limit p_limite
  ), reivindicados as (
    update public.convite_email_outbox as fila
    set status = 'processando', tentativas = fila.tentativas + 1,
        bloqueado_ate = now() + interval '5 minutes', worker_id = p_worker_id
    from candidatos
    where fila.id = candidatos.id
    returning fila.*
  )
  select fila.id, convite.id, convite.barbearia_id, convite.email_normalizado,
         convite.nome, fila.tentativas
  from reivindicados as fila
  join public.convites_barbearia as convite on convite.id = fila.convite_id;
end;
$$;

create function public.concluir_convite_email(
  p_outbox_id uuid,
  p_worker_id uuid,
  p_sucesso boolean,
  p_retentavel boolean default true,
  p_codigo_erro text default null
)
returns public.status_convite_email_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila public.convite_email_outbox%rowtype;
  v_codigo text := lower(btrim(p_codigo_erro));
  v_status public.status_convite_email_outbox;
begin
  if p_outbox_id is null or p_worker_id is null or p_sucesso is null then
    raise exception using errcode = '22004', message = 'Conclusão de outbox inválida.';
  end if;
  select * into v_fila from public.convite_email_outbox where id = p_outbox_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Item de outbox não encontrado.'; end if;
  if v_fila.status in ('enviado', 'falhou', 'cancelado') then return v_fila.status; end if;
  if v_fila.status <> 'processando' or v_fila.worker_id <> p_worker_id then
    raise exception using errcode = '55000', message = 'Lease da outbox não pertence ao worker.';
  end if;

  if p_sucesso then
    perform public.marcar_convite_enviado(v_fila.convite_id);
    update public.convite_email_outbox set status = 'enviado', enviado_em = now(),
      bloqueado_ate = null, worker_id = null, ultimo_codigo_erro = null where id = p_outbox_id
    returning status into v_status;
  elsif p_retentavel and v_fila.tentativas < 5 then
    if v_codigo is null or v_codigo !~ '^[a-z0-9][a-z0-9._-]{0,119}$' then v_codigo := 'delivery_retryable'; end if;
    update public.convite_email_outbox set status = 'pendente',
      proxima_tentativa_em = now() + make_interval(secs => least(900, 15 * (2 ^ (v_fila.tentativas - 1)))::integer),
      bloqueado_ate = null, worker_id = null, ultimo_codigo_erro = v_codigo where id = p_outbox_id
    returning status into v_status;
  else
    if v_codigo is null or v_codigo !~ '^[a-z0-9][a-z0-9._-]{0,119}$' then v_codigo := 'delivery_failed'; end if;
    perform public.marcar_convite_falhou(v_fila.convite_id, v_codigo);
    update public.convite_email_outbox set status = 'falhou', bloqueado_ate = null,
      worker_id = null, ultimo_codigo_erro = v_codigo where id = p_outbox_id
    returning status into v_status;
  end if;
  return v_status;
end;
$$;

revoke all on function public.reivindicar_convites_email(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.concluir_convite_email(uuid, uuid, boolean, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.reivindicar_convites_email(uuid, integer) to service_role;
grant execute on function public.concluir_convite_email(uuid, uuid, boolean, boolean, text) to service_role;

comment on table public.convite_email_outbox is 'Fila server-only durável e idempotente para entrega de convites.';
