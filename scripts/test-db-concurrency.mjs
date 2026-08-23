import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;

const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres";
const DISPOSABLE_DATABASE_MARKER =
  "barbervision:disposable-concurrency-test";
const LOCK_WAIT_TIMEOUT_MS = 8_000;
const POLL_INTERVAL_MS = 40;

function connectionString() {
  return (
    process.env.BARBERVISION_TEST_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    DEFAULT_LOCAL_DATABASE_URL
  );
}

function assertSafeTarget(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const remoteAllowed =
    process.env.BARBERVISION_ALLOW_REMOTE_DB_TEST === "true";

  if (!localHosts.has(parsed.hostname) && !remoteAllowed) {
    throw new Error(
      "Teste concorrente recusado em banco remoto. Use um projeto descartável e defina BARBERVISION_ALLOW_REMOTE_DB_TEST=true conscientemente.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Teste concorrente recusado com NODE_ENV=production.");
  }

  const target = {
    database: parsed.pathname.replace(/^\//, "") || "postgres",
    host: parsed.hostname,
    port: parsed.port || "5432",
  };
  const expectedConfirmation = `${target.host}:${target.port}/${target.database}`;

  if (
    process.env.BARBERVISION_TEST_DATABASE_CONFIRM !== expectedConfirmation
  ) {
    throw new Error(
      `Confirmação do banco descartável ausente. Defina BARBERVISION_TEST_DATABASE_CONFIRM=${expectedConfirmation} depois de conferir o destino.`,
    );
  }

  return target;
}

function fixtureIds() {
  return {
    ownerLifecycle: randomUUID(),
    employee: randomUUID(),
    ownerOne: randomUUID(),
    ownerTwo: randomUUID(),
    tenantLifecycle: randomUUID(),
    tenantLastOwner: randomUUID(),
    clientExisting: randomUUID(),
    clientRacing: randomUUID(),
    inviteOne: randomUUID(),
    inviteTwo: randomUUID(),
    suffix: randomUUID().replaceAll("-", ""),
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createClient(databaseUrl, applicationName) {
  const client = new Client({
    application_name: applicationName,
    connectionString: databaseUrl,
  });
  await client.connect();
  await client.query("set statement_timeout = '15s'");
  await client.query("set lock_timeout = '10s'");
  return client;
}

async function backendPid(client) {
  const result = await client.query("select pg_backend_pid() as pid");
  return Number(result.rows[0].pid);
}

async function waitUntilBlockedByLock(observer, pid, label) {
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await observer.query(
      `
        select state, wait_event_type, wait_event
        from pg_catalog.pg_stat_activity
        where pid = $1
      `,
      [pid],
    );
    const activity = result.rows[0];

    if (activity?.wait_event_type === "Lock") {
      return activity.wait_event;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `${label} não ficou bloqueado por lock dentro de ${LOCK_WAIT_TIMEOUT_MS} ms; o teste não conseguiu provar concorrência real.`,
  );
}

async function preflight(admin) {
  const result = await admin.query(`
    select
      to_regclass('public.barbearias') is not null as tem_tenant,
      to_regclass('public.eventos_auditoria') is not null as tem_auditoria,
      to_regprocedure('public.revogar_funcionario(uuid,uuid)') is not null as tem_rpc,
      exists (
        select 1
        from pg_catalog.pg_roles
        where rolname = current_user
          and rolsuper
      ) as superusuario,
      (
        select pg_catalog.shobj_description(database.oid, 'pg_database')
        from pg_catalog.pg_database as database
        where database.datname = current_database()
      ) as marcador_banco
  `);
  const state = result.rows[0];

  if (!state.tem_tenant || !state.tem_auditoria || !state.tem_rpc) {
    throw new Error(
      "Migrations 1–5 não estão aplicadas. Execute db:reset antes do teste concorrente.",
    );
  }

  if (!state.superusuario) {
    throw new Error(
      "O runner exige o postgres local/superusuário para limpar eventos append-only com segurança transacional.",
    );
  }

  if (state.marcador_banco !== DISPOSABLE_DATABASE_MARKER) {
    throw new Error(
      `Banco sem marcador descartável. Em uma instância exclusiva de teste, execute: COMMENT ON DATABASE ${JSON.stringify(
        (await admin.query("select current_database() as nome")).rows[0].nome,
      )} IS '${DISPOSABLE_DATABASE_MARKER}';`,
    );
  }
}

async function insertAuthUser(admin, id, email) {
  await admin.query(
    `
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000',
        $1,
        'authenticated',
        'authenticated',
        $2,
        '',
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
      )
    `,
    [id, email],
  );
}

async function setupFixtures(admin, ids) {
  await admin.query("begin");
  try {
    await insertAuthUser(
      admin,
      ids.ownerLifecycle,
      `owner-lifecycle-${ids.suffix}@barbervision.invalid`,
    );
    await insertAuthUser(
      admin,
      ids.employee,
      `employee-${ids.suffix}@barbervision.invalid`,
    );
    await insertAuthUser(
      admin,
      ids.ownerOne,
      `owner-one-${ids.suffix}@barbervision.invalid`,
    );
    await insertAuthUser(
      admin,
      ids.ownerTwo,
      `owner-two-${ids.suffix}@barbervision.invalid`,
    );

    await admin.query(
      `
        insert into public.perfis (usuario_id, nome, ativo)
        values
          ($1, 'Dono lifecycle concorrente', true),
          ($2, 'Funcionário concorrente', true),
          ($3, 'Primeiro dono concorrente', true),
          ($4, 'Segundo dono concorrente', true)
      `,
      [ids.ownerLifecycle, ids.employee, ids.ownerOne, ids.ownerTwo],
    );

    await admin.query(
      `
        insert into public.barbearias (id, nome, slug, status, criado_por)
        values
          ($1, 'Tenant lifecycle concorrente', $3, 'ativa', $5),
          ($2, 'Tenant último dono concorrente', $4, 'ativa', $6)
      `,
      [
        ids.tenantLifecycle,
        ids.tenantLastOwner,
        `conc-lifecycle-${ids.suffix}`,
        `conc-owner-${ids.suffix}`,
        ids.ownerLifecycle,
        ids.ownerOne,
      ],
    );

    await admin.query(
      `
        insert into public.membros_barbearia (
          barbearia_id,
          usuario_id,
          papel,
          status,
          convidado_por
        ) values
          ($1, $3, 'dono', 'ativo', $3),
          ($1, $4, 'funcionario', 'ativo', $3),
          ($2, $5, 'dono', 'ativo', $5),
          ($2, $6, 'dono', 'ativo', $5)
      `,
      [
        ids.tenantLifecycle,
        ids.tenantLastOwner,
        ids.ownerLifecycle,
        ids.employee,
        ids.ownerOne,
        ids.ownerTwo,
      ],
    );

    await admin.query(
      `
        insert into public.clientes (
          id,
          barbearia_id,
          nome,
          whatsapp,
          whatsapp_normalizado,
          criado_por
        ) values
          ($1, $3, 'Cliente já atribuído', '+55 (85) 90000-0101', '5585900000101', $4),
          ($2, $3, 'Cliente da corrida', '+55 (85) 90000-0102', '5585900000102', $4)
      `,
      [
        ids.clientExisting,
        ids.clientRacing,
        ids.tenantLifecycle,
        ids.ownerLifecycle,
      ],
    );

    await admin.query(
      `
        insert into public.atribuicoes_cliente (
          barbearia_id,
          cliente_id,
          usuario_id,
          atribuido_por
        ) values ($1, $2, $3, $4)
      `,
      [
        ids.tenantLifecycle,
        ids.clientExisting,
        ids.employee,
        ids.ownerLifecycle,
      ],
    );

    await admin.query(
      `
        insert into public.convites_barbearia (
          id, barbearia_id, nome, email_normalizado, papel, status, criado_por, expira_em
        ) values
          ($1, $3, 'Worker concorrente 1', $5, 'funcionario', 'pendente_envio', $4, now() + interval '1 day'),
          ($2, $3, 'Worker concorrente 2', $6, 'funcionario', 'pendente_envio', $4, now() + interval '1 day')
      `,
      [
        ids.inviteOne,
        ids.inviteTwo,
        ids.tenantLifecycle,
        ids.ownerLifecycle,
        `worker-one-${ids.suffix}@barbervision.invalid`,
        `worker-two-${ids.suffix}@barbervision.invalid`,
      ],
    );

    await admin.query("commit");
  } catch (error) {
    await admin.query("rollback");
    throw error;
  }
}

async function testOutboxWorkers(databaseUrl, observer, ids) {
  const first = await createClient(databaseUrl, "barbervision-outbox-worker-1");
  const second = await createClient(databaseUrl, "barbervision-outbox-worker-2");
  const firstWorker = randomUUID();
  const secondWorker = randomUUID();

  try {
    const [firstClaim, secondClaim] = await Promise.all([
      first.query("select * from public.reivindicar_convites_email($1::uuid, 1)", [firstWorker]),
      second.query("select * from public.reivindicar_convites_email($1::uuid, 1)", [secondWorker]),
    ]);
    const claimed = [...firstClaim.rows, ...secondClaim.rows];
    const claimedIds = new Set(claimed.map((item) => item.convite_id));

    if (claimed.length !== 2 || claimedIds.size !== 2) {
      throw new Error(`Workers reivindicaram itens duplicados ou incompletos: ${JSON.stringify(claimed)}`);
    }

    const expectedIds = new Set([ids.inviteOne, ids.inviteTwo]);
    if ([...claimedIds].some((id) => !expectedIds.has(id))) {
      throw new Error(`Worker reivindicou convite fora do fixture: ${JSON.stringify([...claimedIds])}`);
    }

    const verification = await observer.query(
      `select count(*)::integer as total, count(distinct worker_id)::integer as workers
       from public.convite_email_outbox
       where convite_id = any($1::uuid[]) and status = 'processando' and tentativas = 1`,
      [[ids.inviteOne, ids.inviteTwo]],
    );
    if (verification.rows[0].total !== 2 || verification.rows[0].workers !== 2) {
      throw new Error(`Estado inesperado da outbox concorrente: ${JSON.stringify(verification.rows[0])}`);
    }

    console.log("[OK] Outbox: dois workers reivindicaram itens distintos sem duplicação.");
  } finally {
    await first.end().catch(() => {});
    await second.end().catch(() => {});
  }
}

async function testLastOwnerSerialization(databaseUrl, observer, ids) {
  const first = await createClient(databaseUrl, "barbervision-concurrency-owner-1");
  const second = await createClient(databaseUrl, "barbervision-concurrency-owner-2");

  try {
    const secondPid = await backendPid(second);
    await first.query("begin");
    await second.query("begin");

    await first.query(
      `
        update public.membros_barbearia
        set status = 'revogado'
        where barbearia_id = $1
          and usuario_id = $2
      `,
      [ids.tenantLastOwner, ids.ownerOne],
    );

    const secondOutcomePromise = second
      .query(
        `
          update public.membros_barbearia
          set status = 'revogado'
          where barbearia_id = $1
            and usuario_id = $2
        `,
        [ids.tenantLastOwner, ids.ownerTwo],
      )
      .then(
        () => ({ ok: true }),
        (error) => ({ error, ok: false }),
      );

    await waitUntilBlockedByLock(
      observer,
      secondPid,
      "Segunda revogação de dono",
    );
    await first.query("commit");

    const secondOutcome = await secondOutcomePromise;
    if (secondOutcome.ok) {
      await second.query("rollback");
      throw new Error(
        "A segunda revogação de dono concluiu; a invariável do último dono falhou.",
      );
    }

    await second.query("rollback");
    if (
      secondOutcome.error?.code !== "23514" ||
      !String(secondOutcome.error?.message).includes(
        "ao menos um dono ativo",
      )
    ) {
      throw secondOutcome.error;
    }

    const verification = await observer.query(
      `
        select
          count(*) filter (where status = 'ativo')::integer as ativos,
          count(*) filter (where status = 'revogado')::integer as revogados
        from public.membros_barbearia
        where barbearia_id = $1
          and papel = 'dono'
      `,
      [ids.tenantLastOwner],
    );

    if (
      verification.rows[0].ativos !== 1 ||
      verification.rows[0].revogados !== 1
    ) {
      throw new Error(
        `Estado inesperado após concorrência de donos: ${JSON.stringify(verification.rows[0])}`,
      );
    }

    console.log("[OK] Último dono: exatamente uma revogação confirmou.");
  } finally {
    if (!first.ended) {
      await first.query("rollback").catch(() => {});
      await first.end();
    }
    if (!second.ended) {
      await second.query("rollback").catch(() => {});
      await second.end();
    }
  }
}

async function testAssignmentVersusRevocation(databaseUrl, observer, ids) {
  const assigner = await createClient(
    databaseUrl,
    "barbervision-concurrency-assignment",
  );
  const revoker = await createClient(
    databaseUrl,
    "barbervision-concurrency-revocation",
  );

  try {
    const revokerPid = await backendPid(revoker);
    await assigner.query("begin");
    await assigner.query(
      `
        insert into public.atribuicoes_cliente (
          barbearia_id,
          cliente_id,
          usuario_id,
          atribuido_por
        ) values ($1, $2, $3, $4)
      `,
      [
        ids.tenantLifecycle,
        ids.clientRacing,
        ids.employee,
        ids.ownerLifecycle,
      ],
    );

    await revoker.query("begin");
    await revoker.query("set local role authenticated");
    await revoker.query(
      "select set_config('request.jwt.claims', $1, true)",
      [
        JSON.stringify({
          aal: "aal2",
          is_anonymous: false,
          role: "authenticated",
          sub: ids.ownerLifecycle,
        }),
      ],
    );

    const revocationOutcomePromise = revoker
      .query(
        "select public.revogar_funcionario($1::uuid, $2::uuid) as usuario_id",
        [ids.tenantLifecycle, ids.employee],
      )
      .then(
        (result) => ({ ok: true, result }),
        (error) => ({ error, ok: false }),
      );

    await waitUntilBlockedByLock(
      observer,
      revokerPid,
      "Revogação concorrente à atribuição",
    );
    await assigner.query("commit");

    const revocationOutcome = await revocationOutcomePromise;
    if (!revocationOutcome.ok) {
      await revoker.query("rollback");
      throw revocationOutcome.error;
    }
    await revoker.query("commit");

    const verification = await observer.query(
      `
        select
          (
            select status::text
            from public.membros_barbearia
            where barbearia_id = $1
              and usuario_id = $2
          ) as status,
          (
            select count(*)::integer
            from public.atribuicoes_cliente
            where barbearia_id = $1
              and usuario_id = $2
          ) as atribuicoes,
          (
            select count(*)::integer
            from public.eventos_auditoria
            where barbearia_id = $1
              and alvo_usuario_id = $2
              and acao = 'funcionario.revogado'
          ) as eventos
      `,
      [ids.tenantLifecycle, ids.employee],
    );
    const state = verification.rows[0];

    if (
      state.status !== "revogado" ||
      state.atribuicoes !== 0 ||
      state.eventos !== 1
    ) {
      throw new Error(
        `Estado inesperado após atribuição/revogação concorrente: ${JSON.stringify(state)}`,
      );
    }

    console.log(
      "[OK] Atribuição/revogação: membership revogada, zero atribuições e um evento.",
    );
  } finally {
    if (!assigner.ended) {
      await assigner.query("rollback").catch(() => {});
      await assigner.end();
    }
    if (!revoker.ended) {
      await revoker.query("rollback").catch(() => {});
      await revoker.end();
    }
  }
}

async function cleanupFixtures(admin, ids) {
  const tenantIds = [ids.tenantLifecycle, ids.tenantLastOwner];
  const userIds = [
    ids.ownerLifecycle,
    ids.employee,
    ids.ownerOne,
    ids.ownerTwo,
  ];

  await admin.query("begin");
  try {
    await admin.query(
      `
        update public.barbearias
        set status = 'arquivada'
        where id = any($1::uuid[])
      `,
      [tenantIds],
    );
    await admin.query(
      "alter table public.eventos_auditoria disable trigger eventos_auditoria_append_only",
    );
    await admin.query(
      "delete from public.eventos_auditoria where barbearia_id = any($1::uuid[])",
      [tenantIds],
    );
    await admin.query(
      "alter table public.eventos_auditoria enable trigger eventos_auditoria_append_only",
    );
    await admin.query(
      "delete from public.convites_barbearia where barbearia_id = any($1::uuid[])",
      [tenantIds],
    );
    await admin.query(
      "delete from public.atribuicoes_cliente where barbearia_id = any($1::uuid[])",
      [tenantIds],
    );
    await admin.query(
      "delete from public.clientes where barbearia_id = any($1::uuid[])",
      [tenantIds],
    );
    await admin.query(
      "delete from public.membros_barbearia where barbearia_id = any($1::uuid[])",
      [tenantIds],
    );
    await admin.query(
      "delete from public.perfis where usuario_id = any($1::uuid[])",
      [userIds],
    );
    await admin.query(
      "delete from public.barbearias where id = any($1::uuid[])",
      [tenantIds],
    );
    await admin.query("delete from auth.users where id = any($1::uuid[])", [
      userIds,
    ]);
    await admin.query("commit");
  } catch (error) {
    await admin.query("rollback");
    throw error;
  }
}

async function main() {
  const databaseUrl = connectionString();
  const target = assertSafeTarget(databaseUrl);
  const ids = fixtureIds();
  const admin = await createClient(
    databaseUrl,
    "barbervision-concurrency-observer",
  );
  let cleanupRequired = false;

  console.log(
    `[INFO] Banco de teste: ${target.host}:${target.port}/${target.database}`,
  );

  try {
    await preflight(admin);
    await admin.query(
      "select pg_catalog.pg_advisory_lock(pg_catalog.hashtextextended('barbervision:concurrency-tests', 0))",
    );
    cleanupRequired = true;
    await setupFixtures(admin, ids);

    await testLastOwnerSerialization(databaseUrl, admin, ids);
    await testAssignmentVersusRevocation(databaseUrl, admin, ids);
    await testOutboxWorkers(databaseUrl, admin, ids);
    console.log("[OK] Suíte concorrente concluída.");
  } finally {
    if (cleanupRequired) {
      let cleanupClient;
      try {
        cleanupClient = await createClient(
          databaseUrl,
          "barbervision-concurrency-cleanup",
        );
        await cleanupFixtures(cleanupClient, ids);
      } catch (error) {
        console.error(`[ERRO] Limpeza dos fixtures falhou: ${error.message}`);
        process.exitCode = 1;
      } finally {
        if (cleanupClient) {
          await cleanupClient.end().catch(() => {});
        }
      }
    }
    await admin
      .query(
        "select pg_catalog.pg_advisory_unlock(pg_catalog.hashtextextended('barbervision:concurrency-tests', 0))",
      )
      .catch(() => {});
    await admin.end();
  }
}

main().catch((error) => {
  console.error(`[ERRO] Teste concorrente falhou: ${error.message}`);
  process.exitCode = 1;
});
