import { NextResponse } from "next/server";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

const TIPOS_VALIDOS = new Set(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function destinoPorTipo(tipo) {
  if (tipo === "recovery") return "/barbeiro/redefinir-senha";
  if (tipo === "invite") return "/barbeiro/ativar-conta";
  return "/barbeiro/dashboard";
}

export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type");
  const conviteId = url.searchParams.get("convite");

  if (!tokenHash || !TIPOS_VALIDOS.has(tipo)) {
    return NextResponse.redirect(new URL("/barbeiro/login?erro=confirmacao", url.origin), 303);
  }

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });

  if (error) {
    return NextResponse.redirect(new URL("/barbeiro/login?erro=confirmacao", url.origin), 303);
  }

  if (tipo === "invite" && conviteId) {
    const { error: erroConvite } = await supabase.rpc("aceitar_convite_barbearia", {
      p_convite_id: conviteId
    });
    if (erroConvite) {
      return NextResponse.redirect(new URL("/barbeiro/sem-acesso?motivo=convite", url.origin), 303);
    }
  }

  return NextResponse.redirect(new URL(destinoPorTipo(tipo), url.origin), 303);
}
