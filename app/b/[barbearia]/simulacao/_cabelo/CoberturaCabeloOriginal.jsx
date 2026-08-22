"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  NEUTRALIZACAO_MAX_OPERACOES,
  NEUTRALIZACAO_MAX_PONTOS,
  NEUTRALIZACAO_OPACIDADE_MAX,
  NEUTRALIZACAO_OPACIDADE_MIN,
  NEUTRALIZACAO_RAIO_MAX,
  NEUTRALIZACAO_RAIO_MIN,
  NEUTRALIZACAO_SUAVIDADE_MAX,
  NEUTRALIZACAO_SUAVIDADE_MIN
} from "./neutralizacaoCabeloLocal";

const LARGURA_PALCO = 640;
const ALTURA_PALCO = 800;
const MODOS_VALIDOS = new Set(["selecionar-fonte", "pintar", "inativo"]);

export const AJUSTE_COBERTURA_PADRAO = Object.freeze({
  ativo: true,
  modo: "selecionar-fonte",
  raio: 4.5,
  opacidade: 96,
  suavizacao: 72,
  alinhado: false,
  mostrarGuias: true
});

function limitar(valor, minimo, maximo, fallback) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return fallback;
  return Math.min(maximo, Math.max(minimo, numero));
}

function limitar01(valor, fallback = 0) {
  return limitar(valor, 0, 1, fallback);
}

/**
 * Junta a configuracao geral com o ajuste da selfie. O ajuste tem precedencia.
 * `raio`, `opacidade` e `suavizacao` sao percentuais apresentados para a UI.
 */
export function normalizarAjusteCobertura(config = {}, ajuste = {}) {
  const origem = { ...AJUSTE_COBERTURA_PADRAO, ...config, ...ajuste };
  const modo = MODOS_VALIDOS.has(origem.modo) ? origem.modo : AJUSTE_COBERTURA_PADRAO.modo;

  return {
    ativo: origem.ativo !== false,
    modo: origem.ativo === false ? "inativo" : modo,
    raio: limitar(
      origem.raio,
      NEUTRALIZACAO_RAIO_MIN * 100,
      NEUTRALIZACAO_RAIO_MAX * 100,
      AJUSTE_COBERTURA_PADRAO.raio
    ),
    opacidade: limitar(
      origem.opacidade,
      NEUTRALIZACAO_OPACIDADE_MIN * 100,
      NEUTRALIZACAO_OPACIDADE_MAX * 100,
      AJUSTE_COBERTURA_PADRAO.opacidade
    ),
    suavizacao: limitar(
      origem.suavizacao,
      NEUTRALIZACAO_SUAVIDADE_MIN * 100,
      NEUTRALIZACAO_SUAVIDADE_MAX * 100,
      AJUSTE_COBERTURA_PADRAO.suavizacao
    ),
    alinhado: origem.alinhado === true,
    mostrarGuias: origem.mostrarGuias !== false
  };
}

function pontoNormalizado(ponto) {
  if (!ponto || typeof ponto !== "object") return null;
  const x = Number(ponto.x);
  const y = Number(ponto.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: limitar01(x), y: limitar01(y) };
}

function criarCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = LARGURA_PALCO;
  canvas.height = ALTURA_PALCO;
  return canvas;
}

function carregarImagem(fonte) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.decoding = "async";

    // O asset empacotado da demonstracao tambem funciona. Uma URL externa sem
    // CORS falha ao ser lida e nunca envia a selfie para outro servico.
    if (!String(fonte).startsWith("data:")) imagem.crossOrigin = "anonymous";

    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Nao foi possivel carregar a selfie."));
    imagem.src = fonte;
  });
}

function desenharImagemCover(contexto, imagem) {
  const escala = Math.max(LARGURA_PALCO / imagem.naturalWidth, ALTURA_PALCO / imagem.naturalHeight);
  const largura = imagem.naturalWidth * escala;
  const altura = imagem.naturalHeight * escala;
  const x = (LARGURA_PALCO - largura) / 2;
  const y = (ALTURA_PALCO - altura) / 2;

  contexto.clearRect(0, 0, LARGURA_PALCO, ALTURA_PALCO);
  contexto.drawImage(imagem, x, y, largura, altura);
}

function normalizarOperacao(operacao, indice) {
  if (!operacao || typeof operacao !== "object") return null;
  const fonte = pontoNormalizado(operacao.fonte);
  const pontos = Array.isArray(operacao.pontos)
    ? operacao.pontos.slice(0, NEUTRALIZACAO_MAX_PONTOS).map(pontoNormalizado).filter(Boolean)
    : [];
  if (!fonte || pontos.length === 0) return null;

  return {
    id: String(operacao.id || `cobertura-${indice}`),
    fonte,
    inicioDestino: pontoNormalizado(operacao.inicioDestino) || pontos[0],
    pontos,
    raio: limitar(operacao.raio, NEUTRALIZACAO_RAIO_MIN, NEUTRALIZACAO_RAIO_MAX, 0.045),
    opacidade: limitar(
      operacao.opacidade,
      NEUTRALIZACAO_OPACIDADE_MIN,
      NEUTRALIZACAO_OPACIDADE_MAX,
      0.96
    ),
    suavizacao: limitar(
      operacao.suavizacao,
      NEUTRALIZACAO_SUAVIDADE_MIN,
      NEUTRALIZACAO_SUAVIDADE_MAX,
      0.72
    ),
    alinhado: operacao.alinhado === true
  };
}

function criarCarimbo(raio, suavizacao) {
  const margem = 2;
  const diametro = Math.ceil(raio * 2 + margem * 2);
  const canvas = document.createElement("canvas");
  canvas.width = diametro;
  canvas.height = diametro;
  const contexto = canvas.getContext("2d");
  const centro = diametro / 2;
  const gradiente = contexto.createRadialGradient(centro, centro, 0, centro, centro, raio);
  const miolo = limitar(1 - suavizacao, 0.05, 0.9, 0.28);
  gradiente.addColorStop(0, "rgba(255,255,255,1)");
  gradiente.addColorStop(miolo, "rgba(255,255,255,1)");
  gradiente.addColorStop(1, "rgba(255,255,255,0)");

  return { canvas, contexto, centro, raio, mascara: gradiente };
}

function aplicarCarimbo(contextoSaida, foto, carimbo, origemX, origemY, destinoX, destinoY, opacidade) {
  const { canvas, contexto, centro, raio, mascara } = carimbo;
  const origemSeguraX = limitar(origemX, raio, LARGURA_PALCO - raio, LARGURA_PALCO / 2);
  const origemSeguraY = limitar(origemY, raio, ALTURA_PALCO - raio, ALTURA_PALCO / 2);

  contexto.clearRect(0, 0, canvas.width, canvas.height);
  contexto.globalCompositeOperation = "source-over";
  contexto.globalAlpha = 1;
  contexto.drawImage(
    foto,
    origemSeguraX - raio,
    origemSeguraY - raio,
    raio * 2,
    raio * 2,
    centro - raio,
    centro - raio,
    raio * 2,
    raio * 2
  );
  contexto.globalCompositeOperation = "destination-in";
  contexto.fillStyle = mascara;
  contexto.fillRect(0, 0, canvas.width, canvas.height);

  contextoSaida.save();
  contextoSaida.globalAlpha = opacidade;
  contextoSaida.drawImage(canvas, destinoX - centro, destinoY - centro);
  contextoSaida.restore();
}

function interpolarTrecho(inicio, fim, espacamento) {
  const dx = fim.x - inicio.x;
  const dy = fim.y - inicio.y;
  const distancia = Math.hypot(dx, dy);
  const passos = Math.max(1, Math.ceil(distancia / espacamento));
  const pontos = [];

  for (let passo = 1; passo <= passos; passo += 1) {
    const progresso = passo / passos;
    pontos.push({ x: inicio.x + dx * progresso, y: inicio.y + dy * progresso });
  }

  return pontos;
}

function desenharOperacao(contexto, foto, entrada, indice) {
  const operacao = normalizarOperacao(entrada, indice);
  if (!operacao) return;

  const raio = operacao.raio * LARGURA_PALCO;
  const espacamento = Math.max(1, raio * 0.22);
  const carimbo = criarCarimbo(raio, operacao.suavizacao);
  const fonteX = operacao.fonte.x * LARGURA_PALCO;
  const fonteY = operacao.fonte.y * ALTURA_PALCO;
  const inicioX = operacao.inicioDestino.x * LARGURA_PALCO;
  const inicioY = operacao.inicioDestino.y * ALTURA_PALCO;
  let anterior = {
    x: operacao.pontos[0].x * LARGURA_PALCO,
    y: operacao.pontos[0].y * ALTURA_PALCO
  };

  function carimbar(ponto) {
    const origemX = operacao.alinhado ? fonteX + ponto.x - inicioX : fonteX;
    const origemY = operacao.alinhado ? fonteY + ponto.y - inicioY : fonteY;
    aplicarCarimbo(contexto, foto, carimbo, origemX, origemY, ponto.x, ponto.y, operacao.opacidade);
  }

  carimbar(anterior);
  for (let pontoIndice = 1; pontoIndice < operacao.pontos.length; pontoIndice += 1) {
    const atual = {
      x: operacao.pontos[pontoIndice].x * LARGURA_PALCO,
      y: operacao.pontos[pontoIndice].y * ALTURA_PALCO
    };
    interpolarTrecho(anterior, atual, espacamento).forEach(carimbar);
    anterior = atual;
  }
}

function criarPincelAoVivo(entrada) {
  const operacao = normalizarOperacao(entrada, 0);
  if (!operacao) return null;

  const raio = operacao.raio * LARGURA_PALCO;
  return {
    carimbo: criarCarimbo(raio, operacao.suavizacao),
    espacamento: Math.max(1, raio * 0.22),
    fonteX: operacao.fonte.x * LARGURA_PALCO,
    fonteY: operacao.fonte.y * ALTURA_PALCO,
    inicioX: operacao.inicioDestino.x * LARGURA_PALCO,
    inicioY: operacao.inicioDestino.y * ALTURA_PALCO,
    opacidade: operacao.opacidade,
    alinhado: operacao.alinhado
  };
}

function desenharTrechoAoVivo(contexto, foto, pincel, inicioNormalizado, fimNormalizado) {
  if (!contexto || !foto || !pincel) return;
  const inicio = {
    x: inicioNormalizado.x * LARGURA_PALCO,
    y: inicioNormalizado.y * ALTURA_PALCO
  };
  const fim = {
    x: fimNormalizado.x * LARGURA_PALCO,
    y: fimNormalizado.y * ALTURA_PALCO
  };

  interpolarTrecho(inicio, fim, pincel.espacamento).forEach((ponto) => {
    const origemX = pincel.alinhado ? pincel.fonteX + ponto.x - pincel.inicioX : pincel.fonteX;
    const origemY = pincel.alinhado ? pincel.fonteY + ponto.y - pincel.inicioY : pincel.fonteY;
    aplicarCarimbo(
      contexto,
      foto,
      pincel.carimbo,
      origemX,
      origemY,
      ponto.x,
      ponto.y,
      pincel.opacidade
    );
  });
}

function desenharCobertura(canvas, foto, operacoes) {
  const contexto = canvas.getContext("2d");
  contexto.clearRect(0, 0, LARGURA_PALCO, ALTURA_PALCO);
  let pontosRestantes = NEUTRALIZACAO_MAX_PONTOS;

  for (const [indice, operacao] of operacoes.slice(0, NEUTRALIZACAO_MAX_OPERACOES).entries()) {
    if (pontosRestantes <= 0) break;
    const pontos = Array.isArray(operacao?.pontos)
      ? operacao.pontos.slice(0, pontosRestantes)
      : [];
    desenharOperacao(contexto, foto, { ...operacao, pontos }, indice);
    pontosRestantes -= pontos.length;
  }
}

function pontoDoEvento(evento) {
  const limites = evento.currentTarget.getBoundingClientRect();
  return {
    x: limitar01((evento.clientX - limites.left) / limites.width),
    y: limitar01((evento.clientY - limites.top) / limites.height)
  };
}

function idDaOperacao(contadorRef) {
  contadorRef.current += 1;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cobertura-${Date.now()}-${contadorRef.current}`;
}

/**
 * Neutralizador local por carimbo. Deve ficar sobre a selfie e abaixo do novo
 * cabelo. `fonte` e `operacoes` sao controlados pelo componente pai.
 */
export default function CoberturaCabeloOriginal({
  selfieDataUrl,
  fonte,
  operacoes = [],
  onFonteChange,
  onOperacoesChange,
  config,
  ajuste,
  onStatusChange,
  className = "",
  style
}) {
  const saidaRef = useRef(null);
  const interacaoRef = useRef(null);
  const fotoRef = useRef(null);
  const arrasteRef = useRef(null);
  const selecaoFonteRef = useRef(null);
  const operacoesRef = useRef(operacoes);
  const contadorRef = useRef(0);
  const [fotoVersao, setFotoVersao] = useState(0);
  const [cursor, setCursor] = useState(null);
  const parametros = useMemo(
    () => normalizarAjusteCobertura(config, ajuste),
    [ajuste, config]
  );
  const fonteSegura = pontoNormalizado(fonte);

  operacoesRef.current = Array.isArray(operacoes) ? operacoes : [];

  useEffect(() => {
    const canvas = saidaRef.current;
    const contexto = canvas?.getContext("2d");
    if (!canvas || !contexto) return undefined;

    contexto.clearRect(0, 0, LARGURA_PALCO, ALTURA_PALCO);
    fotoRef.current = null;

    if (!parametros.ativo || !selfieDataUrl) {
      onStatusChange?.(parametros.ativo ? "sem-selfie" : "inativo");
      return undefined;
    }

    let cancelado = false;
    onStatusChange?.("carregando");

    carregarImagem(selfieDataUrl)
      .then((imagem) => {
        if (cancelado) return;
        const foto = criarCanvas();
        desenharImagemCover(foto.getContext("2d"), imagem);

        // Forca uma leitura agora: se a origem externa nao permitir CORS, a
        // camada falha fechada e permanece transparente.
        foto.getContext("2d").getImageData(0, 0, 1, 1);
        fotoRef.current = foto;
        setFotoVersao((versao) => versao + 1);
        onStatusChange?.("pronto");
      })
      .catch(() => {
        if (cancelado) return;
        contexto.clearRect(0, 0, LARGURA_PALCO, ALTURA_PALCO);
        onStatusChange?.("erro");
      });

    return () => {
      cancelado = true;
    };
  }, [parametros.ativo, selfieDataUrl, onStatusChange]);

  useEffect(() => {
    if (!saidaRef.current || !fotoRef.current) return;
    desenharCobertura(saidaRef.current, fotoRef.current, operacoesRef.current);
  }, [fotoVersao, operacoes]);

  useEffect(() => {
    const canvas = interacaoRef.current;
    if (!canvas) return;
    const contexto = canvas.getContext("2d");
    contexto.clearRect(0, 0, LARGURA_PALCO, ALTURA_PALCO);
    if (!parametros.mostrarGuias || parametros.modo === "inativo") return;

    if (fonteSegura) {
      const x = fonteSegura.x * LARGURA_PALCO;
      const y = fonteSegura.y * ALTURA_PALCO;
      const raio = (parametros.raio / 100) * LARGURA_PALCO;
      contexto.save();
      contexto.strokeStyle = "rgba(213, 164, 57, 0.95)";
      contexto.lineWidth = 2;
      contexto.setLineDash([7, 5]);
      contexto.beginPath();
      contexto.arc(x, y, raio, 0, Math.PI * 2);
      contexto.stroke();
      contexto.restore();
    }

    if (cursor) {
      contexto.save();
      contexto.strokeStyle = "rgba(255, 255, 255, 0.9)";
      contexto.lineWidth = 2;
      contexto.beginPath();
      contexto.arc(
        cursor.x * LARGURA_PALCO,
        cursor.y * ALTURA_PALCO,
        (parametros.raio / 100) * LARGURA_PALCO,
        0,
        Math.PI * 2
      );
      contexto.stroke();
      contexto.restore();
    }
  }, [cursor, fonteSegura?.x, fonteSegura?.y, parametros.modo, parametros.mostrarGuias, parametros.raio]);

  function publicarOperacao(operacao) {
    const totalPontos = operacoesRef.current.reduce(
      (total, item) => total + (Array.isArray(item?.pontos) ? item.pontos.length : 0),
      0
    );
    const pontosDisponiveis = NEUTRALIZACAO_MAX_PONTOS - totalPontos;
    if (
      operacoesRef.current.length >= NEUTRALIZACAO_MAX_OPERACOES ||
      pontosDisponiveis <= 0
    ) {
      onStatusChange?.("limite");
      return;
    }

    const operacaoLimitada = {
      ...operacao,
      pontos: operacao.pontos.slice(0, pontosDisponiveis)
    };
    const proximas = [...operacoesRef.current, operacaoLimitada];
    if (saidaRef.current && fotoRef.current) desenharCobertura(saidaRef.current, fotoRef.current, proximas);
    onOperacoesChange?.(proximas);
    if (operacao.pontos.length > operacaoLimitada.pontos.length) onStatusChange?.("limite");
  }

  function iniciar(evento) {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    if (arrasteRef.current) return;
    const ponto = pontoDoEvento(evento);
    setCursor(ponto);

    if (parametros.modo === "selecionar-fonte") {
      if (evento.pointerType === "touch") {
        selecaoFonteRef.current = {
          pointerId: evento.pointerId,
          ponto,
          movido: false
        };
      } else {
        evento.preventDefault();
        onFonteChange?.(ponto);
      }
      return;
    }

    if (parametros.modo !== "pintar" || !fonteSegura || !fotoRef.current) return;
    const totalPontos = operacoesRef.current.reduce(
      (total, operacao) => total + (Array.isArray(operacao?.pontos) ? operacao.pontos.length : 0),
      0
    );
    if (
      operacoesRef.current.length >= NEUTRALIZACAO_MAX_OPERACOES ||
      totalPontos >= NEUTRALIZACAO_MAX_PONTOS
    ) {
      onStatusChange?.("limite");
      return;
    }

    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const operacao = {
      id: idDaOperacao(contadorRef),
      fonte: fonteSegura,
      inicioDestino: ponto,
      pontos: [ponto],
      raio: parametros.raio / 100,
      opacidade: parametros.opacidade / 100,
      suavizacao: parametros.suavizacao / 100,
      alinhado: parametros.alinhado
    };
    arrasteRef.current = {
      pointerId: evento.pointerId,
      operacao,
      pincel: criarPincelAoVivo(operacao)
    };
    if (saidaRef.current && fotoRef.current) {
      desenharTrechoAoVivo(
        saidaRef.current.getContext("2d"),
        fotoRef.current,
        arrasteRef.current.pincel,
        ponto,
        ponto
      );
    }
  }

  function mover(evento) {
    const ponto = pontoDoEvento(evento);
    setCursor(ponto);
    const selecao = selecaoFonteRef.current;
    if (selecao?.pointerId === evento.pointerId) {
      if (Math.hypot(ponto.x - selecao.ponto.x, ponto.y - selecao.ponto.y) > 0.015) {
        selecao.movido = true;
      }
      return;
    }
    const arraste = arrasteRef.current;
    if (!arraste || arraste.pointerId !== evento.pointerId) return;

    const pontos = arraste.operacao.pontos;
    const pontosConfirmados = operacoesRef.current.reduce(
      (total, operacao) => total + (Array.isArray(operacao?.pontos) ? operacao.pontos.length : 0),
      0
    );
    if (pontosConfirmados + pontos.length >= NEUTRALIZACAO_MAX_PONTOS) {
      onStatusChange?.("limite");
      return;
    }
    const anterior = pontos[pontos.length - 1];
    const distancia = Math.hypot(ponto.x - anterior.x, ponto.y - anterior.y);
    if (distancia < (parametros.raio / 100) * 0.12) return;

    arraste.operacao = { ...arraste.operacao, pontos: [...pontos, ponto] };
    if (saidaRef.current && fotoRef.current) {
      desenharTrechoAoVivo(
        saidaRef.current.getContext("2d"),
        fotoRef.current,
        arraste.pincel,
        anterior,
        ponto
      );
    }
  }

  function encerrar(evento) {
    const selecao = selecaoFonteRef.current;
    if (selecao?.pointerId === evento.pointerId) {
      selecaoFonteRef.current = null;
      if (!selecao.movido) onFonteChange?.(pontoDoEvento(evento));
      return;
    }
    const arraste = arrasteRef.current;
    if (!arraste || arraste.pointerId !== evento.pointerId) return;
    arrasteRef.current = null;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    publicarOperacao(arraste.operacao);
  }

  function cancelar(evento) {
    if (selecaoFonteRef.current?.pointerId === evento.pointerId) {
      selecaoFonteRef.current = null;
      return;
    }
    const arraste = arrasteRef.current;
    if (!arraste || arraste.pointerId !== evento.pointerId) return;
    arrasteRef.current = null;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    if (saidaRef.current && fotoRef.current) {
      desenharCobertura(saidaRef.current, fotoRef.current, operacoesRef.current);
    }
  }

  function usarTeclado(evento) {
    if (parametros.modo === "inativo") return;
    const atual = cursor || fonteSegura || { x: 0.5, y: 0.22 };
    const passo = evento.shiftKey ? 0.03 : 0.01;
    const movimentos = {
      ArrowLeft: { x: -passo, y: 0 },
      ArrowRight: { x: passo, y: 0 },
      ArrowUp: { x: 0, y: -passo },
      ArrowDown: { x: 0, y: passo }
    };
    const movimento = movimentos[evento.key];
    if (movimento) {
      evento.preventDefault();
      setCursor({
        x: limitar01(atual.x + movimento.x),
        y: limitar01(atual.y + movimento.y)
      });
      return;
    }

    if (evento.key !== "Enter" && evento.key !== " ") return;
    evento.preventDefault();
    if (parametros.modo === "selecionar-fonte") {
      onFonteChange?.(atual);
      return;
    }
    if (parametros.modo !== "pintar" || !fonteSegura || !fotoRef.current) return;

    publicarOperacao({
      id: idDaOperacao(contadorRef),
      fonte: fonteSegura,
      inicioDestino: atual,
      pontos: [atual],
      raio: parametros.raio / 100,
      opacidade: parametros.opacidade / 100,
      suavizacao: parametros.suavizacao / 100,
      alinhado: parametros.alinhado
    });
  }

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        aspectRatio: "4 / 5",
        ...style
      }}
    >
      <canvas
        ref={saidaRef}
        width={LARGURA_PALCO}
        height={ALTURA_PALCO}
        aria-hidden="true"
        data-cobertura-cabelo="resultado"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />
      <canvas
        ref={interacaoRef}
        width={LARGURA_PALCO}
        height={ALTURA_PALCO}
        role="application"
        tabIndex={parametros.modo === "inativo" ? -1 : 0}
        aria-label={
          parametros.modo === "selecionar-fonte"
            ? "Selecione uma área limpa da testa ou do fundo. Use as setas para mover o cursor e Enter para escolher."
            : "Pinte sobre o cabelo original. Use as setas para mover o cursor e Enter para aplicar o pincel."
        }
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={encerrar}
        onPointerCancel={cancelar}
        onLostPointerCapture={cancelar}
        onKeyDown={usarTeclado}
        onFocus={() => setCursor((atual) => atual || fonteSegura || { x: 0.5, y: 0.22 })}
        onPointerLeave={() => setCursor(null)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          touchAction: parametros.modo === "pintar" ? "none" : "pan-y",
          cursor: parametros.modo === "selecionar-fonte" ? "crosshair" : "none",
          pointerEvents: parametros.modo === "inativo" ? "none" : "auto"
        }}
      />
    </div>
  );
}
