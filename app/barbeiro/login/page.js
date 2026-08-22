import LoginDemo from "@/components/auth/LoginDemo";
import LoginReal from "@/components/auth/LoginReal";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

function proximoSeguro(valor) {
  return typeof valor === "string" && valor.startsWith("/barbeiro/") && !valor.startsWith("//")
    ? valor
    : "/barbeiro/dashboard";
}

export default async function Login({ searchParams }) {
  if (!supabaseEstaConfigurado()) return <LoginDemo />;

  const parametros = await searchParams;
  const aviso = parametros?.erro
    ? "O link não pôde ser validado ou já expirou. Solicite um novo e-mail."
    : "";
  return <LoginReal proximo={proximoSeguro(parametros?.next)} aviso={aviso} />;
}
