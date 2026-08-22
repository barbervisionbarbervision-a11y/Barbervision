"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Scissors } from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ProgressSteps from "@/components/ProgressSteps";
import { barbas } from "@/lib/mockData";
import { getFluxo, setFluxo } from "@/lib/clienteFlow";
import CabeloSimuladorLocal from "./_cabelo/CabeloSimuladorLocal";
import {
  AJUSTE_CABELO_MANUAL_PRIMARIO_ALGORITMO,
  AJUSTE_CABELO_MANUAL_PRIMARIO_VERSAO,
  ajusteCabeloManualPrimarioValido
} from "./_cabelo/cabeloCatalogoLocal";
import {
  REMOCAO_CABELO_AUTOMATICA_ALGORITMO,
  REMOCAO_CABELO_AUTOMATICA_METODO,
  REMOCAO_CABELO_MODELO_SHA256,
  REMOCAO_CABELO_AUTOMATICA_VERSAO
} from "./_cabelo/remocaoCabeloAutomaticaLocal";

function ajusteManualValido(ajuste, corte) {
  return Boolean(
    ajuste &&
    corte &&
    ajusteCabeloManualPrimarioValido(ajuste) &&
    ajuste.versao === AJUSTE_CABELO_MANUAL_PRIMARIO_VERSAO &&
    ajuste.algoritmo === AJUSTE_CABELO_MANUAL_PRIMARIO_ALGORITMO &&
    ajuste.automatico === false &&
    ajuste.corte === corte &&
    typeof ajuste.templateId === "string" &&
    ajuste.templateId.length > 0
  );
}

function reciboAutomaticoValido(recibo) {
  return Boolean(
    recibo &&
    recibo.versao === REMOCAO_CABELO_AUTOMATICA_VERSAO &&
    recibo.metodo === REMOCAO_CABELO_AUTOMATICA_METODO &&
    recibo.algoritmo === REMOCAO_CABELO_AUTOMATICA_ALGORITMO &&
    recibo.modeloSha256 === REMOCAO_CABELO_MODELO_SHA256 &&
    recibo.concluida === true &&
    (recibo.resultado === "removido" || recibo.resultado === "sem-cabelo")
  );
}

export default function Simulacao() {
  const router = useRouter();
  const { barbearia } = useParams();
  const [selfieOriginal, setSelfieOriginal] = useState(null);
  const [corte, setCorte] = useState(null);
  const [barba, setBarba] = useState(barbas[barbas.length - 1]);
  const [ajusteCabelo, setAjusteCabelo] = useState(null);
  const [ajusteInicialSalvo, setAjusteInicialSalvo] = useState(null);
  const ajusteCabeloRef = useRef(null);
  const [neutralizacaoCabelo, setNeutralizacaoCabelo] = useState(null);
  const [catalogoDisponivel, setCatalogoDisponivel] = useState(false);
  const [erroPersistencia, setErroPersistencia] = useState("");

  useEffect(() => {
    const fluxo = getFluxo();
    if (
      fluxo.barbeariaSlug !== barbearia ||
      !fluxo.nome ||
      !fluxo.whatsapp ||
      !fluxo.selfieDataUrl
    ) {
      router.replace(`/b/${barbearia}`);
      return;
    }

    setSelfieOriginal(fluxo.selfieDataUrl);
    setCorte(fluxo.corte || null);
    setAjusteInicialSalvo(fluxo.ajusteCabelo || null);
    // O placement salvo serve apenas como candidato de geometria manual depois
    // que a selfie e a matte forem refeitas. Nunca é tratado como resultado live.
    ajusteCabeloRef.current = null;
    setAjusteCabelo(null);
    setNeutralizacaoCabelo(fluxo.neutralizacaoCabelo || null);
    if (fluxo.barba) setBarba(fluxo.barba);
  }, [barbearia, router]);

  useEffect(() => {
    if (neutralizacaoCabelo?.concluida !== true) return;
    try {
      setFluxo({ neutralizacaoCabelo });
      setErroPersistencia("");
    } catch {
      setErroPersistencia(
        "O navegador ficou sem espaço para salvar o preparo. Volte e escolha uma foto menor."
      );
    }
  }, [neutralizacaoCabelo]);

  const receberNeutralizacao = useCallback((valor) => {
    setNeutralizacaoCabelo(valor);
    if (valor !== null) return;
    try {
      setFluxo({ neutralizacaoCabelo: null, ajusteCabelo: null });
      setErroPersistencia("");
    } catch {
      setErroPersistencia("Não foi possível limpar a preparação anterior. Recarregue a página e tente novamente.");
    }
  }, []);

  const receberAjuste = useCallback((valor) => {
    ajusteCabeloRef.current = valor;
    setAjusteCabelo(valor);
  }, []);

  function continuar() {
    const ajusteAtual = ajusteCabeloRef.current;
    if (
      !catalogoDisponivel ||
      !corte ||
      !ajusteManualValido(ajusteAtual, corte) ||
      !reciboAutomaticoValido(neutralizacaoCabelo)
    ) return;
    try {
      setFluxo({ etapa: "recomendacao", corte, barba, ajusteCabelo: ajusteAtual, neutralizacaoCabelo });
      setErroPersistencia("");
      router.push(`/b/${barbearia}/recomendacao`);
    } catch {
      setErroPersistencia(
        "O navegador ficou sem espaço para salvar a escolha. Volte e escolha uma foto menor."
      );
    }
  }

  if (!selfieOriginal) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center">
        <Logo size="sm" />
        <ProgressSteps atual={5} />
        <div className="flex items-center gap-2 text-sm text-steel" role="status">
          <Loader2 size={18} className="animate-spin text-brass" aria-hidden="true" />
          Preparando sua selfie...
        </div>
      </main>
    );
  }

  const podeContinuar =
    catalogoDisponivel &&
    Boolean(corte) &&
    ajusteManualValido(ajusteCabelo, corte) &&
    reciboAutomaticoValido(neutralizacaoCabelo);

  return (
    <main className="flex min-h-screen flex-col items-center gap-7 bg-ink px-4 py-8 sm:px-6 sm:py-10">
      <Logo size="sm" />
      <ProgressSteps atual={5} />

      <header className="max-w-xl text-center">
        <div className="mb-3 flex items-center justify-center gap-2 text-brass">
          <Scissors size={18} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-widest2">Simulação fotográfica local</span>
        </div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment sm:text-3xl">
          Experimente o corte
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-steel">
          Escolha o corte e prepare a foto neste aparelho. O cabelo original é removido localmente, mas quem
          define posição, largura, altura e inclinação do novo estilo é você, usando o painel ao lado da foto.
          A selfie não é enviada para outro serviço.
        </p>
      </header>

      <CabeloSimuladorLocal
        selfieDataUrl={selfieOriginal}
        corteInicial={corte}
        ajusteInicial={ajusteInicialSalvo}
        neutralizacaoInicial={neutralizacaoCabelo}
        onCorteChange={setCorte}
        onAjusteChange={receberAjuste}
        onNeutralizacaoChange={receberNeutralizacao}
        onCatalogoDisponivelChange={setCatalogoDisponivel}
      />

      <section aria-labelledby="titulo-barba" className="w-full max-w-4xl rounded-2xl border border-steel/25 bg-white/[0.025] p-4 sm:p-5">
        <h2 id="titulo-barba" className="font-display text-sm uppercase tracking-widest2 text-parchment">
          Barba para o pedido
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-steel">
          A barba não muda na foto nesta versão; ela fica anotada junto com sua escolha.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Opções de barba">
          {barbas.map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setBarba(opcao)}
              aria-pressed={barba === opcao}
              className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                barba === opcao
                  ? "border-barber bg-barber font-semibold text-parchment"
                  : "border-steel/30 text-parchment/80 hover:border-barber"
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>
      </section>

      <div className="flex w-full max-w-4xl flex-col items-center gap-3 border-t border-steel/20 pt-6">
        {erroPersistencia && (
          <p className="w-full max-w-md rounded-lg border border-barber/50 bg-barber/10 px-3 py-2 text-center text-sm text-parchment" role="alert">
            {erroPersistencia}
          </p>
        )}
        <p id="aviso-previa" className="text-center text-xs leading-relaxed text-steel">
          {!catalogoDisponivel
            ? "O avanço será liberado quando o dono disponibilizar pelo menos um molde fotográfico pronto."
            : neutralizacaoCabelo?.concluida !== true ||
                neutralizacaoCabelo?.algoritmo !== REMOCAO_CABELO_AUTOMATICA_ALGORITMO ||
                ajusteCabelo?.algoritmo !== AJUSTE_CABELO_MANUAL_PRIMARIO_ALGORITMO
              ? "Prepare a selfie, ajuste o corte manualmente e confirme em Pronto."
              : "Prévia 2D aproximada: a remoção é local e o posicionamento final foi confirmado manualmente por você."}
        </p>
        <Button
          onClick={continuar}
          disabled={!podeContinuar}
          aria-describedby="aviso-previa"
          className="w-full max-w-md"
        >
          {podeContinuar
            ? "Continuar para recomendações"
            : catalogoDisponivel
              ? "Conclua o ajuste manual"
              : "Catálogo fotográfico indisponível"}
        </Button>
      </div>
    </main>
  );
}
