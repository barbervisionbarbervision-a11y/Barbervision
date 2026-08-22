import {
  ANALISE_CABECA_METODO,
  ANALISE_CABECA_MODELO_SHA256
} from "./remocaoCabeloAutomaticaLocal";

export const AJUSTE_CABELO_PADRAO = Object.freeze({
  x: 50,
  y: 20,
  largura: 72,
  altura: 38,
  rotacao: 0,
  inclinacao: 0,
  brilho: 100,
  contraste: 100,
  saturacao: 100,
  tonalidade: 0,
  sombra: 20,
  opacidade: 100,
  espelhado: false
});

export const AJUSTE_CABELO_AUTOMATICO_VERSAO = 6;
export const AJUSTE_CABELO_AUTOMATICO_ALGORITMO = "face-landmarks-alpha-v3";
export const AJUSTE_CABELO_MODELO_CABECA_SHA256 = ANALISE_CABECA_MODELO_SHA256;
export const AJUSTE_CABELO_MANUAL_VERSAO = 1;
export const AJUSTE_CABELO_MANUAL_ORIGEM = "auto-fit-local-refinado-manualmente";
export const AJUSTE_CABELO_MANUAL_PRIMARIO_VERSAO = 7;
export const AJUSTE_CABELO_MANUAL_PRIMARIO_ALGORITMO = "manual-placement-v1";
export const AJUSTE_CABELO_MANUAL_PRIMARIO_ORIGEM = "manual-local";
export const AJUSTE_CABELO_MANUAL_PRIMARIO_ESTADO_VERSAO = 2;

// O contrato v6 de encaixe automático permanece abaixo apenas para leitura de
// histórico/migração. O simulador ativo publica e aceita somente o contrato v7
// manual definido acima.
const PALCO_LARGURA = 640;
const PALCO_ALTURA = 800;

const LIMITES_AJUSTE = Object.freeze({
  x: [0, 100],
  y: [0, 75],
  largura: [28, 130],
  altura: [12, 100],
  rotacao: [-45, 45],
  inclinacao: [-30, 30],
  brilho: [50, 160],
  contraste: [50, 180],
  saturacao: [0, 200],
  tonalidade: [-180, 180],
  sombra: [0, 100],
  opacidade: [20, 100]
});

export function limitarCabelo(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function numeroSeguro(valor, fallback) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function normalizarNumero(chave, valor, fallback) {
  const [minimo, maximo] = LIMITES_AJUSTE[chave];
  return Math.round(limitarCabelo(numeroSeguro(valor, fallback), minimo, maximo));
}

function arredondar(valor, casas = 2) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function hashCurtoTexto(valor) {
  const texto = String(valor || "");
  let hash = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function obterRevisaoMoldeCabelo(cabelo) {
  if (!cabelo?.id) return "";
  const revisao = Number.isInteger(cabelo.revisaoEncaixe) ? cabelo.revisaoEncaixe : 0;
  if (typeof cabelo.asset === "string" && cabelo.asset) {
    return `asset:${cabelo.asset}:r${revisao}`;
  }

  const fonteLocal = typeof cabelo.imageDataUrl === "string" ? cabelo.imageDataUrl : "";
  const editadoEm = cabelo.metadataRecorte?.editadoEm || "sem-data";
  return `local:r${revisao}:${editadoEm}:${fonteLocal.length}:${hashCurtoTexto(fonteLocal)}`;
}

function mediana(valores) {
  if (!Array.isArray(valores) || valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2
    ? ordenados[meio]
    : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

export function criarAjusteDoCatalogo(cabelo, ajusteSalvo = null) {
  const transformacao = cabelo?.transformacaoPadrao || {};
  const escala = limitarCabelo(numeroSeguro(transformacao.escala, 1), 0.5, 1.5);
  const base = {
    ...AJUSTE_CABELO_PADRAO,
    x: 50 + numeroSeguro(transformacao.deslocamentoX, 0),
    y: 20 + numeroSeguro(transformacao.deslocamentoY, 0),
    largura: AJUSTE_CABELO_PADRAO.largura * escala,
    altura: AJUSTE_CABELO_PADRAO.altura * escala,
    rotacao: numeroSeguro(transformacao.rotacao, 0)
  };
  const salvo = ajusteSalvo && typeof ajusteSalvo === "object" ? ajusteSalvo : {};

  return {
    x: normalizarNumero("x", salvo.x, base.x),
    y: normalizarNumero("y", salvo.y, base.y),
    largura: normalizarNumero("largura", salvo.largura, base.largura),
    altura: normalizarNumero("altura", salvo.altura, base.altura),
    rotacao: normalizarNumero("rotacao", salvo.rotacao, base.rotacao),
    inclinacao: normalizarNumero("inclinacao", salvo.inclinacao, base.inclinacao),
    brilho: normalizarNumero("brilho", salvo.brilho, base.brilho),
    contraste: normalizarNumero("contraste", salvo.contraste, base.contraste),
    saturacao: normalizarNumero("saturacao", salvo.saturacao, base.saturacao),
    tonalidade: normalizarNumero("tonalidade", salvo.tonalidade, base.tonalidade),
    sombra: normalizarNumero("sombra", salvo.sombra, base.sombra),
    opacidade: normalizarNumero("opacidade", salvo.opacidade, base.opacidade),
    espelhado: salvo.espelhado === true
  };
}

function identidadeManualPrimariaCompativel(ajuste, cabelo) {
  if (
    !ajuste ||
    !cabelo ||
    ajuste.versao !== AJUSTE_CABELO_MANUAL_PRIMARIO_VERSAO ||
    ajuste.algoritmo !== AJUSTE_CABELO_MANUAL_PRIMARIO_ALGORITMO ||
    ajuste.origem !== AJUSTE_CABELO_MANUAL_PRIMARIO_ORIGEM ||
    ajuste.automatico !== false ||
    ajuste.templateId !== cabelo.id ||
    ajuste.corte !== cabelo.nome ||
    ajuste.moldeRevisao !== obterRevisaoMoldeCabelo(cabelo) ||
    ajuste.ajusteManual?.versao !== AJUSTE_CABELO_MANUAL_PRIMARIO_ESTADO_VERSAO ||
    ajuste.ajusteManual?.aplicado !== true
  ) return false;

  if (cabelo.asset && ajuste.asset !== cabelo.asset) return false;
  return geometriaFinalValida(ajuste);
}

function criarContratoManualPrimario(cabelo, geometria, confirmado = false) {
  if (!cabelo?.id || !cabelo?.nome) return null;
  const normalizado = criarAjusteDoCatalogo(cabelo, geometria);
  return {
    ...normalizado,
    versao: AJUSTE_CABELO_MANUAL_PRIMARIO_VERSAO,
    templateId: cabelo.id,
    asset: cabelo.asset || null,
    moldeRevisao: obterRevisaoMoldeCabelo(cabelo),
    corte: cabelo.nome,
    origem: AJUSTE_CABELO_MANUAL_PRIMARIO_ORIGEM,
    algoritmo: AJUSTE_CABELO_MANUAL_PRIMARIO_ALGORITMO,
    automatico: false,
    ajusteManual: {
      versao: AJUSTE_CABELO_MANUAL_PRIMARIO_ESTADO_VERSAO,
      aplicado: true,
      confirmado: confirmado === true
    }
  };
}

/**
 * Cria a posição inicial fixa do molde. Ela depende apenas do catálogo e não
 * usa landmarks, caixa de cabelo ou qualquer medida da selfie.
 */
export function criarAjusteManualPrimarioDoCatalogo(cabelo, candidato = null) {
  if (identidadeManualPrimariaCompativel(candidato, cabelo)) {
    return criarContratoManualPrimario(
      cabelo,
      candidato,
      candidato.ajusteManual?.confirmado === true
    );
  }
  return criarContratoManualPrimario(cabelo, null, false);
}

/**
 * Aplica passos absolutos ao placement manual. Largura e altura são
 * independentes para que o cliente possa corrigir as duas dimensões.
 */
export function ajustarCabeloManualmente(ajuste, delta = {}) {
  if (!ajusteCabeloManualPrimarioValido(ajuste, { exigirConfirmacao: false })) {
    return null;
  }

  const proximo = {
    ...ajuste,
    x: arredondar(limitarCabelo(
      numeroSeguro(ajuste.x, AJUSTE_CABELO_PADRAO.x) + numeroSeguro(delta.x, 0),
      ...LIMITES_AJUSTE.x
    )),
    y: arredondar(limitarCabelo(
      numeroSeguro(ajuste.y, AJUSTE_CABELO_PADRAO.y) + numeroSeguro(delta.y, 0),
      ...LIMITES_AJUSTE.y
    )),
    largura: arredondar(limitarCabelo(
      numeroSeguro(ajuste.largura, AJUSTE_CABELO_PADRAO.largura) + numeroSeguro(delta.largura, 0),
      ...LIMITES_AJUSTE.largura
    )),
    altura: arredondar(limitarCabelo(
      numeroSeguro(ajuste.altura, AJUSTE_CABELO_PADRAO.altura) + numeroSeguro(delta.altura, 0),
      ...LIMITES_AJUSTE.altura
    )),
    rotacao: arredondar(limitarCabelo(
      numeroSeguro(ajuste.rotacao, AJUSTE_CABELO_PADRAO.rotacao) + numeroSeguro(delta.rotacao, 0),
      ...LIMITES_AJUSTE.rotacao
    )),
    ajusteManual: {
      ...ajuste.ajusteManual,
      confirmado: false
    }
  };

  return geometriaFinalValida(proximo) ? proximo : null;
}

export function ajusteCabeloManualPrimarioValido(
  ajuste,
  { exigirConfirmacao = true } = {}
) {
  if (
    !ajuste ||
    ajuste.versao !== AJUSTE_CABELO_MANUAL_PRIMARIO_VERSAO ||
    ajuste.algoritmo !== AJUSTE_CABELO_MANUAL_PRIMARIO_ALGORITMO ||
    ajuste.origem !== AJUSTE_CABELO_MANUAL_PRIMARIO_ORIGEM ||
    ajuste.automatico !== false ||
    typeof ajuste.templateId !== "string" ||
    ajuste.templateId.length === 0 ||
    typeof ajuste.moldeRevisao !== "string" ||
    ajuste.moldeRevisao.length === 0 ||
    typeof ajuste.corte !== "string" ||
    ajuste.corte.length === 0 ||
    ajuste.ajusteManual?.versao !== AJUSTE_CABELO_MANUAL_PRIMARIO_ESTADO_VERSAO ||
    ajuste.ajusteManual?.aplicado !== true ||
    !geometriaFinalValida(ajuste)
  ) return false;

  return !exigirConfirmacao || ajuste.ajusteManual.confirmado === true;
}

export function confirmarAjusteCabeloManualPrimario(ajuste) {
  if (!ajusteCabeloManualPrimarioValido(ajuste, { exigirConfirmacao: false })) {
    return null;
  }
  return {
    ...ajuste,
    ajusteManual: {
      ...ajuste.ajusteManual,
      confirmado: true
    }
  };
}

function identidadeAjusteV6Valida(ajuste) {
  return Boolean(
    ajuste &&
    ajuste.versao === AJUSTE_CABELO_AUTOMATICO_VERSAO &&
    ajuste.algoritmo === AJUSTE_CABELO_AUTOMATICO_ALGORITMO &&
    ajuste.modeloCabecaSha256 === AJUSTE_CABELO_MODELO_CABECA_SHA256 &&
    typeof ajuste.templateId === "string" &&
    ajuste.templateId.length > 0 &&
    typeof ajuste.moldeRevisao === "string" &&
    ajuste.moldeRevisao.length > 0
  );
}

function ajusteAutomaticoRefinavel(ajuste) {
  return Boolean(
    identidadeAjusteV6Valida(ajuste) &&
    ajuste.origem === "auto-fit-local" &&
    ajuste.automatico === true
  );
}

function deltaManualNormalizado(delta = {}) {
  return {
    deslocamentoX: arredondar(limitarCabelo(numeroSeguro(delta.deslocamentoX, 0), -8, 8)),
    deslocamentoY: arredondar(limitarCabelo(numeroSeguro(delta.deslocamentoY, 0), -8, 8)),
    escala: arredondar(limitarCabelo(numeroSeguro(delta.escala, 1), 0.82, 1.18), 3),
    rotacao: arredondar(limitarCabelo(numeroSeguro(delta.rotacao, 0), -10, 10))
  };
}

function geometriaManualNormalizada(automatico, delta) {
  return {
    x: arredondar(limitarCabelo(
      numeroSeguro(automatico.x, AJUSTE_CABELO_PADRAO.x) + delta.deslocamentoX,
      ...LIMITES_AJUSTE.x
    )),
    y: arredondar(limitarCabelo(
      numeroSeguro(automatico.y, AJUSTE_CABELO_PADRAO.y) + delta.deslocamentoY,
      ...LIMITES_AJUSTE.y
    )),
    largura: arredondar(
      limitarCabelo(
        numeroSeguro(automatico.largura, AJUSTE_CABELO_PADRAO.largura) * delta.escala,
        ...LIMITES_AJUSTE.largura
      )
    ),
    altura: arredondar(
      limitarCabelo(
        numeroSeguro(automatico.altura, AJUSTE_CABELO_PADRAO.altura) * delta.escala,
        ...LIMITES_AJUSTE.altura
      )
    ),
    rotacao: arredondar(
      limitarCabelo(
        numeroSeguro(automatico.rotacao, AJUSTE_CABELO_PADRAO.rotacao) + delta.rotacao,
        ...LIMITES_AJUSTE.rotacao
      )
    )
  };
}

function geometriaFinalValida(ajuste) {
  return ["x", "y", "largura", "altura", "rotacao"].every((chave) => {
    const valor = ajuste?.[chave];
    const limites = LIMITES_AJUSTE[chave];
    return Number.isFinite(valor) && valor >= limites[0] && valor <= limites[1];
  });
}

/**
 * Refina somente a geometria final de um placement v6 já calculado. O auto-fit
 * continua sendo a base; nenhum landmark ou métrica facial é persistido.
 */
export function refinarAjusteCabeloManualmente(automatico, delta = {}) {
  if (!ajusteAutomaticoRefinavel(automatico)) return null;
  const deltaNormalizado = deltaManualNormalizado(delta);

  return {
    ...automatico,
    ...geometriaManualNormalizada(automatico, deltaNormalizado),
    origem: AJUSTE_CABELO_MANUAL_ORIGEM,
    automatico: false,
    ajusteManual: {
      versao: AJUSTE_CABELO_MANUAL_VERSAO,
      aplicado: true,
      ...deltaNormalizado
    }
  };
}

export function ajusteCabeloManualValido(ajuste) {
  if (
    !identidadeAjusteV6Valida(ajuste) ||
    !geometriaFinalValida(ajuste) ||
    ajuste.origem !== AJUSTE_CABELO_MANUAL_ORIGEM ||
    ajuste.automatico !== false ||
    ajuste.ajusteManual?.versao !== AJUSTE_CABELO_MANUAL_VERSAO ||
    ajuste.ajusteManual?.aplicado !== true
  ) return false;

  const delta = ajuste.ajusteManual;
  return (
    Number.isFinite(delta.deslocamentoX) &&
    delta.deslocamentoX >= -8 &&
    delta.deslocamentoX <= 8 &&
    Number.isFinite(delta.deslocamentoY) &&
    delta.deslocamentoY >= -8 &&
    delta.deslocamentoY <= 8 &&
    Number.isFinite(delta.escala) &&
    delta.escala >= 0.82 &&
    delta.escala <= 1.18 &&
    Number.isFinite(delta.rotacao) &&
    delta.rotacao >= -10 &&
    delta.rotacao <= 10
  );
}

export function ajusteCabeloV6Valido(ajuste) {
  if (!identidadeAjusteV6Valida(ajuste) || !geometriaFinalValida(ajuste)) return false;
  return ajusteAutomaticoRefinavel(ajuste) || ajusteCabeloManualValido(ajuste);
}

/**
 * Reaplica a geometria manual salva somente sobre o mesmo corte/asset e sobre
 * um auto-fit v6 recém-calculado para a selfie atual.
 */
export function restaurarAjusteCabeloManual(automatico, salvo) {
  if (
    !ajusteAutomaticoRefinavel(automatico) ||
    !ajusteCabeloManualValido(salvo) ||
    salvo.templateId !== automatico.templateId ||
    salvo.corte !== automatico.corte ||
    salvo.moldeRevisao !== automatico.moldeRevisao ||
    (automatico.asset && salvo.asset !== automatico.asset)
  ) {
    return automatico;
  }

  return refinarAjusteCabeloManualmente(automatico, salvo.ajusteManual);
}

export function ajustePertenceAoCabelo(ajuste, cabelo) {
  if (!ajuste || !cabelo) return false;
  if (ajuste.versao !== 4 || ajuste.templateId !== cabelo.id) return false;
  if (cabelo.asset && ajuste.asset !== cabelo.asset) return false;
  return true;
}

/**
 * Analisa apenas o canal alpha do cutout. O resultado fica em memória e cria
 * três âncoras aproximadas na borda inferior do cabelo.
 */
export function analisarMoldeCabeloPorAlpha(pixels, largura, altura) {
  const w = Math.round(Number(largura));
  const h = Math.round(Number(altura));
  if (!pixels || w < 2 || h < 2 || pixels.length < w * h * 4) return null;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let pixelsAlpha = 0;
  let pixelsAlphaNaBorda = 0;
  let pixelsDaBorda = 0;
  const limiteAlpha = 24;
  const margemBordaX = Math.max(1, Math.round(w * 0.04));
  const margemBordaY = Math.max(1, Math.round(h * 0.025));

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const naBorda =
        x < margemBordaX || x >= w - margemBordaX ||
        y < margemBordaY || y >= h - margemBordaY;
      if (naBorda) pixelsDaBorda += 1;
      if (pixels[(y * w + x) * 4 + 3] < limiteAlpha) continue;
      pixelsAlpha += 1;
      if (naBorda) pixelsAlphaNaBorda += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX <= minX || maxY <= minY) return null;
  const proporcaoAlpha = pixelsAlpha / (w * h);
  const ocupacaoBorda = pixelsDaBorda ? pixelsAlphaNaBorda / pixelsDaBorda : 1;
  if (proporcaoAlpha < 0.02 || proporcaoAlpha > 0.78 || ocupacaoBorda > 0.42) return null;
  const larguraAlpha = maxX - minX + 1;
  const alturaAlpha = maxY - minY + 1;
  const contornoInferior = [];

  for (let x = minX; x <= maxX; x += 1) {
    let inferior = -1;
    for (let y = maxY; y >= minY; y -= 1) {
      if (pixels[(y * w + x) * 4 + 3] >= limiteAlpha) {
        inferior = y;
        break;
      }
    }
    if (inferior >= 0) contornoInferior.push({ x, y: inferior });
  }

  function criarAncora(inicio, fim) {
    const esquerda = minX + larguraAlpha * inicio;
    const direita = minX + larguraAlpha * fim;
    const faixa = contornoInferior.filter((ponto) => ponto.x >= esquerda && ponto.x <= direita);
    if (faixa.length < Math.max(4, larguraAlpha * 0.025)) return null;
    return {
      x: mediana(faixa.map((ponto) => ponto.x)),
      y: mediana(faixa.map((ponto) => ponto.y))
    };
  }

  const temploEsquerdo = criarAncora(0.1, 0.3);
  const frenteCentro = criarAncora(0.42, 0.58);
  const temploDireito = criarAncora(0.7, 0.9);
  if (!temploEsquerdo || !frenteCentro || !temploDireito) return null;

  const coberturaColunas = contornoInferior.length / larguraAlpha;

  return {
    versao: 1,
    largura: w,
    altura: h,
    caixaAlpha: { x: minX, y: minY, largura: larguraAlpha, altura: alturaAlpha },
    ancoras: { temploEsquerdo, frenteCentro, temploDireito },
    confianca: arredondar(
      limitarCabelo(coberturaColunas * 0.72 + Math.min(1, proporcaoAlpha / 0.28) * 0.28, 0, 1),
      4
    ),
    proporcaoAlpha: arredondar(proporcaoAlpha, 4),
    ocupacaoBorda: arredondar(ocupacaoBorda, 4),
    origem: "alpha-automatico"
  };
}

function normalizarAnaliseMolde(cabelo, analise) {
  const largura = Number(analise?.largura);
  const altura = Number(analise?.altura);
  if (!Number.isFinite(largura) || !Number.isFinite(altura) || largura <= 0 || altura <= 0) return null;
  const caixaOriginal = analise?.caixaAlpha;
  const caixaAlpha = {
    x: Number(caixaOriginal?.x),
    y: Number(caixaOriginal?.y),
    largura: Number(caixaOriginal?.largura),
    altura: Number(caixaOriginal?.altura)
  };
  if (
    !Object.values(caixaAlpha).every(Number.isFinite) ||
    caixaAlpha.largura <= 0 ||
    caixaAlpha.altura <= 0
  ) return null;

  const ancorasCalibradas = cabelo?.encaixeAutomatico?.ancoras;
  const converter = (ponto) => {
    const x = Number(ponto?.x);
    const y = Number(ponto?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const normalizada = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    return {
      x: normalizada ? x * largura : x,
      y: normalizada ? y * altura : y
    };
  };
  const origem = ancorasCalibradas || analise?.ancoras;
  const temploEsquerdo = converter(origem?.temploEsquerdo);
  const frenteCentro = converter(origem?.frenteCentro);
  const temploDireito = converter(origem?.temploDireito);
  if (!temploEsquerdo || !frenteCentro || !temploDireito) return null;

  return {
    largura,
    altura,
    caixaAlpha,
    ancoras: { temploEsquerdo, frenteCentro, temploDireito },
    confianca: ancorasCalibradas
      ? 0.96
      : limitarCabelo(Number(analise?.confianca) || 0.55, 0, 1),
    origem: ancorasCalibradas ? "catalogo-calibrado" : "alpha-automatico"
  };
}

function interpolarPonto(inicio, fim, progresso) {
  return {
    x: inicio.x + (fim.x - inicio.x) * progresso,
    y: inicio.y + (fim.y - inicio.y) * progresso
  };
}

function criarAncorasAlvo(metricas, cabelo) {
  const cabeca = metricas?.analiseCabeca;
  const ancoras = cabeca?.ancoras;
  if (
    !cabeca ||
    cabeca.metodo !== ANALISE_CABECA_METODO ||
    cabeca.modeloSha256 !== AJUSTE_CABELO_MODELO_CABECA_SHA256 ||
    !ancoras?.testaEsquerda ||
    !ancoras?.frenteCentro ||
    !ancoras?.testaDireita ||
    !ancoras?.temploEsquerdo ||
    !ancoras?.temploDireito
  ) return null;

  // Assets sem laterais longas devem terminar na linha superior da testa.
  // Moldes com taper/sideburn avançam até a têmpora real. O nível é calibrado
  // uma vez no catálogo; o tamanho, a posição e o roll vêm sempre da selfie.
  const nivelTemplo = limitarCabelo(
    numeroSeguro(cabelo?.encaixeAutomatico?.nivelTemplo, 0.65),
    0,
    1
  );
  return {
    temploEsquerdo: interpolarPonto(
      ancoras.testaEsquerda,
      ancoras.temploEsquerdo,
      nivelTemplo
    ),
    frenteCentro: { ...ancoras.frenteCentro },
    temploDireito: interpolarPonto(
      ancoras.testaDireita,
      ancoras.temploDireito,
      nivelTemplo
    )
  };
}

function calcularSimilaridade(ancorasFonte, ancorasAlvo, escalaBias = 1, rotacaoBias = 0) {
  const nomes = ["temploEsquerdo", "frenteCentro", "temploDireito"];
  const pesos = [1, 1.25, 1];
  const somaPesos = pesos.reduce((total, peso) => total + peso, 0);
  const centro = (pontos) => ({
    x: nomes.reduce((total, nome, indice) => total + pontos[nome].x * pesos[indice], 0) / somaPesos,
    y: nomes.reduce((total, nome, indice) => total + pontos[nome].y * pesos[indice], 0) / somaPesos
  });
  const centroFonte = centro(ancorasFonte);
  const centroAlvo = centro(ancorasAlvo);
  let produtoDireto = 0;
  let produtoCruzado = 0;
  let energiaFonte = 0;

  nomes.forEach((nome, indice) => {
    const px = ancorasFonte[nome].x - centroFonte.x;
    const py = ancorasFonte[nome].y - centroFonte.y;
    const qx = ancorasAlvo[nome].x - centroAlvo.x;
    const qy = ancorasAlvo[nome].y - centroAlvo.y;
    produtoDireto += pesos[indice] * (px * qx + py * qy);
    produtoCruzado += pesos[indice] * (px * qy - py * qx);
    energiaFonte += pesos[indice] * (px * px + py * py);
  });

  if (energiaFonte <= 0) return null;
  const anguloBase = Math.atan2(produtoCruzado, produtoDireto);
  const escalaBase = Math.hypot(produtoDireto, produtoCruzado) / energiaFonte;
  if (!Number.isFinite(escalaBase) || escalaBase <= 0) return null;

  const angulo = limitarCabelo(
    (anguloBase * 180) / Math.PI + Number(rotacaoBias || 0),
    -12,
    12
  );
  const radianos = (angulo * Math.PI) / 180;
  const escala = escalaBase * limitarCabelo(Number(escalaBias) || 1, 0.72, 1.28);
  const cos = Math.cos(radianos);
  const sin = Math.sin(radianos);
  const transformarSemTranslacao = (ponto) => ({
    x: escala * (cos * ponto.x - sin * ponto.y),
    y: escala * (sin * ponto.x + cos * ponto.y)
  });
  const centroFonteTransformado = transformarSemTranslacao(centroFonte);

  return {
    escala,
    rotacao: angulo,
    translacao: {
      x: centroAlvo.x - centroFonteTransformado.x,
      y: centroAlvo.y - centroFonteTransformado.y
    },
    transformarSemTranslacao
  };
}

/**
 * Gera o placement v6 sem expor caixa facial ou âncoras no contrato salvo.
 * A geometria e a análise alpha devem permanecer somente no estado React.
 */
export function criarAjusteAutomaticoDoCatalogo(cabelo, metricas, analiseMolde, confiancaRemocao = 0) {
  const molde = normalizarAnaliseMolde(cabelo, analiseMolde);
  const alvo = criarAncorasAlvo(metricas, cabelo);
  if (!cabelo || !molde || !alvo) return null;

  const transformacao = cabelo.transformacaoPadrao || {};
  const similaridade = calcularSimilaridade(
    molde.ancoras,
    alvo,
    transformacao.escala,
    transformacao.rotacao
  );
  if (!similaridade) return null;

  const deslocamentoX = (Number(transformacao.deslocamentoX) || 0) * PALCO_LARGURA / 100;
  const deslocamentoY = (Number(transformacao.deslocamentoY) || 0) * PALCO_ALTURA / 100;
  const caixaCabelo = metricas?.caixaCabelo;
  const distanciaTopoMolde = Math.max(
    1,
    (molde.ancoras.frenteCentro.y - molde.caixaAlpha.y) * similaridade.escala
  );
  const distanciaTopoNecessaria = caixaCabelo
    ? Math.max(1, alvo.frenteCentro.y - Number(caixaCabelo.y) + 4)
    : distanciaTopoMolde;
  const larguraAlphaBase = Math.max(1, molde.caixaAlpha.largura * similaridade.escala);
  const larguraNecessaria = caixaCabelo
    ? Math.max(1, Number(caixaCabelo.largura) + 8)
    : larguraAlphaBase;
  const fatorCoberturaY = limitarCabelo(
    distanciaTopoNecessaria / distanciaTopoMolde,
    0.92,
    1.3
  );
  const fatorCoberturaX = limitarCabelo(
    larguraNecessaria / larguraAlphaBase,
    0.94,
    1.12
  );
  const escalaX = similaridade.escala * fatorCoberturaX;
  const escalaY = similaridade.escala * fatorCoberturaY;
  const larguraRenderizada = escalaX * molde.largura;
  const alturaRenderizada = escalaY * molde.altura;
  const radianos = (similaridade.rotacao * Math.PI) / 180;
  const cos = Math.cos(radianos);
  const sin = Math.sin(radianos);
  const nomesAncoras = ["temploEsquerdo", "frenteCentro", "temploDireito"];
  const pesosAncoras = [1, 2.2, 1];
  const somaPesos = pesosAncoras.reduce((total, peso) => total + peso, 0);
  const transformarRelativoAoCentro = (ponto) => {
    const localX = (ponto.x - molde.largura / 2) * escalaX;
    const localY = (ponto.y - molde.altura / 2) * escalaY;
    return {
      x: cos * localX - sin * localY,
      y: sin * localX + cos * localY
    };
  };
  const alvosComBias = Object.fromEntries(nomesAncoras.map((nome) => [
    nome,
    {
      x: alvo[nome].x + deslocamentoX,
      y: alvo[nome].y + deslocamentoY
    }
  ]));
  const relativos = Object.fromEntries(nomesAncoras.map((nome) => [
    nome,
    transformarRelativoAoCentro(molde.ancoras[nome])
  ]));
  const centroX = nomesAncoras.reduce(
    (total, nome, indice) => total + (
      alvosComBias[nome].x - relativos[nome].x
    ) * pesosAncoras[indice],
    0
  ) / somaPesos;
  const centroY = nomesAncoras.reduce(
    (total, nome, indice) => total + (
      alvosComBias[nome].y - relativos[nome].y
    ) * pesosAncoras[indice],
    0
  ) / somaPesos;
  const erroQuadratico = nomesAncoras.reduce((total, nome, indice) => {
    const erroX = centroX + relativos[nome].x - alvosComBias[nome].x;
    const erroY = centroY + relativos[nome].y - alvosComBias[nome].y;
    return total + (erroX * erroX + erroY * erroY) * pesosAncoras[indice];
  }, 0) / somaPesos;
  const alcanceAlvo = Math.max(
    1,
    Math.hypot(
      alvosComBias.temploDireito.x - alvosComBias.temploEsquerdo.x,
      alvosComBias.temploDireito.y - alvosComBias.temploEsquerdo.y
    )
  );
  const residualNormalizado = Math.sqrt(erroQuadratico) / alcanceAlvo;
  if (!Number.isFinite(residualNormalizado) || residualNormalizado > 0.24) return null;
  const x = (centroX / PALCO_LARGURA) * 100;
  const y = (centroY / PALCO_ALTURA) * 100;
  const larguraPercentual = (larguraRenderizada / PALCO_LARGURA) * 100;
  const alturaPercentual = (alturaRenderizada / PALCO_ALTURA) * 100;
  const geometriaValida =
    larguraPercentual >= 28 && larguraPercentual <= 125 &&
    alturaPercentual >= 12 && alturaPercentual <= 88 &&
    x >= 0 && x <= 100 && y >= 0 && y <= 75;
  if (!geometriaValida) return null;

  const confiancaFace = limitarCabelo(Number(metricas?.confiancaFace) || 0, 0, 1);
  const confiancaCabeca = limitarCabelo(Number(metricas?.analiseCabeca?.confianca) || 0, 0, 1);
  const confiancaGeometria = 1 - limitarCabelo(residualNormalizado / 0.24, 0, 1);
  const confianca = limitarCabelo(
    limitarCabelo(Number(confiancaRemocao) || 0, 0, 1) * 0.28 +
      confiancaFace * 0.18 +
      confiancaCabeca * 0.25 +
      molde.confianca * 0.17 +
      confiancaGeometria * 0.12,
    0,
    1
  );
  if (confianca < 0.55) return null;

  return {
    versao: AJUSTE_CABELO_AUTOMATICO_VERSAO,
    templateId: cabelo.id,
    asset: cabelo.asset || null,
    moldeRevisao: obterRevisaoMoldeCabelo(cabelo),
    corte: cabelo.nome,
    origem: "auto-fit-local",
    algoritmo: AJUSTE_CABELO_AUTOMATICO_ALGORITMO,
    modeloCabecaSha256: AJUSTE_CABELO_MODELO_CABECA_SHA256,
    automatico: true,
    confianca: arredondar(confianca, 4),
    x: arredondar(x),
    y: arredondar(y),
    largura: arredondar(larguraPercentual),
    altura: arredondar(alturaPercentual),
    rotacao: arredondar(similaridade.rotacao),
    inclinacao: 0,
    brilho: 100,
    contraste: 100,
    saturacao: 100,
    tonalidade: 0,
    sombra: 20,
    opacidade: 100,
    espelhado: false
  };
}

export function ajusteAutomaticoPertenceAoCabelo(ajuste, cabelo) {
  if (!ajuste || !cabelo) return false;
  if (
    ajuste.versao !== AJUSTE_CABELO_AUTOMATICO_VERSAO ||
    ajuste.origem !== "auto-fit-local" ||
    ajuste.algoritmo !== AJUSTE_CABELO_AUTOMATICO_ALGORITMO ||
    ajuste.modeloCabecaSha256 !== AJUSTE_CABELO_MODELO_CABECA_SHA256 ||
    ajuste.templateId !== cabelo.id ||
    ajuste.moldeRevisao !== obterRevisaoMoldeCabelo(cabelo)
  ) return false;
  if (cabelo.asset && ajuste.asset !== cabelo.asset) return false;
  return true;
}
