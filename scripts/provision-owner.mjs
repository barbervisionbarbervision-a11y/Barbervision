import { createClient } from "@supabase/supabase-js";

function argumentos(nome) {
  const indice = process.argv.indexOf(`--${nome}`);
  return indice >= 0 ? process.argv[indice + 1]?.trim() : "";
}

function falhar(mensagem) {
  process.stderr.write(`${mensagem}\n`);
  process.exitCode = 1;
}

const email = argumentos("email").toLocaleLowerCase("pt-BR");
const nome = argumentos("nome");
const barbearia = argumentos("barbearia");
const slug = argumentos("slug").toLocaleLowerCase("pt-BR");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
const appUrl = process.env.BARBERVISION_APP_URL?.trim();

if (!email || !nome || !barbearia || !slug) {
  falhar(
    'Uso: npm run auth:provision-owner -- --email "dono@exemplo.com" --nome "Nome" --barbearia "Barbearia" --slug "barbearia"'
  );
} else if (!url || !secretKey || !appUrl) {
  falhar("Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e BARBERVISION_APP_URL no ambiente.");
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  falhar("E-mail inválido.");
} else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  falhar("Slug inválido. Use letras minúsculas, números e hífens.");
} else {
  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const redirectTo = `${new URL(appUrl).origin}/auth/callback?next=/barbeiro/ativar-conta`;
  const convite = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      nome,
      barbervision_onboarding: "dono_controlado",
      barbervision_convite_id: ""
    }
  });

  if (convite.error || !convite.data.user?.id) {
    falhar("Não foi possível criar o convite do dono. Confira se a conta já existe e revise o Auth/SMTP.");
  } else {
    const provisionamento = await admin.rpc("provisionar_dono_controlado", {
      p_usuario_id: convite.data.user.id,
      p_nome: nome,
      p_barbearia_nome: barbearia,
      p_slug: slug
    });

    if (provisionamento.error) {
      falhar(
        `O usuário Auth ${convite.data.user.id} foi convidado, mas o tenant não foi provisionado. Corrija o banco e repita a RPC de provisionamento para esse UUID.`
      );
    } else {
      process.stdout.write(
        `Convite do dono criado. Usuário: ${convite.data.user.id}. Barbearia: ${provisionamento.data}.\n`
      );
    }
  }
}
