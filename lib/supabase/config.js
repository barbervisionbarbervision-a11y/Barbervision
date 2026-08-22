const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export function supabaseEstaConfigurado() {
  return Boolean(obterConfiguracaoPublicaSupabase());
}

export function obterConfiguracaoPublicaSupabase() {
  if (!supabaseUrl && !supabasePublishableKey) return null;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY juntas."
    );
  }

  return {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey
  };
}

export function exigirConfiguracaoPublicaSupabase() {
  const configuracao = obterConfiguracaoPublicaSupabase();

  if (!configuracao) {
    throw new Error("Supabase não está configurado neste ambiente.");
  }

  return configuracao;
}
