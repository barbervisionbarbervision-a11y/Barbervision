create function public.localizar_usuario_auth_por_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_usuario_id uuid;
begin
  if v_email is null
     or char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using
      errcode = '22023',
      message = 'E-mail inválido.';
  end if;

  select usuario.id
  into v_usuario_id
  from auth.users as usuario
  where lower(usuario.email) = v_email;

  return v_usuario_id;
end;
$$;

revoke all on function public.localizar_usuario_auth_por_email(text)
from public, anon, authenticated, service_role;

grant execute on function public.localizar_usuario_auth_por_email(text)
to service_role;

comment on function public.localizar_usuario_auth_por_email(text) is
  'Resolve uma identidade Auth por e-mail somente para retomada server-only do primeiro dono.';
