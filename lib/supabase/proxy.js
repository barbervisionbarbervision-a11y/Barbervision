import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { exigirConfiguracaoPublicaSupabase } from "./config";

export async function atualizarSessaoSupabase(request) {
  const { url, publishableKey } = exigirConfiguracaoPublicaSupabase();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaDefinir) {
        cookiesParaDefinir.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesParaDefinir.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data, error } = await supabase.auth.getClaims();

  return {
    response,
    claims: error ? null : data?.claims ?? null
  };
}
