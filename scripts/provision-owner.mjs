import { createClient } from "@supabase/supabase-js";

function argumento(nome) {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1]?.trim() : "";
}

function possuiFlag(nome) {
  return process.argv.includes(`--${nome}`);
}

function encerrar(mensagem) {
  throw new Error(mensagem);
}

function validarOrigem(valor) {
  const url = new URL(valor);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    encerrar("BARBERVISION_APP_URL deve usar HTTPS, exceto em loopback local.");
  }
  return url.origin;
}

async function localizarUsuarioPorEmail(admin, email) {
  const { data: usuarioId, error } = await admin.rpc("localizar_usuario_auth_por_email", {
    p_email: email
  });
  if (error) encerrar("Não foi possível executar o preflight das identidades Auth.");
  if (!usuarioId) return null;
  const { data, error: erroUsuario } = await admin.auth.admin.getUserById(usuarioId);
  if (erroUsuario || !data.user) encerrar("O preflight encontrou uma identidade inconsistente no Auth.");
  return data.user;
}

async function resolverUsuario(admin, email, usuarioId) {
  if (!usuarioId) return localizarUsuarioPorEmail(admin, email);
  if (!/^[0-9a-f-]{36}$/i.test(usuarioId)) encerrar("UUID informado em --usuario-id é inválido.");
  const { data, error } = await admin.auth.admin.getUserById(usuarioId);
  if (error || !data.user) encerrar("O UUID informado em --usuario-id não existe no Auth.");
  if (data.user.email?.toLocaleLowerCase("pt-BR") !== email) {
    encerrar("O UUID informado não corresponde ao e-mail solicitado.");
  }
  return data.user;
}

async function executar() {
  const email = argumento("email").toLocaleLowerCase("pt-BR");
  const nome = argumento("nome");
  const barbearia = argumento("barbearia");
  const slug = argumento("slug").toLocaleLowerCase("pt-BR");
  const usuarioIdRetomada = argumento("usuario-id");
  const enviarAcesso = possuiFlag("enviar-acesso");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const appUrl = process.env.BARBERVISION_APP_URL?.trim();

  if (!email || !nome || !barbearia || !slug) {
    encerrar('Uso: npm run auth:provision-owner -- --email "dono@exemplo.com" --nome "Nome" --barbearia "Barbearia" --slug "barbearia" [--usuario-id UUID] [--enviar-acesso]');
  }
  if (!url || !secretKey || !appUrl) {
    encerrar("Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e BARBERVISION_APP_URL no ambiente.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) encerrar("E-mail inválido.");
  if (nome.length < 2 || nome.length > 120 || /[\p{Cc}]/u.test(nome)) encerrar("Nome do dono inválido.");
  if (barbearia.length < 2 || barbearia.length > 120 || /[\p{Cc}]/u.test(barbearia)) encerrar("Nome da barbearia inválido.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80) {
    encerrar("Slug inválido. Use de 3 a 80 letras minúsculas, números e hífens.");
  }

  const origem = validarOrigem(appUrl);
  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  let usuario = await resolverUsuario(admin, email, usuarioIdRetomada);

  const { data: tenantExistente, error: erroTenant } = await admin.from("barbearias")
    .select("id,slug,criado_por,nome,status").eq("slug", slug).maybeSingle();
  if (erroTenant) encerrar("Não foi possível executar o preflight do slug no banco.");
  if (tenantExistente && (!usuario || tenantExistente.criado_por !== usuario.id)) {
    encerrar("O slug já pertence a outro provisionamento. Nenhuma identidade Auth foi criada.");
  }

  let identidadeCriada = false;
  if (!usuario) {
    const convite = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origem}/auth/callback?next=/barbeiro/ativar-conta`,
      data: { nome, barbervision_onboarding: "dono_controlado", barbervision_convite_id: "" }
    });
    if (convite.error || !convite.data.user?.id) encerrar("Não foi possível criar o convite do dono. Revise Auth/SMTP.");
    usuario = convite.data.user;
    identidadeCriada = true;
  }

  const provisionamento = await admin.rpc("provisionar_dono_controlado", {
    p_usuario_id: usuario.id,
    p_nome: nome,
    p_barbearia_nome: barbearia,
    p_slug: slug
  });
  if (provisionamento.error) {
    encerrar(
      `A identidade Auth ${usuario.id} existe, mas o tenant não foi confirmado. Retome com os mesmos dados e --usuario-id ${usuario.id}; não crie outro usuário.`
    );
  }

  if (!identidadeCriada && enviarAcesso) {
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origem}/auth/callback?next=/barbeiro/redefinir-senha`
    });
    if (error) encerrar(`O tenant ${provisionamento.data} foi confirmado, mas o e-mail de acesso não saiu. Repita somente com --usuario-id ${usuario.id} --enviar-acesso.`);
  }

  const origemIdentidade = identidadeCriada ? "criada e convidada" : "existente e reutilizada";
  const acesso = !identidadeCriada && enviarAcesso ? " E-mail de redefinição enviado." : "";
  process.stdout.write(`Provisionamento confirmado. Identidade ${origemIdentidade}: ${usuario.id}. Barbearia: ${provisionamento.data}.${acesso}\n`);
}

executar().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha inesperada no provisionamento."}\n`);
  process.exitCode = 1;
});
