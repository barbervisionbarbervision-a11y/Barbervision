import { createClient } from "@supabase/supabase-js";

function argumento(nome) {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1]?.trim() : "";
}

function falhar(mensagem) {
  throw new Error(mensagem);
}

async function executar() {
  const usuarioId = argumento("usuario-id");
  const email = argumento("confirmar-email").toLocaleLowerCase("pt-BR");
  const confirmou = process.argv.includes("--confirmar-remocao-totp");
  const enviarAcesso = process.argv.includes("--enviar-acesso");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const appUrl = process.env.BARBERVISION_APP_URL?.trim();

  if (!url || !secretKey || (enviarAcesso && !appUrl)) falhar("Configure URL/chave server-only e, para enviar acesso, BARBERVISION_APP_URL.");
  if (!/^[0-9a-f-]{36}$/i.test(usuarioId) || !email || !confirmou) {
    falhar("Informe --usuario-id UUID --confirmar-email EMAIL --confirmar-remocao-totp. Use somente após verificar a identidade do dono fora do sistema.");
  }

  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: usuario, error: erroUsuario } = await admin.auth.admin.getUserById(usuarioId);
  if (erroUsuario || !usuario.user) falhar("Identidade Auth não encontrada.");
  if (usuario.user.email?.toLocaleLowerCase("pt-BR") !== email) falhar("UUID e e-mail de confirmação não correspondem.");

  const { data: memberships, error: erroMembership } = await admin.from("membros_barbearia")
    .select("barbearia_id,papel,status").eq("usuario_id", usuarioId).eq("papel", "dono").eq("status", "ativo");
  if (erroMembership || memberships.length === 0) falhar("A identidade não é dono ativo de nenhuma barbearia.");

  const { data: fatores, error: erroFatores } = await admin.auth.admin.mfa.listFactors({ userId: usuarioId });
  if (erroFatores) falhar("Não foi possível consultar os fatores TOTP.");
  const totp = fatores.factors.filter((fator) => fator.factor_type === "totp");
  if (totp.length === 0) falhar("A conta não possui fator TOTP para recuperar.");

  for (const fator of totp) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ userId: usuarioId, id: fator.id });
    if (error) falhar("A remoção dos fatores ficou incompleta; interrompa e reconcilie no painel Auth.");
  }

  if (enviarAcesso) {
    const origem = new URL(appUrl);
    const loopback = origem.hostname === "127.0.0.1" || origem.hostname === "localhost";
    if (origem.protocol !== "https:" && !(loopback && origem.protocol === "http:")) falhar("BARBERVISION_APP_URL deve usar HTTPS, exceto em loopback.");
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origem.origin}/auth/callback?next=/barbeiro/redefinir-senha`
    });
    if (error) falhar("O TOTP foi removido, mas o e-mail de acesso não saiu. Não repita a remoção; envie somente a recuperação de senha.");
  }

  process.stdout.write(`Recuperação TOTP concluída para ${usuarioId}: ${totp.length} fator(es) removido(s). O próximo login exigirá novo enrollment.${enviarAcesso ? " E-mail de acesso enviado." : ""}\n`);
}

executar().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha inesperada na recuperação TOTP."}\n`);
  process.exitCode = 1;
});
