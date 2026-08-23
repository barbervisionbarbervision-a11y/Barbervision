import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Client } = pg;
const suffix = randomUUID().replaceAll("-", "");
const ownerEmail = `e2e-owner-${suffix}@barbervision.invalid`;
const employeeEmail = `e2e-employee-${suffix}@barbervision.invalid`;
const revokedEmail = `e2e-revoked-${suffix}@barbervision.invalid`;
const failedEmail = `e2e-failed-${suffix}@barbervision.invalid`;
const ownerPassword = `Owner!${randomBytes(14).toString("base64url")}8z`;
const employeePassword = `Employee!${randomBytes(14).toString("base64url")}8z`;
const recoveredPassword = `Recovered!${randomBytes(14).toString("base64url")}8z`;
const tenantId = randomUUID();
const tenantSlug = `e2e-${suffix}`;
const databaseUrl = process.env.BARBERVISION_TEST_DATABASE_URL || "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres";
const mailpitUrl = process.env.BARBERVISION_E2E_MAILPIT_URL;
const appUrl = process.env.BARBERVISION_E2E_APP_URL || "http://127.0.0.1:3000";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
let ownerId;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replaceAll("=", "").replaceAll(" ", "").toUpperCase()) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret) {
  const counter = BigInt(Math.floor(Date.now() / 30_000));
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function database() {
  const db = new Client({ connectionString: databaseUrl, application_name: "barbervision-e2e" });
  await db.connect();
  return db;
}

async function waitForEmail(request, recipient, after = 0) {
  await expect.poll(async () => {
    const response = await request.get(`${mailpitUrl}/api/v1/messages?limit=100`);
    const payload = await response.json();
    return (payload.messages || []).some((message) => Number(new Date(message.Created)) >= after && (message.To || []).some((to) => (to.Address || to.address) === recipient));
  }, { timeout: 30_000 }).toBe(true);

  const list = await (await request.get(`${mailpitUrl}/api/v1/messages?limit=100`)).json();
  const message = (list.messages || []).find((item) => Number(new Date(item.Created)) >= after && (item.To || []).some((to) => (to.Address || to.address) === recipient));
  const detail = await (await request.get(`${mailpitUrl}/api/v1/message/${message.ID}`)).json();
  const body = String(detail.HTML || detail.Text || detail.html || detail.text || "");
  const links = [...body.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((match) => match[0].replaceAll("&amp;", "&"));
  const link = links.find((candidate) => candidate.startsWith(appUrl));
  invariant(link, `Link da aplicação não encontrado no e-mail para ${recipient}.`);
  return link;
}

test.beforeAll(async ({ request }) => {
  invariant(mailpitUrl, "MAILPIT local ausente.");
  const db = await database();
  try {
    const marker = await db.query("select pg_catalog.shobj_description(oid, 'pg_database') as marker from pg_database where datname=current_database()");
    invariant(marker.rows[0].marker === "barbervision:disposable-concurrency-test", "Banco sem marcador descartável.");
    await request.delete(`${mailpitUrl}/api/v1/messages`);
    const created = await admin.auth.admin.createUser({ email: ownerEmail, password: ownerPassword, email_confirm: true });
    if (created.error) throw created.error;
    ownerId = created.data.user.id;
    await db.query("begin");
    await db.query("insert into public.perfis (usuario_id,nome,ativo) values ($1,'Dono E2E',true)", [ownerId]);
    await db.query("insert into public.barbearias (id,nome,slug,status,criado_por) values ($1,'Barbearia E2E',$2,'ativa',$3)", [tenantId, tenantSlug, ownerId]);
    await db.query("insert into public.membros_barbearia (barbearia_id,usuario_id,papel,status,convidado_por) values ($1,$2,'dono','ativo',$2)", [tenantId, ownerId]);
    await db.query("commit");
  } finally {
    await db.end();
  }
});

test.afterAll(async () => {
  const db = await database();
  try {
    await db.query("begin");
    await db.query("update public.barbearias set status='arquivada' where id=$1", [tenantId]);
    await db.query("alter table public.eventos_auditoria disable trigger eventos_auditoria_append_only");
    await db.query("delete from public.eventos_auditoria where barbearia_id=$1", [tenantId]);
    await db.query("alter table public.eventos_auditoria enable trigger eventos_auditoria_append_only");
    await db.query("delete from public.convites_barbearia where barbearia_id=$1", [tenantId]);
    await db.query("delete from public.atribuicoes_cliente where barbearia_id=$1", [tenantId]);
    await db.query("delete from public.clientes where barbearia_id=$1", [tenantId]);
    await db.query("delete from public.membros_barbearia where barbearia_id=$1", [tenantId]);
    await db.query("delete from public.perfis where usuario_id in (select id from auth.users where email in ($1,$2,$3,$4))", [ownerEmail, employeeEmail, revokedEmail, failedEmail]);
    await db.query("delete from public.barbearias where id=$1", [tenantId]);
    const users = await db.query("select id from auth.users where email in ($1,$2,$3,$4)", [ownerEmail, employeeEmail, revokedEmail, failedEmail]);
    await db.query("commit");
    for (const user of users.rows) {
      const deleted = await admin.auth.admin.deleteUser(user.id);
      if (deleted.error) throw deleted.error;
    }
  } finally {
    await db.end();
  }
});

test("Auth, TOTP, convite, ativação, recuperação, revogação e logout", async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  await page.goto("/barbeiro/login");
  await page.getByLabel("E-mail").fill(ownerEmail);
  await page.getByLabel("Senha").fill(ownerPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/barbeiro\/mfa/);
  const secret = (await page.locator("code").innerText()).trim();
  await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
  await page.getByRole("button", { name: "Confirmar código" }).click();
  await expect(page).toHaveURL(/\/barbeiro\/dashboard/);

  await page.goto("/barbeiro/equipe");
  const inviteStarted = Date.now() - 2_000;
  await page.getByLabel("Nome").fill("Funcionário E2E");
  await page.getByLabel("E-mail").fill(employeeEmail);
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByRole("status")).toContainText("registrado para envio");
  const inviteLink = await waitForEmail(request, employeeEmail, inviteStarted);

  const employeeContext = await browser.newContext();
  const employeePage = await employeeContext.newPage();
  await employeePage.goto(inviteLink);
  await expect(employeePage).toHaveURL(/\/barbeiro\/ativar-conta/);
  await employeePage.getByLabel("Nova senha", { exact: true }).fill(employeePassword);
  await employeePage.getByLabel("Repetir nova senha").fill(employeePassword);
  await employeePage.getByRole("button", { name: "Ativar conta" }).click();
  await expect(employeePage).toHaveURL(/\/barbeiro\/dashboard/);
  await employeePage.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(employeePage).toHaveURL(/\/barbeiro\/login/);

  const recoveryStarted = Date.now() - 2_000;
  await employeePage.goto("/barbeiro/esqueci-senha");
  await employeePage.getByLabel("E-mail da conta").fill(employeeEmail);
  await employeePage.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(employeePage.getByRole("status")).toContainText("Se existir uma conta");
  const recoveryLink = await waitForEmail(request, employeeEmail, recoveryStarted);
  await employeePage.goto(recoveryLink);
  await expect(employeePage).toHaveURL(/\/barbeiro\/redefinir-senha/);
  await employeePage.getByLabel("Nova senha", { exact: true }).fill(recoveredPassword);
  await employeePage.getByLabel("Repetir nova senha").fill(recoveredPassword);
  await employeePage.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(employeePage).toHaveURL(/\/barbeiro\/dashboard/);

  await page.goto("/barbeiro/equipe");
  let employeeRow = page.getByText("Funcionário E2E", { exact: true }).locator("..").locator("..");
  await employeeRow.getByRole("button", { name: "Suspender" }).click();
  await expect(page.getByRole("status")).toContainText("Funcionário suspenso");
  employeeRow = page.getByText("Funcionário E2E", { exact: true }).locator("..").locator("..");
  await expect(employeeRow.getByText("Suspenso", { exact: true })).toBeVisible();
  await employeePage.goto("/barbeiro/dashboard");
  await expect(employeePage).toHaveURL(/\/barbeiro\/sem-acesso/);

  await employeeRow.getByRole("button", { name: "Reativar" }).click();
  await expect(page.getByRole("status")).toContainText("Funcionário reativado");
  employeeRow = page.getByText("Funcionário E2E", { exact: true }).locator("..").locator("..");
  await expect(employeeRow.getByText("Ativo", { exact: true })).toBeVisible();
  await employeePage.goto("/barbeiro/dashboard");
  await expect(employeePage).toHaveURL(/\/barbeiro\/dashboard/);

  page.once("dialog", (dialog) => dialog.accept());
  const revokeEmployeeButton = employeeRow.getByRole("button", { name: "Revogar funcionário" });
  await expect(revokeEmployeeButton).toBeEnabled();
  await revokeEmployeeButton.click();
  await expect(page.getByRole("status")).toContainText("Funcionário revogado");
  employeeRow = page.getByText("Funcionário E2E", { exact: true }).locator("..").locator("..");
  await expect(employeeRow.getByText("Revogado", { exact: true })).toBeVisible();
  await employeePage.goto("/barbeiro/dashboard");
  await expect(employeePage).toHaveURL(/\/barbeiro\/sem-acesso/);
  await employeeContext.close();

  const failedUser = await admin.auth.admin.createUser({ email: failedEmail, email_confirm: true });
  if (failedUser.error) throw failedUser.error;
  await page.getByLabel("Nome").fill("Convite com Falha");
  await page.getByLabel("E-mail").fill(failedEmail);
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByRole("status")).toContainText("registrado para envio");
  const failedDb = await database();
  try {
    await expect.poll(async () => {
      const failedInvite = await failedDb.query(
        "select status from public.convites_barbearia where barbearia_id=$1 and email_normalizado=$2",
        [tenantId, failedEmail]
      );
      return failedInvite.rows[0]?.status;
    }).toBe("falhou");
  } finally {
    await failedDb.end();
  }
  await page.reload();
  await expect(page.getByText(failedEmail, { exact: true }).locator("..").locator("..").getByText("Falha no envio", { exact: true })).toBeVisible();

  const revokedStarted = Date.now() - 2_000;
  await page.getByLabel("Nome").fill("Convite Revogado");
  await page.getByLabel("E-mail").fill(revokedEmail);
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByRole("status")).toContainText("registrado para envio");
  await waitForEmail(request, revokedEmail, revokedStarted);
  await page.reload();
  const expiredDb = await database();
  try {
    await expiredDb.query(
      "update public.convites_barbearia set expira_em=now() - interval '1 second' where barbearia_id=$1 and email_normalizado=$2",
      [tenantId, revokedEmail]
    );
  } finally {
    await expiredDb.end();
  }
  const row = page.getByText(revokedEmail, { exact: true }).locator("..").locator("..");
  await row.getByRole("button", { name: "Revogar" }).click();
  await expect(page.getByRole("status")).toContainText("reconciliado como expirado");
  await expect(page.getByText(revokedEmail, { exact: true }).locator("..").locator("..").getByText("Expirado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/barbeiro\/login/);
});
