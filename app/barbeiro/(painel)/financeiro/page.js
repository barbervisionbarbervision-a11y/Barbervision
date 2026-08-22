"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  UnlockKeyhole,
  XCircle
} from "lucide-react";
import Button from "@/components/Button";
import { barbeariaExemplo } from "@/lib/mockData";
import { useSessaoDono } from "@/lib/useSessaoDono";
import {
  CLASSIFICACOES_FINANCEIRAS,
  FORMAS_PAGAMENTO,
  NATUREZAS_JURIDICAS,
  PORTES_EMPRESA,
  REGIMES_TRIBUTARIOS,
  SITUACOES_DOCUMENTO,
  calcularResumoFinanceiro,
  calcularValoresLancamento,
  carregarFechamentoFinanceiroLocal,
  carregarPerfilFinanceiroLocal,
  competenciaAtual,
  criarFechamentoFinanceiroInicial,
  criarLancamentoFinanceiroId,
  fecharCompetenciaFinanceira,
  fechamentoPodeSerConcluido,
  formatarCentavos,
  gerarCsvFechamentoFinanceiro,
  normalizarLancamentoFinanceiro,
  reabrirCompetenciaFinanceira,
  reiniciarDadosFinanceirosLocais,
  salvarFechamentoFinanceiroLocal,
  salvarPerfilFinanceiroLocal,
  validarLancamentoFinanceiro
} from "@/lib/fechamentoFinanceiro";

const ROTULO_CLASSIFICACAO = Object.fromEntries(
  CLASSIFICACOES_FINANCEIRAS.map((item) => [item.id, item.label])
);
const ROTULO_PAGAMENTO = Object.fromEntries(FORMAS_PAGAMENTO.map((item) => [item.id, item.label]));
const ROTULO_DOCUMENTO = Object.fromEntries(SITUACOES_DOCUMENTO.map((item) => [item.id, item.label]));

function dataInicialDaCompetencia(competencia) {
  const hoje = new Date();
  const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate()
  ).padStart(2, "0")}`;
  return dataHoje.startsWith(`${competencia}-`) ? dataHoje : `${competencia}-01`;
}

function criarFormularioVazio(competencia) {
  return {
    data: dataInicialDaCompetencia(competencia),
    classificacao: "servico",
    descricao: "",
    profissional: "",
    formaPagamento: "pix",
    valorBruto: "",
    desconto: "",
    estorno: "",
    taxa: "",
    valorRecebido: "",
    documentoSituacao: "nao_informada",
    documentoNumero: "",
    referenciaConciliacao: ""
  };
}

function moedaParaCentavos(valor, opcional = false) {
  const original = String(valor ?? "").trim();
  if (!original && opcional) return null;
  let texto = original.replace(/[^\d,.-]/g, "");
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  const numero = Number(texto || 0);
  return Number.isFinite(numero) ? Math.round(numero * 100) : NaN;
}

function centavosParaCampo(valor) {
  return Number.isInteger(valor) ? (valor / 100).toFixed(2).replace(".", ",") : "";
}

function formatarCompetencia(competencia) {
  const [ano, mes] = competencia.split("-");
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(ano), Number(mes) - 1, 1))
  );
}

function badgeConciliacao(situacao) {
  const estilos = {
    conciliado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    pendente: "border-brass/30 bg-brass/10 text-brass",
    divergente: "border-barber/40 bg-barber/10 text-red-300",
    cancelado: "border-steel/25 bg-white/5 text-steel"
  };
  return estilos[situacao] || estilos.pendente;
}

function CartaoResumo({ titulo, valor, detalhe, destaque = "parchment" }) {
  const cores = {
    parchment: "text-parchment",
    brass: "text-brass",
    barber: "text-red-300"
  };
  return (
    <div className="rounded-xl border border-steel/20 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest2 text-steel">{titulo}</p>
      <p className={`mt-2 text-xl font-semibold ${cores[destaque]}`}>{valor}</p>
      <p className="mt-1 text-xs text-steel">{detalhe}</p>
    </div>
  );
}

export default function Financeiro() {
  const sessao = useSessaoDono();
  const [competencia, setCompetencia] = useState(() => competenciaAtual());
  const [fechamento, setFechamento] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [perfilRascunho, setPerfilRascunho] = useState(null);
  const [formulario, setFormulario] = useState(() => criarFormularioVazio(competenciaAtual()));
  const [editandoId, setEditandoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [armazenamentoCorrompido, setArmazenamentoCorrompido] = useState(false);

  useEffect(() => {
    if (!sessao) return undefined;
    let ativo = true;
    const timer = window.setTimeout(() => {
      if (!ativo) return;
      const resultadoMes = carregarFechamentoFinanceiroLocal(barbeariaExemplo.slug, competencia);
      const resultadoPerfil = carregarPerfilFinanceiroLocal(barbeariaExemplo.slug, barbeariaExemplo.nome);
      const corrompido = resultadoMes.estado === "corrompido" || resultadoPerfil.estado === "corrompido";
      setArmazenamentoCorrompido(corrompido);
      setFechamento(resultadoMes.fechamento);
      setPerfil(resultadoPerfil.perfil);
      setPerfilRascunho(resultadoPerfil.perfil);
      setFormulario(criarFormularioVazio(competencia));
      setEditandoId(null);
      setErro(resultadoMes.erro || resultadoPerfil.erro || "");
      setMensagem("");
      setCarregando(false);
    }, 0);
    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [competencia, sessao]);

  const resumo = useMemo(
    () => calcularResumoFinanceiro(fechamento?.lancamentos || []),
    [fechamento?.lancamentos]
  );
  const validacaoFechamento = useMemo(
    () => fechamentoPodeSerConcluido(fechamento),
    [fechamento]
  );

  if (!sessao) return null;

  function trocarCompetencia(evento) {
    setCompetencia(evento.target.value);
    setCarregando(true);
    setErro("");
    setMensagem("");
  }

  function persistirFechamento(proximo, textoSucesso) {
    try {
      const salvo = salvarFechamentoFinanceiroLocal(barbeariaExemplo.slug, proximo);
      setFechamento(salvo);
      setErro("");
      setMensagem(textoSucesso);
      return salvo;
    } catch (falha) {
      setMensagem("");
      setErro(falha.message || "Não foi possível salvar o fechamento neste navegador.");
      return null;
    }
  }

  function salvarPerfil(evento) {
    evento?.preventDefault();
    if (!perfilRascunho) return null;
    if (perfilRascunho.nomeEmpresarial.trim().length < 2) {
      setErro("Informe o nome empresarial para o relatório.");
      return null;
    }
    try {
      const salvo = salvarPerfilFinanceiroLocal(barbeariaExemplo.slug, perfilRascunho);
      setPerfil(salvo);
      setPerfilRascunho(salvo);
      setErro("");
      setMensagem("Dados empresariais declarados foram salvos somente neste navegador.");
      return salvo;
    } catch (falha) {
      setMensagem("");
      setErro(falha.message || "Não foi possível salvar os dados empresariais.");
      return null;
    }
  }

  function limparFormulario() {
    setFormulario(criarFormularioVazio(competencia));
    setEditandoId(null);
  }

  function montarLancamentoDoFormulario() {
    const agora = new Date().toISOString();
    const anterior = fechamento.lancamentos.find((item) => item.id === editandoId);
    return {
      id: anterior?.id || criarLancamentoFinanceiroId(),
      data: formulario.data,
      classificacao: formulario.classificacao,
      descricao: formulario.descricao,
      profissional: formulario.profissional,
      formaPagamento: formulario.formaPagamento,
      valorBrutoCentavos: moedaParaCentavos(formulario.valorBruto),
      descontoCentavos: moedaParaCentavos(formulario.desconto),
      estornoCentavos: moedaParaCentavos(formulario.estorno),
      taxaPagamentoCentavos: moedaParaCentavos(formulario.taxa),
      valorRecebidoCentavos: moedaParaCentavos(formulario.valorRecebido, true),
      recebidoEm: formulario.valorRecebido.trim() ? anterior?.recebidoEm || agora : null,
      referenciaConciliacao: formulario.referenciaConciliacao,
      documento: {
        situacao: formulario.documentoSituacao,
        numero: formulario.documentoNumero
      },
      status: "ativo",
      motivoCancelamento: "",
      origem: "manual-local",
      criadoEm: anterior?.criadoEm || agora,
      atualizadoEm: agora
    };
  }

  function salvarLancamento(evento) {
    evento.preventDefault();
    if (!fechamento || fechamento.status === "fechado") return;
    const candidato = montarLancamentoDoFormulario();
    const erros = validarLancamentoFinanceiro(candidato, competencia);
    if (erros.length) {
      setMensagem("");
      setErro(erros.join(" "));
      return;
    }
    const normalizado = normalizarLancamentoFinanceiro(candidato, competencia);
    if (!normalizado) {
      setErro("O lançamento não pôde ser normalizado.");
      return;
    }
    const lancamentos = editandoId
      ? fechamento.lancamentos.map((item) => (item.id === editandoId ? normalizado : item))
      : [...fechamento.lancamentos, normalizado];
    const salvo = persistirFechamento(
      { ...fechamento, lancamentos },
      editandoId ? "Lançamento atualizado no fechamento local." : "Lançamento adicionado ao mês."
    );
    if (salvo) limparFormulario();
  }

  function editarLancamento(lancamento) {
    if (fechamento.status === "fechado" || lancamento.status === "cancelado") return;
    setEditandoId(lancamento.id);
    setFormulario({
      data: lancamento.data,
      classificacao: lancamento.classificacao,
      descricao: lancamento.descricao,
      profissional: lancamento.profissional,
      formaPagamento: lancamento.formaPagamento,
      valorBruto: centavosParaCampo(lancamento.valorBrutoCentavos),
      desconto: centavosParaCampo(lancamento.descontoCentavos),
      estorno: centavosParaCampo(lancamento.estornoCentavos),
      taxa: centavosParaCampo(lancamento.taxaPagamentoCentavos),
      valorRecebido: centavosParaCampo(lancamento.valorRecebidoCentavos),
      documentoSituacao: lancamento.documento.situacao,
      documentoNumero: lancamento.documento.numero,
      referenciaConciliacao: lancamento.referenciaConciliacao
    });
    setErro("");
    setMensagem("Editando lançamento; salve para confirmar a alteração.");
    requestAnimationFrame(() => document.getElementById("form-lancamento")?.scrollIntoView({ behavior: "smooth" }));
  }

  function conciliarPeloEsperado(lancamento) {
    if (fechamento.status === "fechado" || lancamento.status === "cancelado") return;
    const valores = calcularValoresLancamento(lancamento);
    const agora = new Date().toISOString();
    const lancamentos = fechamento.lancamentos.map((item) =>
      item.id === lancamento.id
        ? {
            ...item,
            valorRecebidoCentavos: valores.recebimentoEsperadoCentavos,
            recebidoEm: agora,
            referenciaConciliacao: item.referenciaConciliacao || "Conferido manualmente na demo",
            atualizadoEm: agora,
            origem: "manual-local"
          }
        : item
    );
    persistirFechamento({ ...fechamento, lancamentos }, "Recebimento conciliado pelo valor esperado.");
  }

  function cancelarLancamento(lancamento) {
    if (fechamento.status === "fechado" || lancamento.status === "cancelado") return;
    const motivo = window.prompt("Por que este lançamento será cancelado?", "Correção do fechamento local");
    if (motivo == null) return;
    if (motivo.trim().length < 5) {
      setErro("Informe um motivo com pelo menos 5 caracteres para cancelar.");
      return;
    }
    const agora = new Date().toISOString();
    const lancamentos = fechamento.lancamentos.map((item) =>
      item.id === lancamento.id
        ? { ...item, status: "cancelado", motivoCancelamento: motivo.trim(), atualizadoEm: agora, origem: "manual-local" }
        : item
    );
    if (persistirFechamento({ ...fechamento, lancamentos }, "Lançamento cancelado e preservado no relatório.")) {
      if (editandoId === lancamento.id) limparFormulario();
    }
  }

  function preencherRecebidoEsperado() {
    const candidato = montarLancamentoDoFormulario();
    const erros = validarLancamentoFinanceiro({ ...candidato, valorRecebidoCentavos: null }, competencia);
    if (erros.length) {
      setErro(erros.join(" "));
      return;
    }
    const valores = calcularValoresLancamento(candidato);
    setFormulario((atual) => ({
      ...atual,
      valorRecebido: centavosParaCampo(valores.recebimentoEsperadoCentavos)
    }));
    setErro("");
  }

  function restaurarExemplos() {
    if (!window.confirm("Substituir os lançamentos deste mês pelos exemplos fictícios?")) return;
    const inicial = criarFechamentoFinanceiroInicial(competencia, true);
    persistirFechamento(
      {
        ...inicial,
        revisao: fechamento.revisao,
        criadoEm: fechamento.criadoEm,
        eventos: fechamento.eventos
      },
      "Exemplos fictícios restaurados neste mês."
    );
    limparFormulario();
  }

  function limparExemplos() {
    const exemplos = fechamento.lancamentos.filter((item) => item.origem === "demonstracao").length;
    if (!exemplos) {
      setMensagem("Não há exemplos fictícios originais para limpar.");
      return;
    }
    if (!window.confirm(`Remover ${exemplos} lançamento(s) fictício(s) deste mês?`)) return;
    const lancamentos = fechamento.lancamentos.filter((item) => item.origem !== "demonstracao");
    persistirFechamento({ ...fechamento, lancamentos }, "Exemplos fictícios removidos deste mês.");
    limparFormulario();
  }

  function fecharMes() {
    if (!fechamento || !perfilRascunho) return;
    if (
      perfilRascunho.porte === "nao_informado" ||
      perfilRascunho.naturezaJuridica === "nao_informada" ||
      perfilRascunho.regimeTributario === "nao_informado"
    ) {
      setErro("Antes de fechar, informe separadamente porte, natureza jurídica e regime tributário.");
      document.getElementById("perfil-empresa")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!validacaoFechamento.pode) {
      setErro(validacaoFechamento.motivo);
      return;
    }
    if (!window.confirm("Fechar este mês como relatório gerencial local? A edição ficará bloqueada até uma reabertura justificada.")) {
      return;
    }
    const perfilSalvo = salvarPerfil();
    if (!perfilSalvo) return;
    try {
      const proximo = fecharCompetenciaFinanceira(fechamento, perfilSalvo, sessao.nome);
      persistirFechamento(proximo, "Mês fechado localmente. Exporte o CSV e envie para conferência do contador.");
    } catch (falha) {
      setErro(falha.message);
    }
  }

  function reabrirMes() {
    const motivo = window.prompt("Informe o motivo da reabertura:", "Correção solicitada para conferência");
    if (motivo == null) return;
    try {
      const proximo = reabrirCompetenciaFinanceira(fechamento, sessao.nome, motivo);
      persistirFechamento(proximo, "Mês reaberto localmente; revise e feche novamente.");
    } catch (falha) {
      setErro(falha.message);
    }
  }

  function exportarCsv() {
    if (!fechamento || !perfil) return;
    try {
      const csv = gerarCsvFechamentoFinanceiro({
        barbeariaNome: barbeariaExemplo.nome,
        fechamento,
        perfil
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `barber-vision-fechamento-${competencia}-${fechamento.status}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setErro("");
      setMensagem(
        fechamento.status === "fechado"
          ? "CSV do fechamento local baixado. Envie-o para conferência do contador."
          : "Prévia CSV baixada; ela ainda pode mudar enquanto o mês estiver aberto."
      );
    } catch {
      setMensagem("");
      setErro("Não foi possível gerar o CSV neste navegador.");
    }
  }

  function reiniciarDadosCorrompidos() {
    if (!window.confirm("Apagar o perfil financeiro e o mês corrompido somente deste navegador? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      const reiniciado = reiniciarDadosFinanceirosLocais(
        barbeariaExemplo.slug,
        competencia,
        barbeariaExemplo.nome
      );
      setFechamento(reiniciado.fechamento);
      setPerfil(reiniciado.perfil);
      setPerfilRascunho(reiniciado.perfil);
      setArmazenamentoCorrompido(false);
      setErro("");
      setMensagem("Dados financeiros locais corrompidos foram reiniciados com exemplos fictícios.");
    } catch (falha) {
      setErro(falha.message);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center text-sm text-steel">
        <RefreshCw className="mr-2 animate-spin" size={17} /> Carregando fechamento local…
      </div>
    );
  }

  if (armazenamentoCorrompido || !fechamento || !perfilRascunho) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-barber/50 bg-barber/10 p-6">
        <AlertTriangle className="text-red-300" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl uppercase tracking-widest2 text-parchment">Dados locais inválidos</h1>
        <p className="mt-2 text-sm leading-relaxed text-steel">{erro || "O fechamento não pôde ser carregado."}</p>
        <Button type="button" variant="danger" className="mt-5" onClick={reiniciarDadosCorrompidos}>
          Reiniciar perfil e mês local
        </Button>
      </section>
    );
  }

  const fechado = fechamento.status === "fechado";

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest2 text-brass">Conferência mensal</p>
          <h1 className="mt-2 font-display text-2xl uppercase tracking-widest2 text-parchment">
            Fechamento financeiro
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-steel">
            Separe serviços e produtos, confira recebimentos e gere um CSV gerencial para o contador.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-xs font-semibold uppercase tracking-wide text-steel">
            Competência
            <input
              type="month"
              value={competencia}
              onChange={trocarCompetencia}
              className="mt-1 block min-h-11 rounded-lg border border-steel/30 bg-ink px-3 text-parchment outline-none focus:border-brass"
            />
          </label>
          <button
            type="button"
            onClick={exportarCsv}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brass/50 px-4 text-sm font-semibold text-brass hover:bg-brass/10"
          >
            <Download size={17} /> Exportar CSV
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-brass/30 bg-brass/5 p-4" role="note">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-brass" size={19} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-parchment">Demonstração gerencial local — não é documento fiscal</p>
            <p className="mt-1 text-xs leading-relaxed text-steel">
              Os dados ficam apenas neste navegador, podem ser alterados e não têm backup. Esta área não calcula
              tributos, lucro, DAS ou PGDAS-D; não transmite declaração, não gera guia, não comprova pagamento e não
              substitui o contador. Use somente informações fictícias nesta fase.
            </p>
          </div>
        </div>
      </section>

      {(erro || mensagem) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            erro ? "border-barber/50 bg-barber/10 text-red-200" : "border-brass/30 bg-brass/10 text-brass"
          }`}
          role={erro ? "alert" : "status"}
        >
          {erro || mensagem}
        </div>
      )}

      <section id="perfil-empresa" className="rounded-xl border border-steel/20 bg-white/5 p-5">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 shrink-0 text-brass" size={19} />
          <div>
            <h2 className="font-display text-sm uppercase tracking-widest2 text-parchment">Dados declarados para o contador</h2>
            <p className="mt-1 text-xs leading-relaxed text-steel">
              Porte, natureza jurídica e regime são campos diferentes. Eles entram apenas como contexto no relatório e
              não acionam fórmula tributária nesta versão.
            </p>
          </div>
        </div>
        <form onSubmit={salvarPerfil} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm text-steel xl:col-span-2">
            Nome empresarial
            <input
              value={perfilRascunho.nomeEmpresarial}
              maxLength={140}
              onChange={(evento) => setPerfilRascunho((atual) => ({ ...atual, nomeEmpresarial: evento.target.value }))}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
            />
          </label>
          <label className="text-sm text-steel">
            Município / UF
            <input
              value={perfilRascunho.municipioUf}
              maxLength={120}
              placeholder="Ex.: Natal / RN"
              onChange={(evento) => setPerfilRascunho((atual) => ({ ...atual, municipioUf: evento.target.value }))}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
            />
          </label>
          <label className="text-sm text-steel">
            Porte empresarial
            <select
              value={perfilRascunho.porte}
              onChange={(evento) => setPerfilRascunho((atual) => ({ ...atual, porte: evento.target.value }))}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
            >
              {PORTES_EMPRESA.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-steel">
            Natureza jurídica
            <select
              value={perfilRascunho.naturezaJuridica}
              onChange={(evento) => setPerfilRascunho((atual) => ({ ...atual, naturezaJuridica: evento.target.value }))}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
            >
              {NATUREZAS_JURIDICAS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-steel">
            Regime tributário declarado
            <select
              value={perfilRascunho.regimeTributario}
              onChange={(evento) => setPerfilRascunho((atual) => ({ ...atual, regimeTributario: evento.target.value }))}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
            >
              {REGIMES_TRIBUTARIOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-steel md:col-span-2">
            Contador responsável (opcional)
            <input
              value={perfilRascunho.contadorNome}
              maxLength={120}
              onChange={(evento) => setPerfilRascunho((atual) => ({ ...atual, contadorNome: evento.target.value }))}
              className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2">
              <Save size={16} /> Salvar dados declarados
            </Button>
          </div>
        </form>
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-sm uppercase tracking-widest2 text-parchment">
              Resumo de {formatarCompetencia(competencia)}
            </h2>
            <p className="mt-1 text-xs text-steel">Totais derivados dos lançamentos ativos; nada é calculado como imposto.</p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              fechado ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-brass/30 bg-brass/10 text-brass"
            }`}
          >
            {fechado ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}
            {fechado ? "Fechado localmente" : "Mês aberto"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CartaoResumo titulo="Serviços" valor={formatarCentavos(resumo.servicosCentavos)} detalhe="Receita registrada" destaque="brass" />
          <CartaoResumo titulo="Produtos" valor={formatarCentavos(resumo.produtosCentavos)} detalhe="Separados dos serviços" destaque="brass" />
          <CartaoResumo titulo="Recebido informado" valor={formatarCentavos(resumo.recebidoCentavos)} detalhe={`${resumo.conciliados} conciliado(s)`} />
          <CartaoResumo
            titulo="Diferença"
            valor={formatarCentavos(resumo.diferencaCentavos)}
            detalhe={`${resumo.pendentes} pendente(s) · ${resumo.divergentes} divergente(s)`}
            destaque={resumo.diferencaCentavos === 0 && resumo.pendentes === 0 ? "parchment" : "barber"}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <CartaoResumo titulo="Bruto registrado" valor={formatarCentavos(resumo.valorBrutoCentavos)} detalhe="Antes de ajustes" />
          <CartaoResumo titulo="Descontos + estornos" valor={formatarCentavos(resumo.descontosCentavos + resumo.estornosCentavos)} detalhe="Informados nos lançamentos" />
          <CartaoResumo titulo="Taxas de pagamento" valor={formatarCentavos(resumo.taxasCentavos)} detalhe="Não são cálculo tributário" />
        </div>
      </section>

      {!fechado && (resumo.pendentes > 0 || resumo.divergentes > 0) && (
        <section className="rounded-xl border border-barber/35 bg-barber/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-red-300" size={18} />
            <div>
              <p className="text-sm font-semibold text-parchment">Conciliação ainda incompleta</p>
              <p className="mt-1 text-xs leading-relaxed text-steel">
                O fechamento exige zero pendências e zero divergências. Use “Conciliar esperado” quando o valor
                recebido estiver correto ou edite o lançamento para registrar a diferença real.
              </p>
            </div>
          </div>
        </section>
      )}

      <section id="form-lancamento" className="scroll-mt-4 rounded-xl border border-steel/20 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-sm uppercase tracking-widest2 text-parchment">
              {editandoId ? "Editar lançamento" : "Adicionar lançamento"}
            </h2>
            <p className="mt-1 text-xs text-steel">
              Venda mista deve virar duas linhas: uma de serviço e outra de produto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={fechado} onClick={limparExemplos} className="rounded-lg border border-steel/30 px-3 py-2 text-xs text-steel hover:border-brass hover:text-brass disabled:opacity-40">
              Limpar fictícios
            </button>
            <button type="button" disabled={fechado} onClick={restaurarExemplos} className="flex items-center gap-1 rounded-lg border border-steel/30 px-3 py-2 text-xs text-steel hover:border-brass hover:text-brass disabled:opacity-40">
              <RotateCcw size={13} /> Restaurar exemplos
            </button>
          </div>
        </div>

        {fechado ? (
          <div className="mt-5 rounded-lg border border-steel/20 bg-ink/60 p-4 text-sm text-steel">
            Este mês está bloqueado. Reabra com justificativa para alterar lançamentos.
          </div>
        ) : (
          <form onSubmit={salvarLancamento} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-steel">
              Data
              <input type="date" value={formulario.data} onChange={(evento) => setFormulario((atual) => ({ ...atual, data: evento.target.value }))} className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel">
              Classificação
              <select value={formulario.classificacao} onChange={(evento) => setFormulario((atual) => ({ ...atual, classificacao: evento.target.value }))} className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass">
                {CLASSIFICACOES_FINANCEIRAS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-steel md:col-span-2">
              Descrição
              <input value={formulario.descricao} maxLength={160} onChange={(evento) => setFormulario((atual) => ({ ...atual, descricao: evento.target.value }))} placeholder="Ex.: corte degradê ou pomada matte" className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel">
              Profissional (opcional)
              <input value={formulario.profissional} maxLength={100} onChange={(evento) => setFormulario((atual) => ({ ...atual, profissional: evento.target.value }))} className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel">
              Forma de pagamento
              <select value={formulario.formaPagamento} onChange={(evento) => setFormulario((atual) => ({ ...atual, formaPagamento: evento.target.value }))} className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass">
                {FORMAS_PAGAMENTO.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-steel">
              Valor bruto (R$)
              <input inputMode="decimal" value={formulario.valorBruto} onChange={(evento) => setFormulario((atual) => ({ ...atual, valorBruto: evento.target.value }))} placeholder="45,00" className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel">
              Desconto (R$)
              <input inputMode="decimal" value={formulario.desconto} onChange={(evento) => setFormulario((atual) => ({ ...atual, desconto: evento.target.value }))} placeholder="0,00" className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel">
              Estorno (R$)
              <input inputMode="decimal" value={formulario.estorno} onChange={(evento) => setFormulario((atual) => ({ ...atual, estorno: evento.target.value }))} placeholder="0,00" className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel">
              Taxa do pagamento (R$)
              <input inputMode="decimal" value={formulario.taxa} onChange={(evento) => setFormulario((atual) => ({ ...atual, taxa: evento.target.value }))} placeholder="0,00" className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel">
              Valor recebido (R$)
              <div className="mt-1 flex gap-2">
                <input inputMode="decimal" value={formulario.valorRecebido} onChange={(evento) => setFormulario((atual) => ({ ...atual, valorRecebido: evento.target.value }))} placeholder="Vazio = pendente" className="min-w-0 flex-1 rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
                <button type="button" onClick={preencherRecebidoEsperado} className="rounded-lg border border-brass/40 px-3 text-xs font-semibold text-brass hover:bg-brass/10">Usar esperado</button>
              </div>
            </label>
            <label className="text-sm text-steel">
              Situação do documento
              <select value={formulario.documentoSituacao} onChange={(evento) => setFormulario((atual) => ({ ...atual, documentoSituacao: evento.target.value }))} className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass">
                {SITUACOES_DOCUMENTO.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-steel">
              Número do documento (opcional)
              <input value={formulario.documentoNumero} maxLength={80} onChange={(evento) => setFormulario((atual) => ({ ...atual, documentoNumero: evento.target.value }))} className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <label className="text-sm text-steel xl:col-span-2">
              Referência da conciliação (opcional)
              <input value={formulario.referenciaConciliacao} maxLength={120} onChange={(evento) => setFormulario((atual) => ({ ...atual, referenciaConciliacao: evento.target.value }))} placeholder="Ex.: lote da maquininha ou conferência do caixa" className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass" />
            </label>
            <div className="flex items-end gap-2 xl:col-span-2">
              <Button type="submit" className="flex min-h-11 flex-1 items-center justify-center gap-2">
                {editandoId ? <Save size={16} /> : <Plus size={16} />}
                {editandoId ? "Salvar alteração" : "Adicionar ao mês"}
              </Button>
              {editandoId && <Button type="button" variant="ghost" onClick={limparFormulario}>Cancelar edição</Button>}
            </div>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-steel/20 bg-white/5 p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="text-brass" size={18} />
          <h2 className="font-display text-sm uppercase tracking-widest2 text-parchment">Lançamentos do mês</h2>
        </div>
        {fechamento.lancamentos.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-steel/30 p-8 text-center text-sm text-steel">
            Nenhum lançamento nesta competência. Adicione manualmente ou restaure exemplos fictícios.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-xs">
              <thead className="border-b border-steel/25 text-steel">
                <tr>
                  <th className="px-2 py-3 font-medium">Data / origem</th>
                  <th className="px-2 py-3 font-medium">Classificação</th>
                  <th className="px-2 py-3 font-medium">Descrição</th>
                  <th className="px-2 py-3 font-medium">Pagamento</th>
                  <th className="px-2 py-3 text-right font-medium">Registrado</th>
                  <th className="px-2 py-3 text-right font-medium">Esperado</th>
                  <th className="px-2 py-3 text-right font-medium">Recebido</th>
                  <th className="px-2 py-3 font-medium">Conciliação</th>
                  <th className="px-2 py-3 font-medium">Documento</th>
                  <th className="px-2 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel/15">
                {fechamento.lancamentos.map((lancamento) => {
                  const valores = calcularValoresLancamento(lancamento);
                  return (
                    <tr key={lancamento.id} className={lancamento.status === "cancelado" ? "opacity-55" : ""}>
                      <td className="px-2 py-3 text-steel">
                        <span className="block text-parchment">{lancamento.data.split("-").reverse().join("/")}</span>
                        <span className="mt-1 block text-[10px] uppercase tracking-wide">
                          {lancamento.origem === "demonstracao" ? "Fictício" : "Manual local"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-parchment">{ROTULO_CLASSIFICACAO[lancamento.classificacao]}</td>
                      <td className="max-w-[230px] px-2 py-3">
                        <span className="block text-parchment">{lancamento.descricao}</span>
                        {lancamento.profissional && <span className="mt-1 block text-steel">{lancamento.profissional}</span>}
                        {lancamento.status === "cancelado" && <span className="mt-1 block text-red-300">Cancelado: {lancamento.motivoCancelamento}</span>}
                      </td>
                      <td className="px-2 py-3 text-steel">{ROTULO_PAGAMENTO[lancamento.formaPagamento]}</td>
                      <td className="px-2 py-3 text-right text-parchment">{formatarCentavos(valores.receitaRegistradaCentavos)}</td>
                      <td className="px-2 py-3 text-right text-parchment">{formatarCentavos(valores.recebimentoEsperadoCentavos)}</td>
                      <td className="px-2 py-3 text-right text-parchment">
                        {lancamento.valorRecebidoCentavos == null ? "—" : formatarCentavos(lancamento.valorRecebidoCentavos)}
                      </td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${badgeConciliacao(valores.situacaoConciliacao)}`}>
                          {valores.situacaoConciliacao}
                        </span>
                        {valores.diferencaCentavos != null && valores.diferencaCentavos !== 0 && (
                          <span className="mt-1 block text-red-300">{formatarCentavos(valores.diferencaCentavos)}</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-steel">
                        <span className="block">{ROTULO_DOCUMENTO[lancamento.documento.situacao]}</span>
                        {lancamento.documento.numero && <span className="mt-1 block text-[10px]">{lancamento.documento.numero}</span>}
                      </td>
                      <td className="px-2 py-3">
                        {!fechado && lancamento.status !== "cancelado" && (
                          <div className="flex justify-end gap-1">
                            {valores.situacaoConciliacao !== "conciliado" && (
                              <button type="button" onClick={() => conciliarPeloEsperado(lancamento)} className="rounded-md border border-emerald-500/30 p-2 text-emerald-300 hover:bg-emerald-500/10" aria-label={`Conciliar ${lancamento.descricao} pelo esperado`} title="Conciliar esperado">
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            <button type="button" onClick={() => editarLancamento(lancamento)} className="rounded-md border border-steel/25 p-2 text-steel hover:border-brass hover:text-brass" aria-label={`Editar ${lancamento.descricao}`}>
                              <Pencil size={14} />
                            </button>
                            <button type="button" onClick={() => cancelarLancamento(lancamento)} className="rounded-md border border-barber/30 p-2 text-red-300 hover:bg-barber/10" aria-label={`Cancelar ${lancamento.descricao}`}>
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-brass/30 bg-gradient-to-br from-brass/10 to-transparent p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <CircleDollarSign className="mt-0.5 shrink-0 text-brass" size={21} />
            <div>
              <h2 className="font-display text-sm uppercase tracking-widest2 text-parchment">
                {fechado ? "Competência fechada localmente" : "Pronto para fechar?"}
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-steel">
                {fechado
                  ? `Fechado por ${fechamento.fechadoPor}. O CSV usa o perfil empresarial salvo naquele momento.`
                  : validacaoFechamento.motivo}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={exportarCsv} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brass/50 px-4 text-sm font-semibold text-brass hover:bg-brass/10">
              <Download size={16} /> {fechado ? "Baixar CSV fechado" : "Baixar prévia CSV"}
            </button>
            {fechado ? (
              <Button type="button" variant="ghost" onClick={reabrirMes} className="flex min-h-11 items-center justify-center gap-2">
                <UnlockKeyhole size={16} /> Reabrir com motivo
              </Button>
            ) : (
              <Button type="button" disabled={!validacaoFechamento.pode} onClick={fecharMes} className="flex min-h-11 items-center justify-center gap-2">
                <LockKeyhole size={16} /> Fechar mês localmente
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
