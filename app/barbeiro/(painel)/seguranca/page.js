import SegurancaConta from "@/components/auth/SegurancaConta";
import { exigirSessaoBarbearia } from "@/lib/auth/context";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

export default async function Seguranca() {
  if (!supabaseEstaConfigurado()) {
    return (
      <div className="max-w-2xl rounded-xl border border-brass/35 bg-brass/10 p-5 text-sm text-parchment">
        A segurança real da conta aparece quando o ambiente Supabase está configurado. A sessão demonstrativa continua fictícia.
      </div>
    );
  }

  const { sessao } = await exigirSessaoBarbearia();
  return <SegurancaConta sessao={sessao} />;
}
