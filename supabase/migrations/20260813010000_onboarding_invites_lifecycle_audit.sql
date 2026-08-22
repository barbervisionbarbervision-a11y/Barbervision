-- Passo 3 — onboarding controlado, convites, lifecycle de funcionários e
-- auditoria de domínio. Esta migration depende da garantia de e-mail/AAL2 da
-- migration 20260808013000_auth_assurance.sql.

begin;

create type public.status_convite_barbearia as enum (
  'pendente_envio',
  'enviado',
  'aceito',
  'revogado',
  'expirado',
  'falhou'
);

create type public.origem_evento_auditoria as enum (
  'usuario',
  'sistema'
);

create type public.acao_evento_auditoria as enum (
  'barbearia.provisionada',
  'convite.criado',
  'convite.enviado',
  'convite.falhou',
  'convite.revogado',
  'convite.expirado',
  'convite.aceito',
  'funcionario.suspenso',
  'funcionario.reativado',
  'funcionario.revogado'
);

create table public.convites_barbearia (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null
    references public.barbearias(id) on delete restrict,
  nome text not null,
  email_normalizado text not null,
  papel public.papel_membro_barbearia not null default 'funcionario',
  status public.status_convite_barbearia not null default 'pendente_envio',
  -- Proveniência histórica: excluir a conta não reescreve o convite.
  criado_por uuid not null,
  aceito_por uuid,
  revogado_por uuid,
  expira_em timestamptz not null default (now() + interval '7 days'),
  enviado_em timestamptz,
  aceito_em timestamptz,
  revogado_em timestamptz,
  expirado_em timestamptz,
  falhou_em timestamptz,
  codigo_erro text,
  versao integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint convites_barbearia_nome_valido check (
    nome = btrim(nome)
    and char_length(nome) between 2 and 120
    and nome !~ '[[:cntrl:]]'
  ),
  constraint convites_barbearia_email_normalizado check (
    email_normalizado = lower(btrim(email_normalizado))
    and char_length(email_normalizado) between 6 and 254
    and email_normalizado ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$'
    and email_normalizado !~ '^\.'
    and email_normalizado !~ '\.@'
    and email_normalizado !~ '\.\.'
    and email_normalizado !~ '@-'
    and email_normalizado !~ '\.-'
    and email_normalizado !~ '-(\.|$)'
  ),
  constraint convites_barbearia_somente_funcionario check (
    papel = 'funcionario'::public.papel_membro_barbearia
  ),
  constraint convites_barbearia_expiracao_valida check (
    expira_em > created_at
  ),
  constraint convites_barbearia_versao_valida check (versao > 0),
  constraint convites_barbearia_codigo_erro_valido check (
    codigo_erro is null
    or (
      char_length(codigo_erro) between 1 and 120
      and codigo_erro ~ '^[a-z0-9][a-z0-9._-]*$'
    )
  ),
  constraint convites_barbearia_estado_coerente check (
    case status
      when 'pendente_envio'::public.status_convite_barbearia then
        enviado_em is null
        and aceito_em is null and aceito_por is null
        and revogado_em is null and revogado_por is null
        and expirado_em is null
        and falhou_em is null and codigo_erro is null
      when 'enviado'::public.status_convite_barbearia then
        enviado_em is not null
        and aceito_em is null and aceito_por is null
        and revogado_em is null and revogado_por is null
        and expirado_em is null
        and falhou_em is null and codigo_erro is null
      when 'aceito'::public.status_convite_barbearia then
        aceito_em is not null and aceito_por is not null
        and revogado_em is null and revogado_por is null
        and expirado_em is null
        and falhou_em is null and codigo_erro is null
      when 'revogado'::public.status_convite_barbearia then
        aceito_em is null and aceito_por is null
        and revogado_em is not null and revogado_por is not null
        and expirado_em is null
        and falhou_em is null and codigo_erro is null
      when 'expirado'::public.status_convite_barbearia then
        aceito_em is null and aceito_por is null
        and revogado_em is null and revogado_por is null
        and expirado_em is not null
        and falhou_em is null and codigo_erro is null
      when 'falhou'::public.status_convite_barbearia then
        aceito_em is null and aceito_por is null
        and revogado_em is null and revogado_por is null
        and expirado_em is null
        and falhou_em is not null and codigo_erro is not null
      else false
    end
  )
);

create table public.eventos_auditoria (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null
    references public.barbearias(id) on delete restrict,
  -- IDs históricos não têm FK destrutiva: apagar uma conta não pode reescrever
  -- nem impedir a retenção do evento de domínio.
  ator_usuario_id uuid,
  alvo_usuario_id uuid,
  origem public.origem_evento_auditoria not null,
  acao public.acao_evento_auditoria not null,
  entidade text not null,
  entidade_id uuid not null,
  metadados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint eventos_auditoria_entidade_valida check (
    entidade in ('barbearia', 'convite', 'membership')
  ),
  constraint eventos_auditoria_metadados_objeto check (
    jsonb_typeof(metadados) = 'object'
    and octet_length(metadados::text) <= 4096
  ),
  constraint eventos_auditoria_origem_coerente check (
    origem = 'sistema'::public.origem_evento_auditoria
    or ator_usuario_id is not null
  ),
  constraint eventos_auditoria_sem_segredos_obvios check (
    not (
      metadados ?| array[
        'email',
        'senha',
        'password',
        'token',
        'otp',
        'totp',
        'link',
        'selfie',
        'imagem'
      ]::text[]
    )
  )
);

-- Campos de proveniência preservam o UUID histórico sem FK destrutiva. Um
-- DELETE em Auth não deve reescrever autoria nem inverter a ordem de locks
-- entre identidade, tenant, membership e atribuição.
alter table public.membros_barbearia
  drop constraint if exists membros_barbearia_convidado_por_fkey;

alter table public.barbearias
  drop constraint if exists barbearias_criado_por_fkey;

alter table public.clientes
  drop constraint if exists clientes_criado_por_fkey;

alter table public.atribuicoes_cliente
  drop constraint if exists atribuicoes_cliente_atribuido_por_fkey;

create unique index convites_barbearia_aberto_email_unico_idx
  on public.convites_barbearia (barbearia_id, email_normalizado)
  where status in (
    'pendente_envio'::public.status_convite_barbearia,
    'enviado'::public.status_convite_barbearia
  );

create index convites_barbearia_tenant_created_idx
  on public.convites_barbearia (barbearia_id, created_at desc);

create index convites_barbearia_aceito_por_idx
  on public.convites_barbearia (aceito_por, barbearia_id)
  where aceito_por is not null;

create index eventos_auditoria_tenant_created_idx
  on public.eventos_auditoria (barbearia_id, created_at desc, id);

create index eventos_auditoria_alvo_idx
  on public.eventos_auditoria (barbearia_id, alvo_usuario_id, created_at desc)
  where alvo_usuario_id is not null;

create function private.normalizar_email_convite(p_email text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(btrim(p_email));
$$;

create function private.definir_updated_at_e_versao_convite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.versao := old.versao + 1;
  return new;
end;
$$;

create function private.registrar_evento_auditoria(
  p_barbearia_id uuid,
  p_ator_usuario_id uuid,
  p_alvo_usuario_id uuid,
  p_origem public.origem_evento_auditoria,
  p_acao public.acao_evento_auditoria,
  p_entidade text,
  p_entidade_id uuid,
  p_metadados jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento_id uuid;
begin
  if p_barbearia_id is null
     or p_origem is null
     or p_acao is null
     or p_entidade_id is null then
    raise exception using
      errcode = '22004',
      message = 'Evento de auditoria incompleto.';
  end if;

  if p_entidade not in ('barbearia', 'convite', 'membership') then
    raise exception using
      errcode = '22023',
      message = 'Entidade de auditoria inválida.';
  end if;

  if p_metadados is null or jsonb_typeof(p_metadados) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Metadados de auditoria precisam ser um objeto JSON.';
  end if;

  insert into public.eventos_auditoria (
    barbearia_id,
    ator_usuario_id,
    alvo_usuario_id,
    origem,
    acao,
    entidade,
    entidade_id,
    metadados
  )
  values (
    p_barbearia_id,
    p_ator_usuario_id,
    p_alvo_usuario_id,
    p_origem,
    p_acao,
    p_entidade,
    p_entidade_id,
    p_metadados
  )
  returning id into v_evento_id;

  return v_evento_id;
end;
$$;

create function private.bloquear_mutacao_evento_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'Eventos de auditoria são append-only.';
end;
$$;

create function private.travar_tenant_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barbearia_id uuid;
begin
  if tg_op = 'UPDATE'
     and (
       old.barbearia_id is distinct from new.barbearia_id
       or old.usuario_id is distinct from new.usuario_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'A identidade de uma membership não pode ser alterada; encerre-a e use o fluxo adequado.';
  end if;

  v_barbearia_id := case
    when tg_op = 'DELETE' then old.barbearia_id
    else new.barbearia_id
  end;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = v_barbearia_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'A barbearia da membership não existe.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

-- Serializa atribuições com suspensão/revogação. Sem esse lock, uma inserção
-- poderia validar o estado antigo da membership e concluir depois da revogação.
create or replace function private.validar_responsavel_atribuicao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform 1
    from auth.users as usuario
    where usuario.id = new.usuario_id
    for share;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'A conta Auth do responsável não existe.';
    end if;
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = new.barbearia_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'A barbearia da atribuição não existe.';
  end if;

  if not exists (
    select 1
    from public.membros_barbearia as membro
    join public.perfis as perfil
      on perfil.usuario_id = membro.usuario_id
     and perfil.ativo
    join public.barbearias as barbearia
      on barbearia.id = membro.barbearia_id
     and barbearia.status = 'ativa'::public.status_barbearia
    where membro.barbearia_id = new.barbearia_id
      and membro.usuario_id = new.usuario_id
      and membro.status = 'ativo'::public.status_membro_barbearia
  ) then
    raise exception using
      errcode = '23514',
      message = 'O responsável precisa ser um membro ativo, com perfil ativo, da mesma barbearia ativa.';
  end if;

  return new;
end;
$$;

create function private.proteger_perfil_dono_ativo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid;
begin
  if tg_op = 'UPDATE'
     and old.usuario_id is distinct from new.usuario_id then
    raise exception using
      errcode = '23514',
      message = 'A identidade de um perfil não pode ser alterada.';
  end if;

  if tg_op = 'UPDATE'
     and (old.ativo is not true or new.ativo is true) then
    return new;
  end if;

  v_usuario_id := old.usuario_id;

  perform 1
  from public.barbearias as barbearia
  join public.membros_barbearia as membro
    on membro.barbearia_id = barbearia.id
   and membro.usuario_id = v_usuario_id
   and membro.papel = 'dono'::public.papel_membro_barbearia
   and membro.status = 'ativo'::public.status_membro_barbearia
  order by barbearia.id
  for update of barbearia;

  if exists (
    select 1
    from public.membros_barbearia as membro
    where membro.usuario_id = v_usuario_id
      and membro.papel = 'dono'::public.papel_membro_barbearia
      and membro.status = 'ativo'::public.status_membro_barbearia
  ) then
    raise exception using
      errcode = '23514',
      message = 'Transfira ou encerre as memberships de dono antes de desativar o perfil.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger convites_barbearia_definir_updated_at
before update on public.convites_barbearia
for each row execute function private.definir_updated_at_e_versao_convite();

create trigger eventos_auditoria_append_only
before update or delete on public.eventos_auditoria
for each row execute function private.bloquear_mutacao_evento_auditoria();

create trigger eventos_auditoria_bloquear_truncate
before truncate on public.eventos_auditoria
for each statement execute function private.bloquear_mutacao_evento_auditoria();

create trigger membros_00_travar_tenant
before insert or update or delete on public.membros_barbearia
for each row execute function private.travar_tenant_membership();

create trigger perfis_proteger_dono_ativo
before update of usuario_id, ativo or delete on public.perfis
for each row execute function private.proteger_perfil_dono_ativo();

alter table public.convites_barbearia enable row level security;
alter table public.eventos_auditoria enable row level security;

revoke all on table public.convites_barbearia from anon, authenticated, service_role;
revoke all on table public.eventos_auditoria from anon, authenticated, service_role;

grant select on table public.convites_barbearia to authenticated, service_role;
grant select on table public.eventos_auditoria to authenticated, service_role;

-- Memberships só podem ser alteradas por comandos estreitos ou por uma sessão
-- operacional postgres. A secret/service role não recebe DML direto.
revoke insert, update, delete, truncate
  on table public.membros_barbearia
  from service_role;

-- Reatribuição precisa de um comando transacional próprio. UPDATE direto
-- poderia adquirir a linha de atribuição antes do tenant e concorrer com a
-- exclusão de uma identidade Auth em ordem inversa.
revoke update (usuario_id)
  on table public.atribuicoes_cliente
  from authenticated;
revoke update
  on table public.atribuicoes_cliente
  from service_role;

revoke all on type public.status_barbearia from public, anon;
revoke all on type public.papel_membro_barbearia from public, anon;
revoke all on type public.status_membro_barbearia from public, anon;

revoke all on type public.status_convite_barbearia from public, anon;
revoke all on type public.origem_evento_auditoria from public, anon;
revoke all on type public.acao_evento_auditoria from public, anon;

grant usage on type public.status_convite_barbearia to authenticated, service_role;
grant usage on type public.origem_evento_auditoria to authenticated, service_role;
grant usage on type public.acao_evento_auditoria to authenticated, service_role;

create policy convites_barbearia_select_dono
on public.convites_barbearia
for select
to authenticated
using (private.usuario_eh_dono(barbearia_id));

create policy eventos_auditoria_select_dono
on public.eventos_auditoria
for select
to authenticated
using (private.usuario_eh_dono(barbearia_id));

create function public.criar_convite_funcionario(
  p_barbearia_id uuid,
  p_email text,
  p_nome text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator uuid := (select auth.uid());
  v_email text := private.normalizar_email_convite(p_email);
  v_nome text := btrim(p_nome);
  v_convite_id uuid;
  v_expirado_id uuid;
  v_expira_em timestamptz;
begin
  if p_barbearia_id is null or v_ator is null then
    raise exception using
      errcode = '42501',
      message = 'Sessão de dono obrigatória.';
  end if;

  if v_nome is null
     or char_length(v_nome) not between 2 and 120
     or v_nome ~ '[[:cntrl:]]' then
    raise exception using
      errcode = '22023',
      message = 'Nome de convite inválido.';
  end if;

  if v_email is null
     or char_length(v_email) not between 6 and 254
     or v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$'
     or v_email ~ '^\.'
     or v_email ~ '\.@'
     or v_email ~ '\.\.'
     or v_email ~ '@-'
     or v_email ~ '\.-'
     or v_email ~ '-(\.|$)' then
    raise exception using
      errcode = '22023',
      message = 'E-mail de convite inválido; use um endereço ASCII normalizado.';
  end if;

  if not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Somente o dono em AAL2 pode convidar funcionários.';
  end if;

  perform 1
  from auth.users as usuario
  where usuario.id = v_ator
  for share;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'A conta Auth do dono não está disponível.';
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = p_barbearia_id
    and barbearia.status = 'ativa'::public.status_barbearia
  for update;

  if not found or not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Barbearia ativa e sessão de dono em AAL2 são obrigatórias.';
  end if;

  update public.convites_barbearia as convite
  set
    status = 'expirado'::public.status_convite_barbearia,
    expirado_em = now()
  where convite.barbearia_id = p_barbearia_id
    and convite.email_normalizado = v_email
    and convite.status in (
      'pendente_envio'::public.status_convite_barbearia,
      'enviado'::public.status_convite_barbearia
    )
    and convite.expira_em <= now()
  returning convite.id into v_expirado_id;

  if v_expirado_id is not null then
    perform private.registrar_evento_auditoria(
      p_barbearia_id,
      v_ator,
      null,
      'usuario'::public.origem_evento_auditoria,
      'convite.expirado'::public.acao_evento_auditoria,
      'convite',
      v_expirado_id,
      '{}'::jsonb
    );
  end if;

  if exists (
    select 1
    from public.membros_barbearia as membro
    join auth.users as usuario on usuario.id = membro.usuario_id
    where membro.barbearia_id = p_barbearia_id
      and private.normalizar_email_convite(usuario.email) = v_email
      and membro.status <> 'revogado'::public.status_membro_barbearia
  ) then
    raise exception using
      errcode = '23505',
      message = 'Já existe membro ativo, convidado ou suspenso com esse e-mail.';
  end if;

  if exists (
    select 1
    from public.convites_barbearia as convite
    where convite.barbearia_id = p_barbearia_id
      and convite.email_normalizado = v_email
      and convite.status in (
        'pendente_envio'::public.status_convite_barbearia,
        'enviado'::public.status_convite_barbearia
      )
  ) then
    raise exception using
      errcode = '23505',
      message = 'Já existe convite aberto para esse e-mail.';
  end if;

  v_expira_em := now() + interval '7 days';

  insert into public.convites_barbearia (
    barbearia_id,
    nome,
    email_normalizado,
    papel,
    status,
    criado_por,
    expira_em
  )
  values (
    p_barbearia_id,
    v_nome,
    v_email,
    'funcionario'::public.papel_membro_barbearia,
    'pendente_envio'::public.status_convite_barbearia,
    v_ator,
    v_expira_em
  )
  returning id into v_convite_id;

  perform private.registrar_evento_auditoria(
    p_barbearia_id,
    v_ator,
    null,
    'usuario'::public.origem_evento_auditoria,
    'convite.criado'::public.acao_evento_auditoria,
    'convite',
    v_convite_id,
    jsonb_build_object(
      'papel', 'funcionario',
      'expira_em', v_expira_em
    )
  );

  return v_convite_id;
end;
$$;

create function public.revogar_convite_barbearia(p_convite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator uuid := (select auth.uid());
  v_barbearia_id uuid;
  v_status public.status_convite_barbearia;
  v_expira_em timestamptz;
begin
  if p_convite_id is null or v_ator is null then
    raise exception using
      errcode = '42501',
      message = 'Sessão de dono obrigatória.';
  end if;

  select convite.barbearia_id
  into v_barbearia_id
  from public.convites_barbearia as convite
  where convite.id = p_convite_id;

  if v_barbearia_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado.';
  end if;

  if not private.usuario_eh_dono(v_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Somente o dono em AAL2 pode revogar convites.';
  end if;

  perform 1
  from auth.users as usuario
  where usuario.id = v_ator
  for share;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'A conta Auth do dono não está disponível.';
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = v_barbearia_id
    and barbearia.status = 'ativa'::public.status_barbearia
  for update;

  if not found or not private.usuario_eh_dono(v_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Barbearia ativa e sessão de dono em AAL2 são obrigatórias.';
  end if;

  select convite.status, convite.expira_em
  into v_status, v_expira_em
  from public.convites_barbearia as convite
  where convite.id = p_convite_id
    and convite.barbearia_id = v_barbearia_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado após o lock do tenant.';
  end if;

  if v_status = 'revogado'::public.status_convite_barbearia then
    return p_convite_id;
  end if;

  if v_status in (
    'pendente_envio'::public.status_convite_barbearia,
    'enviado'::public.status_convite_barbearia
  ) and v_expira_em <= now() then
    update public.convites_barbearia
    set
      status = 'expirado'::public.status_convite_barbearia,
      expirado_em = now()
    where id = p_convite_id;

    perform private.registrar_evento_auditoria(
      v_barbearia_id,
      v_ator,
      null,
      'usuario'::public.origem_evento_auditoria,
      'convite.expirado'::public.acao_evento_auditoria,
      'convite',
      p_convite_id,
      '{}'::jsonb
    );

    return p_convite_id;
  end if;

  if v_status not in (
    'pendente_envio'::public.status_convite_barbearia,
    'enviado'::public.status_convite_barbearia
  ) then
    raise exception using
      errcode = '55000',
      message = 'Somente convites abertos podem ser revogados.';
  end if;

  update public.convites_barbearia
  set
    status = 'revogado'::public.status_convite_barbearia,
    revogado_em = now(),
    revogado_por = v_ator
  where id = p_convite_id;

  perform private.registrar_evento_auditoria(
    v_barbearia_id,
    v_ator,
    null,
    'usuario'::public.origem_evento_auditoria,
    'convite.revogado'::public.acao_evento_auditoria,
    'convite',
    p_convite_id,
    '{}'::jsonb
  );

  return p_convite_id;
end;
$$;

create function public.marcar_convite_enviado(p_convite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barbearia_id uuid;
  v_status public.status_convite_barbearia;
  v_expira_em timestamptz;
begin
  if p_convite_id is null then
    raise exception using
      errcode = '22004',
      message = 'Convite obrigatório.';
  end if;

  select convite.barbearia_id
  into v_barbearia_id
  from public.convites_barbearia as convite
  where convite.id = p_convite_id;

  if v_barbearia_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado.';
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = v_barbearia_id
  for update;

  select convite.status, convite.expira_em
  into v_status, v_expira_em
  from public.convites_barbearia as convite
  where convite.id = p_convite_id
    and convite.barbearia_id = v_barbearia_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado após o lock do tenant.';
  end if;

  if v_status in (
    'aceito'::public.status_convite_barbearia,
    'revogado'::public.status_convite_barbearia,
    'expirado'::public.status_convite_barbearia,
    'falhou'::public.status_convite_barbearia,
    'enviado'::public.status_convite_barbearia
  ) then
    return p_convite_id;
  end if;

  if v_expira_em <= now() then
    update public.convites_barbearia
    set
      status = 'expirado'::public.status_convite_barbearia,
      expirado_em = now()
    where id = p_convite_id;

    perform private.registrar_evento_auditoria(
      v_barbearia_id,
      null,
      null,
      'sistema'::public.origem_evento_auditoria,
      'convite.expirado'::public.acao_evento_auditoria,
      'convite',
      p_convite_id,
      '{}'::jsonb
    );

    return p_convite_id;
  end if;

  update public.convites_barbearia
  set
    status = 'enviado'::public.status_convite_barbearia,
    enviado_em = now()
  where id = p_convite_id;

  perform private.registrar_evento_auditoria(
    v_barbearia_id,
    null,
    null,
    'sistema'::public.origem_evento_auditoria,
    'convite.enviado'::public.acao_evento_auditoria,
    'convite',
    p_convite_id,
    '{}'::jsonb
  );

  return p_convite_id;
end;
$$;

create function public.marcar_convite_falhou(
  p_convite_id uuid,
  p_codigo_erro text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barbearia_id uuid;
  v_status public.status_convite_barbearia;
  v_expira_em timestamptz;
  v_codigo_erro text := lower(btrim(p_codigo_erro));
begin
  if p_convite_id is null then
    raise exception using
      errcode = '22004',
      message = 'Convite obrigatório.';
  end if;

  if v_codigo_erro is null
     or char_length(v_codigo_erro) not between 1 and 120
     or v_codigo_erro !~ '^[a-z0-9][a-z0-9._-]*$' then
    raise exception using
      errcode = '22023',
      message = 'Código de erro inválido.';
  end if;

  select convite.barbearia_id
  into v_barbearia_id
  from public.convites_barbearia as convite
  where convite.id = p_convite_id;

  if v_barbearia_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado.';
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = v_barbearia_id
  for update;

  select convite.status, convite.expira_em
  into v_status, v_expira_em
  from public.convites_barbearia as convite
  where convite.id = p_convite_id
    and convite.barbearia_id = v_barbearia_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado após o lock do tenant.';
  end if;

  if v_status <> 'pendente_envio'::public.status_convite_barbearia then
    return p_convite_id;
  end if;

  if v_expira_em <= now() then
    update public.convites_barbearia
    set
      status = 'expirado'::public.status_convite_barbearia,
      expirado_em = now()
    where id = p_convite_id;

    perform private.registrar_evento_auditoria(
      v_barbearia_id,
      null,
      null,
      'sistema'::public.origem_evento_auditoria,
      'convite.expirado'::public.acao_evento_auditoria,
      'convite',
      p_convite_id,
      '{}'::jsonb
    );

    return p_convite_id;
  end if;

  update public.convites_barbearia
  set
    status = 'falhou'::public.status_convite_barbearia,
    falhou_em = now(),
    codigo_erro = v_codigo_erro
  where id = p_convite_id;

  perform private.registrar_evento_auditoria(
    v_barbearia_id,
    null,
    null,
    'sistema'::public.origem_evento_auditoria,
    'convite.falhou'::public.acao_evento_auditoria,
    'convite',
    p_convite_id,
    jsonb_build_object('codigo_erro', v_codigo_erro)
  );

  return p_convite_id;
end;
$$;

create function public.aceitar_convite_barbearia(p_convite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_email_usuario text;
  v_barbearia_id uuid;
  v_nome text;
  v_email_convite text;
  v_criado_por uuid;
  v_aceito_por uuid;
  v_status public.status_convite_barbearia;
  v_expira_em timestamptz;
  v_papel public.papel_membro_barbearia;
  v_status_membro public.status_membro_barbearia;
  v_membership_reativada boolean := false;
begin
  if p_convite_id is null
     or v_usuario_id is null
     or not private.usuario_auth_permanente() then
    raise exception using
      errcode = '42501',
      message = 'Sessão autenticada permanente obrigatória.';
  end if;

  select
    convite.barbearia_id,
    convite.nome,
    convite.email_normalizado
  into
    v_barbearia_id,
    v_nome,
    v_email_convite
  from public.convites_barbearia as convite
  where convite.id = p_convite_id;

  if v_barbearia_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado.';
  end if;

  -- A ordem global é usuário Auth -> perfil -> tenant -> convite/membership.
  -- Ela também é usada pelo provisionamento e evita ciclos com exclusão de
  -- conta ou desativação de perfil.
  select private.normalizar_email_convite(usuario.email)
  into v_email_usuario
  from auth.users as usuario
  where usuario.id = v_usuario_id
    and usuario.email is not null
    and usuario.email_confirmed_at is not null
  for update;

  if v_email_usuario is null then
    raise exception using
      errcode = '42501',
      message = 'A conta precisa ter um e-mail confirmado.';
  end if;

  if v_email_usuario <> v_email_convite then
    raise exception using
      errcode = '42501',
      message = 'A conta confirmada não corresponde ao e-mail do convite.';
  end if;

  insert into public.perfis (usuario_id, nome, ativo)
  values (v_usuario_id, v_nome, true)
  on conflict (usuario_id) do nothing;

  perform 1
  from public.perfis as perfil
  where perfil.usuario_id = v_usuario_id
    and perfil.ativo
  for share;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'O perfil desta conta está inativo e exige recuperação administrativa.';
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = v_barbearia_id
    and barbearia.status = 'ativa'::public.status_barbearia
  for update;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'A barbearia do convite não está ativa.';
  end if;

  select
    convite.nome,
    convite.email_normalizado,
    convite.criado_por,
    convite.aceito_por,
    convite.status,
    convite.expira_em
  into
    v_nome,
    v_email_convite,
    v_criado_por,
    v_aceito_por,
    v_status,
    v_expira_em
  from public.convites_barbearia as convite
  where convite.id = p_convite_id
    and convite.barbearia_id = v_barbearia_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Convite não encontrado após o lock do tenant.';
  end if;

  if v_status = 'aceito'::public.status_convite_barbearia then
    if v_aceito_por = v_usuario_id then
      return v_barbearia_id;
    end if;

    raise exception using
      errcode = '42501',
      message = 'Este convite já foi aceito por outra conta.';
  end if;

  if v_status not in (
    'pendente_envio'::public.status_convite_barbearia,
    'enviado'::public.status_convite_barbearia
  ) then
    raise exception using
      errcode = '55000',
      message = 'Este convite não está aberto para aceite.';
  end if;

  if v_expira_em <= now() then
    raise exception using
      errcode = '55000',
      message = 'Este convite expirou.';
  end if;

  if v_email_usuario <> v_email_convite then
    raise exception using
      errcode = '42501',
      message = 'A conta confirmada não corresponde ao e-mail do convite.';
  end if;

  select membro.papel, membro.status
  into v_papel, v_status_membro
  from public.membros_barbearia as membro
  where membro.barbearia_id = v_barbearia_id
    and membro.usuario_id = v_usuario_id
  for update;

  if not found then
    insert into public.membros_barbearia (
      barbearia_id,
      usuario_id,
      papel,
      status,
      convidado_por
    )
    values (
      v_barbearia_id,
      v_usuario_id,
      'funcionario'::public.papel_membro_barbearia,
      'ativo'::public.status_membro_barbearia,
      v_criado_por
    );
  elsif v_papel <> 'funcionario'::public.papel_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'Convite de funcionário não pode alterar uma membership de dono.';
  elsif v_status_membro = 'suspenso'::public.status_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'Membership suspensa exige reativação explícita pelo dono.';
  elsif v_status_membro = 'revogado'::public.status_membro_barbearia then
    update public.membros_barbearia
    set
      status = 'ativo'::public.status_membro_barbearia,
      convidado_por = v_criado_por
    where barbearia_id = v_barbearia_id
      and usuario_id = v_usuario_id;
    v_membership_reativada := true;
  elsif v_status_membro = 'convidado'::public.status_membro_barbearia then
    update public.membros_barbearia
    set
      status = 'ativo'::public.status_membro_barbearia,
      convidado_por = v_criado_por
    where barbearia_id = v_barbearia_id
      and usuario_id = v_usuario_id;
  elsif v_status_membro <> 'ativo'::public.status_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'Estado de membership incompatível com o aceite.';
  end if;

  update public.convites_barbearia
  set
    status = 'aceito'::public.status_convite_barbearia,
    aceito_em = now(),
    aceito_por = v_usuario_id
  where id = p_convite_id;

  perform private.registrar_evento_auditoria(
    v_barbearia_id,
    v_usuario_id,
    v_usuario_id,
    'usuario'::public.origem_evento_auditoria,
    'convite.aceito'::public.acao_evento_auditoria,
    'convite',
    p_convite_id,
    jsonb_build_object('membership_reativada', v_membership_reativada)
  );

  return v_barbearia_id;
end;
$$;

create function public.provisionar_dono_controlado(
  p_usuario_id uuid,
  p_nome text,
  p_barbearia_nome text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := btrim(p_nome);
  v_barbearia_nome text := btrim(p_barbearia_nome);
  v_slug text := lower(btrim(p_slug));
  v_barbearia_id uuid;
begin
  if p_usuario_id is null then
    raise exception using
      errcode = '22004',
      message = 'Usuário Auth obrigatório.';
  end if;

  if v_nome is null
     or char_length(v_nome) not between 2 and 120
     or v_nome ~ '[[:cntrl:]]' then
    raise exception using
      errcode = '22023',
      message = 'Nome do dono inválido.';
  end if;

  if v_barbearia_nome is null
     or char_length(v_barbearia_nome) not between 2 and 120
     or v_barbearia_nome ~ '[[:cntrl:]]' then
    raise exception using
      errcode = '22023',
      message = 'Nome da barbearia inválido.';
  end if;

  if v_slug is null
     or char_length(v_slug) not between 3 and 80
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using
      errcode = '22023',
      message = 'Slug da barbearia inválido.';
  end if;

  perform 1
  from auth.users as usuario
  where usuario.id = p_usuario_id
    and usuario.email is not null
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Usuário Auth inexistente ou sem e-mail.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('barbervision:provision:' || v_slug, 0)
  );

  select barbearia.id
  into v_barbearia_id
  from public.barbearias as barbearia
  where barbearia.slug = v_slug
  for update;

  if v_barbearia_id is not null then
    if exists (
      select 1
      from public.barbearias as barbearia
      join public.perfis as perfil
        on perfil.usuario_id = p_usuario_id
       and perfil.ativo
      join public.membros_barbearia as membro
        on membro.barbearia_id = barbearia.id
       and membro.usuario_id = p_usuario_id
       and membro.papel = 'dono'::public.papel_membro_barbearia
       and membro.status = 'ativo'::public.status_membro_barbearia
      where barbearia.id = v_barbearia_id
        and barbearia.slug = v_slug
        and barbearia.status = 'ativa'::public.status_barbearia
        and barbearia.criado_por = p_usuario_id
    ) then
      return v_barbearia_id;
    end if;

    raise exception using
      errcode = '23505',
      message = 'O slug já pertence a outro provisionamento ou está inconsistente.';
  end if;

  insert into public.perfis (usuario_id, nome, ativo)
  values (p_usuario_id, v_nome, true)
  on conflict (usuario_id) do nothing;

  perform 1
  from public.perfis as perfil
  where perfil.usuario_id = p_usuario_id
    and perfil.ativo
  for share;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'O perfil do futuro dono está inativo.';
  end if;

  insert into public.barbearias (
    nome,
    slug,
    status,
    criado_por
  )
  values (
    v_barbearia_nome,
    v_slug,
    'ativa'::public.status_barbearia,
    p_usuario_id
  )
  returning id into v_barbearia_id;

  insert into public.membros_barbearia (
    barbearia_id,
    usuario_id,
    papel,
    status,
    convidado_por
  )
  values (
    v_barbearia_id,
    p_usuario_id,
    'dono'::public.papel_membro_barbearia,
    'ativo'::public.status_membro_barbearia,
    p_usuario_id
  );

  perform private.registrar_evento_auditoria(
    v_barbearia_id,
    null,
    p_usuario_id,
    'sistema'::public.origem_evento_auditoria,
    'barbearia.provisionada'::public.acao_evento_auditoria,
    'barbearia',
    v_barbearia_id,
    '{}'::jsonb
  );

  return v_barbearia_id;
end;
$$;

create function public.suspender_funcionario(
  p_barbearia_id uuid,
  p_usuario_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator uuid := (select auth.uid());
  v_papel public.papel_membro_barbearia;
  v_status public.status_membro_barbearia;
begin
  if p_barbearia_id is null or p_usuario_id is null or v_ator is null then
    raise exception using
      errcode = '42501',
      message = 'Sessão de dono e funcionário-alvo são obrigatórios.';
  end if;

  if not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Somente o dono em AAL2 pode suspender funcionários.';
  end if;

  perform 1
  from auth.users as usuario
  where usuario.id = p_usuario_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'A conta Auth do funcionário não existe.';
  end if;

  perform 1
  from public.perfis as perfil
  where perfil.usuario_id = p_usuario_id
  for share;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'O perfil do funcionário não existe.';
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = p_barbearia_id
    and barbearia.status = 'ativa'::public.status_barbearia
  for update;

  if not found or not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Barbearia ativa e sessão de dono em AAL2 são obrigatórias.';
  end if;

  select membro.papel, membro.status
  into v_papel, v_status
  from public.membros_barbearia as membro
  where membro.barbearia_id = p_barbearia_id
    and membro.usuario_id = p_usuario_id
  for update;

  if not found or v_papel <> 'funcionario'::public.papel_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'O alvo precisa ser funcionário da mesma barbearia.';
  end if;

  if v_status = 'suspenso'::public.status_membro_barbearia then
    return p_usuario_id;
  end if;

  if v_status <> 'ativo'::public.status_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'Somente funcionário ativo pode ser suspenso.';
  end if;

  update public.membros_barbearia
  set status = 'suspenso'::public.status_membro_barbearia
  where barbearia_id = p_barbearia_id
    and usuario_id = p_usuario_id;

  perform private.registrar_evento_auditoria(
    p_barbearia_id,
    v_ator,
    p_usuario_id,
    'usuario'::public.origem_evento_auditoria,
    'funcionario.suspenso'::public.acao_evento_auditoria,
    'membership',
    p_usuario_id,
    '{}'::jsonb
  );

  return p_usuario_id;
end;
$$;

create function public.reativar_funcionario(
  p_barbearia_id uuid,
  p_usuario_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator uuid := (select auth.uid());
  v_papel public.papel_membro_barbearia;
  v_status public.status_membro_barbearia;
begin
  if p_barbearia_id is null or p_usuario_id is null or v_ator is null then
    raise exception using
      errcode = '42501',
      message = 'Sessão de dono e funcionário-alvo são obrigatórios.';
  end if;

  if not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Somente o dono em AAL2 pode reativar funcionários.';
  end if;

  perform 1
  from auth.users as usuario
  where usuario.id = p_usuario_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'A conta Auth do funcionário não existe.';
  end if;

  perform 1
  from public.perfis as perfil
  where perfil.usuario_id = p_usuario_id
    and perfil.ativo
  for share;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'Perfil ativo é obrigatório para reativação.';
  end if;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = p_barbearia_id
    and barbearia.status = 'ativa'::public.status_barbearia
  for update;

  if not found or not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Barbearia ativa e sessão de dono em AAL2 são obrigatórias.';
  end if;

  select membro.papel, membro.status
  into v_papel, v_status
  from public.membros_barbearia as membro
  where membro.barbearia_id = p_barbearia_id
    and membro.usuario_id = p_usuario_id
  for update;

  if not found or v_papel <> 'funcionario'::public.papel_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'O alvo precisa ser funcionário da mesma barbearia.';
  end if;

  if v_status = 'ativo'::public.status_membro_barbearia then
    return p_usuario_id;
  end if;

  if v_status <> 'suspenso'::public.status_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'Somente funcionário suspenso pode ser reativado diretamente.';
  end if;

  if not exists (
    select 1
    from public.perfis as perfil
    join auth.users as usuario on usuario.id = perfil.usuario_id
    where perfil.usuario_id = p_usuario_id
      and perfil.ativo
      and usuario.email is not null
      and usuario.email_confirmed_at is not null
  ) then
    raise exception using
      errcode = '55000',
      message = 'Perfil ativo e e-mail confirmado são obrigatórios para reativação.';
  end if;

  update public.membros_barbearia
  set status = 'ativo'::public.status_membro_barbearia
  where barbearia_id = p_barbearia_id
    and usuario_id = p_usuario_id;

  perform private.registrar_evento_auditoria(
    p_barbearia_id,
    v_ator,
    p_usuario_id,
    'usuario'::public.origem_evento_auditoria,
    'funcionario.reativado'::public.acao_evento_auditoria,
    'membership',
    p_usuario_id,
    '{}'::jsonb
  );

  return p_usuario_id;
end;
$$;

create function public.revogar_funcionario(
  p_barbearia_id uuid,
  p_usuario_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator uuid := (select auth.uid());
  v_papel public.papel_membro_barbearia;
  v_status public.status_membro_barbearia;
  v_atribuicoes_removidas integer := 0;
begin
  if p_barbearia_id is null or p_usuario_id is null or v_ator is null then
    raise exception using
      errcode = '42501',
      message = 'Sessão de dono e funcionário-alvo são obrigatórios.';
  end if;

  if not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Somente o dono em AAL2 pode revogar funcionários.';
  end if;

  perform 1
  from auth.users as usuario
  where usuario.id = p_usuario_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'A conta Auth do funcionário não existe.';
  end if;

  perform 1
  from public.perfis as perfil
  where perfil.usuario_id = p_usuario_id
  for share;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'O perfil do funcionário não existe.';
  end if;

  -- UPDATE/DELETE de atribuição já possui o lock da linha antes do trigger.
  -- Revogação precisa adquirir essas linhas antes do tenant para manter a
  -- mesma ordem e só então remover as atribuições.
  perform 1
  from public.atribuicoes_cliente as atribuicao
  where atribuicao.barbearia_id = p_barbearia_id
    and atribuicao.usuario_id = p_usuario_id
  order by atribuicao.cliente_id
  for update;

  perform 1
  from public.barbearias as barbearia
  where barbearia.id = p_barbearia_id
    and barbearia.status = 'ativa'::public.status_barbearia
  for update;

  if not found or not private.usuario_eh_dono(p_barbearia_id) then
    raise exception using
      errcode = '42501',
      message = 'Barbearia ativa e sessão de dono em AAL2 são obrigatórias.';
  end if;

  select membro.papel, membro.status
  into v_papel, v_status
  from public.membros_barbearia as membro
  where membro.barbearia_id = p_barbearia_id
    and membro.usuario_id = p_usuario_id
  for update;

  if not found or v_papel <> 'funcionario'::public.papel_membro_barbearia then
    raise exception using
      errcode = '55000',
      message = 'O alvo precisa ser funcionário da mesma barbearia.';
  end if;

  delete from public.atribuicoes_cliente
  where barbearia_id = p_barbearia_id
    and usuario_id = p_usuario_id;
  get diagnostics v_atribuicoes_removidas = row_count;

  if v_status = 'revogado'::public.status_membro_barbearia then
    return p_usuario_id;
  end if;

  if v_status not in (
    'ativo'::public.status_membro_barbearia,
    'suspenso'::public.status_membro_barbearia
  ) then
    raise exception using
      errcode = '55000',
      message = 'Somente funcionário ativo ou suspenso pode ser revogado.';
  end if;

  update public.membros_barbearia
  set status = 'revogado'::public.status_membro_barbearia
  where barbearia_id = p_barbearia_id
    and usuario_id = p_usuario_id;

  perform private.registrar_evento_auditoria(
    p_barbearia_id,
    v_ator,
    p_usuario_id,
    'usuario'::public.origem_evento_auditoria,
    'funcionario.revogado'::public.acao_evento_auditoria,
    'membership',
    p_usuario_id,
    jsonb_build_object('atribuicoes_removidas', v_atribuicoes_removidas)
  );

  return p_usuario_id;
end;
$$;

revoke all on function private.normalizar_email_convite(text)
  from public, anon, authenticated, service_role;
revoke all on function private.definir_updated_at_e_versao_convite()
  from public, anon, authenticated, service_role;
revoke all on function private.registrar_evento_auditoria(
  uuid,
  uuid,
  uuid,
  public.origem_evento_auditoria,
  public.acao_evento_auditoria,
  text,
  uuid,
  jsonb
) from public, anon, authenticated, service_role;
revoke all on function private.bloquear_mutacao_evento_auditoria()
  from public, anon, authenticated, service_role;
revoke all on function private.travar_tenant_membership()
  from public, anon, authenticated, service_role;
revoke all on function private.validar_responsavel_atribuicao()
  from public, anon, authenticated, service_role;
revoke all on function private.proteger_perfil_dono_ativo()
  from public, anon, authenticated, service_role;

revoke all on function public.criar_convite_funcionario(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.revogar_convite_barbearia(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.aceitar_convite_barbearia(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.marcar_convite_enviado(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.marcar_convite_falhou(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.provisionar_dono_controlado(uuid, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.suspender_funcionario(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.reativar_funcionario(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.revogar_funcionario(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.criar_convite_funcionario(uuid, text, text)
  to authenticated;
grant execute on function public.revogar_convite_barbearia(uuid)
  to authenticated;
grant execute on function public.aceitar_convite_barbearia(uuid)
  to authenticated;
grant execute on function public.suspender_funcionario(uuid, uuid)
  to authenticated;
grant execute on function public.reativar_funcionario(uuid, uuid)
  to authenticated;
grant execute on function public.revogar_funcionario(uuid, uuid)
  to authenticated;

grant execute on function public.marcar_convite_enviado(uuid)
  to service_role;
grant execute on function public.marcar_convite_falhou(uuid, text)
  to service_role;
grant execute on function public.provisionar_dono_controlado(uuid, text, text, text)
  to service_role;

comment on table public.convites_barbearia is
  'Convite de funcionário separado da membership; token/link permanecem no Supabase Auth e nunca são persistidos aqui.';
comment on table public.eventos_auditoria is
  'Auditoria append-only de comandos privilegiados do domínio, sem senha, token, TOTP, selfie ou e-mail bruto.';
comment on function public.criar_convite_funcionario(uuid, text, text) is
  'Dono AAL2 cria convite idempotentemente protegido por tenant e e-mail aberto.';
comment on function public.aceitar_convite_barbearia(uuid) is
  'Conta autenticada e confirmada aceita convite cujo e-mail coincide com auth.users; cria perfil/membership atomicamente.';
comment on function public.provisionar_dono_controlado(uuid, text, text, text) is
  'Service-only: cria perfil, tenant e primeiro dono numa transação; não depende de metadata do Auth.';
comment on function public.suspender_funcionario(uuid, uuid) is
  'Dono AAL2 suspende somente funcionário ativo e preserva atribuições.';
comment on function public.reativar_funcionario(uuid, uuid) is
  'Dono AAL2 reativa somente funcionário suspenso, com perfil ativo e e-mail confirmado.';
comment on function public.revogar_funcionario(uuid, uuid) is
  'Dono AAL2 revoga somente funcionário ativo/suspenso e remove suas atribuições na mesma transação.';

commit;
