begin;

alter table public.clientes
  add column consentimento_cadastro_versao text,
  add column consentimento_cadastro_em timestamptz,
  add constraint clientes_consentimento_cadastro_coerente check (
    (consentimento_cadastro_versao is null and consentimento_cadastro_em is null)
    or (
      consentimento_cadastro_versao ~ '^[a-z0-9][a-z0-9._-]{0,63}$'
      and consentimento_cadastro_em is not null
    )
  );

comment on column public.clientes.consentimento_cadastro_versao is
  'Versão do aviso aceito para cadastro e continuidade da experiência; não representa consentimento de marketing nem de selfie.';
comment on column public.clientes.consentimento_cadastro_em is
  'Instante, definido pelo servidor, em que o aviso de cadastro foi aceito.';

create table public.api_rate_limits (
  identificador_hash text primary key check (identificador_hash ~ '^[a-f0-9]{64}$'),
  janela_inicio timestamptz not null,
  contagem integer not null check (contagem > 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated, service_role;

create function public.consumir_limite_api(
  p_identificador_hash text,
  p_limite integer,
  p_janela_segundos integer
)
returns table (permitido boolean, restante integer, tentar_novamente_em integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := clock_timestamp();
  v_registro public.api_rate_limits%rowtype;
  v_expira_em timestamptz;
begin
  if p_identificador_hash !~ '^[a-f0-9]{64}$'
    or p_limite not between 1 and 1000
    or p_janela_segundos not between 10 and 86400 then
    raise exception using errcode = '22023', message = 'Parâmetros de rate limit inválidos.';
  end if;

  insert into public.api_rate_limits as limite (
    identificador_hash, janela_inicio, contagem, updated_at
  ) values (
    p_identificador_hash, v_agora, 1, v_agora
  )
  on conflict (identificador_hash) do update
  set janela_inicio = case
        when limite.janela_inicio + make_interval(secs => p_janela_segundos) <= v_agora then v_agora
        else limite.janela_inicio
      end,
      contagem = case
        when limite.janela_inicio + make_interval(secs => p_janela_segundos) <= v_agora then 1
        else limite.contagem + 1
      end,
      updated_at = v_agora
  returning * into v_registro;

  v_expira_em := v_registro.janela_inicio + make_interval(secs => p_janela_segundos);
  return query select
    v_registro.contagem <= p_limite,
    greatest(0, p_limite - v_registro.contagem),
    case when v_registro.contagem <= p_limite then 0
      else greatest(1, ceil(extract(epoch from (v_expira_em - v_agora)))::integer)
    end;
end;
$$;

revoke all on function public.consumir_limite_api(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consumir_limite_api(text, integer, integer)
  to service_role;

comment on function public.consumir_limite_api(text, integer, integer) is
  'Contador atômico distribuído para APIs públicas; recebe somente identificador HMAC, nunca IP ou contato em claro.';

commit;

