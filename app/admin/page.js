import { Store } from "lucide-react";
import Logo from "@/components/Logo";
import { barbeariasAssinantesExemplo } from "@/lib/mockData";

const corStatus = {
  ativa: "text-brass border-brass/40",
  trial: "text-steel border-steel/40",
  inadimplente: "text-barber border-barber/40"
};

export default function PainelMaster() {
  const ativas = barbeariasAssinantesExemplo.filter((b) => b.status === "ativa").length;
  const receitaMensal = barbeariasAssinantesExemplo
    .filter((b) => b.status === "ativa")
    .reduce((soma, b) => soma + b.valorMensal, 0);

  return (
    <main className="min-h-screen bg-ink px-6 py-10 flex flex-col gap-8 items-center">
      <Logo size="sm" />
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Store className="text-brass" size={24} />
          <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">
            Painel master — Barber Vision
          </h1>
        </div>
        <p className="text-sm text-steel -mt-4">
          Visão sua (dono da plataforma), separada do painel de cada barbearia — acompanhe quem está
          assinando o Barber Vision.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-steel/20 rounded-xl p-5">
            <p className="text-3xl font-display text-parchment">{ativas}</p>
            <p className="text-sm text-steel">Barbearias ativas</p>
          </div>
          <div className="bg-white/5 border border-steel/20 rounded-xl p-5">
            <p className="text-3xl font-display text-parchment">R$ {receitaMensal}</p>
            <p className="text-sm text-steel">Receita mensal recorrente estimada</p>
          </div>
        </div>

        <div className="overflow-x-auto bg-white/5 border border-steel/20 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-steel border-b border-steel/20">
                <th className="p-4 font-medium">Barbearia</th>
                <th className="p-4 font-medium">Link</th>
                <th className="p-4 font-medium">Plano</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Valor/mês</th>
              </tr>
            </thead>
            <tbody>
              {barbeariasAssinantesExemplo.map((b) => (
                <tr key={b.id} className="border-b border-steel/10 last:border-0">
                  <td className="p-4 text-parchment font-medium">{b.nome}</td>
                  <td className="p-4 text-steel">/b/{b.slug}</td>
                  <td className="p-4 text-steel">{b.plano}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs border ${corStatus[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4 text-steel">R$ {b.valorMensal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-steel/60">
          Essa página fica em <code className="text-brass">/admin</code> e não tem link em nenhum lugar do
          site — só quem sabe o endereço acessa. Quando for vender pra várias barbearias de verdade, aqui é
          onde você (ou alguém de confiança) acompanha assinaturas, cobra inadimplentes, etc. Numa próxima
          fase, vale colocar uma senha de verdade nessa rota (hoje ela está sem nenhuma proteção).
        </p>
      </div>
    </main>
  );
}
