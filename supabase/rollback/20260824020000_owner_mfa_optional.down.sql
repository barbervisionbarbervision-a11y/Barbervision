begin;

create or replace function private.usuario_tem_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.usuario_auth_permanente()
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

comment on function private.usuario_tem_aal2() is
  'Aceita somente JWT com claim aal2; claim ausente é tratado como aal1.';

commit;
