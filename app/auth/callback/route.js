import { NextResponse } from "next/server";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

function destinoSeguro(valor, fallback) {
  return typeof valor === "string" && valor.startsWith("/barbeiro/") && !valor.startsWith("//")
    ? valor
    : fallback;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const conviteId = url.searchParams.get("convite");
  const destino = destinoSeguro(url.searchParams.get("next"), "/barbeiro/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL("/barbeiro/login?erro=callback", url.origin), 303);
  }

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/barbeiro/login?erro=callback", url.origin), 303);
  }

  if (conviteId) {
    const { error: erroConvite } = await supabase.rpc("aceitar_convite_barbearia", {
      p_convite_id: conviteId
    });
    if (erroConvite) {
      return NextResponse.redirect(new URL("/barbeiro/sem-acesso?motivo=convite", url.origin), 303);
    }
  }

  return NextResponse.redirect(new URL(destino, url.origin), 303);
}
