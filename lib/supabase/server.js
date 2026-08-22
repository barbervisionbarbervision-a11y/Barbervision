import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exigirConfiguracaoPublicaSupabase } from "./config";

export async function criarClienteSupabaseServer() {
  const { url, publishableKey } = exigirConfiguracaoPublicaSupabase();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaDefinir) {
        try {
          cookiesParaDefinir.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components não podem gravar cookies. O Proxy atualiza a sessão.
        }
      }
    }
  });
}
