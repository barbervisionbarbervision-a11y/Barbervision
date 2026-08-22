-- Rollback manual e destrutivo da fundação multi-tenant.
-- Por segurança, este arquivo recusa remover tabelas enquanto houver dados.

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
      message = 'Rollback recusado: existem dados nas tabelas do passo 2. Exporte e remova-os explicitamente antes de continuar.';
  end if;
end;
$$;

drop table public.atribuicoes_cliente;
drop table public.clientes;
drop table public.membros_barbearia;
drop table public.perfis;
drop table public.barbearias;

drop function if exists private.definir_updated_at();

drop type public.status_membro_barbearia;
drop type public.papel_membro_barbearia;
drop type public.status_barbearia;

commit;
