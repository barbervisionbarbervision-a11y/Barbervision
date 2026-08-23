import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Client } = pg;
const DATABASE_MARKER = "barbervision:disposable-concurrency-test";
const expectedConfirmation = "127.0.0.1:54322/postgres";
const databaseUrl = process.env.BARBERVISION_TEST_DATABASE_URL ||
  "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const jwtSecret = process.env.BARBERVISION_TEST_JWT_SECRET;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEnvironment() {
  invariant(supabaseUrl && publishableKey && secretKey && jwtSecret, "Defina URL, chaves locais e BARBERVISION_TEST_JWT_SECRET.");
  const api = new URL(supabaseUrl);
  const db = new URL(databaseUrl);
  invariant(["127.0.0.1", "localhost", "::1"].includes(api.hostname), "A API precisa ser local.");
  invariant(["127.0.0.1", "localhost", "::1"].includes(db.hostname), "O banco precisa ser local.");
  invariant(process.env.BARBERVISION_TEST_DATABASE_CONFIRM === expectedConfirmation, `Defina BARBERVISION_TEST_DATABASE_CONFIRM=${expectedConfirmation}.`);
  invariant(process.env.NODE_ENV !== "production", "Execução recusada em NODE_ENV=production.");
}

function jwtExpirado(usuarioId) {
  const codificar = (valor) => Buffer.from(JSON.stringify(valor)).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = codificar({ alg: "HS256", typ: "JWT" });
  const payload = codificar({
    sub: usuarioId,
    role: "authenticated",
    aud: "authenticated",
    iss: `${supabaseUrl}/auth/v1`,
    iat: agora - 120,
    exp: agora - 60,
    aal: "aal1"
  });
  const assinatura = createHmac("sha256", jwtSecret).update(`${cabecalho}.${payload}`).digest("base64url");
  return `${cabecalho}.${payload}.${assinatura}`;
}

function client(key, accessToken) {
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replaceAll("=", "").replaceAll(" ", "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    invariant(index >= 0, "Segredo TOTP inválido.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 30_000));
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(number).padStart(6, "0");
}

async function signIn(email, password) {
  const authClient = client(publishableKey);
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  invariant(data.session?.access_token, `Sessão ausente para ${email}.`);
  return { authClient, token: data.session.access_token, session: data.session };
}

async function elevateOwner(authClient) {
  const enrollment = await authClient.auth.mfa.enroll({ factorType: "totp", friendlyName: `jwt-test-${randomUUID()}` });
  if (enrollment.error) throw enrollment.error;
  const factorId = enrollment.data.id;
  const secret = enrollment.data.totp.secret;
  const verification = await authClient.auth.mfa.challengeAndVerify({ factorId, code: totp(secret) });
  if (verification.error) throw verification.error;
  invariant(verification.data.access_token, "Sessão AAL2 ausente.");
  return verification.data.access_token;
}

async function expectRows(supabase, table, expected, label) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${label}: ${error.message}`);
  invariant(count === expected, `${label}: esperado ${expected}, recebido ${count}.`);
  console.log(`[OK] ${label}`);
}

async function main() {
  assertEnvironment();
  const suffix = randomUUID().replaceAll("-", "");
  const password = `Bv!${randomBytes(18).toString("base64url")}9a`;
  const ids = {
    tenantA: randomUUID(), tenantB: randomUUID(), clientAssigned: randomUUID(), clientUnassigned: randomUUID(), clientCross: randomUUID(), namespace: randomUUID(),
  };
  const users = ["owner-a", "owner-b", "employee", "suspended", "outsider"].map((role) => ({ role, email: `${role}-${suffix}@barbervision.invalid` }));
  const admin = client(secretKey);
  const db = new Client({ connectionString: databaseUrl, application_name: "barbervision-jwt-storage-test" });
  const createdUserIds = [];
  const bucket = "barbervision-hair-cutouts";
  const validPath = `${ids.tenantA}/${ids.namespace}/fixture.png`;

  await db.connect();
  try {
    const marker = await db.query("select pg_catalog.shobj_description(oid, 'pg_database') as marker from pg_database where datname=current_database()");
    invariant(marker.rows[0].marker === DATABASE_MARKER, "Banco local sem marcador descartável.");

    const publicSignup = await client(publishableKey).auth.signUp({ email: `public-${suffix}@barbervision.invalid`, password });
    invariant(publicSignup.error, "Cadastro público deveria permanecer bloqueado.");
    console.log("[OK] Cadastro público permanece bloqueado");

    for (const user of users) {
      const { data, error } = await admin.auth.admin.createUser({ email: user.email, password, email_confirm: true });
      if (error) throw error;
      user.id = data.user.id;
      createdUserIds.push(user.id);
    }
    const byRole = Object.fromEntries(users.map((user) => [user.role, user]));

    await db.query("begin");
    await db.query("insert into public.perfis (usuario_id,nome,ativo) select * from unnest($1::uuid[],$2::text[],$3::boolean[])", [users.map((u) => u.id), users.map((u) => u.role), users.map(() => true)]);
    await db.query("insert into public.barbearias (id,nome,slug,status,criado_por) values ($1,'JWT A',$3,'ativa',$5),($2,'JWT B',$4,'ativa',$6)", [ids.tenantA, ids.tenantB, `jwt-a-${suffix}`, `jwt-b-${suffix}`, byRole["owner-a"].id, byRole["owner-b"].id]);
    await db.query("insert into public.membros_barbearia (barbearia_id,usuario_id,papel,status,convidado_por) values ($1,$3,'dono','ativo',$3),($2,$4,'dono','ativo',$4),($1,$5,'funcionario','ativo',$3),($1,$6,'funcionario','suspenso',$3)", [ids.tenantA, ids.tenantB, byRole["owner-a"].id, byRole["owner-b"].id, byRole.employee.id, byRole.suspended.id]);
    await db.query("insert into public.clientes (id,barbearia_id,nome,whatsapp,whatsapp_normalizado,criado_por) values ($1,$4,'Atribuído','+55 85 90000-0201','5585900000201',$6),($2,$4,'Não atribuído','+55 85 90000-0202','5585900000202',$6),($3,$5,'Cross tenant','+55 85 90000-0203','5585900000203',$7)", [ids.clientAssigned, ids.clientUnassigned, ids.clientCross, ids.tenantA, ids.tenantB, byRole["owner-a"].id, byRole["owner-b"].id]);
    await db.query("insert into public.atribuicoes_cliente (barbearia_id,cliente_id,usuario_id,atribuido_por) values ($1,$2,$3,$4)", [ids.tenantA, ids.clientAssigned, byRole.employee.id, byRole["owner-a"].id]);
    await db.query("commit");

    const ownerLogin = await signIn(byRole["owner-a"].email, password);
    const ownerAal1Client = client(publishableKey, ownerLogin.token);
    await expectRows(ownerAal1Client, "perfis", 1, "dono AAL1 lê o próprio perfil para bootstrap");
    await expectRows(ownerAal1Client, "membros_barbearia", 1, "dono AAL1 lê a própria membership para bootstrap");
    await expectRows(ownerAal1Client, "barbearias", 0, "dono AAL1 não lê tenant");
    const ownerAal2 = await elevateOwner(ownerLogin.authClient);
    await expectRows(client(publishableKey, ownerAal2), "barbearias", 1, "dono AAL2 lê somente o próprio tenant");

    const employeeLogin = await signIn(byRole.employee.email, password);
    const refreshedEmployee = await employeeLogin.authClient.auth.refreshSession({
      refresh_token: employeeLogin.session.refresh_token
    });
    if (refreshedEmployee.error) throw refreshedEmployee.error;
    invariant(refreshedEmployee.data.session?.access_token, "Refresh válido deveria renovar a sessão do funcionário.");
    console.log("[OK] Refresh token válido renova a sessão");
    await expectRows(client(publishableKey, employeeLogin.token), "barbearias", 1, "funcionário ativo lê o próprio tenant");
    await expectRows(client(publishableKey, employeeLogin.token), "clientes", 1, "funcionário lê somente cliente atribuído");
    const suspendedLogin = await signIn(byRole.suspended.email, password);
    await expectRows(client(publishableKey, suspendedLogin.token), "barbearias", 0, "funcionário suspenso não lê tenant");
    const outsiderLogin = await signIn(byRole.outsider.email, password);
    await expectRows(client(publishableKey, outsiderLogin.token), "barbearias", 0, "usuário sem membership não lê tenant");

    const consultaExpirada = await client(publishableKey, jwtExpirado(byRole.employee.id))
      .from("barbearias").select("id");
    invariant(consultaExpirada.error, "Access token expirado deveria ser rejeitado pela Data API.");
    console.log("[OK] Access token expirado é rejeitado");

    const secondEmployeeSession = await signIn(byRole.employee.email, password);
    const globalLogout = await employeeLogin.authClient.auth.signOut({ scope: "global" });
    if (globalLogout.error) throw globalLogout.error;
    const refreshAfterGlobalLogout = await secondEmployeeSession.authClient.auth.refreshSession({
      refresh_token: secondEmployeeSession.session.refresh_token
    });
    invariant(refreshAfterGlobalLogout.error, "Logout global deveria invalidar refresh tokens de outros aparelhos.");
    console.log("[OK] Logout global invalida refresh tokens de todas as sessões");

    const blob = new Blob([Buffer.from("barbervision-storage-jwt-test")], { type: "image/png" });
    let result = await client(publishableKey, ownerLogin.token).storage.from(bucket).upload(validPath, blob);
    invariant(result.error, "Upload de dono AAL1 deveria ser negado.");
    console.log("[OK] Storage nega dono AAL1");
    result = await client(publishableKey, employeeLogin.token).storage.from(bucket).upload(validPath, blob);
    invariant(result.error, "Upload de funcionário deveria ser negado.");
    console.log("[OK] Storage nega funcionário");
    result = await client(publishableKey, ownerAal2).storage.from(bucket).upload(`${ids.tenantB}/${ids.namespace}/cross.png`, blob);
    invariant(result.error, "Upload cross-tenant deveria ser negado.");
    console.log("[OK] Storage nega cross-tenant");
    result = await client(publishableKey, ownerAal2).storage.from("barbervision-selfies").upload(validPath, blob);
    invariant(result.error, "Upload de selfie deveria ser negado enquanto não há policy.");
    console.log("[OK] Storage mantém selfies bloqueadas");
    result = await client(publishableKey, ownerAal2).storage.from(bucket).upload(validPath, blob);
    if (result.error) throw result.error;
    const download = await client(publishableKey, ownerAal2).storage.from(bucket).download(validPath);
    if (download.error) throw download.error;
    invariant(await download.data.text() === "barbervision-storage-jwt-test", "Conteúdo baixado diverge do blob enviado.");
    const removal = await client(publishableKey, ownerAal2).storage.from(bucket).remove([validPath]);
    if (removal.error) throw removal.error;
    console.log("[OK] Dono AAL2 envia, baixa e remove blob do próprio tenant");

    execFileSync(process.execPath, [
      "scripts/recover-owner-totp.mjs",
      "--usuario-id", byRole["owner-a"].id,
      "--confirmar-email", byRole["owner-a"].email,
      "--confirmar-remocao-totp"
    ], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
    const fatoresDepoisDaRecuperacao = await admin.auth.admin.mfa.listFactors({ userId: byRole["owner-a"].id });
    if (fatoresDepoisDaRecuperacao.error) throw fatoresDepoisDaRecuperacao.error;
    invariant(fatoresDepoisDaRecuperacao.data.factors.length === 0, "Recuperação deveria remover o TOTP do dono.");
    console.log("[OK] Recuperação operacional remove TOTP e força novo enrollment");
    console.log("[OK] Suíte JWT/Data API/Storage concluída.");
  } finally {
    await db.query("rollback").catch(() => {});
    await admin.storage.from(bucket).remove([validPath]).catch(() => {});
    try {
      await db.query("begin");
      await db.query("update public.barbearias set status='arquivada' where id = any($1::uuid[])", [[ids.tenantA, ids.tenantB]]);
      await db.query("alter table public.eventos_auditoria disable trigger eventos_auditoria_append_only");
      await db.query("delete from public.eventos_auditoria where barbearia_id = any($1::uuid[])", [[ids.tenantA, ids.tenantB]]);
      await db.query("alter table public.eventos_auditoria enable trigger eventos_auditoria_append_only");
      await db.query("delete from public.convites_barbearia where barbearia_id = any($1::uuid[])", [[ids.tenantA, ids.tenantB]]);
      await db.query("delete from public.atribuicoes_cliente where barbearia_id = any($1::uuid[])", [[ids.tenantA, ids.tenantB]]);
      await db.query("delete from public.clientes where barbearia_id = any($1::uuid[])", [[ids.tenantA, ids.tenantB]]);
      await db.query("delete from public.membros_barbearia where barbearia_id = any($1::uuid[])", [[ids.tenantA, ids.tenantB]]);
      await db.query("delete from public.perfis where usuario_id = any($1::uuid[])", [createdUserIds]);
      await db.query("delete from public.barbearias where id = any($1::uuid[])", [[ids.tenantA, ids.tenantB]]);
      await db.query("commit");
      for (const id of createdUserIds) {
        const removal = await admin.auth.admin.deleteUser(id);
        if (removal.error) throw removal.error;
      }
    } catch (error) {
      await db.query("rollback").catch(() => {});
      console.error(`[ERRO] Limpeza dos fixtures falhou: ${error.message}`);
      process.exitCode = 1;
    }
    await db.end().catch(() => {});
  }
}

main().catch((error) => { console.error(`[ERRO] ${error.message}`); process.exitCode = 1; });
