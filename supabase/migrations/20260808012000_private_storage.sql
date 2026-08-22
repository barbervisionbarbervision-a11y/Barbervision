-- Passo 2 — buckets privados e policies de Storage por UUID do tenant.
-- Caminho obrigatório: <barbearia_uuid>/<namespace_uuid>/<arquivo>.
-- O segundo UUID organiza nomes; só o primeiro segmento autoriza o tenant.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'barbervision-hair-sources',
    'barbervision-hair-sources',
    false,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'barbervision-hair-cutouts',
    'barbervision-hair-cutouts',
    false,
    2097152,
    array['image/png', 'image/webp']::text[]
  ),
  (
    'barbervision-selfies',
    'barbervision-selfies',
    false,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  );

create function private.storage_path_valido(p_nome text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    array_length(storage.foldername(p_nome), 1) = 2
    and (storage.foldername(p_nome))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (storage.foldername(p_nome))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and p_nome !~ '(^|/)\.\.(/|$)';
$$;

create function private.usuario_eh_dono_do_storage_path(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.storage_path_valido(p_nome)
    and private.usuario_conta_ativa()
    and exists (
      select 1
      from public.membros_barbearia as membro
      join public.barbearias as barbearia
        on barbearia.id = membro.barbearia_id
       and barbearia.status = 'ativa'::public.status_barbearia
      where membro.barbearia_id::text = (storage.foldername(p_nome))[1]
        and membro.usuario_id = (select auth.uid())
        and membro.papel = 'dono'::public.papel_membro_barbearia
        and membro.status = 'ativo'::public.status_membro_barbearia
    );
$$;

revoke all on function private.storage_path_valido(text) from public, anon, authenticated;
revoke all on function private.usuario_eh_dono_do_storage_path(text) from public, anon, authenticated;
grant execute on function private.storage_path_valido(text) to authenticated, service_role;
grant execute on function private.usuario_eh_dono_do_storage_path(text) to authenticated, service_role;

create policy barbervision_storage_select_dono
on storage.objects
for select
to authenticated
using (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

create policy barbervision_storage_insert_dono
on storage.objects
for insert
to authenticated
with check (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

create policy barbervision_storage_update_dono
on storage.objects
for update
to authenticated
using (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
)
with check (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

create policy barbervision_storage_delete_dono
on storage.objects
for delete
to authenticated
using (
  bucket_id in (
    'barbervision-hair-sources',
    'barbervision-hair-cutouts'
  )
  and private.usuario_eh_dono_do_storage_path(name)
);

comment on function private.usuario_eh_dono_do_storage_path(text) is
  'Valida owner ativo pelo primeiro segmento UUID do path; owner_id do objeto não é autorização de tenant.';

-- O bucket de selfies permanece sem policy de cliente até o passo de privacidade.

commit;
