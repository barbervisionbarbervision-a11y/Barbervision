"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Gift, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ProgressSteps from "@/components/ProgressSteps";
import { getFluxo, limparFluxo } from "@/lib/clienteFlow";
import { carregarHairCatalogLocal } from "@/lib/hairCatalog";
import { barbeariaExemplo, horariosDisponiveisExemplo } from "@/lib/mockData";
import { salvarContextoPosVenda } from "@/lib/posVenda";
import { gerarCodigoIndicacao } from "@/lib/dataUtils";

export default function EscolhaFinal() {
  const router = useRouter();
  const { barbearia } = useParams();
  const [fluxo, setFluxoLocal] = useState(null);
  const [horario, setHorario] = useState(horariosDisponiveisExemplo[0]);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    const atual = getFluxo();
    if (
      atual.barbeariaSlug !== barbearia ||
      !atual.nome ||
      !atual.whatsapp ||
      !atual.corte ||
      !atual.barba
    ) {
      router.replace(`/b/${barbearia}`);
      return;
    }

    setFluxoLocal(atual);
  }, [barbearia, router]);

  function enviarParaBarbeiro() {
    // Fase futura: gravar em `simulacoes`/`agendamentos` no Supabase e/ou
    // abrir wa.me com os dados prontos para o barbeiro confirmar.
    const itemCatalogo = carregarHairCatalogLocal().find((item) => item.nome === fluxo.corte);
    salvarContextoPosVenda({
      barbeariaSlug: barbearia,
      corte: itemCatalogo
        ? { nome: itemCatalogo.nome, categoria: itemCatalogo.categoria }
        : fluxo.corte,
      barba: fluxo.barba,
      horario
    });
    setEnviado(true);
    limparFluxo();
  }

  if (!fluxo) return null;

  if (enviado) {
    const { visitasParaDesconto, descricaoDesconto, indicacoesParaBonus, descricaoBonusIndicacao } =
      barbeariaExemplo.regrasFidelidade;
    const codigo = gerarCodigoIndicacao(fluxo.whatsapp?.slice(-4) || "0000", fluxo.nome);

    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-4 bg-ink text-center">
        <CheckCircle2 className="text-brass" size={48} />
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Escolha preparada!</h1>
        <p className="text-steel max-w-xs">
          Seu pedido para <span className="text-parchment font-semibold">{horario}</span> está pronto para você
          apresentar ao barbeiro. O envio e o agendamento real entram na fase conectada do produto.
        </p>

        <div className="w-full max-w-xs bg-white/5 border border-steel/20 rounded-xl p-4 flex gap-3 items-start text-left mt-2">
          <Gift className="text-brass shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-parchment/80">
            A cada {visitasParaDesconto} vezes que você usar o Barber Vision aqui, ganha {descricaoDesconto}.
            E indicando {indicacoesParaBonus} amigos que virarem clientes, ganha {descricaoBonusIndicacao}.
          </p>
        </div>

        <div className="w-full max-w-xs bg-white/5 border border-brass/30 rounded-xl p-4 flex gap-3 items-start text-left">
          <Share2 className="text-brass shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs text-steel">Seu código de indicação</p>
            <p className="text-parchment font-display tracking-widest2 text-sm mt-0.5">{codigo}</p>
            <p className="text-xs text-parchment/70 mt-1">
              Compartilhe com um amigo — quando ele usar o Barber Vision e informar esse código, a indicação
              conta pra você automaticamente.
            </p>
          </div>
        </div>

        <div className="mt-2 w-full max-w-xs border-t border-steel/20 pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest2 text-brass">Demonstração do pós-venda</p>
          <p className="mt-2 text-xs leading-relaxed text-steel">
            Depois do corte, o cliente avalia o resultado e recebe automaticamente os cuidados indicados para o
            estilo escolhido.
          </p>
          <Button
            onClick={() => router.push(`/b/${barbearia}/avaliacao`)}
            className="mt-4 w-full"
          >
            Avaliar corte e ver cuidados
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-steel/60">
            Nesta apresentação, a etapa é simulada e fica salva somente neste navegador.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 bg-ink">
      <Logo size="md" />
      <ProgressSteps atual={7} />

      <div className="w-full max-w-sm bg-white/5 border border-steel/20 rounded-xl p-6 flex flex-col gap-3">
        <h1 className="font-display text-xl uppercase tracking-widest2 text-parchment text-center mb-2">
          Sua escolha final
        </h1>
        <div className="flex justify-between text-sm">
          <span className="text-steel">Corte</span>
          <span className="text-parchment font-semibold">{fluxo.corte}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel">Barba</span>
          <span className="text-parchment font-semibold">{fluxo.barba}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-steel">Cliente</span>
          <span className="text-parchment font-semibold">{fluxo.nome}</span>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <label className="text-sm text-steel">
          Escolha um horário
          <select
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="mt-1 w-full bg-white/5 border border-steel/30 rounded-lg px-4 py-3 text-parchment focus:border-brass outline-none"
          >
            {horariosDisponiveisExemplo.map((h) => (
              <option key={h} value={h} className="bg-ink">
                {h}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-steel/60 mt-1">
          (Horários fictícios por enquanto — na próxima fase, isso cruza com a agenda real de cada barbeiro.)
        </p>
      </div>

      <Button onClick={enviarParaBarbeiro} className="w-full max-w-sm">
        Enviar para meu barbeiro
      </Button>
    </main>
  );
}
