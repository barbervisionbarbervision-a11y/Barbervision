"use client";

import { useEffect, useRef } from "react";
import {
  ANALISE_CABECA_MODELO_SHA256,
  REMOCAO_PALCO_ALTURA,
  REMOCAO_PALCO_LARGURA,
  analisarCabecaPorLandmarks,
  analisarAmostrasDeCor,
  calcularCapEliptica,
  criarMascaraDaCategoria,
  criarStatusRemocaoCabeloAutomatica,
  dilatarMascaraBinaria,
  encontrarComponenteCentral,
  limitarNumero,
  pontoDentroDaCap,
  ruidoDeterministico,
  suavizarMascara
} from "./remocaoCabeloAutomaticaLocal";

const CAMINHO_WASM = "/mediapipe/wasm";
const CAMINHO_MODELO = "/modelos/selfie_multiclass_256x256.tflite";
const CAMINHO_MODELO_CABECA = "/modelos/face_landmarker.task";
const CLASSE_FUNDO = 0;
const CLASSE_CABELO = 1;
const CLASSE_PELE_ROSTO = 3;
const PROPORCAO_MINIMA_CABELO_SIGNIFICATIVO = 0.02;
const PROPORCAO_MINIMA_CABELO_DENTRO_DA_CAP = 0.32;
const PROPORCAO_EXTERNA_SEVERA = 0.68;
const PROPORCAO_MAXIMA_EXTERNA_NO_PALCO = 0.055;

let segmentadorPromise = null;
let analisadorCabecaPromise = null;
const cacheImagensMolde = new Map();
const TEMPO_LIMITE_CARREGAMENTO_MS = 45000;

function criarErro(mensagem, codigo = "PROCESSAMENTO_INVALIDO") {
  const erro = new Error(mensagem);
  erro.codigo = codigo;
  return erro;
}

function aguardarComLimite(promessa, tempoMs, mensagem) {
  let temporizador;
  const limite = new Promise((_, reject) => {
    temporizador = window.setTimeout(
      () => reject(criarErro(mensagem, "TEMPO_LIMITE_EXCEDIDO")),
      tempoMs
    );
  });
  return Promise.race([promessa, limite]).finally(() => window.clearTimeout(temporizador));
}

async function obterSegmentadorLocal() {
  if (!segmentadorPromise) {
    segmentadorPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const arquivos = await FilesetResolver.forVisionTasks(CAMINHO_WASM);
      const segmentador = await ImageSegmenter.createFromOptions(arquivos, {
        baseOptions: {
          modelAssetPath: CAMINHO_MODELO,
          delegate: "CPU"
        },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: true
      });
      const rotulos = segmentador.getLabels().map((rotulo) => rotulo.toLowerCase().trim());
      if (
        rotulos.length > CLASSE_PELE_ROSTO &&
        (rotulos[CLASSE_CABELO] !== "hair" || rotulos[CLASSE_PELE_ROSTO] !== "face-skin")
      ) {
        segmentador.close();
        throw criarErro("O modelo local possui categorias incompatíveis.", "MODELO_INCOMPATIVEL");
      }
      return { segmentador, rotulos };
    })().catch((erro) => {
      segmentadorPromise = null;
      throw erro;
    });
  }
  return segmentadorPromise;
}

async function obterAnalisadorCabecaLocal() {
  if (!analisadorCabecaPromise) {
    analisadorCabecaPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const arquivos = await FilesetResolver.forVisionTasks(CAMINHO_WASM);
      return FaceLandmarker.createFromOptions(arquivos, {
        baseOptions: {
          modelAssetPath: CAMINHO_MODELO_CABECA,
          delegate: "CPU"
        },
        runningMode: "IMAGE",
        numFaces: 2,
        minFaceDetectionConfidence: 0.52,
        minFacePresenceConfidence: 0.52,
        minTrackingConfidence: 0.52,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
    })().catch((erro) => {
      analisadorCabecaPromise = null;
      throw erro;
    });
  }
  return analisadorCabecaPromise;
}

function carregarImagem(fonte) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.decoding = "async";
    if (!String(fonte).startsWith("data:")) imagem.crossOrigin = "anonymous";
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(criarErro("Não foi possível abrir a selfie.", "SELFIE_INVALIDA"));
    imagem.src = fonte;
  });
}

function obterImagemMolde(fonte) {
  if (!fonte) return Promise.resolve(null);
  if (cacheImagensMolde.has(fonte)) return cacheImagensMolde.get(fonte);
  const promessa = carregarImagem(fonte).catch((erro) => {
    cacheImagensMolde.delete(fonte);
    throw erro;
  });
  cacheImagensMolde.set(fonte, promessa);
  return promessa;
}

function criarCanvas(largura = REMOCAO_PALCO_LARGURA, altura = REMOCAO_PALCO_ALTURA) {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  return canvas;
}

function desenharObjectCover(contexto, imagem) {
  const larguraImagem = imagem.naturalWidth || imagem.width;
  const alturaImagem = imagem.naturalHeight || imagem.height;
  if (!larguraImagem || !alturaImagem) throw criarErro("A selfie não possui dimensões válidas.", "SELFIE_INVALIDA");
  const escala = Math.max(
    REMOCAO_PALCO_LARGURA / larguraImagem,
    REMOCAO_PALCO_ALTURA / alturaImagem
  );
  const largura = larguraImagem * escala;
  const altura = alturaImagem * escala;
  contexto.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
  contexto.drawImage(
    imagem,
    (REMOCAO_PALCO_LARGURA - largura) / 2,
    (REMOCAO_PALCO_ALTURA - altura) / 2,
    largura,
    altura
  );
}

function copiarMascaraFloat(mascara) {
  return mascara ? new Float32Array(mascara.getAsFloat32Array()) : null;
}

function extrairSegmentacao(resultado) {
  const categoria = resultado.categoryMask;
  const confiancas = resultado.confidenceMasks || [];
  const mascaras = new Set([categoria, ...confiancas].filter(Boolean));

  try {
    if (!categoria) throw criarErro("O modelo local não retornou a máscara de categorias.", "MASCARA_AUSENTE");
    const categorias = new Uint8Array(categoria.getAsUint8Array());
    const largura = categoria.width;
    const altura = categoria.height;
    if (!largura || !altura || categorias.length !== largura * altura) {
      throw criarErro("A máscara local retornou dimensões inválidas.", "MASCARA_INVALIDA");
    }

    const cabelo = copiarMascaraFloat(confiancas[CLASSE_CABELO]);
    const peleRosto = copiarMascaraFloat(confiancas[CLASSE_PELE_ROSTO]);
    if ((cabelo && cabelo.length !== categorias.length) || (peleRosto && peleRosto.length !== categorias.length)) {
      throw criarErro("As máscaras de confiança são incompatíveis.", "MASCARA_INVALIDA");
    }

    return {
      largura,
      altura,
      categorias,
      cabelo,
      peleRosto,
      qualidade: Array.from(resultado.qualityScores || [])
    };
  } finally {
    mascaras.forEach((mascara) => mascara.close());
  }
}

function indiceMascara(x, y, largura, altura) {
  const mascaraX = Math.min(largura - 1, Math.max(0, Math.floor((x / REMOCAO_PALCO_LARGURA) * largura)));
  const mascaraY = Math.min(altura - 1, Math.max(0, Math.floor((y / REMOCAO_PALCO_ALTURA) * altura)));
  return mascaraY * largura + mascaraX;
}

function caixaParaPalco(componente, larguraMascara, alturaMascara) {
  return {
    x: (componente.x / larguraMascara) * REMOCAO_PALCO_LARGURA,
    y: (componente.y / alturaMascara) * REMOCAO_PALCO_ALTURA,
    largura: (componente.largura / larguraMascara) * REMOCAO_PALCO_LARGURA,
    altura: (componente.altura / alturaMascara) * REMOCAO_PALCO_ALTURA
  };
}

function mediaConfiancaNaMascara(confiancas, mascara) {
  if (!confiancas || !mascara || confiancas.length !== mascara.length) return 0.72;
  let soma = 0;
  let quantidade = 0;
  for (let indice = 0; indice < mascara.length; indice += 1) {
    if (!mascara[indice]) continue;
    soma += confiancas[indice];
    quantidade += 1;
  }
  return quantidade ? soma / quantidade : 0;
}

function calcularConfiancaFace(componente, largura, altura, confiancaMedia) {
  const larguraNormalizada = componente.largura / largura;
  const alturaNormalizada = componente.altura / altura;
  const areaNormalizada = componente.area / (largura * altura);
  const proporcao = componente.largura / Math.max(1, componente.altura);
  const tamanho = limitarNumero(Math.min(larguraNormalizada / 0.24, alturaNormalizada / 0.28), 0, 1, 0);
  const area = limitarNumero(areaNormalizada / 0.075, 0, 1, 0);
  const formato = limitarNumero(1 - Math.abs(proporcao - 0.72) / 0.72, 0, 1, 0);
  return limitarNumero(
    componente.centralidade * 0.28 + tamanho * 0.22 + area * 0.16 + formato * 0.14 + confiancaMedia * 0.2,
    0,
    1,
    0
  );
}

function pixelDaFoto(dados, x, y) {
  const seguroX = Math.round(limitarNumero(x, 0, REMOCAO_PALCO_LARGURA - 1, 0));
  const seguroY = Math.round(limitarNumero(y, 0, REMOCAO_PALCO_ALTURA - 1, 0));
  const indice = (seguroY * REMOCAO_PALCO_LARGURA + seguroX) * 4;
  return { r: dados[indice], g: dados[indice + 1], b: dados[indice + 2], x: seguroX, y: seguroY };
}

function coletarAmostrasPele(dadosFoto, segmentacao, componente, caixaFace) {
  const amostras = [];
  const esquerda = Math.max(0, Math.floor(caixaFace.x + caixaFace.largura * 0.2));
  const direita = Math.min(REMOCAO_PALCO_LARGURA, Math.ceil(caixaFace.x + caixaFace.largura * 0.8));
  const topo = Math.max(0, Math.floor(caixaFace.y));
  const limiteInicial = Math.min(
    REMOCAO_PALCO_ALTURA,
    Math.ceil(caixaFace.y + caixaFace.altura * 0.32)
  );

  function coletar(limiteY, margemX) {
    for (let y = topo; y < limiteY; y += 2) {
      for (let x = Math.max(0, esquerda - margemX); x < Math.min(REMOCAO_PALCO_LARGURA, direita + margemX); x += 2) {
        const indice = indiceMascara(x, y, segmentacao.largura, segmentacao.altura);
        if (!componente.mascara[indice] && (segmentacao.peleRosto?.[indice] || 0) < 0.44) continue;
        const pixel = pixelDaFoto(dadosFoto, x, y);
        const luz = pixel.r * 0.2126 + pixel.g * 0.7152 + pixel.b * 0.0722;
        if (luz > 18 && luz < 252) amostras.push(pixel);
      }
    }
  }

  coletar(limiteInicial, 0);
  if (amostras.length < 120) {
    coletar(
      Math.min(REMOCAO_PALCO_ALTURA, Math.ceil(caixaFace.y + caixaFace.altura * 0.56)),
      Math.ceil(caixaFace.largura * 0.08)
    );
  }
  return amostras;
}

function coletarAmostrasCabelo(dadosFoto, mascaraCabelo) {
  const amostras = [];
  for (let y = 0; y < REMOCAO_PALCO_ALTURA; y += 4) {
    for (let x = 0; x < REMOCAO_PALCO_LARGURA; x += 4) {
      if (mascaraCabelo[y * REMOCAO_PALCO_LARGURA + x]) amostras.push(pixelDaFoto(dadosFoto, x, y));
    }
  }
  return amostras;
}

function criarMascarasAlvo(segmentacao, cap, caixaFace) {
  const total = REMOCAO_PALCO_LARGURA * REMOCAO_PALCO_ALTURA;
  const cabeloCompleto = new Uint8Array(total);
  const pele = new Uint8Array(total);
  const limiteEsquerdo = cap.centroX - cap.raioX * 1.62;
  const limiteDireito = cap.centroX + cap.raioX * 1.62;
  const limiteTopo = cap.centroY - cap.raioY * 1.35;
  const limiteInferior = caixaFace.y + caixaFace.altura * 0.34;
  let pixelsCabelo = 0;
  let pixelsInternos = 0;
  let pixelsExternos = 0;
  let cabeloMinX = REMOCAO_PALCO_LARGURA;
  let cabeloMinY = REMOCAO_PALCO_ALTURA;
  let cabeloMaxX = -1;
  let cabeloMaxY = -1;

  for (let y = 0; y < REMOCAO_PALCO_ALTURA; y += 1) {
    for (let x = 0; x < REMOCAO_PALCO_LARGURA; x += 1) {
      if (x < limiteEsquerdo || x > limiteDireito || y < limiteTopo || y > limiteInferior) continue;
      const indicePalco = y * REMOCAO_PALCO_LARGURA + x;
      const indice = indiceMascara(x, y, segmentacao.largura, segmentacao.altura);
      const confianca = segmentacao.cabelo?.[indice] || 0;
      const cabelo = segmentacao.categorias[indice] === CLASSE_CABELO || confianca >= 0.36;
      if (!cabelo) continue;

      cabeloCompleto[indicePalco] = 1;
      pixelsCabelo += 1;
      cabeloMinX = Math.min(cabeloMinX, x);
      cabeloMinY = Math.min(cabeloMinY, y);
      cabeloMaxX = Math.max(cabeloMaxX, x);
      cabeloMaxY = Math.max(cabeloMaxY, y);
      if (pontoDentroDaCap(x, y, cap, 3)) {
        pele[indicePalco] = 1;
        pixelsInternos += 1;
      } else {
        pixelsExternos += 1;
      }
    }
  }

  const caixaCabelo = cabeloMaxX >= cabeloMinX && cabeloMaxY >= cabeloMinY
    ? {
      x: cabeloMinX,
      y: cabeloMinY,
      largura: cabeloMaxX - cabeloMinX + 1,
      altura: cabeloMaxY - cabeloMinY + 1
    }
    : null;
  return {
    cabeloCompleto,
    pele,
    pixelsCabelo,
    pixelsInternos,
    pixelsExternos,
    caixaCabelo
  };
}

function prepararAlfas(alvos, cap) {
  const largura = REMOCAO_PALCO_LARGURA;
  const altura = REMOCAO_PALCO_ALTURA;
  const peleDilatada = dilatarMascaraBinaria(alvos.pele, largura, altura, 5);

  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const indice = y * largura + x;
      if (!pontoDentroDaCap(x, y, cap, 2)) peleDilatada[indice] = 0;
    }
  }

  const peleSuavizada = suavizarMascara(peleDilatada, largura, altura, 5, 2);
  // O blur precisa ser limitado novamente. Sem este segundo recorte, duas ou
  // três passagens espalham pele sintética para o fundo e para as têmporas.
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      const indice = y * largura + x;
      if (!pontoDentroDaCap(x, y, cap, 2)) peleSuavizada[indice] = 0;
    }
  }

  return { pele: peleSuavizada };
}

function canal(valor) {
  return Math.round(limitarNumero(valor, 0, 255, 0));
}

function corSintetica(estatisticas, x, y, referencia, tipo, estatisticasCabelo) {
  const textura = estatisticas.textura || [];
  const indiceTextura = textura.length
    ? Math.floor(ruidoDeterministico(x, y, tipo === "pele" ? 19 : 43) * textura.length)
    : 0;
  const residuo = textura[indiceTextura] || { r: 0, g: 0, b: 0 };
  const normalX = limitarNumero((x - referencia.centroX) / Math.max(1, referencia.raioX), -1.5, 1.5, 0);
  const normalY = limitarNumero((y - referencia.centroY) / Math.max(1, referencia.raioY), -1.5, 1.5, 0);
  const luzDirecional = estatisticas.gradienteX * normalX * 0.48
    + estatisticas.gradienteY * normalY * 0.42;
  const modelagem = tipo === "pele"
    ? 7 * (1 - Math.min(1, Math.abs(normalX))) - 10 * Math.pow(Math.min(1, Math.abs(normalX)), 1.7)
    : 0;
  let r = estatisticas.r + luzDirecional + modelagem + residuo.r * 0.56;
  let g = estatisticas.g + luzDirecional + modelagem + residuo.g * 0.56;
  let b = estatisticas.b + luzDirecional + modelagem + residuo.b * 0.56;

  if (
    tipo === "pele" &&
    estatisticasCabelo &&
    ruidoDeterministico(x, y, 71) > 0.925
  ) {
    const forca = 0.07 + ruidoDeterministico(x, y, 97) * 0.08;
    r = r * (1 - forca) + estatisticasCabelo.r * forca;
    g = g * (1 - forca) + estatisticasCabelo.g * forca;
    b = b * (1 - forca) + estatisticasCabelo.b * forca;
  }

  return { r: canal(r), g: canal(g), b: canal(b) };
}

function renderizarOverlay(canvas, alfas, cap, pele, cabelo) {
  const contexto = canvas.getContext("2d");
  const imagem = contexto.createImageData(REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
  const dados = imagem.data;
  let pixelsCorrigidos = 0;

  for (let y = 0; y < REMOCAO_PALCO_ALTURA; y += 1) {
    for (let x = 0; x < REMOCAO_PALCO_LARGURA; x += 1) {
      const indicePixel = y * REMOCAO_PALCO_LARGURA + x;
      const alphaPele = limitarNumero(alfas.pele[indicePixel], 0, 1, 0);
      const alpha = alphaPele;
      if (alpha <= 0.012) continue;

      const corPele = corSintetica(pele, x, y, cap, "pele", cabelo);
      const indice = indicePixel * 4;
      dados[indice] = corPele.r;
      dados[indice + 1] = corPele.g;
      dados[indice + 2] = corPele.b;
      dados[indice + 3] = canal(alpha * 255);
      if (alpha > 0.08) pixelsCorrigidos += 1;
    }
  }

  contexto.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
  contexto.putImageData(imagem, 0, 0);
  return pixelsCorrigidos;
}

async function comporOverlaySobCorte(
  canvasDestino,
  overlayBase,
  fonteMolde,
  ajuste,
  deveAplicar = () => true
) {
  const contextoDestino = canvasDestino.getContext("2d");
  contextoDestino.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
  if (!overlayBase || !fonteMolde || !ajuste) return false;

  const imagemMolde = await obterImagemMolde(fonteMolde);
  if (!imagemMolde || !deveAplicar()) return false;

  const largura = limitarNumero(
    (Number(ajuste.largura) / 100) * REMOCAO_PALCO_LARGURA,
    1,
    REMOCAO_PALCO_LARGURA * 1.4,
    1
  );
  const altura = limitarNumero(
    (Number(ajuste.altura) / 100) * REMOCAO_PALCO_ALTURA,
    1,
    REMOCAO_PALCO_ALTURA,
    1
  );
  const centroX = limitarNumero(
    (Number(ajuste.x) / 100) * REMOCAO_PALCO_LARGURA,
    -REMOCAO_PALCO_LARGURA,
    REMOCAO_PALCO_LARGURA * 2,
    REMOCAO_PALCO_LARGURA / 2
  );
  const centroY = limitarNumero(
    (Number(ajuste.y) / 100) * REMOCAO_PALCO_ALTURA,
    -REMOCAO_PALCO_ALTURA,
    REMOCAO_PALCO_ALTURA * 2,
    REMOCAO_PALCO_ALTURA * 0.2
  );
  const rotacao = limitarNumero(Number(ajuste.rotacao), -45, 45, 0) * Math.PI / 180;

  const mascara = criarCanvas();
  const contextoMascara = mascara.getContext("2d");
  contextoMascara.save();
  contextoMascara.translate(centroX, centroY);
  contextoMascara.rotate(rotacao);
  if (ajuste.espelhado === true) contextoMascara.scale(-1, 1);
  contextoMascara.drawImage(imagemMolde, -largura / 2, -altura / 2, largura, altura);
  contextoMascara.restore();

  // A camada de oclusão precisa ser mais opaca que as franjas fotográficas;
  // caso contrário, o cabelo antigo reaparece através de cada pixel de alpha
  // parcial. O limiar mantém a borda no mesmo lugar e preserva uma faixa curta
  // de feather, sem dilatar a silhueta do corte.
  const silhueta = contextoMascara.getImageData(
    0,
    0,
    REMOCAO_PALCO_LARGURA,
    REMOCAO_PALCO_ALTURA
  );
  for (let indice = 3; indice < silhueta.data.length; indice += 4) {
    const alpha = silhueta.data[indice];
    if (alpha <= 10) {
      silhueta.data[indice] = 0;
    } else if (alpha >= 36) {
      silhueta.data[indice] = 255;
    } else {
      silhueta.data[indice] = canal(
        Math.pow((alpha - 10) / 26, 0.62) * 255
      );
    }
  }
  contextoMascara.putImageData(silhueta, 0, 0);

  const composicao = criarCanvas();
  const contextoComposicao = composicao.getContext("2d");
  contextoComposicao.drawImage(overlayBase, 0, 0);
  contextoComposicao.globalCompositeOperation = "destination-in";
  contextoComposicao.drawImage(mascara, 0, 0);
  contextoComposicao.globalCompositeOperation = "source-over";
  if (deveAplicar()) contextoDestino.drawImage(composicao, 0, 0);

  mascara.width = 1;
  mascara.height = 1;
  composicao.width = 1;
  composicao.height = 1;
  return true;
}

async function processarSelfie(canvas, selfieDataUrl, emitir) {
  const inicio = performance.now();
  emitir("carregando");
  const [imagem, runtime, analisadorCabeca] = await aguardarComLimite(
    Promise.all([
      carregarImagem(selfieDataUrl),
      obterSegmentadorLocal(),
      obterAnalisadorCabecaLocal()
    ]),
    TEMPO_LIMITE_CARREGAMENTO_MS,
    "O preparo local demorou demais para iniciar. Verifique a conexão e tente novamente."
  );
  const foto = criarCanvas();
  const contextoFoto = foto.getContext("2d", { willReadFrequently: true });
  desenharObjectCover(contextoFoto, imagem);
  contextoFoto.getImageData(0, 0, 1, 1);
  emitir("processando");
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const resultadoCabeca = analisadorCabeca.detect(foto);
  const rostosLandmarks = Array.isArray(resultadoCabeca?.faceLandmarks)
    ? resultadoCabeca.faceLandmarks
    : [];
  if (rostosLandmarks.length > 1) {
    throw criarErro(
      "Use uma foto frontal com apenas uma pessoa, sem montagem ou colagem.",
      "MULTIPLOS_ROSTOS"
    );
  }
  if (rostosLandmarks.length !== 1) {
    throw criarErro(
      "Não foi possível analisar a cabeça. Use uma selfie frontal, bem iluminada e sem acessórios.",
      "CABECA_NAO_DETECTADA"
    );
  }
  const analiseCabeca = analisarCabecaPorLandmarks(
    rostosLandmarks[0],
    REMOCAO_PALCO_LARGURA,
    REMOCAO_PALCO_ALTURA
  );
  if (!analiseCabeca || analiseCabeca.modeloSha256 !== ANALISE_CABECA_MODELO_SHA256) {
    throw criarErro(
      "Não foi possível medir a cabeça com segurança. Refaça uma selfie frontal.",
      "ANALISE_CABECA_INVALIDA"
    );
  }
  if (
    analiseCabeca.confianca < 0.58 ||
    Math.abs(analiseCabeca.rotacao) > 20 ||
    analiseCabeca.assimetria > 0.34
  ) {
    throw criarErro(
      "Mantenha a cabeça reta e de frente para a câmera para preparar a foto.",
      "POSE_CABECA_INVALIDA"
    );
  }

  const segmentacao = extrairSegmentacao(runtime.segmentador.segment(foto));
  const mascaraFace = criarMascaraDaCategoria(
    segmentacao.categorias,
    segmentacao.peleRosto,
    CLASSE_PELE_ROSTO,
    0.4
  );
  for (let y = 0; y < segmentacao.altura; y += 1) {
    for (let x = 0; x < segmentacao.largura; x += 1) {
      if (x < segmentacao.largura * 0.08 || x > segmentacao.largura * 0.92 || y < segmentacao.altura * 0.06 || y > segmentacao.altura * 0.9) {
        mascaraFace[y * segmentacao.largura + x] = 0;
      }
    }
  }

  const componenteFace = encontrarComponenteCentral(
    mascaraFace,
    segmentacao.largura,
    segmentacao.altura,
    { minimoArea: segmentacao.largura * segmentacao.altura * 0.008 }
  );
  if (!componenteFace) {
    throw criarErro("Não foi possível localizar um rosto frontal na selfie.", "ROSTO_NAO_DETECTADO");
  }

  const mascaraFaceRestante = Uint8Array.from(mascaraFace);
  for (let indice = 0; indice < mascaraFaceRestante.length; indice += 1) {
    if (componenteFace.mascara[indice]) mascaraFaceRestante[indice] = 0;
  }
  const segundoRosto = encontrarComponenteCentral(
    mascaraFaceRestante,
    segmentacao.largura,
    segmentacao.altura,
    {
      minimoArea: Math.max(
        segmentacao.largura * segmentacao.altura * 0.006,
        componenteFace.area * 0.28
      )
    }
  );
  if (segundoRosto) {
    const proporcaoSegundo = segundoRosto.largura / Math.max(1, segundoRosto.altura);
    const pareceOutroRosto =
      segundoRosto.area >= componenteFace.area * 0.36 &&
      segundoRosto.largura >= componenteFace.largura * 0.46 &&
      segundoRosto.altura >= componenteFace.altura * 0.46 &&
      proporcaoSegundo >= 0.42 &&
      proporcaoSegundo <= 1.42;
    if (pareceOutroRosto) {
      throw criarErro(
        "Use uma foto frontal com apenas uma pessoa, sem montagem ou colagem.",
        "MULTIPLOS_ROSTOS"
      );
    }
  }

  const confiancaMediaFace = mediaConfiancaNaMascara(segmentacao.peleRosto, componenteFace.mascara);
  const confiancaFace = calcularConfiancaFace(
    componenteFace,
    segmentacao.largura,
    segmentacao.altura,
    confiancaMediaFace
  );
  if (confiancaFace < 0.36) {
    throw criarErro("O rosto está pequeno, inclinado ou fora do guia frontal.", "CONFIANCA_FACE_BAIXA");
  }

  const caixaFace = caixaParaPalco(componenteFace, segmentacao.largura, segmentacao.altura);
  const cap = calcularCapEliptica(
    caixaFace,
    REMOCAO_PALCO_LARGURA,
    REMOCAO_PALCO_ALTURA,
    analiseCabeca
  );
  const dadosFoto = contextoFoto.getImageData(
    0,
    0,
    REMOCAO_PALCO_LARGURA,
    REMOCAO_PALCO_ALTURA
  ).data;
  const pele = analisarAmostrasDeCor(
    coletarAmostrasPele(dadosFoto, segmentacao, componenteFace, caixaFace)
  );
  if (!pele || pele.quantidade < 48 || pele.confianca < 0.13) {
    throw criarErro("A testa não possui uma amostra de pele estável.", "AMOSTRA_PELE_INVALIDA");
  }

  const alvos = criarMascarasAlvo(segmentacao, cap, caixaFace);
  const cabelo = analisarAmostrasDeCor(coletarAmostrasCabelo(dadosFoto, alvos.cabeloCompleto));
  const totalPalco = REMOCAO_PALCO_LARGURA * REMOCAO_PALCO_ALTURA;
  const cabeloSignificativo = alvos.pixelsCabelo >=
    totalPalco * PROPORCAO_MINIMA_CABELO_SIGNIFICATIVO;
  const proporcaoInterna = cabeloSignificativo
    ? alvos.pixelsInternos / alvos.pixelsCabelo
    : 1;
  // A cap estreita define onde é seguro sintetizar pele; ela não define quanto
  // cabelo uma pessoa pode ter. Só recusamos um volume realmente extremo no
  // palco, em vez de rejeitar qualquer lateral normal fora da cap.
  const exteriorRelevante = cabeloSignificativo &&
    alvos.pixelsExternos / alvos.pixelsCabelo > PROPORCAO_EXTERNA_SEVERA &&
    alvos.pixelsExternos / totalPalco > PROPORCAO_MAXIMA_EXTERNA_NO_PALCO;
  const cobertura = !cabeloSignificativo
    ? 1
    : limitarNumero(proporcaoInterna / 0.45, 0, 1, 0);

  if (exteriorRelevante) {
    throw criarErro(
      "O volume do cabelo ultrapassa a área que esta versão consegue reconstruir com qualidade. Prenda ou afaste o cabelo e refaça uma foto frontal.",
      "VOLUME_CABELO_INCOMPATIVEL"
    );
  }
  if (cabeloSignificativo && proporcaoInterna < PROPORCAO_MINIMA_CABELO_DENTRO_DA_CAP) {
    throw criarErro("A máscara não conseguiu cobrir o cabelo com segurança.", "COBERTURA_INSUFICIENTE");
  }

  let pixelsCorrigidos = 0;
  if (cabeloSignificativo) {
    const alfas = prepararAlfas(alvos, cap);
    pixelsCorrigidos = renderizarOverlay(canvas, alfas, cap, pele, cabelo);
  } else {
    canvas.getContext("2d").clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
  }

  const qualidadeModelo = segmentacao.qualidade.filter(Number.isFinite).map((item) => limitarNumero(item, 0, 1, 0));
  const mediaQualidade = qualidadeModelo.length
    ? qualidadeModelo.reduce((total, item) => total + item, 0) / qualidadeModelo.length
    : 0.78;
  const confianca = limitarNumero(
    confiancaFace * 0.36
      + pele.confianca * 0.2
      + cobertura * 0.24
      + mediaQualidade * 0.12
      + 0.08,
    0,
    1,
    0
  );
  if (confianca < 0.4) {
    throw criarErro("A confiança do preparo local ficou baixa demais.", "CONFIANCA_BAIXA");
  }

  return {
    confianca,
    resultado: cabeloSignificativo ? "removido" : "sem-cabelo",
    metricas: {
      tempoMs: performance.now() - inicio,
      larguraMascara: segmentacao.largura,
      alturaMascara: segmentacao.altura,
      pixelsFace: componenteFace.area,
      pixelsCabelo: alvos.pixelsCabelo,
      pixelsCabeloInterno: alvos.pixelsInternos,
      pixelsCabeloExterno: alvos.pixelsExternos,
      pixelsCorrigidos,
      confiancaFace,
      confiancaPele: pele.confianca,
      uniformidadeFundo: 0,
      fundoAplicado: false,
      cabeloJaAusente: !cabeloSignificativo,
      qualidadeModelo,
      caixaFace,
      caixaCabelo: alvos.caixaCabelo,
      cap,
      analiseCabeca
    }
  };
}

/**
 * Camada automatica transparente. Um `executarToken` novo e positivo inicia
 * uma inferencia local; token zero nunca processa.
 */
export default function RemocaoCabeloAutomatica({
  selfieDataUrl,
  executarToken = 0,
  ativo = true,
  fonteMolde = null,
  ajuste = null,
  onStatusChange,
  onComposicaoChange,
  className = "",
  style
}) {
  const canvasRef = useRef(null);
  const callbackRef = useRef(onStatusChange);
  const callbackComposicaoRef = useRef(onComposicaoChange);
  const processamentoRef = useRef(null);
  const resultadoBaseRef = useRef(null);
  callbackRef.current = onStatusChange;
  callbackComposicaoRef.current = onComposicaoChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    const resultado = resultadoBaseRef.current;
    if (!canvas) return undefined;
    if (
      !ativo ||
      !ajuste ||
      !fonteMolde ||
      !resultado ||
      resultado.token !== Number(executarToken) ||
      resultado.selfieDataUrl !== selfieDataUrl
    ) {
      canvas.getContext("2d").clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
      callbackComposicaoRef.current?.(false, null);
      return undefined;
    }

    let cancelado = false;
    callbackComposicaoRef.current?.(false, null);
    comporOverlaySobCorte(
      canvas,
      resultado.canvas,
      fonteMolde,
      ajuste,
      () => !cancelado
    )
      .then((pronta) => {
        if (cancelado) return;
        callbackComposicaoRef.current?.(
          pronta,
          pronta ? null : "Não foi possível finalizar a composição deste ajuste manual."
        );
      })
      .catch(() => {
        if (cancelado) return;
        canvas.getContext("2d").clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
        callbackComposicaoRef.current?.(
          false,
          "Não foi possível finalizar a composição deste ajuste manual."
        );
      });
    return () => {
      cancelado = true;
    };
  }, [ajuste, ativo, executarToken, fonteMolde, selfieDataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const contexto = canvas.getContext("2d");

    function emitir(status, patch = {}) {
      callbackRef.current?.(criarStatusRemocaoCabeloAutomatica(status, patch));
    }

    if (!ativo) {
      contexto.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
      processamentoRef.current = null;
      resultadoBaseRef.current = null;
      callbackComposicaoRef.current?.(false, null);
      emitir("inativo");
      return undefined;
    }

    const token = Number(executarToken);
    if (!Number.isFinite(token) || token <= 0) {
      contexto.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
      processamentoRef.current = null;
      resultadoBaseRef.current = null;
      callbackComposicaoRef.current?.(false, null);
      emitir("ocioso");
      return undefined;
    }

    if (!selfieDataUrl) {
      callbackComposicaoRef.current?.(false, null);
      emitir("erro", { erro: "Selecione uma selfie antes de executar o preparo local." });
      return undefined;
    }

    let cancelado = false;
    let trabalho = processamentoRef.current;
    if (trabalho?.token !== token || trabalho?.selfieDataUrl !== selfieDataUrl) {
      contexto.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
      trabalho = {
        token,
        selfieDataUrl,
        canvas: criarCanvas(),
        status: "carregando",
        assinantes: new Set(),
        promessa: null
      };
      trabalho.promessa = processarSelfie(trabalho.canvas, selfieDataUrl, (status) => {
        trabalho.status = status;
        trabalho.assinantes.forEach((assinante) => assinante(status));
      });
      processamentoRef.current = trabalho;
    }

    const receberEtapa = (status) => {
      if (!cancelado) emitir(status);
    };
    trabalho.assinantes.add(receberEtapa);
    receberEtapa(trabalho.status);

    trabalho.promessa
      .then((processado) => {
        if (cancelado) return;
        resultadoBaseRef.current = {
          token,
          selfieDataUrl,
          canvas: trabalho.canvas
        };
        contexto.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
        callbackComposicaoRef.current?.(false, null);
        emitir("pronto", processado);
      })
      .catch((erro) => {
        if (cancelado) return;
        resultadoBaseRef.current = null;
        callbackComposicaoRef.current?.(false, null);
        contexto.clearRect(0, 0, REMOCAO_PALCO_LARGURA, REMOCAO_PALCO_ALTURA);
        emitir("erro", {
          erro: erro?.message || "Não foi possível preparar a selfie localmente."
        });
      });

    return () => {
      cancelado = true;
      trabalho.assinantes.delete(receberEtapa);
    };
  }, [ativo, executarToken, selfieDataUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={REMOCAO_PALCO_LARGURA}
      height={REMOCAO_PALCO_ALTURA}
      aria-hidden="true"
      data-remocao-cabelo-automatica="resultado"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        aspectRatio: "4 / 5",
        pointerEvents: "none",
        ...style
      }}
    />
  );
}
