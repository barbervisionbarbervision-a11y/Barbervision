"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  ListChecks,
  Package,
  Scissors,
  Star
} from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import VitrineProdutosCuidados from "@/components/VitrineProdutosCuidados";
import { criarPlanoCuidadosCabelo } from "@/lib/cuidadosCabelo";
import { carregarContextoPosVenda, salvarAvaliacaoPosVenda } from "@/lib/posVenda";

export default function Avaliacao() {
  const router = useRouter();
  const params = useParams();
  const barbearia = Array.isArray(params.barbearia) ? params.barbearia[0] : params.barbearia;
  const [contexto, setContexto] = useState(null);
  const [carregado, setCarregado] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!barbearia) return;

    const salvo = carregarContextoPosVenda(barbearia);
    setContexto(salvo);
    if (salvo?.avaliacao) {
      setNota(salvo.avaliacao.nota);
      setComentario(salvo.avaliacao.comentario);
      setEnviado(true);
    }
    setCarregado(true);
  }, [barbearia]);

  function enviar() {
    if (nota === 0) return;

    const atualizado = salvarAvaliacaoPosVenda(barbearia, { nota, comentario });
    if (atualizado) setContexto(atualizado);
    setEnviado(true);
  }

  const corte = contexto?.corte || { nome: "Corte personalizado", categoria: "Outros" };
  const plano = enviado ? criarPlanoCuidadosCabelo(corte) : null;

  if (!carregado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-6">
        <p className="text-sm text-steel" role="status">Preparando a avaliação...</p>
      </main>
    );
  }

  if (enviado && plano) {
    return (
      <main className="min-h-screen bg-ink px-4 py-10 text-parchment sm:px-6 sm:py-14">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
          <Logo size="sm" />

          <header className="mt-7 max-w-2xl text-center">
            <CheckCircle2 className="mx-auto text-brass" size={44} aria-hidden="true" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest2 text-brass">
              Avaliação concluída · cuidados liberados
            </p>
            <h1 className="mt-3 font-display text-2xl uppercase tracking-widest2 sm:text-3xl">
              Cuidados para manter seu corte
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-steel">{plano.resumo}</p>
          </header>

          <section className="mt-7 grid w-full gap-3 rounded-2xl border border-brass/30 bg-brass/[0.06] p-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-widest2 text-steel">Corte avaliado</p>
              <p className="mt-1 font-semibold text-parchment">{plano.corte.nome}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest2 text-steel">Retorno sugerido</p>
              <p className="mt-1 font-semibold text-brass">{plano.manutencao.intervaloRetorno}</p>
            </div>
          </section>

          {nota <= 2 && (
            <section className="mt-4 flex w-full gap-3 rounded-xl border border-barber/50 bg-barber/10 p-4 text-left">
              <AlertCircle className="mt-0.5 shrink-0 text-barber" size={20} aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-parchment">Sua experiência merece atenção</h2>
                <p className="mt-1 text-xs leading-relaxed text-steel">
                  Nesta demonstração, a nota fica apenas no navegador. Na versão conectada, ela será encaminhada à
                  barbearia para que a equipe possa acompanhar o atendimento.
                </p>
              </div>
            </section>
          )}

          <div className="mt-6 grid w-full gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-steel/20 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 text-brass">
                <ListChecks size={19} aria-hidden="true" />
                <h2 className="font-display text-sm uppercase tracking-widest2">Rotina em casa</h2>
              </div>
              <ol className="mt-4 space-y-3">
                {plano.rotina.map((passo, indice) => (
                  <li key={passo} className="flex gap-3 text-sm leading-relaxed text-parchment/85">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass/15 text-xs font-semibold text-brass">
                      {indice + 1}
                    </span>
                    <span>{passo}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-steel/20 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 text-brass">
                <Package size={19} aria-hidden="true" />
                <h2 className="font-display text-sm uppercase tracking-widest2">Tipos de produto</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {plano.produtos.map((produto) => (
                  <li key={produto.tipo} className="border-b border-steel/15 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-parchment">{produto.tipo}</p>
                    <p className="mt-1 text-xs leading-relaxed text-steel">{produto.finalidade}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-steel/20 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 text-brass">
                <Ban size={19} aria-hidden="true" />
                <h2 className="font-display text-sm uppercase tracking-widest2">O que evitar</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {plano.evitar.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-parchment/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-barber" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-steel/20 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 text-brass">
                <Calendar size={19} aria-hidden="true" />
                <h2 className="font-display text-sm uppercase tracking-widest2">Manutenção</h2>
              </div>
              <p className="mt-4 text-2xl font-semibold text-parchment">{plano.manutencao.intervaloRetorno}</p>
              <p className="mt-2 text-sm leading-relaxed text-steel">{plano.manutencao.orientacao}</p>
            </section>
          </div>

          <VitrineProdutosCuidados barbeariaSlug={barbearia} plano={plano} />

          <p className="mt-5 max-w-2xl text-center text-[11px] leading-relaxed text-steel/65">
            {plano.aviso} A barbearia pode personalizar estas orientações na versão conectada.
          </p>

          <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Button onClick={() => router.push(`/b/${barbearia}`)} className="w-full">
              Fazer nova simulação
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push(`/b/${barbearia}/demo`)}
              className="w-full"
            >
              Repetir demonstração
            </Button>
          </div>

          <p className="mt-3 text-center text-[11px] text-steel/55">
            A avaliação desta demonstração fica somente neste navegador.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-ink px-4 py-10 text-center sm:px-6 sm:py-14">
      <Logo size="md" />

      <div className="mt-7 flex items-center gap-2 text-brass">
        <Scissors size={17} aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-widest2">Pós-venda</span>
      </div>
      <h1 className="mt-3 font-display text-2xl uppercase tracking-widest2 text-parchment">
        Como ficou seu corte?
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-steel">
        Avalie o resultado e, ao enviar, receba automaticamente uma rotina de cuidados para manter o estilo.
      </p>

      <section className="mt-6 w-full max-w-sm rounded-xl border border-steel/20 bg-white/[0.035] p-4 text-left">
        {contexto ? (
          <>
            <p className="text-[11px] uppercase tracking-widest2 text-steel">Corte desta demonstração</p>
            <p className="mt-1 font-semibold text-parchment">{contexto.corte.nome}</p>
            <p className="mt-1 text-xs text-steel">{contexto.barba} · {contexto.horario}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-parchment">Avaliação sem atendimento vinculado</p>
            <p className="mt-1 text-xs leading-relaxed text-steel">
              Você ainda pode testar a tela; será exibido um plano geral. Faça a simulação completa para receber os
              cuidados específicos do corte escolhido.
            </p>
          </>
        )}
      </section>

      <fieldset className="mt-7">
        <legend className="text-sm text-steel">Sua nota para o resultado</legend>
        <div className="mt-3 flex gap-2" aria-label="Nota de uma a cinco estrelas">
          {[1, 2, 3, 4, 5].map((numero) => (
            <button
              key={numero}
              type="button"
              onClick={() => setNota(numero)}
              aria-label={`${numero} ${numero === 1 ? "estrela" : "estrelas"}`}
              aria-pressed={numero === nota}
              className="rounded-md p-1 transition-transform hover:scale-110"
            >
              <Star
                size={34}
                className={numero <= nota ? "fill-brass text-brass" : "text-steel/40"}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        <p className="mt-2 h-5 text-xs text-brass" aria-live="polite">
          {nota > 0 ? `${nota} de 5 estrelas` : "Selecione uma nota para continuar"}
        </p>
      </fieldset>

      <div className="mt-5 w-full max-w-sm text-left">
        <label htmlFor="comentario" className="text-sm text-steel">Quer contar mais alguma coisa? (opcional)</label>
        <textarea
          id="comentario"
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value)}
          placeholder="Conte como foi sua experiência"
          rows={4}
          maxLength={600}
          className="mt-2 w-full resize-none rounded-lg border border-steel/30 bg-white/5 px-4 py-3 text-parchment outline-none placeholder:text-steel/60 focus:border-brass"
        />
        <p className="mt-1 text-right text-[11px] text-steel/55">{comentario.length}/600</p>
      </div>

      <Button onClick={enviar} disabled={nota === 0} className="mt-5 w-full max-w-sm">
        Enviar e receber meus cuidados
      </Button>
      <p className="mt-3 max-w-sm text-[11px] leading-relaxed text-steel/55">
        Protótipo local: nenhuma avaliação é enviada à equipe nesta versão.
      </p>
    </main>
  );
}
