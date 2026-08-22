import { redirect } from "next/navigation";
import MfaTotpForm from "@/components/auth/MfaTotpForm";
import { exigirSessaoBarbearia } from "@/lib/auth/context";

export default async function Mfa() {
  const { sessao } = await exigirSessaoBarbearia({ permitirAal1DoDono: true });

  if (sessao.papel !== "dono") redirect("/barbeiro/dashboard");
  if (sessao.aal === "aal2") redirect("/barbeiro/dashboard");

  return <MfaTotpForm />;
}
