import { redirect } from "next/navigation";
import DefinirSenhaForm from "@/components/auth/DefinirSenhaForm";
import { obterContextoAuth } from "@/lib/auth/context";

export default async function AtivarConta() {
  const contexto = await obterContextoAuth();
  if (!contexto?.claims?.sub) redirect("/barbeiro/login");
  return <DefinirSenhaForm ativacao />;
}
