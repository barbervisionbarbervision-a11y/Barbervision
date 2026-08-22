-- Passo 2 — fundação multi-tenant do Barber Vision.
-- Esta migration parte de um banco Supabase limpo. O antigo supabase/schema.sql
-- nunca foi uma migration e não deve ser aplicado antes deste arquivo.

begin;

do $$
begin
  if to_regclass('public.barbearias') is not null
     or to_regclass('public.barbeiros') is not null
     or to_regclass('public.clientes') is not null
     or to_regclass('public.cortes_catalogo') is not null
     or to_regclass('public.simulacoes') is not null
     or to_regclass('public.fidelidade') is not null then
    raise exception using
      errcode = '55000',
      message = 'Schema legado detectado. Não aplique a baseline do passo 2 sobre as tabelas antigas; migre ou recrie o ambiente explicitamente.';
  end if;
end;
$$;

create schema if not exists private;
revoke all on schema private from public;

create type public.status_barbearia as enum (
  'ativa',
  'suspensa',
  'arquivada'
);

create type public.papel_membro_barbearia as enum (
  'dono',
  'funcionario'
);

create type public.status_membro_barbearia as enum (
  'convidado',
  'ativo',
  'suspenso',
  'revogado'
);

create table public.barbearias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  logo_path text,
  status public.status_barbearia not null default 'ativa',
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barbearias_nome_valido check (char_length(btrim(nome)) between 2 and 120),
  constraint barbearias_slug_normalizado check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 80
  ),
  constraint barbearias_logo_path_relativo check (
    logo_path is null
    or (
      logo_path !~ '^(https?:)?//'
      and logo_path !~ '(^|/)\.\.(/|$)'
      and char_length(logo_path) between 3 and 500
    )
  )
);

create table public.perfis (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  avatar_path text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint perfis_nome_valido check (char_length(btrim(nome)) between 2 and 120),
  constraint perfis_avatar_path_relativo check (
    avatar_path is null
    or (
      avatar_path !~ '^(https?:)?//'
      and avatar_path !~ '(^|/)\.\.(/|$)'
      and char_length(avatar_path) between 3 and 500
    )
  )
);

create table public.membros_barbearia (
  barbearia_id uuid not null references public.barbearias(id) on delete restrict,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel public.papel_membro_barbearia not null,
  status public.status_membro_barbearia not null default 'convidado',
  convidado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (barbearia_id, usuario_id)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null references public.barbearias(id) on delete restrict,
  nome text not null,
  whatsapp text not null,
  whatsapp_normalizado text not null,
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_tenant_id_unico unique (barbearia_id, id),
  constraint clientes_tenant_whatsapp_unico unique (
    barbearia_id,
    whatsapp_normalizado
  ),
  constraint clientes_nome_valido check (char_length(btrim(nome)) between 2 and 160),
  constraint clientes_whatsapp_valido check (char_length(btrim(whatsapp)) between 8 and 32),
  constraint clientes_whatsapp_normalizado_valido check (
    whatsapp_normalizado ~ '^[1-9][0-9]{7,14}$'
  ),
  constraint clientes_whatsapp_coerente check (
    regexp_replace(whatsapp, '[^0-9]', '', 'g') = whatsapp_normalizado
  ),
  constraint clientes_observacoes_limite check (
    observacoes is null or char_length(observacoes) <= 2000
  )
);

create table public.atribuicoes_cliente (
  barbearia_id uuid not null,
  cliente_id uuid not null,
  usuario_id uuid not null,
  atribuido_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (barbearia_id, cliente_id),
  constraint atribuicoes_cliente_cliente_fk
    foreign key (barbearia_id, cliente_id)
    references public.clientes(barbearia_id, id)
    on delete cascade,
  constraint atribuicoes_cliente_membro_fk
    foreign key (barbearia_id, usuario_id)
    references public.membros_barbearia(barbearia_id, usuario_id)
    on delete restrict
);

create index membros_barbearia_usuario_status_idx
  on public.membros_barbearia (usuario_id, status, barbearia_id);

create index membros_barbearia_tenant_papel_status_idx
  on public.membros_barbearia (barbearia_id, papel, status);

create index clientes_tenant_nome_idx
  on public.clientes (barbearia_id, lower(nome));

create index atribuicoes_cliente_usuario_idx
  on public.atribuicoes_cliente (barbearia_id, usuario_id, cliente_id);

create function private.definir_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.definir_updated_at() from public;

create trigger barbearias_definir_updated_at
before update on public.barbearias
for each row execute function private.definir_updated_at();

create trigger perfis_definir_updated_at
before update on public.perfis
for each row execute function private.definir_updated_at();

create trigger membros_barbearia_definir_updated_at
before update on public.membros_barbearia
for each row execute function private.definir_updated_at();

create trigger clientes_definir_updated_at
before update on public.clientes
for each row execute function private.definir_updated_at();

create trigger atribuicoes_cliente_definir_updated_at
before update on public.atribuicoes_cliente
for each row execute function private.definir_updated_at();

comment on table public.barbearias is
  'Tenant da plataforma. Status é controlado pela plataforma, não pelo usuário final.';
comment on table public.perfis is
  'Perfil global mínimo ligado a auth.users; papel pertence à membership, nunca ao perfil.';
comment on table public.membros_barbearia is
  'Membership por tenant. Uma conta pode ter papéis diferentes em barbearias diferentes.';
comment on table public.clientes is
  'Cliente privado e obrigatoriamente associado a uma barbearia.';
comment on table public.atribuicoes_cliente is
  'Responsável atual pelo cliente; a FK composta impede atribuição a membro de outro tenant.';

commit;
