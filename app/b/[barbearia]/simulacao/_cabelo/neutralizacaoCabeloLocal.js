export const NEUTRALIZACAO_CABELO_VERSAO = 1;
export const NEUTRALIZACAO_MAX_OPERACOES = 150;
export const NEUTRALIZACAO_MAX_PONTOS = 5000;
export const NEUTRALIZACAO_RAIO_MIN = 0.01;
export const NEUTRALIZACAO_RAIO_MAX = 0.12;
export const NEUTRALIZACAO_SUAVIDADE_MIN = 0.2;
export const NEUTRALIZACAO_SUAVIDADE_MAX = 0.95;
export const NEUTRALIZACAO_OPACIDADE_MIN = 0.2;
export const NEUTRALIZACAO_OPACIDADE_MAX = 1;

export const NEUTRALIZACAO_CABELO_PADRAO = Object.freeze({
  versao: NEUTRALIZACAO_CABELO_VERSAO,
  ativa: true,
  concluida: false,
  fonte: null,
  raio: 0.045,
  suavidade: 0.72,
  opacidade: 1,
  alinhado: false,
  operacoes: []
});

function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function numeroSeguro(valor, fallback) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function arredondar(valor) {
  return Math.round(valor * 100000) / 100000;
}

function normalizarPonto(ponto) {
  if (!ponto || typeof ponto !== "object") return null;
  const x = Number(ponto.x);
  const y = Number(ponto.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    x: arredondar(limitar(x, 0, 1)),
    y: arredondar(limitar(y, 0, 1))
  };
}

function normalizarOperacao(operacao, pontosDisponiveis) {
  if (!operacao || typeof operacao !== "object" || pontosDisponiveis <= 0) return null;
  const fonte = normalizarPonto(operacao.fonte);
  if (!fonte || !Array.isArray(operacao.pontos)) return null;

  const pontos = operacao.pontos
    .slice(0, pontosDisponiveis)
    .map(normalizarPonto)
    .filter(Boolean);
  if (pontos.length === 0) return null;

  return {
    id: typeof operacao.id === "string" ? operacao.id.slice(0, 100) : `traco-${Date.now()}`,
    fonte,
    inicioDestino: normalizarPonto(operacao.inicioDestino) || pontos[0],
    pontos,
    raio: arredondar(
      limitar(numeroSeguro(operacao.raio, 0.045), NEUTRALIZACAO_RAIO_MIN, NEUTRALIZACAO_RAIO_MAX)
    ),
    suavizacao: arredondar(
      limitar(
        numeroSeguro(operacao.suavizacao ?? operacao.suavidade, 0.72),
        NEUTRALIZACAO_SUAVIDADE_MIN,
        NEUTRALIZACAO_SUAVIDADE_MAX
      )
    ),
    opacidade: arredondar(
      limitar(
        numeroSeguro(operacao.opacidade, 1),
        NEUTRALIZACAO_OPACIDADE_MIN,
        NEUTRALIZACAO_OPACIDADE_MAX
      )
    ),
    alinhado: operacao.alinhado === true
  };
}

export function normalizarNeutralizacaoCabelo(valor) {
  const atual = valor && typeof valor === "object" ? valor : {};
  const versaoValida = atual.versao === NEUTRALIZACAO_CABELO_VERSAO;
  const operacoes = [];
  let totalPontos = 0;

  if (versaoValida && Array.isArray(atual.operacoes)) {
    for (const candidata of atual.operacoes.slice(0, NEUTRALIZACAO_MAX_OPERACOES)) {
      const restante = NEUTRALIZACAO_MAX_PONTOS - totalPontos;
      const operacao = normalizarOperacao(candidata, restante);
      if (!operacao) continue;
      operacoes.push(operacao);
      totalPontos += operacao.pontos.length;
      if (totalPontos >= NEUTRALIZACAO_MAX_PONTOS) break;
    }
  }

  return {
    versao: NEUTRALIZACAO_CABELO_VERSAO,
    ativa: versaoValida ? atual.ativa !== false : NEUTRALIZACAO_CABELO_PADRAO.ativa,
    concluida: versaoValida && atual.concluida === true,
    fonte: versaoValida ? normalizarPonto(atual.fonte) : null,
    raio: arredondar(
      limitar(
        numeroSeguro(versaoValida ? atual.raio : undefined, NEUTRALIZACAO_CABELO_PADRAO.raio),
        NEUTRALIZACAO_RAIO_MIN,
        NEUTRALIZACAO_RAIO_MAX
      )
    ),
    suavidade: arredondar(
      limitar(
        numeroSeguro(versaoValida ? atual.suavidade : undefined, NEUTRALIZACAO_CABELO_PADRAO.suavidade),
        NEUTRALIZACAO_SUAVIDADE_MIN,
        NEUTRALIZACAO_SUAVIDADE_MAX
      )
    ),
    opacidade: arredondar(
      limitar(
        numeroSeguro(versaoValida ? atual.opacidade : undefined, NEUTRALIZACAO_CABELO_PADRAO.opacidade),
        NEUTRALIZACAO_OPACIDADE_MIN,
        NEUTRALIZACAO_OPACIDADE_MAX
      )
    ),
    alinhado: versaoValida && atual.alinhado === true,
    operacoes
  };
}

export function criarNeutralizacaoCabelo(valor = null) {
  return normalizarNeutralizacaoCabelo(valor);
}

export function neutralizacaoCabeloTemPintura(valor) {
  return normalizarNeutralizacaoCabelo(valor).operacoes.length > 0;
}
