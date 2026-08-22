-- Rollback manual da migration de Storage.
-- Execute antes dos rollbacks de RLS e core, somente num ambiente controlado.

begin;

do $$
begin
  if exists (select 1 from public.atribuicoes_cliente)
     or exists (select 1 from public.clientes)
     or exists (select 1 from public.membros_barbearia)
     or exists (select 1 from public.perfis)
     or exists (select 1 from public.barbearias) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado antes de remover segurança: existem dados nas tabelas do passo 2. Exporte e remova-os explicitamente primeiro.';
  end if;

  if exists (
    select 1
    from storage.objects
    where bucket_id in (
      'barbervision-hair-sources',
      'barbervision-hair-cutouts',
      'barbervision-selfies'
    )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Rollback recusado: existem objetos nos buckets Barber Vision. Exporte e remova-os explicitamente primeiro.';
  end if;
end;
$$;

drop policy if exists barbervision_storage_delete_dono on storage.objects;
drop policy if exists barbervision_storage_update_dono on storage.objects;
drop policy if exists barbervision_storage_insert_dono on storage.objects;
drop policy if exists barbervision_storage_select_dono on storage.objects;

drop function if exists private.usuario_eh_dono_do_storage_path(text);
drop function if exists private.storage_path_valido(text);

delete from storage.buckets
where id in (
  'barbervision-hair-sources',
  'barbervision-hair-cutouts',
  'barbervision-selfies'
);

commit;
