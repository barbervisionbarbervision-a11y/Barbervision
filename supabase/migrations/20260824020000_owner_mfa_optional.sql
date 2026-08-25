-- Torna o TOTP opcional para o dono. A conta continua exigindo e-mail confirmado,
-- perfil ativo e membership ativa. O usuário pode habilitar TOTP depois em Segurança.

begin;

create or replace function private.usuario_tem_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.usuario_auth_permanente();
$$;

comment on function private.usuario_tem_aal2() is
  'Compatibilidade das policies: MFA do dono é opcional; preserva validação de usuário Auth permanente.';

commit;
