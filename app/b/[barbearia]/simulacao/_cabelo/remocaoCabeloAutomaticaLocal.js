export const REMOCAO_CABELO_AUTOMATICA_VERSAO = 3;
export const REMOCAO_PALCO_LARGURA = 640;
export const REMOCAO_PALCO_ALTURA = 800;
export const REMOCAO_CABELO_AUTOMATICA_METODO = "mediapipe-multiclass-local";
export const REMOCAO_CABELO_AUTOMATICA_ALGORITMO = "hair-occlusion-canvas-v3";
export const REMOCAO_CABELO_MODELO_SHA256 = "C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0";
export const ANALISE_CABECA_MODELO_SHA256 = "64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF";
export const ANALISE_CABECA_METODO = "mediapipe-face-landmarker-local";

const STATUS_VALIDOS = new Set([
  "ocioso",
  "inativo",
  "carregando",
  "processando",
  "pronto",
  "erro"
]);

export const REMOCAO_CABELO_AUTOMATICA_PADRAO = Object.freeze({
  versao: REMOCAO_CABELO_AUTOMATICA_VERSAO,
  metodo: REMOCAO_CABELO_AUTOMATICA_METODO,
  algoritmo: REMOCAO_CABELO_AUTOMATICA_ALGORITMO,
  modeloSha256: REMOCAO_CABELO_MODELO_SHA256,
  status: "ocioso",
  concluida: false,
  confianca: 0,
  resultado: null,
  erro: null,
  metricas: Object.freeze({})
});

export function limitarNumero(valor, minimo, maximo, fallback = minimo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return fallback;
  return Math.min(maximo, Math.max(minimo, numero));
}

function arredondar(valor, casas = 5) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function inteiroSeguro(valor, maximo = Number.MAX_SAFE_INTEGER) {
  return Math.round(limitarNumero(valor, 0, maximo, 0));
}

function normalizarRetangulo(valor) {
  if (!valor || typeof valor !== "object") return null;
  const x = Number(valor.x);
  const y = Number(valor.y);
  const largura = Number(valor.largura);
  const altura = Number(valor.altura);
  if (![x, y, largura, altura].every(Number.isFinite) || largura <= 0 || altura <= 0) return null;

  return {
    x: arredondar(x, 2),
    y: arredondar(y, 2),
    largura: arredondar(largura, 2),
    altura: arredondar(altura, 2)
  };
}

function normalizarCap(valor) {
  if (!valor || typeof valor !== "object") return null;
  const campos = ["centroX", "centroY", "raioX", "raioY", "linhaCentro", "linhaTemplo"];
  if (!campos.every((campo) => Number.isFinite(Number(valor[campo])))) return null;

  return Object.fromEntries(campos.map((campo) => [campo, arredondar(Number(valor[campo]), 2)]));
}

function normalizarPonto(valor) {
  if (!valor || typeof valor !== "object") return null;
  const x = Number(valor.x);
  const y = Number(valor.y);
  if (![x, y].every(Number.isFinite)) return null;
  return { x: arredondar(x, 2), y: arredondar(y, 2) };
}

function normalizarAnaliseCabeca(valor) {
  if (
    !valor ||
    typeof valor !== "object" ||
    valor.metodo !== ANALISE_CABECA_METODO ||
    valor.modeloSha256 !== ANALISE_CABECA_MODELO_SHA256
  ) return null;

  const origem = valor.ancoras && typeof valor.ancoras === "object" ? valor.ancoras : {};
  const ancoras = {
    testaEsquerda: normalizarPonto(origem.testaEsquerda),
    frenteCentro: normalizarPonto(origem.frenteCentro),
    testaDireita: normalizarPonto(origem.testaDireita),
    temploEsquerdo: normalizarPonto(origem.temploEsquerdo),
    temploDireito: normalizarPonto(origem.temploDireito)
  };
  if (Object.values(ancoras).some((ponto) => !ponto)) return null;

  return {
    versao: 1,
    metodo: ANALISE_CABECA_METODO,
    modeloSha256: ANALISE_CABECA_MODELO_SHA256,
    ancoras,
    centroX: arredondar(limitarNumero(valor.centroX, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_LARGURA / 2), 2),
    linhaTestaY: arredondar(limitarNumero(valor.linhaTestaY, 0, REMOCAO_PALCO_ALTURA, REMOCAO_PALCO_ALTURA * 0.25), 2),
    larguraRosto: arredondar(limitarNumero(valor.larguraRosto, 1, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_LARGURA * 0.3), 2),
    alturaRosto: arredondar(limitarNumero(valor.alturaRosto, 1, REMOCAO_PALCO_ALTURA, REMOCAO_PALCO_ALTURA * 0.35), 2),
    rotacao: arredondar(limitarNumero(valor.rotacao, -45, 45, 0), 3),
    assimetria: arredondar(limitarNumero(valor.assimetria, 0, 1, 1), 4),
    confianca: arredondar(limitarNumero(valor.confianca, 0, 1, 0), 4)
  };
}

function normalizarMetricas(valor) {
  const origem = valor && typeof valor === "object" ? valor : {};
  const qualidadeModelo = Array.isArray(origem.qualidadeModelo)
    ? origem.qualidadeModelo.slice(0, 10).map((item) => arredondar(limitarNumero(item, 0, 1, 0)))
    : [];

  return {
    tempoMs: inteiroSeguro(origem.tempoMs, 300_000),
    larguraMascara: inteiroSeguro(origem.larguraMascara, 10_000),
    alturaMascara: inteiroSeguro(origem.alturaMascara, 10_000),
    pixelsFace: inteiroSeguro(origem.pixelsFace, 100_000_000),
    pixelsCabelo: inteiroSeguro(origem.pixelsCabelo, 100_000_000),
    pixelsCabeloInterno: inteiroSeguro(origem.pixelsCabeloInterno, 100_000_000),
    pixelsCabeloExterno: inteiroSeguro(origem.pixelsCabeloExterno, 100_000_000),
    pixelsCorrigidos: inteiroSeguro(origem.pixelsCorrigidos, 100_000_000),
    confiancaFace: arredondar(limitarNumero(origem.confiancaFace, 0, 1, 0)),
    confiancaPele: arredondar(limitarNumero(origem.confiancaPele, 0, 1, 0)),
    uniformidadeFundo: arredondar(limitarNumero(origem.uniformidadeFundo, 0, 1, 0)),
    fundoAplicado: origem.fundoAplicado === true,
    cabeloJaAusente: origem.cabeloJaAusente === true,
    qualidadeModelo,
    caixaFace: normalizarRetangulo(origem.caixaFace),
    caixaCabelo: normalizarRetangulo(origem.caixaCabelo),
    cap: normalizarCap(origem.cap),
    analiseCabeca: normalizarAnaliseCabeca(origem.analiseCabeca)
  };
}

/** Normaliza o payload emitido pelo componente automatico. */
export function normalizarRemocaoCabeloAutomatica(valor) {
  const origem = valor && typeof valor === "object" ? valor : {};
  let status = STATUS_VALIDOS.has(origem.status) ? origem.status : "ocioso";
  const resultado = origem.resultado === "removido" || origem.resultado === "sem-cabelo"
    ? origem.resultado
    : null;
  let erro = typeof origem.erro === "string" && origem.erro.trim()
    ? origem.erro.trim().slice(0, 400)
    : null;

  if (status === "pronto" && !resultado) {
    status = "erro";
    erro = erro || "O processamento terminou sem um resultado local valido.";
  }

  return {
    versao: REMOCAO_CABELO_AUTOMATICA_VERSAO,
    metodo: REMOCAO_CABELO_AUTOMATICA_METODO,
    algoritmo: REMOCAO_CABELO_AUTOMATICA_ALGORITMO,
    modeloSha256: REMOCAO_CABELO_MODELO_SHA256,
    status,
    concluida: status === "pronto",
    confianca: arredondar(limitarNumero(origem.confianca, 0, 1, 0)),
    resultado,
    erro: status === "erro" ? erro || "Nao foi possivel preparar esta selfie." : null,
    metricas: normalizarMetricas(origem.metricas)
  };
}

export function criarStatusRemocaoCabeloAutomatica(status, patch = {}) {
  return normalizarRemocaoCabeloAutomatica({
    ...REMOCAO_CABELO_AUTOMATICA_PADRAO,
    ...patch,
    status
  });
}

/**
 * Recibo pequeno que pode entrar na jornada. Métricas faciais, máscara e Canvas
 * permanecem efêmeros no componente e nunca são copiados para o storage.
 */
export function criarReciboRemocaoCabeloAutomatica(valor) {
  const normalizado = normalizarRemocaoCabeloAutomatica(valor);
  if (normalizado.status !== "pronto" || normalizado.concluida !== true) return null;
  return {
    versao: REMOCAO_CABELO_AUTOMATICA_VERSAO,
    metodo: REMOCAO_CABELO_AUTOMATICA_METODO,
    algoritmo: REMOCAO_CABELO_AUTOMATICA_ALGORITMO,
    modeloSha256: REMOCAO_CABELO_MODELO_SHA256,
    concluida: true,
    resultado: normalizado.resultado
  };
}

/** Cria uma mascara binaria combinando categoria e confianca sem alterar as entradas. */
export function criarMascaraDaCategoria(categorias, confiancas, categoria, limiar = 0.42) {
  const tamanho = Math.max(categorias?.length || 0, confiancas?.length || 0);
  const mascara = new Uint8Array(tamanho);
  const corte = limitarNumero(limiar, 0, 1, 0.42);

  for (let indice = 0; indice < tamanho; indice += 1) {
    if (categorias?.[indice] === categoria || (confiancas?.[indice] || 0) >= corte) {
      mascara[indice] = 1;
    }
  }
  return mascara;
}

/** Seleciona o componente conexo mais relevante e central. */
export function encontrarComponenteCentral(mascara, largura, altura, opcoes = {}) {
  const total = largura * altura;
  if (!mascara || mascara.length < total || largura < 1 || altura < 1) return null;

  const minimoArea = Math.max(8, Math.round(opcoes.minimoArea || total * 0.0025));
  const visitados = new Uint8Array(total);
  const rotulos = new Int32Array(total);
  const fila = new Int32Array(total);
  let rotulo = 0;
  let melhor = null;

  for (let inicial = 0; inicial < total; inicial += 1) {
    if (!mascara[inicial] || visitados[inicial]) continue;
    rotulo += 1;
    let inicioFila = 0;
    let fimFila = 0;
    fila[fimFila++] = inicial;
    visitados[inicial] = 1;
    let area = 0;
    let somaX = 0;
    let somaY = 0;
    let minimoX = largura;
    let minimoY = altura;
    let maximoX = 0;
    let maximoY = 0;

    while (inicioFila < fimFila) {
      const indice = fila[inicioFila++];
      const x = indice % largura;
      const y = Math.floor(indice / largura);
      rotulos[indice] = rotulo;
      area += 1;
      somaX += x;
      somaY += y;
      minimoX = Math.min(minimoX, x);
      minimoY = Math.min(minimoY, y);
      maximoX = Math.max(maximoX, x);
      maximoY = Math.max(maximoY, y);

      const vizinhos = [];
      if (x > 0) vizinhos.push(indice - 1);
      if (x + 1 < largura) vizinhos.push(indice + 1);
      if (y > 0) vizinhos.push(indice - largura);
      if (y + 1 < altura) vizinhos.push(indice + largura);
      for (const vizinho of vizinhos) {
        if (mascara[vizinho] && !visitados[vizinho]) {
          visitados[vizinho] = 1;
          fila[fimFila++] = vizinho;
        }
      }
    }

    if (area < minimoArea) continue;
    const centroX = somaX / area;
    const centroY = somaY / area;
    const distanciaCentro = Math.hypot(
      (centroX / Math.max(1, largura - 1) - 0.5) / 0.5,
      (centroY / Math.max(1, altura - 1) - 0.43) / 0.72
    );
    const centralidade = limitarNumero(1 - distanciaCentro, 0, 1, 0);
    const pontuacao = area * (0.48 + centralidade * 0.52);

    if (!melhor || pontuacao > melhor.pontuacao) {
      melhor = {
        rotulo,
        area,
        centroX,
        centroY,
        centralidade,
        pontuacao,
        x: minimoX,
        y: minimoY,
        largura: maximoX - minimoX + 1,
        altura: maximoY - minimoY + 1
      };
    }
  }

  if (!melhor) return null;
  const mascaraComponente = new Uint8Array(total);
  for (let indice = 0; indice < total; indice += 1) {
    if (rotulos[indice] === melhor.rotulo) mascaraComponente[indice] = 1;
  }

  return { ...melhor, mascara: mascaraComponente };
}

function distanciaPontos(a, b) {
  return Math.hypot((b?.x || 0) - (a?.x || 0), (b?.y || 0) - (a?.y || 0));
}

function pontoLandmark(marcos, indice, largura, altura) {
  const marco = marcos?.[indice];
  const x = Number(marco?.x);
  const y = Number(marco?.y);
  if (![x, y].every(Number.isFinite) || x < -0.12 || x > 1.12 || y < -0.12 || y > 1.12) {
    return null;
  }
  return {
    x: limitarNumero(x * largura, 0, largura, largura / 2),
    y: limitarNumero(y * altura, 0, altura, altura / 2)
  };
}

function ordenarHorizontalmente(a, b) {
  if (!a || !b) return [a, b];
  return a.x <= b.x ? [a, b] : [b, a];
}

/**
 * Converte os 478 landmarks do Face Landmarker em um quadro anatômico pequeno.
 * Os pontos permanecem efêmeros: somente o placement final entra na jornada.
 */
export function analisarCabecaPorLandmarks(marcos, largura, altura) {
  if (!Array.isArray(marcos) || marcos.length < 468 || largura < 1 || altura < 1) return null;

  const topoTesta = pontoLandmark(marcos, 10, largura, altura);
  const queixo = pontoLandmark(marcos, 152, largura, altura);
  const nariz = pontoLandmark(marcos, 1, largura, altura);
  const [olhoEsquerdo, olhoDireito] = ordenarHorizontalmente(
    pontoLandmark(marcos, 33, largura, altura),
    pontoLandmark(marcos, 263, largura, altura)
  );
  const [faceEsquerda, faceDireita] = ordenarHorizontalmente(
    pontoLandmark(marcos, 234, largura, altura),
    pontoLandmark(marcos, 454, largura, altura)
  );
  const [testaEsquerda, testaDireita] = ordenarHorizontalmente(
    pontoLandmark(marcos, 103, largura, altura),
    pontoLandmark(marcos, 332, largura, altura)
  );
  const [temploEsquerdo, temploDireito] = ordenarHorizontalmente(
    pontoLandmark(marcos, 127, largura, altura),
    pontoLandmark(marcos, 356, largura, altura)
  );

  const obrigatorios = [
    topoTesta,
    queixo,
    nariz,
    olhoEsquerdo,
    olhoDireito,
    faceEsquerda,
    faceDireita,
    testaEsquerda,
    testaDireita,
    temploEsquerdo,
    temploDireito
  ];
  if (obrigatorios.some((ponto) => !ponto)) return null;

  const larguraRosto = distanciaPontos(faceEsquerda, faceDireita);
  const alturaRosto = distanciaPontos(topoTesta, queixo);
  if (
    larguraRosto < largura * 0.12 ||
    larguraRosto > largura * 0.72 ||
    alturaRosto < altura * 0.16 ||
    alturaRosto > altura * 0.72
  ) return null;

  const rotacao = (Math.atan2(
    olhoDireito.y - olhoEsquerdo.y,
    olhoDireito.x - olhoEsquerdo.x
  ) * 180) / Math.PI;
  const distanciaEsquerda = distanciaPontos(faceEsquerda, nariz);
  const distanciaDireita = distanciaPontos(nariz, faceDireita);
  const assimetria = Math.abs(distanciaEsquerda - distanciaDireita)
    / Math.max(1, distanciaEsquerda + distanciaDireita);
  const tamanho = limitarNumero(
    Math.min(larguraRosto / (largura * 0.25), alturaRosto / (altura * 0.29)),
    0,
    1,
    0
  );
  const confiancaRotacao = 1 - limitarNumero(Math.max(0, Math.abs(rotacao) - 6) / 18, 0, 1, 1);
  const confiancaFrontal = 1 - limitarNumero(assimetria / 0.32, 0, 1, 1);
  const confianca = limitarNumero(
    0.34 + tamanho * 0.3 + confiancaRotacao * 0.18 + confiancaFrontal * 0.18,
    0,
    1,
    0
  );

  return normalizarAnaliseCabeca({
    versao: 1,
    metodo: ANALISE_CABECA_METODO,
    modeloSha256: ANALISE_CABECA_MODELO_SHA256,
    ancoras: {
      testaEsquerda,
      frenteCentro: topoTesta,
      testaDireita,
      temploEsquerdo,
      temploDireito
    },
    centroX: (faceEsquerda.x + faceDireita.x) / 2,
    linhaTestaY: topoTesta.y,
    larguraRosto,
    alturaRosto,
    rotacao,
    assimetria,
    confianca
  });
}

export function calcularCapEliptica(caixaFace, largura, altura, analiseCabeca = null) {
  if (!caixaFace) return null;
  const cabeca = normalizarAnaliseCabeca(analiseCabeca);
  const larguraFace = limitarNumero(caixaFace.largura, largura * 0.12, largura * 0.82, largura * 0.34);
  const alturaFace = limitarNumero(caixaFace.altura, altura * 0.14, altura * 0.78, altura * 0.42);
  const centroX = limitarNumero(
    cabeca?.centroX ?? caixaFace.x + larguraFace / 2,
    0,
    largura,
    largura / 2
  );
  const topoFace = limitarNumero(
    cabeca?.linhaTestaY ?? caixaFace.y,
    0,
    altura,
    altura * 0.25
  );
  const larguraAnatomica = cabeca?.larguraRosto || larguraFace;
  const alturaAnatomica = cabeca?.alturaRosto || alturaFace;
  const linhaTemploAnatomica = cabeca
    ? (cabeca.ancoras.testaEsquerda.y + cabeca.ancoras.testaDireita.y) / 2
    : topoFace + alturaFace * 0.18;

  return {
    centroX,
    centroY: topoFace + alturaAnatomica * 0.045,
    // A caixa face-skin pode incluir orelhas. Usar 0,63 criava uma "touca"
    // sintética além do crânio; 0,47 aproxima a largura real da calota.
    raioX: limitarNumero(larguraAnatomica * 0.47, largura * 0.09, largura * 0.34, largura * 0.2),
    raioY: limitarNumero(alturaAnatomica * 0.56, altura * 0.12, altura * 0.44, altura * 0.24),
    linhaCentro: topoFace + alturaAnatomica * 0.025,
    linhaTemplo: limitarNumero(
      linhaTemploAnatomica + alturaAnatomica * 0.015,
      topoFace,
      topoFace + alturaAnatomica * 0.32,
      topoFace + alturaAnatomica * 0.18
    )
  };
}

export function pontoDentroDaCap(x, y, cap, margem = 0) {
  if (!cap) return false;
  const raioX = Math.max(1, cap.raioX + margem);
  const raioY = Math.max(1, cap.raioY + margem);
  const normalX = (x - cap.centroX) / raioX;
  const normalY = (y - cap.centroY) / raioY;
  const linha = cap.linhaCentro
    + (cap.linhaTemplo - cap.linhaCentro) * Math.pow(Math.min(1, Math.abs(normalX)), 1.65)
    + margem * 0.35;
  return normalX * normalX + normalY * normalY <= 1 && y <= linha;
}

export function dilatarMascaraBinaria(mascara, largura, altura, raio = 3) {
  const alcance = inteiroSeguro(raio, 32);
  const total = largura * altura;
  if (!mascara || mascara.length < total || alcance === 0) return Uint8Array.from(mascara || []);
  const horizontal = new Uint8Array(total);
  const saida = new Uint8Array(total);

  for (let y = 0; y < altura; y += 1) {
    let soma = 0;
    const base = y * largura;
    for (let x = 0; x <= Math.min(largura - 1, alcance); x += 1) soma += mascara[base + x] ? 1 : 0;
    for (let x = 0; x < largura; x += 1) {
      horizontal[base + x] = soma > 0 ? 1 : 0;
      const remover = x - alcance;
      const adicionar = x + alcance + 1;
      if (remover >= 0) soma -= mascara[base + remover] ? 1 : 0;
      if (adicionar < largura) soma += mascara[base + adicionar] ? 1 : 0;
    }
  }

  for (let x = 0; x < largura; x += 1) {
    let soma = 0;
    for (let y = 0; y <= Math.min(altura - 1, alcance); y += 1) soma += horizontal[y * largura + x];
    for (let y = 0; y < altura; y += 1) {
      saida[y * largura + x] = soma > 0 ? 1 : 0;
      const remover = y - alcance;
      const adicionar = y + alcance + 1;
      if (remover >= 0) soma -= horizontal[remover * largura + x];
      if (adicionar < altura) soma += horizontal[adicionar * largura + x];
    }
  }

  return saida;
}

function desfoqueHorizontal(entrada, largura, altura, raio) {
  const saida = new Float32Array(entrada.length);
  for (let y = 0; y < altura; y += 1) {
    const base = y * largura;
    let soma = 0;
    let quantidade = 0;
    for (let x = 0; x <= Math.min(largura - 1, raio); x += 1) {
      soma += entrada[base + x];
      quantidade += 1;
    }
    for (let x = 0; x < largura; x += 1) {
      saida[base + x] = soma / quantidade;
      const remover = x - raio;
      const adicionar = x + raio + 1;
      if (remover >= 0) {
        soma -= entrada[base + remover];
        quantidade -= 1;
      }
      if (adicionar < largura) {
        soma += entrada[base + adicionar];
        quantidade += 1;
      }
    }
  }
  return saida;
}

function desfoqueVertical(entrada, largura, altura, raio) {
  const saida = new Float32Array(entrada.length);
  for (let x = 0; x < largura; x += 1) {
    let soma = 0;
    let quantidade = 0;
    for (let y = 0; y <= Math.min(altura - 1, raio); y += 1) {
      soma += entrada[y * largura + x];
      quantidade += 1;
    }
    for (let y = 0; y < altura; y += 1) {
      saida[y * largura + x] = soma / quantidade;
      const remover = y - raio;
      const adicionar = y + raio + 1;
      if (remover >= 0) {
        soma -= entrada[remover * largura + x];
        quantidade -= 1;
      }
      if (adicionar < altura) {
        soma += entrada[adicionar * largura + x];
        quantidade += 1;
      }
    }
  }
  return saida;
}

/** Retorna alfa de 0 a 1 com desfoque separavel. */
export function suavizarMascara(mascara, largura, altura, raio = 4, passagens = 2) {
  const total = largura * altura;
  if (!mascara || mascara.length < total) return new Float32Array(total);
  const alcance = inteiroSeguro(raio, 32);
  let atual = Float32Array.from(mascara, (valor) => limitarNumero(valor, 0, 1, 0));
  for (let passagem = 0; passagem < Math.max(1, inteiroSeguro(passagens, 4)); passagem += 1) {
    atual = desfoqueVertical(
      desfoqueHorizontal(atual, largura, altura, alcance),
      largura,
      altura,
      alcance
    );
  }
  return atual;
}

function mediana(valores) {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2
    ? ordenados[meio]
    : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

function luminosidade(amostra) {
  return amostra.r * 0.2126 + amostra.g * 0.7152 + amostra.b * 0.0722;
}

/** Estatistica robusta para pele ou fundo, incluindo textura e gradiente de luz. */
export function analisarAmostrasDeCor(amostras) {
  const validas = Array.isArray(amostras)
    ? amostras.filter((item) => item && [item.r, item.g, item.b].every(Number.isFinite))
    : [];
  if (validas.length === 0) return null;

  const medianaR = mediana(validas.map((item) => item.r));
  const medianaG = mediana(validas.map((item) => item.g));
  const medianaB = mediana(validas.map((item) => item.b));
  const medianaLuz = mediana(validas.map(luminosidade));
  const mad = mediana(validas.map((item) => Math.abs(luminosidade(item) - medianaLuz)));
  const limiteLuz = Math.max(9, mad * 3.2);
  const filtradas = validas.filter((item) => {
    const distanciaCor = Math.hypot(item.r - medianaR, item.g - medianaG, item.b - medianaB);
    return Math.abs(luminosidade(item) - medianaLuz) <= limiteLuz && distanciaCor <= 78;
  });
  const usadas = filtradas.length >= Math.min(24, validas.length * 0.25) ? filtradas : validas;
  const soma = usadas.reduce(
    (total, item) => ({ r: total.r + item.r, g: total.g + item.g, b: total.b + item.b }),
    { r: 0, g: 0, b: 0 }
  );
  const r = soma.r / usadas.length;
  const g = soma.g / usadas.length;
  const b = soma.b / usadas.length;
  const luzes = usadas.map(luminosidade);
  const mediaLuz = luzes.reduce((total, valor) => total + valor, 0) / luzes.length;
  const desvio = Math.sqrt(
    luzes.reduce((total, valor) => total + (valor - mediaLuz) ** 2, 0) / luzes.length
  );
  const xs = usadas.filter((item) => Number.isFinite(item.x));
  const ys = usadas.filter((item) => Number.isFinite(item.y));
  const meioX = xs.length ? (Math.min(...xs.map((item) => item.x)) + Math.max(...xs.map((item) => item.x))) / 2 : 0;
  const meioY = ys.length ? (Math.min(...ys.map((item) => item.y)) + Math.max(...ys.map((item) => item.y))) / 2 : 0;

  function diferencaLuz(eixo, meio) {
    const menores = usadas.filter((item) => Number.isFinite(item[eixo]) && item[eixo] < meio);
    const maiores = usadas.filter((item) => Number.isFinite(item[eixo]) && item[eixo] >= meio);
    if (menores.length < 8 || maiores.length < 8) return 0;
    const media = (lista) => lista.reduce((total, item) => total + luminosidade(item), 0) / lista.length;
    return limitarNumero(media(maiores) - media(menores), -30, 30, 0);
  }

  const passoTextura = Math.max(1, Math.ceil(usadas.length / 256));
  const textura = usadas.filter((_, indice) => indice % passoTextura === 0).slice(0, 256).map((item) => ({
    r: limitarNumero(item.r - r, -18, 18, 0),
    g: limitarNumero(item.g - g, -18, 18, 0),
    b: limitarNumero(item.b - b, -18, 18, 0)
  }));

  return {
    r,
    g,
    b,
    desvio,
    quantidade: usadas.length,
    confianca: limitarNumero((usadas.length / 320) * (1 - desvio / 68), 0, 1, 0),
    uniformidade: limitarNumero(1 - desvio / 42, 0, 1, 0),
    gradienteX: diferencaLuz("x", meioX),
    gradienteY: diferencaLuz("y", meioY),
    textura
  };
}

export function ruidoDeterministico(x, y, semente = 1) {
  let valor = Math.imul(Math.floor(x) + 374761393, 668265263)
    ^ Math.imul(Math.floor(y) + 1442695041, 2246822519)
    ^ Math.imul(semente, 3266489917);
  valor = Math.imul(valor ^ (valor >>> 13), 1274126177);
  return ((valor ^ (valor >>> 16)) >>> 0) / 4294967295;
}
