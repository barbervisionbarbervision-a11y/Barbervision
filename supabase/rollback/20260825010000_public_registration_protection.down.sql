begin;

drop function if exists public.consumir_limite_api(text, integer, integer);
drop table if exists public.api_rate_limits;

alter table public.clientes
  drop constraint if exists clientes_consentimento_cadastro_coerente,
  drop column if exists consentimento_cadastro_em,
  drop column if exists consentimento_cadastro_versao;

commit;

