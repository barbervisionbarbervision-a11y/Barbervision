-- Passo 2 — helpers de autorização, grants mínimos e RLS.
-- Papéis são lidos de membros_barbearia; nenhuma policy confia em user_metadata.

begin;

create function private.usuario_auth_permanente()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true';
$$;

create function private.usuario_conta_ativa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_auth_permanente()
    and exists (
      select 1
      from public.perfis as perfil
      where perfil.usuario_id = (select auth.uid())
        and perfil.ativo
    );
$$;

create function private.usuario_eh_membro(p_barbearia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_conta_ativa()
    and exists (
      select 1
      from public.membros_barbearia as membro
      join public.barbearias as barbearia
        on barbearia.id = membro.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      where membro.barbearia_id = p_barbearia_id
        and membro.usuario_id = (select auth.uid())
        and membro.status = 'ativo'::public.status_membro_barbearia
    );
$$;

create function private.usuario_eh_dono(p_barbearia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_conta_ativa()
    and exists (
      select 1
      from public.membros_barbearia as membro
      join public.barbearias as barbearia
        on barbearia.id = membro.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      where membro.barbearia_id = p_barbearia_id
        and membro.usuario_id = (select auth.uid())
        and membro.papel = 'dono'::public.papel_membro_barbearia
        and membro.status = 'ativo'::public.status_membro_barbearia
    );
$$;

create function private.usuario_pode_gerenciar_tenant(p_barbearia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_eh_dono(p_barbearia_id)
    and exists (
      select 1
      from public.barbearias as barbearia
      where barbearia.id = p_barbearia_id
        and barbearia.status = 'ativa'::public.status_barbearia
    );
$$;

create function private.usuario_pode_ver_perfil(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_conta_ativa()
    and exists (
      select 1
      from public.membros_barbearia as dono
      join public.barbearias as barbearia
        on barbearia.id = dono.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      join public.membros_barbearia as alvo
        on alvo.barbearia_id = dono.barbearia_id
       and alvo.status = 'ativo'::public.status_membro_barbearia
      join public.perfis as perfil_alvo
        on perfil_alvo.usuario_id = alvo.usuario_id
       and perfil_alvo.ativo
      where dono.usuario_id = (select auth.uid())
        and dono.papel = 'dono'::public.papel_membro_barbearia
        and dono.status = 'ativo'::public.status_membro_barbearia
        and alvo.usuario_id = p_usuario_id
    );
$$;

create function private.usuario_pode_ver_cliente(
  p_barbearia_id uuid,
  p_cliente_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.usuario_conta_ativa()
    and exists (
      select 1
      from public.barbearias as barbearia
      join public.membros_barbearia as membro
        on membro.barbearia_id = barbearia.id
       and membro.usuario_id = (select auth.uid())
       and membro.status = 'ativo'::public.status_membro_barbearia
      where barbearia.id = p_barbearia_id
        and barbearia.status = 'ativa'::public.status_barbearia
        and (
          membro.papel = 'dono'::public.papel_membro_barbearia
          or exists (
            select 1
            from public.atribuicoes_cliente as atribuicao
            where atribuicao.barbearia_id = p_barbearia_id
              and atribuicao.cliente_id = p_cliente_id
              and atribuicao.usuario_id = (select auth.uid())
          )
        )
    );
$$;

create function private.registrar_criador_cliente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.criado_por := (select auth.uid());
  end if;
  return new;
end;
$$;

create function private.registrar_autor_atribuicao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.atribuido_por := (select auth.uid());
  end if;
  return new;
end;
$$;

create function private.validar_responsavel_atribuicao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create function private.proteger_ultimo_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.barbearias as barbearia
    where barbearia.id = old.barbearia_id
      and barbearia.status = 'ativa'::public.status_barbearia
  )
  and not exists (
    select 1
    from public.membros_barbearia as membro
    join public.perfis as perfil
      on perfil.usuario_id = membro.usuario_id
     and perfil.ativo
    where membro.barbearia_id = old.barbearia_id
      and membro.papel = 'dono'::public.papel_membro_barbearia
      and membro.status = 'ativo'::public.status_membro_barbearia
  ) then
    raise exception using
      errcode = '23514',
      message = 'Uma barbearia ativa precisa manter ao menos um dono ativo com perfil ativo.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.usuario_auth_permanente() from public, anon, authenticated;
revoke all on function private.usuario_conta_ativa() from public, anon, authenticated;
revoke all on function private.usuario_eh_membro(uuid) from public, anon, authenticated;
revoke all on function private.usuario_eh_dono(uuid) from public, anon, authenticated;
revoke all on function private.usuario_pode_gerenciar_tenant(uuid) from public, anon, authenticated;
revoke all on function private.usuario_pode_ver_perfil(uuid) from public, anon, authenticated;
revoke all on function private.usuario_pode_ver_cliente(uuid, uuid) from public, anon, authenticated;
revoke all on function private.registrar_criador_cliente() from public, anon, authenticated;
revoke all on function private.registrar_autor_atribuicao() from public, anon, authenticated;
revoke all on function private.validar_responsavel_atribuicao() from public, anon, authenticated;
revoke all on function private.proteger_ultimo_dono() from public, anon, authenticated;

grant usage on schema private to authenticated, service_role;
grant execute on function private.usuario_auth_permanente() to authenticated, service_role;
grant execute on function private.usuario_conta_ativa() to authenticated, service_role;
grant execute on function private.usuario_eh_membro(uuid) to authenticated, service_role;
grant execute on function private.usuario_eh_dono(uuid) to authenticated, service_role;
grant execute on function private.usuario_pode_gerenciar_tenant(uuid) to authenticated, service_role;
grant execute on function private.usuario_pode_ver_perfil(uuid) to authenticated, service_role;
grant execute on function private.usuario_pode_ver_cliente(uuid, uuid) to authenticated, service_role;

alter table public.barbearias enable row level security;
alter table public.perfis enable row level security;
alter table public.membros_barbearia enable row level security;
alter table public.clientes enable row level security;
alter table public.atribuicoes_cliente enable row level security;

create trigger clientes_registrar_criador
before insert on public.clientes
for each row execute function private.registrar_criador_cliente();

create trigger atribuicoes_registrar_autor
before insert or update on public.atribuicoes_cliente
for each row execute function private.registrar_autor_atribuicao();

create trigger atribuicoes_validar_responsavel
before insert or update of barbearia_id, usuario_id on public.atribuicoes_cliente
for each row execute function private.validar_responsavel_atribuicao();

create trigger membros_proteger_ultimo_dono
after update of papel, status or delete on public.membros_barbearia
for each row execute function private.proteger_ultimo_dono();

revoke all on table public.barbearias from anon, authenticated;
revoke all on table public.perfis from anon, authenticated;
revoke all on table public.membros_barbearia from anon, authenticated;
revoke all on table public.clientes from anon, authenticated;
revoke all on table public.atribuicoes_cliente from anon, authenticated;

grant select on table public.barbearias to authenticated;
grant update (nome, slug, logo_path) on table public.barbearias to authenticated;

grant select on table public.perfis to authenticated;
grant insert (usuario_id, nome, avatar_path) on table public.perfis to authenticated;
grant update (nome, avatar_path) on table public.perfis to authenticated;

grant select on table public.membros_barbearia to authenticated;

grant select, delete on table public.clientes to authenticated;
grant insert (
  id,
  barbearia_id,
  nome,
  whatsapp,
  whatsapp_normalizado,
  observacoes
) on table public.clientes to authenticated;
grant update (
  nome,
  whatsapp,
  whatsapp_normalizado,
  observacoes
) on table public.clientes to authenticated;

grant select, delete on table public.atribuicoes_cliente to authenticated;
grant insert (
  barbearia_id,
  cliente_id,
  usuario_id
) on table public.atribuicoes_cliente to authenticated;
grant update (usuario_id) on table public.atribuicoes_cliente to authenticated;

grant all on table public.barbearias to service_role;
grant all on table public.perfis to service_role;
grant all on table public.membros_barbearia to service_role;
grant all on table public.clientes to service_role;
grant all on table public.atribuicoes_cliente to service_role;

grant usage on type public.status_barbearia to authenticated, service_role;
grant usage on type public.papel_membro_barbearia to authenticated, service_role;
grant usage on type public.status_membro_barbearia to authenticated, service_role;

create policy barbearias_select_membro
on public.barbearias
for select
to authenticated
using (private.usuario_eh_membro(id));

create policy barbearias_update_dono
on public.barbearias
for update
to authenticated
using (private.usuario_eh_dono(id))
with check (private.usuario_eh_dono(id));

create policy perfis_select_proprio_ou_equipe_do_dono
on public.perfis
for select
to authenticated
using (
  private.usuario_auth_permanente()
  and (
    usuario_id = (select auth.uid())
    or private.usuario_pode_ver_perfil(usuario_id)
  )
);

create policy perfis_insert_proprio
on public.perfis
for insert
to authenticated
with check (
  private.usuario_auth_permanente()
  and usuario_id = (select auth.uid())
);

create policy perfis_update_proprio
on public.perfis
for update
to authenticated
using (
  private.usuario_auth_permanente()
  and usuario_id = (select auth.uid())
)
with check (
  private.usuario_auth_permanente()
  and usuario_id = (select auth.uid())
);

create policy membros_select_proprio_ou_dono
on public.membros_barbearia
for select
to authenticated
using (
  private.usuario_auth_permanente()
  and (
    usuario_id = (select auth.uid())
    or private.usuario_eh_dono(barbearia_id)
  )
);

create policy clientes_select_escopo
on public.clientes
for select
to authenticated
using (private.usuario_pode_ver_cliente(barbearia_id, id));

create policy clientes_insert_dono
on public.clientes
for insert
to authenticated
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy clientes_update_dono
on public.clientes
for update
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id))
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy clientes_delete_dono
on public.clientes
for delete
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy atribuicoes_select_escopo
on public.atribuicoes_cliente
for select
to authenticated
using (
  private.usuario_pode_gerenciar_tenant(barbearia_id)
  or (
    private.usuario_auth_permanente()
    and usuario_id = (select auth.uid())
    and private.usuario_pode_ver_cliente(barbearia_id, cliente_id)
  )
);

create policy atribuicoes_insert_dono
on public.atribuicoes_cliente
for insert
to authenticated
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy atribuicoes_update_dono
on public.atribuicoes_cliente
for update
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id))
with check (private.usuario_pode_gerenciar_tenant(barbearia_id));

create policy atribuicoes_delete_dono
on public.atribuicoes_cliente
for delete
to authenticated
using (private.usuario_pode_gerenciar_tenant(barbearia_id));

comment on function private.usuario_eh_membro(uuid) is
  'Helper SECURITY DEFINER mínimo para evitar recursão de policies em membros_barbearia.';
comment on function private.usuario_eh_dono(uuid) is
  'Autoriza pelo papel/status persistido da membership; não lê user_metadata ou app_metadata.';

commit;
