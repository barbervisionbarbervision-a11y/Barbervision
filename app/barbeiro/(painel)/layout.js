import PainelAutenticadoLayout from "@/components/auth/PainelAutenticadoLayout";
import PainelDemoLayout from "@/components/auth/PainelDemoLayout";
import { exigirSessaoBarbearia } from "@/lib/auth/context";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

export default async function PainelLayout({ children }) {
  if (!supabaseEstaConfigurado()) {
    return <PainelDemoLayout>{children}</PainelDemoLayout>;
  }

  const { sessao } = await exigirSessaoBarbearia();
  return <PainelAutenticadoLayout sessao={sessao}>{children}</PainelAutenticadoLayout>;
}
