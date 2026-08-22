export const FECHAMENTO_FINANCEIRO_VERSAO = 1;
export const FECHAMENTO_FINANCEIRO_PREFIXO = "barbervision:financeiro:v1";
export const PERFIL_FINANCEIRO_PREFIXO = "barbervision:financeiro-perfil:v1";

export const CLASSIFICACOES_FINANCEIRAS = Object.freeze([
  { id: "servico", label: "Serviço" },
  { id: "produto", label: "Produto" }
]);

export const FORMAS_PAGAMENTO = Object.freeze([
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "debito", label: "Cartão de débito" },
  { id: "credito", label: "Cartão de crédito" },
  { id: "transferencia", label: "Transferência" },
  { id: "outro", label: "Outro" }
]);

export const SITUACOES_DOCUMENTO = Object.freeze([
  { id: "nao_informada", label: "Não informado" },
  { id: "emitida", label: "Emitido" },
  { id: "nao_emitida", label: "Não emitido" },
  { id: "cancelada", label: "Cancelado" }
]);

export const PORTES_EMPRESA = Object.freeze([
  { id: "nao_informado", label: "Não informado" },
  { id: "mei", label: "MEI" },
  { id: "me", label: "Microempresa (ME)" },
  { id: "epp", label: "Empresa de Pequeno Porte (EPP)" },
  { id: "outro", label: "Outro" }
]);

export const NATUREZAS_JURIDICAS = Object.freeze([
  { id: "nao_informada", label: "Não informada" },
  { id: "empresario_individual", label: "Empresário Individual" },
  { id: "sociedade_limitada", label: "Sociedade Limitada (LTDA/SLU)" },
  { id: "outra", label: "Outra" }
]);

export const REGIMES_TRIBUTARIOS = Object.freeze([
  { id: "nao_informado", label: "Não informado" },
  { id: "simei", label: "SIMEI / MEI" },
  { id: "simples_nacional", label: "Simples Nacional" },
  { id: "lucro_presumido", label: "Lucro Presumido" },
  { id: "lucro_real", label: "Lucro Real" },
  { id: "outro", label: "Outro" }
]);

const IDS_CLASSIFICACAO = new Set(CLASSIFICACOES_FINANCEIRAS.map((item) => item.id));
const IDS_FORMA_PAGAMENTO = new Set(FORMAS_PAGAMENTO.map((item) => item.id));
const IDS_DOCUMENTO = new Set(SITUACOES_DOCUMENTO.map((item) => item.id));
const IDS_PORTE = new Set(PORTES_EMPRESA.map((item) => item.id));
const IDS_NATUREZA = new Set(NATUREZAS_JURIDICAS.map((item) => item.id));
const IDS_REGIME = new Set(REGIMES_TRIBUTARIOS.map((item) => item.id));
const LIMITE_CENTAVOS = 100_000_000;
const LIMITE_LANCAMENTOS = 500;

function textoSeguro(valor, fallback = "", limite = 160) {
  if (typeof valor !== "string") return fallback;
  const texto = valor.trim().replace(/\s+/g, " ");
  return (texto || fallback).slice(0, limite);
}

function inteiroCentavos(valor, fallback = 0) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0 || numero > LIMITE_CENTAVOS) return fallback;
  return numero;
}

function timestampSeguro(valor, fallback = null) {
  if (typeof valor !== "string" || valor.length > 40 || Number.isNaN(Date.parse(valor))) return fallback;
  return valor;
}

function slugSeguro(valor) {
  return textoSeguro(Array.isArray(valor) ? valor[0] : valor, "", 120);
}

export function competenciaAtual(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

export function normalizarCompetencia(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  const correspondencia = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(texto);
  if (!correspondencia) return null;
  const ano = Number(correspondencia[1]);
  return ano >= 2000 && ano <= 2200 ? texto : null;
}

function dataPertenceACompetencia(data, competencia) {
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  if (!data.startsWith(`${competencia}-`)) return false;
  const [ano, mes, dia] = data.split("-").map(Number);
  const validada = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    validada.getUTCFullYear() === ano &&
    validada.getUTCMonth() === mes - 1 &&
    validada.getUTCDate() === dia
  );
}

export function criarLancamentoFinanceiroId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `financeiro-${crypto.randomUUID()}`;
  }
  return `financeiro-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function calcularValoresLancamento(lancamento) {
  if (lancamento?.status === "cancelado") {
    return {
      receitaRegistradaCentavos: 0,
      recebimentoEsperadoCentavos: 0,
      diferencaCentavos: 0,
      situacaoConciliacao: "cancelado"
    };
  }

  const bruto = inteiroCentavos(lancamento?.valorBrutoCentavos);
  const desconto = inteiroCentavos(lancamento?.descontoCentavos);
  const estorno = inteiroCentavos(lancamento?.estornoCentavos);
  const taxa = inteiroCentavos(lancamento?.taxaPagamentoCentavos);
  const receitaRegistradaCentavos = Math.max(0, bruto - desconto - estorno);
  const recebimentoEsperadoCentavos = Math.max(0, receitaRegistradaCentavos - taxa);
  const recebido = Number.isInteger(lancamento?.valorRecebidoCentavos)
    ? inteiroCentavos(lancamento.valorRecebidoCentavos)
    : null;

  return {
    receitaRegistradaCentavos,
    recebimentoEsperadoCentavos,
    diferencaCentavos: recebido == null ? null : recebido - recebimentoEsperadoCentavos,
    situacaoConciliacao:
      recebido == null
        ? "pendente"
        : recebido === recebimentoEsperadoCentavos
          ? "conciliado"
          : "divergente"
  };
}

export function normalizarLancamentoFinanceiro(lancamento, competencia, indice = 0) {
  if (!lancamento || typeof lancamento !== "object" || Array.isArray(lancamento)) return null;
  const competenciaValida = normalizarCompetencia(competencia);
  if (!competenciaValida || !dataPertenceACompetencia(lancamento.data, competenciaValida)) return null;

  const valorBrutoCentavos = inteiroCentavos(lancamento.valorBrutoCentavos);
  const descontoCentavos = inteiroCentavos(lancamento.descontoCentavos);
  const estornoCentavos = inteiroCentavos(lancamento.estornoCentavos);
  const taxaPagamentoCentavos = inteiroCentavos(lancamento.taxaPagamentoCentavos);
  const maximoDescontoEstorno = Math.max(0, valorBrutoCentavos);
  const descontoLimitado = Math.min(descontoCentavos, maximoDescontoEstorno);
  const estornoLimitado = Math.min(estornoCentavos, maximoDescontoEstorno - descontoLimitado);
  const receitaRegistrada = Math.max(0, valorBrutoCentavos - descontoLimitado - estornoLimitado);
  const taxaLimitada = Math.min(taxaPagamentoCentavos, receitaRegistrada);

  let valorRecebidoCentavos = null;
  if (lancamento.valorRecebidoCentavos !== null && lancamento.valorRecebidoCentavos !== "") {
    const recebido = Number(lancamento.valorRecebidoCentavos);
    if (Number.isInteger(recebido) && recebido >= 0 && recebido <= LIMITE_CENTAVOS) {
      valorRecebidoCentavos = recebido;
    }
  }

  const status = lancamento.status === "cancelado" ? "cancelado" : "ativo";
  return {
    id: textoSeguro(lancamento.id, `financeiro-${indice}`, 120),
    data: lancamento.data,
    classificacao: IDS_CLASSIFICACAO.has(lancamento.classificacao)
      ? lancamento.classificacao
      : "servico",
    descricao: textoSeguro(lancamento.descricao, "Lançamento sem descrição", 160),
    profissional: textoSeguro(lancamento.profissional, "", 100),
    formaPagamento: IDS_FORMA_PAGAMENTO.has(lancamento.formaPagamento)
      ? lancamento.formaPagamento
      : "outro",
    valorBrutoCentavos,
    descontoCentavos: descontoLimitado,
    estornoCentavos: estornoLimitado,
    taxaPagamentoCentavos: taxaLimitada,
    valorRecebidoCentavos,
    recebidoEm: valorRecebidoCentavos == null ? null : timestampSeguro(lancamento.recebidoEm),
    referenciaConciliacao: textoSeguro(lancamento.referenciaConciliacao, "", 120),
    documento: {
      situacao: IDS_DOCUMENTO.has(lancamento.documento?.situacao)
        ? lancamento.documento.situacao
        : "nao_informada",
      numero: textoSeguro(lancamento.documento?.numero, "", 80)
    },
    status,
    motivoCancelamento:
      status === "cancelado" ? textoSeguro(lancamento.motivoCancelamento, "Cancelado na demonstração", 180) : "",
    origem: lancamento.origem === "demonstracao" ? "demonstracao" : "manual-local",
    criadoEm: timestampSeguro(lancamento.criadoEm, new Date().toISOString()),
    atualizadoEm: timestampSeguro(lancamento.atualizadoEm, new Date().toISOString())
  };
}

export function validarLancamentoFinanceiro(lancamento, competencia) {
  const erros = [];
  const competenciaValida = normalizarCompetencia(competencia);
  if (!competenciaValida) erros.push("Competência inválida.");
  if (!dataPertenceACompetencia(lancamento?.data, competenciaValida)) {
    erros.push("A data precisa pertencer ao mês selecionado.");
  }
  if (!IDS_CLASSIFICACAO.has(lancamento?.classificacao)) erros.push("Escolha Serviço ou Produto.");
  if (textoSeguro(lancamento?.descricao, "", 160).length < 2) erros.push("Informe uma descrição.");
  if (!IDS_FORMA_PAGAMENTO.has(lancamento?.formaPagamento)) erros.push("Escolha a forma de pagamento.");

  const bruto = Number(lancamento?.valorBrutoCentavos);
  const desconto = Number(lancamento?.descontoCentavos || 0);
  const estorno = Number(lancamento?.estornoCentavos || 0);
  const taxa = Number(lancamento?.taxaPagamentoCentavos || 0);
  if (!Number.isInteger(bruto) || bruto <= 0 || bruto > LIMITE_CENTAVOS) {
    erros.push("O valor bruto precisa ser maior que zero.");
  }
  if (![desconto, estorno, taxa].every((valor) => Number.isInteger(valor) && valor >= 0)) {
    erros.push("Desconto, estorno e taxa precisam ser valores válidos.");
  }
  if (Number.isInteger(bruto) && desconto + estorno > bruto) {
    erros.push("Desconto e estorno não podem superar o valor bruto.");
  }
  const receita = bruto - desconto - estorno;
  if (Number.isInteger(receita) && taxa > receita) erros.push("A taxa não pode superar o valor após ajustes.");

  if (lancamento?.valorRecebidoCentavos != null) {
    const recebido = Number(lancamento.valorRecebidoCentavos);
    if (!Number.isInteger(recebido) || recebido < 0 || recebido > LIMITE_CENTAVOS) {
      erros.push("O valor recebido é inválido.");
    }
  }
  return erros;
}

function criarExemplos(competencia) {
  const agora = new Date().toISOString();
  const data = (dia) => `${competencia}-${String(dia).padStart(2, "0")}`;
  const exemplos = [
    ["corte-pix", 2, "servico", "Corte degradê", "Marcos", "pix", 4500, 0, 0, 0, 4500, "emitida"],
    ["combo-credito", 5, "servico", "Combo corte e barba", "Diego", "credito", 7000, 500, 0, 195, 6305, "emitida"],
    ["pomada-debito", 8, "produto", "Pomada matte", "João", "debito", 3990, 0, 0, 80, 3910, "emitida"],
    ["corte-pendente", 12, "servico", "Corte social", "Marcos", "dinheiro", 4500, 0, 0, 0, null, "nao_emitida"],
    ["shampoo-pix", 16, "produto", "Shampoo suave", "João", "pix", 3190, 0, 0, 0, 3190, "emitida"],
    ["corte-divergente", 21, "servico", "Corte freestyle", "Diego", "credito", 5000, 0, 0, 150, 4800, "nao_informada"]
  ];

  return exemplos.map(
    ([id, dia, classificacao, descricao, profissional, formaPagamento, bruto, desconto, estorno, taxa, recebido, documento]) =>
      normalizarLancamentoFinanceiro(
        {
          id: `demo-${competencia}-${id}`,
          data: data(dia),
          classificacao,
          descricao,
          profissional,
          formaPagamento,
          valorBrutoCentavos: bruto,
          descontoCentavos: desconto,
          estornoCentavos: estorno,
          taxaPagamentoCentavos: taxa,
          valorRecebidoCentavos: recebido,
          recebidoEm: recebido == null ? null : agora,
          documento: { situacao: documento, numero: documento === "emitida" ? `DEMO-${dia}` : "" },
          status: "ativo",
          origem: "demonstracao",
          criadoEm: agora,
          atualizadoEm: agora
        },
        competencia
      )
  );
}

export function criarFechamentoFinanceiroInicial(competencia = competenciaAtual(), comExemplos = true) {
  const competenciaValida = normalizarCompetencia(competencia) || competenciaAtual();
  const agora = new Date().toISOString();
  return {
    versao: FECHAMENTO_FINANCEIRO_VERSAO,
    competencia: competenciaValida,
    status: "aberto",
    revisao: 0,
    criadoEm: agora,
    atualizadoEm: agora,
    fechadoEm: null,
    fechadoPor: "",
    perfilEmpresaSnapshot: null,
    resumoFechamento: null,
    lancamentos: comExemplos ? criarExemplos(competenciaValida) : [],
    eventos: []
  };
}

export function normalizarPerfilFinanceiro(perfil) {
  return {
    versao: FECHAMENTO_FINANCEIRO_VERSAO,
    nomeEmpresarial: textoSeguro(perfil?.nomeEmpresarial, "Barbearia de demonstração", 140),
    porte: IDS_PORTE.has(perfil?.porte) ? perfil.porte : "nao_informado",
    naturezaJuridica: IDS_NATUREZA.has(perfil?.naturezaJuridica)
      ? perfil.naturezaJuridica
      : "nao_informada",
    regimeTributario: IDS_REGIME.has(perfil?.regimeTributario)
      ? perfil.regimeTributario
      : "nao_informado",
    municipioUf: textoSeguro(perfil?.municipioUf, "", 120),
    contadorNome: textoSeguro(perfil?.contadorNome, "", 120),
    atualizadoEm: timestampSeguro(perfil?.atualizadoEm, new Date().toISOString())
  };
}

export function criarPerfilFinanceiroInicial(nomeEmpresarial = "Barbearia de demonstração") {
  return normalizarPerfilFinanceiro({ nomeEmpresarial });
}

function normalizarEvento(evento, indice) {
  if (!evento || typeof evento !== "object") return null;
  const tipo = ["fechamento", "reabertura"].includes(evento.tipo) ? evento.tipo : null;
  if (!tipo) return null;
  return {
    id: textoSeguro(evento.id, `evento-${indice}`, 120),
    tipo,
    criadoEm: timestampSeguro(evento.criadoEm, new Date().toISOString()),
    responsavel: textoSeguro(evento.responsavel, "Dono demo", 100),
    motivo: textoSeguro(evento.motivo, "", 200)
  };
}

export function normalizarFechamentoFinanceiro(fechamento, competencia) {
  const competenciaValida = normalizarCompetencia(competencia || fechamento?.competencia);
  if (!competenciaValida || !fechamento || typeof fechamento !== "object") return null;
  const lancamentos = Array.isArray(fechamento.lancamentos)
    ? fechamento.lancamentos
        .slice(0, LIMITE_LANCAMENTOS)
        .map((item, indice) => normalizarLancamentoFinanceiro(item, competenciaValida, indice))
        .filter(Boolean)
    : [];
  const ids = new Set();
  const unicos = lancamentos.filter((item) => {
    if (ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
  const status = fechamento.status === "fechado" ? "fechado" : "aberto";
  return {
    versao: FECHAMENTO_FINANCEIRO_VERSAO,
    competencia: competenciaValida,
    status,
    revisao: Math.max(0, Math.min(999_999, Math.trunc(Number(fechamento.revisao) || 0))),
    criadoEm: timestampSeguro(fechamento.criadoEm, new Date().toISOString()),
    atualizadoEm: timestampSeguro(fechamento.atualizadoEm, new Date().toISOString()),
    fechadoEm: status === "fechado" ? timestampSeguro(fechamento.fechadoEm) : null,
    fechadoPor: status === "fechado" ? textoSeguro(fechamento.fechadoPor, "Dono demo", 100) : "",
    perfilEmpresaSnapshot:
      status === "fechado" && fechamento.perfilEmpresaSnapshot
        ? normalizarPerfilFinanceiro(fechamento.perfilEmpresaSnapshot)
        : null,
    resumoFechamento: status === "fechado" ? calcularResumoFinanceiro(unicos) : null,
    lancamentos: unicos,
    eventos: Array.isArray(fechamento.eventos)
      ? fechamento.eventos.slice(-100).map(normalizarEvento).filter(Boolean)
      : []
  };
}

export function calcularResumoFinanceiro(lancamentos) {
  const resumo = {
    totalLancamentos: 0,
    ativos: 0,
    cancelados: 0,
    pendentes: 0,
    conciliados: 0,
    divergentes: 0,
    valorBrutoCentavos: 0,
    descontosCentavos: 0,
    estornosCentavos: 0,
    receitaRegistradaCentavos: 0,
    taxasCentavos: 0,
    recebimentoEsperadoCentavos: 0,
    recebidoCentavos: 0,
    diferencaCentavos: 0,
    servicosCentavos: 0,
    produtosCentavos: 0,
    porFormaPagamento: {}
  };

  for (const lancamento of Array.isArray(lancamentos) ? lancamentos : []) {
    resumo.totalLancamentos += 1;
    const valores = calcularValoresLancamento(lancamento);
    if (lancamento.status === "cancelado") {
      resumo.cancelados += 1;
      continue;
    }
    resumo.ativos += 1;
    resumo[`${valores.situacaoConciliacao}s`] += 1;
    resumo.valorBrutoCentavos += lancamento.valorBrutoCentavos;
    resumo.descontosCentavos += lancamento.descontoCentavos;
    resumo.estornosCentavos += lancamento.estornoCentavos;
    resumo.receitaRegistradaCentavos += valores.receitaRegistradaCentavos;
    resumo.taxasCentavos += lancamento.taxaPagamentoCentavos;
    resumo.recebimentoEsperadoCentavos += valores.recebimentoEsperadoCentavos;
    resumo.recebidoCentavos += lancamento.valorRecebidoCentavos ?? 0;
    resumo.diferencaCentavos += valores.diferencaCentavos ?? 0;
    if (lancamento.classificacao === "servico") {
      resumo.servicosCentavos += valores.receitaRegistradaCentavos;
    } else {
      resumo.produtosCentavos += valores.receitaRegistradaCentavos;
    }
    const forma = lancamento.formaPagamento;
    resumo.porFormaPagamento[forma] = (resumo.porFormaPagamento[forma] || 0) + valores.receitaRegistradaCentavos;
  }
  return resumo;
}

export function fechamentoPodeSerConcluido(fechamento) {
  const resumo = calcularResumoFinanceiro(fechamento?.lancamentos);
  if (fechamento?.status === "fechado") return { pode: false, motivo: "Este mês já está fechado.", resumo };
  if (resumo.ativos === 0) return { pode: false, motivo: "Cadastre pelo menos um lançamento ativo.", resumo };
  if (resumo.pendentes > 0) return { pode: false, motivo: "Concilie todos os recebimentos pendentes.", resumo };
  if (resumo.divergentes > 0) return { pode: false, motivo: "Resolva todas as divergências de recebimento.", resumo };
  return { pode: true, motivo: "Pronto para fechar como relatório gerencial local.", resumo };
}

function chaveFechamento(barbeariaSlug, competencia) {
  const slug = slugSeguro(barbeariaSlug);
  const competenciaValida = normalizarCompetencia(competencia);
  if (!slug || !competenciaValida) return null;
  return `${FECHAMENTO_FINANCEIRO_PREFIXO}:${encodeURIComponent(slug)}:${competenciaValida}`;
}

function chavePerfil(barbeariaSlug) {
  const slug = slugSeguro(barbeariaSlug);
  return slug ? `${PERFIL_FINANCEIRO_PREFIXO}:${encodeURIComponent(slug)}` : null;
}

export function carregarFechamentoFinanceiroLocal(barbeariaSlug, competencia) {
  const inicial = criarFechamentoFinanceiroInicial(competencia, competencia === competenciaAtual());
  if (typeof window === "undefined") return { estado: "novo", fechamento: inicial, erro: null };
  const chave = chaveFechamento(barbeariaSlug, competencia);
  if (!chave) return { estado: "corrompido", fechamento: null, erro: "Barbearia ou competência inválida." };
  const bruto = localStorage.getItem(chave);
  if (!bruto) return { estado: "novo", fechamento: inicial, erro: null };
  try {
    const salvo = JSON.parse(bruto);
    if (salvo?.versao !== FECHAMENTO_FINANCEIRO_VERSAO || salvo?.competencia !== competencia) {
      throw new Error("Contrato incompatível.");
    }
    const normalizado = normalizarFechamentoFinanceiro(salvo, competencia);
    if (!normalizado) throw new Error("Conteúdo inválido.");
    return { estado: "salvo", fechamento: normalizado, erro: null };
  } catch {
    return {
      estado: "corrompido",
      fechamento: null,
      erro: "O fechamento salvo neste navegador está corrompido. Exporte ou limpe o storage antes de sobrescrever."
    };
  }
}

export function salvarFechamentoFinanceiroLocal(barbeariaSlug, fechamento) {
  if (typeof window === "undefined") throw new Error("O armazenamento local não está disponível.");
  const chave = chaveFechamento(barbeariaSlug, fechamento?.competencia);
  if (!chave) throw new Error("Barbearia ou competência inválida.");
  const normalizado = normalizarFechamentoFinanceiro(fechamento, fechamento.competencia);
  if (!normalizado) throw new Error("O fechamento não pôde ser validado.");

  const existente = localStorage.getItem(chave);
  if (existente) {
    let atual;
    try {
      atual = JSON.parse(existente);
    } catch {
      throw new Error("Há um fechamento corrompido nesta competência; ele não foi sobrescrito.");
    }
    if (Number(atual?.revisao) !== Number(normalizado.revisao)) {
      throw new Error("Este mês foi alterado em outra aba. Recarregue antes de salvar novamente.");
    }
  } else if (normalizado.revisao !== 0) {
    throw new Error("A revisão local não corresponde ao fechamento salvo.");
  }

  const salvo = {
    ...normalizado,
    revisao: normalizado.revisao + 1,
    atualizadoEm: new Date().toISOString()
  };
  localStorage.setItem(chave, JSON.stringify(salvo));
  return salvo;
}

export function carregarPerfilFinanceiroLocal(barbeariaSlug, nomeEmpresarial) {
  const inicial = criarPerfilFinanceiroInicial(nomeEmpresarial);
  if (typeof window === "undefined") return { estado: "novo", perfil: inicial, erro: null };
  const chave = chavePerfil(barbeariaSlug);
  if (!chave) return { estado: "corrompido", perfil: null, erro: "Barbearia inválida." };
  const bruto = localStorage.getItem(chave);
  if (!bruto) return { estado: "novo", perfil: inicial, erro: null };
  try {
    const salvo = JSON.parse(bruto);
    if (salvo?.versao !== FECHAMENTO_FINANCEIRO_VERSAO) throw new Error("Contrato incompatível.");
    return { estado: "salvo", perfil: normalizarPerfilFinanceiro(salvo), erro: null };
  } catch {
    return { estado: "corrompido", perfil: null, erro: "O perfil empresarial local está corrompido." };
  }
}

export function salvarPerfilFinanceiroLocal(barbeariaSlug, perfil) {
  if (typeof window === "undefined") throw new Error("O armazenamento local não está disponível.");
  const chave = chavePerfil(barbeariaSlug);
  if (!chave) throw new Error("Barbearia inválida.");
  const salvo = normalizarPerfilFinanceiro({ ...perfil, atualizadoEm: new Date().toISOString() });
  localStorage.setItem(chave, JSON.stringify(salvo));
  return salvo;
}

export function reiniciarDadosFinanceirosLocais(barbeariaSlug, competencia, nomeEmpresarial) {
  if (typeof window === "undefined") throw new Error("O armazenamento local não está disponível.");
  const chaveMes = chaveFechamento(barbeariaSlug, competencia);
  const chaveDados = chavePerfil(barbeariaSlug);
  if (!chaveMes || !chaveDados) throw new Error("Barbearia ou competência inválida.");
  localStorage.removeItem(chaveMes);
  localStorage.removeItem(chaveDados);
  return {
    fechamento: criarFechamentoFinanceiroInicial(competencia, competencia === competenciaAtual()),
    perfil: criarPerfilFinanceiroInicial(nomeEmpresarial)
  };
}

export function fecharCompetenciaFinanceira(fechamento, perfil, responsavel) {
  const validacao = fechamentoPodeSerConcluido(fechamento);
  if (!validacao.pode) throw new Error(validacao.motivo);
  const agora = new Date().toISOString();
  return {
    ...fechamento,
    status: "fechado",
    fechadoEm: agora,
    fechadoPor: textoSeguro(responsavel, "Dono demo", 100),
    perfilEmpresaSnapshot: normalizarPerfilFinanceiro(perfil),
    resumoFechamento: validacao.resumo,
    eventos: [
      ...(fechamento.eventos || []),
      { id: `fechamento-${Date.now()}`, tipo: "fechamento", criadoEm: agora, responsavel, motivo: "" }
    ]
  };
}

export function reabrirCompetenciaFinanceira(fechamento, responsavel, motivo) {
  const motivoSeguro = textoSeguro(motivo, "", 200);
  if (fechamento?.status !== "fechado") throw new Error("O mês já está aberto.");
  if (motivoSeguro.length < 5) throw new Error("Informe um motivo com pelo menos 5 caracteres.");
  const agora = new Date().toISOString();
  return {
    ...fechamento,
    status: "aberto",
    fechadoEm: null,
    fechadoPor: "",
    perfilEmpresaSnapshot: null,
    resumoFechamento: null,
    eventos: [
      ...(fechamento.eventos || []),
      { id: `reabertura-${Date.now()}`, tipo: "reabertura", criadoEm: agora, responsavel, motivo: motivoSeguro }
    ]
  };
}

export function formatarCentavos(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (Number.isInteger(valor) ? valor : 0) / 100
  );
}

function valorCsvCentavos(valor) {
  return ((Number.isInteger(valor) ? valor : 0) / 100).toFixed(2).replace(".", ",");
}

function escaparCsv(valor) {
  let texto = String(valor ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

function rotulo(lista, id) {
  return lista.find((item) => item.id === id)?.label || id || "Não informado";
}

export function gerarCsvFechamentoFinanceiro({ barbeariaNome, fechamento, perfil }) {
  const perfilRelatorio = fechamento.status === "fechado" && fechamento.perfilEmpresaSnapshot
    ? fechamento.perfilEmpresaSnapshot
    : normalizarPerfilFinanceiro(perfil);
  const resumo = fechamento.status === "fechado" && fechamento.resumoFechamento
    ? fechamento.resumoFechamento
    : calcularResumoFinanceiro(fechamento.lancamentos);
  const linhas = [
    ["BARBER VISION — RELATÓRIO GERENCIAL PARA CONTADOR"],
    ["Aviso", "Não calcula tributos, não transmite declarações e não substitui documentos ou guias oficiais."],
    ["Barbearia", barbeariaNome],
    ["Competência", fechamento.competencia],
    ["Situação", fechamento.status === "fechado" ? "Fechado localmente" : "PRÉVIA — mês aberto"],
    ["Nome empresarial declarado", perfilRelatorio.nomeEmpresarial],
    ["Porte declarado", rotulo(PORTES_EMPRESA, perfilRelatorio.porte)],
    ["Natureza jurídica declarada", rotulo(NATUREZAS_JURIDICAS, perfilRelatorio.naturezaJuridica)],
    ["Regime tributário declarado", rotulo(REGIMES_TRIBUTARIOS, perfilRelatorio.regimeTributario)],
    ["Município/UF", perfilRelatorio.municipioUf],
    ["Contador", perfilRelatorio.contadorNome],
    [],
    ["RESUMO OPERACIONAL"],
    ["Receita registrada de serviços", valorCsvCentavos(resumo.servicosCentavos)],
    ["Receita registrada de produtos", valorCsvCentavos(resumo.produtosCentavos)],
    ["Receita registrada total", valorCsvCentavos(resumo.receitaRegistradaCentavos)],
    ["Taxas de pagamento", valorCsvCentavos(resumo.taxasCentavos)],
    ["Recebimento esperado", valorCsvCentavos(resumo.recebimentoEsperadoCentavos)],
    ["Valor recebido informado", valorCsvCentavos(resumo.recebidoCentavos)],
    ["Diferença de conciliação", valorCsvCentavos(resumo.diferencaCentavos)],
    ["Pendentes", resumo.pendentes],
    ["Divergentes", resumo.divergentes],
    [],
    [
      "Data",
      "Classificação",
      "Descrição",
      "Profissional",
      "Forma de pagamento",
      "Valor bruto",
      "Desconto",
      "Estorno",
      "Receita registrada",
      "Taxa",
      "Recebimento esperado",
      "Valor recebido",
      "Diferença",
      "Conciliação",
      "Documento",
      "Número do documento",
      "Status",
      "Origem"
    ]
  ];

  for (const lancamento of fechamento.lancamentos) {
    const valores = calcularValoresLancamento(lancamento);
    linhas.push([
      lancamento.data,
      rotulo(CLASSIFICACOES_FINANCEIRAS, lancamento.classificacao),
      lancamento.descricao,
      lancamento.profissional,
      rotulo(FORMAS_PAGAMENTO, lancamento.formaPagamento),
      valorCsvCentavos(lancamento.valorBrutoCentavos),
      valorCsvCentavos(lancamento.descontoCentavos),
      valorCsvCentavos(lancamento.estornoCentavos),
      valorCsvCentavos(valores.receitaRegistradaCentavos),
      valorCsvCentavos(lancamento.taxaPagamentoCentavos),
      valorCsvCentavos(valores.recebimentoEsperadoCentavos),
      lancamento.valorRecebidoCentavos == null ? "" : valorCsvCentavos(lancamento.valorRecebidoCentavos),
      valores.diferencaCentavos == null ? "" : valorCsvCentavos(valores.diferencaCentavos),
      valores.situacaoConciliacao,
      rotulo(SITUACOES_DOCUMENTO, lancamento.documento.situacao),
      lancamento.documento.numero,
      lancamento.status,
      lancamento.origem
    ]);
  }

  return `\uFEFF${linhas.map((linha) => linha.map(escaparCsv).join(";")).join("\r\n")}`;
}
