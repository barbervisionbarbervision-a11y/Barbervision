-- Validação remota e não destrutiva do retry/backoff da outbox de convites.
-- Execute todo o arquivo no Supabase SQL Editor. A exceção VALIDACAO_OK no
-- final é intencional: ela comprova o resultado e desfaz todos os dados do
-- teste na mesma instrução, inclusive o convite e os eventos de auditoria.

do $$
declare
  v_barbearia_id uuid;
  v_dono_id uuid;
  v_convite_id uuid;
  v_outbox_id uuid;
  v_worker_id uuid;
  v_status public.status_convite_email_outbox;
  v_atraso integer;
  v_status_convite text;
  v_tentativa integer;
  v_esperado integer;
  v_resultado text := '';
begin
  select membro.barbearia_id, membro.usuario_id
    into v_barbearia_id, v_dono_id
  from public.membros_barbearia as membro
  join public.barbearias as barbearia on barbearia.id = membro.barbearia_id
  where membro.papel = 'dono'::public.papel_membro_barbearia
    and membro.status = 'ativo'::public.status_membro_barbearia
  order by membro.created_at
  limit 1;

  if v_barbearia_id is null or v_dono_id is null then
    raise exception 'A validação precisa de uma barbearia com dono ativo.';
  end if;

  insert into public.convites_barbearia (
    barbearia_id, nome, email_normalizado, criado_por
  ) values (
    v_barbearia_id,
    'Teste de retry',
    'retry-probe-' || replace(gen_random_uuid()::text, '-', '') || '@example.invalid',
    v_dono_id
  ) returning id into v_convite_id;

  select id into v_outbox_id
  from public.convite_email_outbox
  where convite_id = v_convite_id;

  if v_outbox_id is null then
    raise exception 'O trigger não criou o item da outbox.';
  end if;

  for v_tentativa in 1..4 loop
    v_worker_id := gen_random_uuid();
    v_esperado := 15 * (2 ^ (v_tentativa - 1));

    update public.convite_email_outbox
    set status = 'processando',
        tentativas = v_tentativa,
        proxima_tentativa_em = now(),
        bloqueado_ate = now() + interval '5 minutes',
        worker_id = v_worker_id,
        ultimo_codigo_erro = null
    where id = v_outbox_id;

    v_status := public.concluir_convite_email(
      v_outbox_id,
      v_worker_id,
      false,
      true,
      'probe_retryable'
    );

    select round(extract(epoch from (proxima_tentativa_em - now())))::integer
      into v_atraso
    from public.convite_email_outbox
    where id = v_outbox_id;

    select status::text into v_status_convite
    from public.convites_barbearia
    where id = v_convite_id;

    if v_status <> 'pendente'::public.status_convite_email_outbox
       or v_atraso <> v_esperado
       or v_status_convite <> 'pendente_envio' then
      raise exception
        'Retry % inválido: outbox=%, atraso=% (esperado %), convite=%',
        v_tentativa, v_status, v_atraso, v_esperado, v_status_convite;
    end if;

    v_resultado := v_resultado || format(
      'tentativa %s: pendente/%ss; ', v_tentativa, v_atraso
    );
  end loop;

  v_worker_id := gen_random_uuid();
  update public.convite_email_outbox
  set status = 'processando',
      tentativas = 5,
      proxima_tentativa_em = now(),
      bloqueado_ate = now() + interval '5 minutes',
      worker_id = v_worker_id
  where id = v_outbox_id;

  v_status := public.concluir_convite_email(
    v_outbox_id,
    v_worker_id,
    false,
    true,
    'probe_retryable'
  );

  select status::text into v_status_convite
  from public.convites_barbearia
  where id = v_convite_id;

  if v_status <> 'falhou'::public.status_convite_email_outbox
     or v_status_convite <> 'falhou' then
    raise exception
      'Falha terminal inválida: outbox=%, convite=%',
      v_status, v_status_convite;
  end if;

  v_resultado := v_resultado || 'tentativa 5: falhou';

  -- Esta exceção é o resultado esperado e também força o rollback atômico do
  -- bloco inteiro. Nenhum dado sintético sobrevive à validação.
  raise exception using
    errcode = 'P0001',
    message = 'VALIDACAO_OK — retry/backoff confirmado — ' || v_resultado;
end;
$$;
