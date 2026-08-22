"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Eraser,
  LoaderCircle,
  MousePointer2,
  Paintbrush,
  RotateCcw,
  Scissors,
  Undo2,
  X
} from "lucide-react";

const MAX_EDITOR_DIMENSION = 1200;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_BRUSH_HISTORY = 6;
const MIN_POLYGON_POINTS = 3;

function criarCanvas(largura, altura) {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  return canvas;
}

function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function desenharPoligono(contexto, pontos) {
  if (pontos.length === 0) return;
  contexto.beginPath();
  contexto.moveTo(pontos[0].x, pontos[0].y);
  pontos.slice(1).forEach((ponto) => contexto.lineTo(ponto.x, ponto.y));
  contexto.closePath();
}

function tamanhoDataUrl(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

function formatarBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function BotaoFerramenta({ ativo = false, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-40 ${
        ativo
          ? "border-brass bg-brass/15 text-brass"
          : "border-steel/30 bg-ink/60 text-parchment hover:border-brass/70 hover:text-brass"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function RecorteCabeloEditor({ src, nome = "molde", onAplicar, onCancelar }) {
  const canvasRef = useRef(null);
  const canvasFonteRef = useRef(null);
  const canvasMascaraRef = useRef(null);
  const canvasMascaraBaseRef = useRef(null);
  const historicoPincelRef = useRef([]);
  const desenhandoRef = useRef(false);
  const ultimoPontoPincelRef = useRef(null);
  const dialogoRef = useRef(null);

  const [tamanho, setTamanho] = useState({ largura: 1, altura: 1 });
  const [dimensoesOriginais, setDimensoesOriginais] = useState({ largura: 0, altura: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pontos, setPontos] = useState([]);
  const [etapa, setEtapa] = useState("poligono");
  const [feather, setFeather] = useState(8);
  const [ferramenta, setFerramenta] = useState("apagar");
  const [tamanhoPincel, setTamanhoPincel] = useState(42);
  const [formato, setFormato] = useState("image/webp");
  const [versaoMascara, setVersaoMascara] = useState(0);
  const [posicaoPonteiro, setPosicaoPonteiro] = useState(null);
  const [cursorTeclado, setCursorTeclado] = useState({ x: 1, y: 1, visivel: false });
  const [processando, setProcessando] = useState(false);
  const [anuncio, setAnuncio] = useState("Editor de recorte aberto.");

  const redesenhar = useCallback(() => {
    const canvas = canvasRef.current;
    const fonte = canvasFonteRef.current;
    if (!canvas || !fonte || carregando || tamanho.largura <= 1) return;

    const contexto = canvas.getContext("2d");
    contexto.clearRect(0, 0, canvas.width, canvas.height);

    if (etapa === "retoque" && canvasMascaraRef.current) {
      const previa = criarCanvas(canvas.width, canvas.height);
      const contextoPrevia = previa.getContext("2d");
      contextoPrevia.drawImage(fonte, 0, 0);
      contextoPrevia.globalCompositeOperation = "destination-in";
      contextoPrevia.drawImage(canvasMascaraRef.current, 0, 0);
      contexto.drawImage(previa, 0, 0);

      if (posicaoPonteiro) {
        contexto.save();
        contexto.beginPath();
        contexto.arc(posicaoPonteiro.x, posicaoPonteiro.y, tamanhoPincel / 2, 0, Math.PI * 2);
        contexto.strokeStyle = ferramenta === "apagar" ? "#ef4444" : "#d5b45b";
        contexto.lineWidth = Math.max(2, canvas.width / 600);
        contexto.setLineDash([Math.max(5, canvas.width / 180), Math.max(4, canvas.width / 220)]);
        contexto.stroke();
        contexto.restore();
      }
      return;
    }

    contexto.drawImage(fonte, 0, 0);

    if (pontos.length > 0) {
      contexto.save();
      desenharPoligono(contexto, pontos);
      contexto.fillStyle = "rgba(213, 180, 91, 0.2)";
      contexto.fill();
      contexto.strokeStyle = "#d5b45b";
      contexto.lineWidth = Math.max(2, canvas.width / 500);
      contexto.setLineDash([Math.max(7, canvas.width / 140), Math.max(5, canvas.width / 190)]);
      contexto.stroke();
      contexto.setLineDash([]);

      pontos.forEach((ponto, indice) => {
        contexto.beginPath();
        contexto.arc(ponto.x, ponto.y, indice === 0 ? 8 : 6, 0, Math.PI * 2);
        contexto.fillStyle = indice === 0 ? "#d5b45b" : "#f7f1e3";
        contexto.fill();
        contexto.strokeStyle = "#17181b";
        contexto.lineWidth = 2;
        contexto.stroke();
      });
      contexto.restore();
    }

    if (cursorTeclado.visivel) {
      contexto.save();
      contexto.strokeStyle = "#ffffff";
      contexto.lineWidth = Math.max(2, canvas.width / 600);
      contexto.beginPath();
      contexto.moveTo(cursorTeclado.x - 12, cursorTeclado.y);
      contexto.lineTo(cursorTeclado.x + 12, cursorTeclado.y);
      contexto.moveTo(cursorTeclado.x, cursorTeclado.y - 12);
      contexto.lineTo(cursorTeclado.x, cursorTeclado.y + 12);
      contexto.stroke();
      contexto.restore();
    }
  }, [carregando, cursorTeclado, etapa, ferramenta, pontos, posicaoPonteiro, tamanho, tamanhoPincel]);

  useEffect(() => {
    redesenhar();
  }, [redesenhar, versaoMascara]);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogoRef.current?.focus();

    function fecharComEscape(evento) {
      if (evento.key === "Escape" && !processando) onCancelar();
    }

    window.addEventListener("keydown", fecharComEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEscape);
    };
  }, [onCancelar, processando]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro("");

    const imagem = new Image();
    imagem.onload = () => {
      if (cancelado) return;
      const escala = Math.min(1, MAX_EDITOR_DIMENSION / Math.max(imagem.naturalWidth, imagem.naturalHeight));
      const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
      const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
      const fonte = criarCanvas(largura, altura);
      fonte.getContext("2d").drawImage(imagem, 0, 0, largura, altura);

      canvasFonteRef.current = fonte;
      canvasMascaraRef.current = criarCanvas(largura, altura);
      canvasMascaraBaseRef.current = criarCanvas(largura, altura);
      historicoPincelRef.current = [];
      setDimensoesOriginais({ largura: imagem.naturalWidth, altura: imagem.naturalHeight });
      setTamanho({ largura, altura });
      setCursorTeclado({ x: largura / 2, y: altura / 3, visivel: false });
      setCarregando(false);
      setAnuncio(`Imagem carregada com ${imagem.naturalWidth} por ${imagem.naturalHeight} pixels.`);
    };
    imagem.onerror = () => {
      if (cancelado) return;
      setErro("Não foi possível abrir esta imagem no editor. Selecione outro arquivo.");
      setCarregando(false);
    };
    imagem.src = src;

    return () => {
      cancelado = true;
      imagem.onload = null;
      imagem.onerror = null;
    };
  }, [src]);

  function coordenadaDoEvento(evento) {
    const canvas = canvasRef.current;
    const retangulo = canvas.getBoundingClientRect();
    return {
      x: limitar(((evento.clientX - retangulo.left) / retangulo.width) * canvas.width, 0, canvas.width),
      y: limitar(((evento.clientY - retangulo.top) / retangulo.height) * canvas.height, 0, canvas.height)
    };
  }

  function pontoPertoDoPrimeiro(ponto) {
    if (pontos.length < MIN_POLYGON_POINTS) return false;
    const primeiro = pontos[0];
    const distancia = Math.hypot(ponto.x - primeiro.x, ponto.y - primeiro.y);
    return distancia <= Math.max(18, tamanho.largura * 0.025);
  }

  function construirMascara() {
    if (pontos.length < MIN_POLYGON_POINTS) {
      setErro("Marque pelo menos três pontos ao redor do cabelo.");
      return false;
    }

    const mascaraCrua = criarCanvas(tamanho.largura, tamanho.altura);
    const contextoCru = mascaraCrua.getContext("2d");
    desenharPoligono(contextoCru, pontos);
    contextoCru.fillStyle = "#ffffff";
    contextoCru.fill();

    const mascara = canvasMascaraRef.current;
    const mascaraBase = canvasMascaraBaseRef.current;
    const contextoMascara = mascara.getContext("2d");
    contextoMascara.clearRect(0, 0, mascara.width, mascara.height);
    contextoMascara.save();
    if (feather > 0) contextoMascara.filter = `blur(${feather}px)`;
    contextoMascara.drawImage(mascaraCrua, 0, 0);
    contextoMascara.restore();

    const contextoBase = mascaraBase.getContext("2d");
    contextoBase.clearRect(0, 0, mascaraBase.width, mascaraBase.height);
    contextoBase.drawImage(mascara, 0, 0);
    historicoPincelRef.current = [];
    setEtapa("retoque");
    setErro("");
    setVersaoMascara((versao) => versao + 1);
    setAnuncio("Contorno concluído. Use o pincel para apagar ou restaurar detalhes.");
    return true;
  }

  function iniciarPonteiro(evento) {
    if (carregando || processando) return;
    evento.preventDefault();
    const ponto = coordenadaDoEvento(evento);
    setPosicaoPonteiro(ponto);

    if (etapa === "poligono") {
      if (pontoPertoDoPrimeiro(ponto)) {
        construirMascara();
        return;
      }
      setPontos((atuais) => [...atuais, ponto]);
      setCursorTeclado({ ...ponto, visivel: false });
      setErro("");
      setAnuncio(`Ponto ${pontos.length + 1} adicionado ao contorno.`);
      return;
    }

    const mascara = canvasMascaraRef.current;
    const contexto = mascara?.getContext("2d", { willReadFrequently: true });
    if (!mascara || !contexto) return;
    try {
      const estado = contexto.getImageData(0, 0, mascara.width, mascara.height);
      historicoPincelRef.current = [...historicoPincelRef.current.slice(-(MAX_BRUSH_HISTORY - 1)), estado];
    } catch {
      historicoPincelRef.current = [];
    }

    desenhandoRef.current = true;
    ultimoPontoPincelRef.current = ponto;
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    aplicarPincel(ponto, ponto);
  }

  function aplicarPincel(inicio, fim) {
    const mascara = canvasMascaraRef.current;
    const contexto = mascara?.getContext("2d");
    if (!contexto) return;

    contexto.save();
    contexto.globalCompositeOperation = ferramenta === "apagar" ? "destination-out" : "source-over";
    contexto.strokeStyle = "rgba(255, 255, 255, 1)";
    contexto.fillStyle = "rgba(255, 255, 255, 1)";
    contexto.lineCap = "round";
    contexto.lineJoin = "round";
    contexto.lineWidth = tamanhoPincel;
    contexto.beginPath();
    contexto.moveTo(inicio.x, inicio.y);
    contexto.lineTo(fim.x, fim.y);
    contexto.stroke();
    contexto.beginPath();
    contexto.arc(fim.x, fim.y, tamanhoPincel / 2, 0, Math.PI * 2);
    contexto.fill();
    contexto.restore();
    setVersaoMascara((versao) => versao + 1);
  }

  function moverPonteiro(evento) {
    if (carregando) return;
    const ponto = coordenadaDoEvento(evento);
    setPosicaoPonteiro(ponto);
    if (etapa !== "retoque" || !desenhandoRef.current) return;
    evento.preventDefault();
    aplicarPincel(ultimoPontoPincelRef.current || ponto, ponto);
    ultimoPontoPincelRef.current = ponto;
  }

  function finalizarPonteiro(evento) {
    if (!desenhandoRef.current) return;
    desenhandoRef.current = false;
    ultimoPontoPincelRef.current = null;
    evento.currentTarget.releasePointerCapture?.(evento.pointerId);
    setAnuncio(ferramenta === "apagar" ? "Área apagada." : "Área restaurada.");
  }

  function desfazer() {
    if (etapa === "poligono") {
      setPontos((atuais) => atuais.slice(0, -1));
      setErro("");
      setAnuncio("Último ponto removido.");
      return;
    }

    const estado = historicoPincelRef.current.pop();
    if (!estado) return;
    canvasMascaraRef.current.getContext("2d").putImageData(estado, 0, 0);
    setVersaoMascara((versao) => versao + 1);
    setAnuncio("Último retoque desfeito.");
  }

  function recomeçar() {
    setPontos([]);
    setEtapa("poligono");
    setErro("");
    setPosicaoPonteiro(null);
    historicoPincelRef.current = [];
    canvasMascaraRef.current?.getContext("2d").clearRect(0, 0, tamanho.largura, tamanho.altura);
    setVersaoMascara((versao) => versao + 1);
    setAnuncio("Seleção reiniciada.");
  }

  function voltarAoContorno() {
    setEtapa("poligono");
    setPosicaoPonteiro(null);
    historicoPincelRef.current = [];
    setAnuncio("Contorno reaberto para ajustes.");
  }

  function lidarComTeclado(evento) {
    if (processando) return;

    if (etapa === "poligono") {
      const passo = evento.shiftKey ? 12 : 4;
      const movimentos = {
        ArrowLeft: [-passo, 0],
        ArrowRight: [passo, 0],
        ArrowUp: [0, -passo],
        ArrowDown: [0, passo]
      };
      if (movimentos[evento.key]) {
        evento.preventDefault();
        const [dx, dy] = movimentos[evento.key];
        setCursorTeclado((atual) => ({
          x: limitar(atual.x + dx, 0, tamanho.largura),
          y: limitar(atual.y + dy, 0, tamanho.altura),
          visivel: true
        }));
      } else if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        setPontos((atuais) => [...atuais, { x: cursorTeclado.x, y: cursorTeclado.y }]);
        setCursorTeclado((atual) => ({ ...atual, visivel: true }));
        setAnuncio(`Ponto ${pontos.length + 1} adicionado pelo teclado.`);
      } else if (evento.key === "Backspace" || evento.key === "Delete") {
        evento.preventDefault();
        desfazer();
      }
    }
  }

  function encontrarLimitesDaMascara() {
    const mascara = canvasMascaraRef.current;
    const dados = mascara.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, mascara.width, mascara.height);
    let minimoX = mascara.width;
    let minimoY = mascara.height;
    let maximoX = -1;
    let maximoY = -1;

    for (let y = 0; y < mascara.height; y += 1) {
      for (let x = 0; x < mascara.width; x += 1) {
        if (dados.data[(y * mascara.width + x) * 4 + 3] <= 2) continue;
        minimoX = Math.min(minimoX, x);
        minimoY = Math.min(minimoY, y);
        maximoX = Math.max(maximoX, x);
        maximoY = Math.max(maximoY, y);
      }
    }

    if (maximoX < minimoX || maximoY < minimoY) return null;
    return {
      x: minimoX,
      y: minimoY,
      largura: maximoX - minimoX + 1,
      altura: maximoY - minimoY + 1
    };
  }

  async function aplicarRecorte() {
    if (etapa !== "retoque") return;
    setProcessando(true);
    setErro("");

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const limites = encontrarLimitesDaMascara();
      if (!limites) throw new Error("A máscara ficou vazia. Restaure uma área ou recomece o contorno.");

      const saida = criarCanvas(limites.largura, limites.altura);
      const contextoSaida = saida.getContext("2d");
      contextoSaida.drawImage(
        canvasFonteRef.current,
        limites.x,
        limites.y,
        limites.largura,
        limites.altura,
        0,
        0,
        limites.largura,
        limites.altura
      );
      contextoSaida.globalCompositeOperation = "destination-in";
      contextoSaida.drawImage(
        canvasMascaraRef.current,
        limites.x,
        limites.y,
        limites.largura,
        limites.altura,
        0,
        0,
        limites.largura,
        limites.altura
      );

      let qualidadeWebp = 0.92;
      let dataUrl = saida.toDataURL(formato, formato === "image/webp" ? qualidadeWebp : undefined);
      const formatoReal = dataUrl.startsWith("data:image/webp") ? "image/webp" : "image/png";
      if (!dataUrl.startsWith(`data:${formatoReal}`)) {
        dataUrl = saida.toDataURL("image/png");
      }

      let bytes = tamanhoDataUrl(dataUrl);
      while (formatoReal === "image/webp" && bytes > MAX_OUTPUT_BYTES && qualidadeWebp > 0.68) {
        qualidadeWebp -= 0.08;
        dataUrl = saida.toDataURL("image/webp", qualidadeWebp);
        bytes = tamanhoDataUrl(dataUrl);
      }
      if (bytes > MAX_OUTPUT_BYTES) {
        throw new Error(
          `O recorte ficou com ${formatarBytes(bytes)}. Reduza a área selecionada ou escolha WebP para manter o limite de 1 MB.`
        );
      }
      onAplicar({
        dataUrl,
        metadata: {
          metodo: "poligono-manual",
          formato: formatoReal,
          featherPx: feather,
          largura: saida.width,
          altura: saida.height,
          larguraFonte: tamanho.largura,
          alturaFonte: tamanho.altura,
          larguraOriginal: dimensoesOriginais.largura,
          alturaOriginal: dimensoesOriginais.altura,
          tamanhoBytes: bytes,
          editadoEm: new Date().toISOString()
        }
      });
      setAnuncio(`Recorte criado com ${formatarBytes(bytes)}.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível gerar o recorte.");
      setProcessando(false);
    }
  }

  const podeDesfazer = etapa === "poligono" ? pontos.length > 0 : historicoPincelRef.current.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-5">
      <section
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recorte-cabelo-titulo"
        aria-describedby="recorte-cabelo-ajuda"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-steel/30 bg-ink shadow-2xl outline-none sm:max-h-[calc(100dvh-2.5rem)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-steel/20 px-4 py-3 sm:px-5">
          <div>
            <h2 id="recorte-cabelo-titulo" className="font-display text-sm uppercase tracking-widest2 text-parchment">
              Recortar cabelo: {nome}
            </h2>
            <p id="recorte-cabelo-ajuda" className="mt-1 text-xs leading-relaxed text-steel">
              {etapa === "poligono"
                ? "Marque pontos ao redor somente do cabelo e conclua o contorno. Clique no primeiro ponto para fechar mais rápido."
                : "Apague o fundo restante ou restaure fios. A área quadriculada ficará transparente."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            disabled={processando}
            className="rounded-lg p-2 text-steel hover:bg-white/5 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:opacity-40"
            aria-label="Fechar editor sem aplicar"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_300px] lg:overflow-hidden">
          <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden bg-black/35 p-2 sm:p-4 lg:min-h-0">
            {carregando && (
              <div className="flex items-center gap-2 text-sm text-steel" role="status">
                <LoaderCircle className="animate-spin" aria-hidden="true" size={18} /> Abrindo imagem…
              </div>
            )}
            {!carregando && !erro && (
              <canvas
                ref={canvasRef}
                width={tamanho.largura}
                height={tamanho.altura}
                tabIndex={0}
                role="img"
                aria-label={
                  etapa === "poligono"
                    ? `Imagem de ${nome}. ${pontos.length} pontos no contorno.`
                    : `Prévia transparente de ${nome} pronta para retoque.`
                }
                onPointerDown={iniciarPonteiro}
                onPointerMove={moverPonteiro}
                onPointerUp={finalizarPonteiro}
                onPointerCancel={finalizarPonteiro}
                onPointerLeave={() => !desenhandoRef.current && setPosicaoPonteiro(null)}
                onKeyDown={lidarComTeclado}
                className={`max-h-[58dvh] max-w-full rounded-lg border border-steel/30 object-contain shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass lg:max-h-[calc(100dvh-11rem)] ${
                  etapa === "poligono" ? "cursor-crosshair" : "cursor-none"
                }`}
                style={{
                  touchAction: "none",
                  backgroundColor: "#303136",
                  backgroundImage:
                    "linear-gradient(45deg, #45464c 25%, transparent 25%), linear-gradient(-45deg, #45464c 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #45464c 75%), linear-gradient(-45deg, transparent 75%, #45464c 75%)",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                  backgroundSize: "16px 16px"
                }}
              />
            )}
          </div>

          <aside className="space-y-5 border-t border-steel/20 bg-white/[0.025] p-4 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-steel">
                {etapa === "poligono" ? `Contorno · ${pontos.length} pontos` : "Retoque manual"}
              </p>
              {etapa === "poligono" ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-steel/20 bg-black/15 p-3 text-xs leading-relaxed text-steel">
                    <MousePointer2 className="mb-2 text-brass" aria-hidden="true" size={18} />
                    No teclado, foque a imagem, mova a mira com as setas e pressione Espaço ou Enter para marcar.
                    Shift acelera o movimento; Backspace desfaz.
                  </div>
                  <label htmlFor="suavizacao-recorte" className="block text-sm text-parchment/85">
                    Suavização da borda: <span className="font-semibold text-brass">{feather}px</span>
                    <input
                      id="suavizacao-recorte"
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={feather}
                      onChange={(evento) => setFeather(Number(evento.target.value))}
                      className="mt-2 w-full accent-brass"
                    />
                  </label>
                  <BotaoFerramenta onClick={construirMascara} disabled={pontos.length < MIN_POLYGON_POINTS} className="w-full">
                    <Scissors aria-hidden="true" size={16} /> Concluir contorno
                  </BotaoFerramenta>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Ferramenta de retoque">
                    <BotaoFerramenta ativo={ferramenta === "apagar"} onClick={() => setFerramenta("apagar")} aria-pressed={ferramenta === "apagar"}>
                      <Eraser aria-hidden="true" size={16} /> Apagar
                    </BotaoFerramenta>
                    <BotaoFerramenta ativo={ferramenta === "restaurar"} onClick={() => setFerramenta("restaurar")} aria-pressed={ferramenta === "restaurar"}>
                      <Paintbrush aria-hidden="true" size={16} /> Restaurar
                    </BotaoFerramenta>
                  </div>
                  <label htmlFor="tamanho-pincel-recorte" className="block text-sm text-parchment/85">
                    Tamanho do pincel: <span className="font-semibold text-brass">{tamanhoPincel}px</span>
                    <input
                      id="tamanho-pincel-recorte"
                      type="range"
                      min="6"
                      max="180"
                      step="2"
                      value={tamanhoPincel}
                      onChange={(evento) => setTamanhoPincel(Number(evento.target.value))}
                      className="mt-2 w-full accent-brass"
                    />
                  </label>
                  <BotaoFerramenta onClick={voltarAoContorno} className="w-full">
                    <MousePointer2 aria-hidden="true" size={16} /> Voltar ao contorno
                  </BotaoFerramenta>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <BotaoFerramenta onClick={desfazer} disabled={!podeDesfazer}>
                <Undo2 aria-hidden="true" size={16} /> Desfazer
              </BotaoFerramenta>
              <BotaoFerramenta onClick={recomeçar}>
                <RotateCcw aria-hidden="true" size={16} /> Recomeçar
              </BotaoFerramenta>
            </div>

            <fieldset className="space-y-2" disabled={etapa !== "retoque" || processando}>
              <legend className="text-xs font-semibold uppercase tracking-wider text-steel">Arquivo transparente</legend>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-steel/20 p-2 text-sm text-parchment/85">
                <input
                  type="radio"
                  name="formato-recorte"
                  value="image/webp"
                  checked={formato === "image/webp"}
                  onChange={(evento) => setFormato(evento.target.value)}
                  className="mt-0.5 accent-brass"
                />
                <span><strong>WebP</strong><span className="block text-xs text-steel">Menor e recomendado.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-steel/20 p-2 text-sm text-parchment/85">
                <input
                  type="radio"
                  name="formato-recorte"
                  value="image/png"
                  checked={formato === "image/png"}
                  onChange={(evento) => setFormato(evento.target.value)}
                  className="mt-0.5 accent-brass"
                />
                <span><strong>PNG</strong><span className="block text-xs text-steel">Maior, sem perdas.</span></span>
              </label>
            </fieldset>

            {erro && <p className="rounded-lg border border-barber/30 bg-barber/10 p-3 text-sm text-barber" role="alert">{erro}</p>}

            <div className="space-y-2 border-t border-steel/20 pt-4">
              <button
                type="button"
                onClick={aplicarRecorte}
                disabled={etapa !== "retoque" || processando}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brass px-4 py-3 font-semibold text-ink hover:bg-brass-dim hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processando ? <LoaderCircle className="animate-spin" aria-hidden="true" size={17} /> : <Check aria-hidden="true" size={17} />}
                {processando ? "Gerando recorte…" : "Usar recorte"}
              </button>
              <button
                type="button"
                onClick={onCancelar}
                disabled={processando}
                className="w-full rounded-lg px-4 py-2 text-sm text-steel hover:bg-white/5 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:opacity-40"
              >
                Cancelar sem alterar
              </button>
            </div>
          </aside>
        </div>

        <p className="sr-only" role="status" aria-live="polite">{anuncio}</p>
      </section>
    </div>
  );
}
