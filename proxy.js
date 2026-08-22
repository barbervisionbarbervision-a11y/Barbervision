import { NextResponse } from "next/server";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";
import { atualizarSessaoSupabase } from "@/lib/supabase/proxy";

const FLAG_DEMO_INTERNA = "BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO";
const ROTAS_PUBLICAS_BARBEIRO = new Set([
  "/barbeiro/login",
  "/barbeiro/esqueci-senha"
]);

function redirecionar(request, pathname, parametros = {}, status = 307) {
  const destino = request.nextUrl.clone();
  destino.pathname = pathname;
  destino.search = "";

  Object.entries(parametros).forEach(([chave, valor]) => {
    if (valor) destino.searchParams.set(chave, valor);
  });

  const resposta = NextResponse.redirect(destino, status);
  resposta.headers.set("Cache-Control", "private, no-store, max-age=0");
  return resposta;
}

function copiarCookies(origem, destino) {
  const headersSetCookie = origem.headers.getSetCookie?.() ?? [];
  if (headersSetCookie.length > 0) {
    headersSetCookie.forEach((valor) => destino.headers.append("set-cookie", valor));
    return destino;
  }

  origem.cookies.getAll().forEach(({ name, value }) => destino.cookies.set(name, value));
  return destino;
}

function bloquearDemoInterna(request) {
  const resposta = redirecionar(request, "/", { modo: "seguro" });
  resposta.headers.set("X-BarberVision-Safe-Mode", "active");
  return resposta;
}

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const ehRotaAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const ehRotaBarbeiro = pathname === "/barbeiro" || pathname.startsWith("/barbeiro/");
  const ehRotaAuth = pathname === "/auth" || pathname.startsWith("/auth/");
  const ehProducao = process.env.NODE_ENV === "production";
  const demoInternaLiberada = process.env[FLAG_DEMO_INTERNA] === "true";
  const authConfigurado = supabaseEstaConfigurado();

  // O painel master continua fora do escopo do Auth da barbearia.
  if (ehRotaAdmin && (ehProducao || authConfigurado)) {
    return bloquearDemoInterna(request);
  }

  if (!authConfigurado) {
    if (ehProducao && !demoInternaLiberada && (ehRotaAdmin || ehRotaBarbeiro)) {
      return bloquearDemoInterna(request);
    }

    return NextResponse.next();
  }

  if (!ehRotaBarbeiro && !ehRotaAuth) return NextResponse.next();

  const { response, claims } = await atualizarSessaoSupabase(request);
  const estaAutenticado = Boolean(claims?.sub);
  const ehPublica = ROTAS_PUBLICAS_BARBEIRO.has(pathname) || ehRotaAuth;

  if (ehRotaBarbeiro && !ehPublica && !estaAutenticado) {
    const retorno = `${pathname}${request.nextUrl.search}`;
    return copiarCookies(response, redirecionar(request, "/barbeiro/login", { next: retorno }));
  }

  if (pathname === "/barbeiro/login" && estaAutenticado) {
    return copiarCookies(response, redirecionar(request, "/barbeiro/dashboard"));
  }

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/barbeiro/:path*", "/auth/:path*"]
};
