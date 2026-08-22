"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Eye,
  ImageOff,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ScanFace,
  SlidersHorizontal,
  Sparkles,
  Store,
  TriangleAlert
} from "lucide-react";
import { useParams } from "next/navigation";
import {
  carregarHairCatalogLocal,
  HAIR_CATALOG_STORAGE_KEY
} from "@/lib/hairCatalog";
import {
  analisarMoldeCabeloPorAlpha,
  ajustarCabeloManualmente,
  confirmarAjusteCabeloManualPrimario,
  criarAjusteManualPrimarioDoCatalogo,
  obterRevisaoMoldeCabelo,
  ajusteCabeloManualPrimarioValido
} from "./cabeloCatalogoLocal";
import RemocaoCabeloAutomatica from "./RemocaoCabeloAutomatica";
import {
  criarReciboRemocaoCabeloAutomatica,
  criarStatusRemocaoCabeloAutomatica,
  REMOCAO_CABELO_AUTOMATICA_VERSAO
} from "./remocaoCabeloAutomaticaLocal";

const DATA_URL_CABELO_SEGURO = /^data:image\/(png|webp);base64,([a-z0-9+/]+={0,2})$/i;
const ASSETS_DEMO_CABELO_SEGUROS = new Set([
  "/demo-cortes/crop-texturizado-realista-v3.png",
  "/demo-cortes/quiff-moderno-realista-v4.png",
  "/demo-cortes/cachos-taper-realista-v2.png",
  "/demo-cortes/slick-back-realista-v2.png",
  "/demo-cortes/topo-volumoso-realista-v2.png"
]);
const CACHE_ANALISE_MOLDE = new Map();

function dataUrlCabeloValido(valor) {
  if (typeof valor !== "string") return false;
  const correspondencia = DATA_URL_CABELO_SEGURO.exec(valor);
  if (!correspondencia) return false;

  try {
    const [, formato, cargaBase64] = correspondencia;
    const cabecalho = atob(cargaBase64.slice(0, 24));
    if (formato.toLowerCase() === "png") {
      const assinaturaPng = [137, 80, 78, 71, 13, 10, 26, 10];
      return assinaturaPng.every((byte, indice) => cabecalho.charCodeAt(indice) === byte);
    }
    return cabecalho.slice(0, 4) === "RIFF" && cabecalho.slice(8, 12) === "WEBP";
  } catch {
    return false;
  }
}

function obterFonteVisualSegura(item) {
  if (dataUrlCabeloValido(item?.imageDataUrl)) return item.imageDataUrl;
  if (typeof item?.asset === "string" && ASSETS_DEMO_CABELO_SEGUROS.has(item.asset)) {
    return item.asset;
  }
  return null;
}

function carregarCatalogoFotografico() {
  return carregarHairCatalogLocal().reduce((catalogo, item) => {
    if (
      item.ativo !== true ||
      item.direitosConfirmados !== true ||
      item.prontoParaSimulacao !== true
    ) return catalogo;

    const fonteVisual = obterFonteVisualSegura(item);
    if (fonteVisual) catalogo.push({ ...item, fonteVisual });
    return catalogo;
  }, []);
}

function criarFiltroFotografico(ajuste) {
  const deslocamentoSombra = Math.round(1 + ajuste.sombra / 18);
  const desfoqueSombra = Math.round(2 + ajuste.sombra / 7);
  const opacidadeSombra = (ajuste.sombra / 100) * 0.35;

  return [
    `brightness(${ajuste.brilho}%)`,
    `contrast(${ajuste.contraste}%)`,
    `saturate(${ajuste.saturacao}%)`,
    `hue-rotate(${ajuste.tonalidade}deg)`,
    `drop-shadow(0 ${deslocamentoSombra}px ${desfoqueSombra}px rgba(0, 0, 0, ${opacidadeSombra.toFixed(2)}))`
  ].join(" ");
}

function carregarImagem(fonte) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.decoding = "async";
    if (!String(fonte).startsWith("data:")) imagem.crossOrigin = "anonymous";
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Não foi possível analisar o molde deste corte."));
    imagem.src = fonte;
  });
}

function obterAnaliseMolde(fonte) {
  if (CACHE_ANALISE_MOLDE.has(fonte)) return CACHE_ANALISE_MOLDE.get(fonte);

  const promessa = carregarImagem(fonte)
    .then((imagem) => {
      const largura = imagem.naturalWidth || imagem.width;
      const altura = imagem.naturalHeight || imagem.height;
      if (!largura || !altura) throw new Error("O molde não possui dimensões válidas.");
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const contexto = canvas.getContext("2d", { willReadFrequently: true });
      contexto.drawImage(imagem, 0, 0, largura, altura);
      const pixels = contexto.getImageData(0, 0, largura, altura).data;
      const analise = analisarMoldeCabeloPorAlpha(pixels, largura, altura);
      canvas.width = 1;
      canvas.height = 1;
      if (!analise) throw new Error("O recorte não possui transparência suficiente para a simulação.");
      return analise;
    })
    .catch((erro) => {
      CACHE_ANALISE_MOLDE.delete(fonte);
      throw erro;
    });

  CACHE_ANALISE_MOLDE.set(fonte, promessa);
  return promessa;
}

function textoStatusPreparo(status, resultado, encaixePronto) {
  if (status === "carregando") return "Carregando o modelo local no seu aparelho...";
  if (status === "processando") return "Removendo o cabelo original no seu aparelho...";
  if (status === "pronto" && !encaixePronto) return "Cabelo preparado. Montando a posição inicial do molde...";
  if (status === "pronto" && resultado === "sem-cabelo") {
    return "A foto já estava sem cabelo detectável. Ajuste o novo corte no painel ao lado.";
  }
  if (status === "pronto") return "Cabelo original removido. Ajuste o novo corte no painel ao lado.";
  if (status === "erro") return "Não foi possível preparar esta selfie com segurança.";
  return "Prepare a foto para remover o cabelo original; o encaixe do novo corte será manual.";
}

export default function CabeloSimuladorLocal({
  selfieDataUrl,
  corteInicial,
  ajusteInicial,
  neutralizacaoInicial,
  onCorteChange,
  onAjusteChange,
  onNeutralizacaoChange,
  onCatalogoDisponivelChange
}) {
  const { barbearia } = useParams();
  const [catalogoVisual, setCatalogoVisual] = useState([]);
  const [catalogoCarregado, setCatalogoCarregado] = useState(false);
  const [cabeloId, setCabeloId] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [modoVisual, setModoVisual] = useState("antes");
  const [executarToken, setExecutarToken] = useState(0);
  const [remocao, setRemocao] = useState(() => criarStatusRemocaoCabeloAutomatica("ocioso"));
  const [analiseMolde, setAnaliseMolde] = useState(null);
  const [statusAnaliseMolde, setStatusAnaliseMolde] = useState("ocioso");
  const [tentativaAnaliseMolde, setTentativaAnaliseMolde] = useState(0);
  const [erroEncaixe, setErroEncaixe] = useState("");
  const [composicaoPronta, setComposicaoPronta] = useState(false);
  const [ajusteInicialBase, setAjusteInicialBase] = useState(null);
  const [ajusteConfirmado, setAjusteConfirmado] = useState(false);
  const [recompondoAjusteManual, setRecompondoAjusteManual] = useState(false);
  const selfieAnteriorRef = useRef(selfieDataUrl);
  const preparoIniciadoRef = useRef(false);
  const ajusteInicialRef = useRef(ajusteInicial);
  const ajusteInicialCapturadoRef = useRef(Boolean(ajusteInicial));
  const ajustesManuaisRef = useRef(new Map());
  const ultimoAjusteCompostoRef = useRef(null);
  const restaurandoUltimoAjusteRef = useRef(false);
  const confirmarRestauradoRef = useRef(false);

  const cabelo = useMemo(
    () => catalogoVisual.find((item) => item.id === cabeloId) || null,
    [cabeloId, catalogoVisual]
  );

  const processando = remocao.status === "carregando" || remocao.status === "processando";
  const finalizando =
    remocao.status === "pronto" &&
    !composicaoPronta &&
    !erroEncaixe &&
    !recompondoAjusteManual;
  const ocupado = processando || finalizando || recompondoAjusteManual;
  const encaixePronto = remocao.status === "pronto" && Boolean(ajuste) && composicaoPronta;

  useEffect(() => {
    if (selfieAnteriorRef.current === selfieDataUrl) return;
    selfieAnteriorRef.current = selfieDataUrl;
    preparoIniciadoRef.current = false;
    setExecutarToken(0);
    setRemocao(criarStatusRemocaoCabeloAutomatica("ocioso"));
    setAjuste(null);
    setAjusteInicialBase(null);
    setAjusteConfirmado(false);
    setRecompondoAjusteManual(false);
    ajusteInicialRef.current = null;
    ajusteInicialCapturadoRef.current = false;
    ajustesManuaisRef.current.clear();
    ultimoAjusteCompostoRef.current = null;
    restaurandoUltimoAjusteRef.current = false;
    confirmarRestauradoRef.current = false;
    setComposicaoPronta(false);
    setModoVisual("antes");
    onNeutralizacaoChange?.(null);
  }, [onNeutralizacaoChange, selfieDataUrl]);

  useEffect(() => {
    if (!ajusteInicial || ajusteInicialCapturadoRef.current) return;
    ajusteInicialRef.current = ajusteInicial;
    ajusteInicialCapturadoRef.current = true;
  }, [ajusteInicial, selfieDataUrl]);

  useEffect(() => {
    function atualizarCatalogo(evento = null) {
      if (evento) {
        if (evento.key !== null && evento.key !== HAIR_CATALOG_STORAGE_KEY) return;
        ajustesManuaisRef.current.clear();
        onAjusteChange?.(null);
        setAjuste(null);
        setAjusteInicialBase(null);
        setAjusteConfirmado(false);
        setComposicaoPronta(false);
        setRecompondoAjusteManual(false);
        ultimoAjusteCompostoRef.current = null;
        restaurandoUltimoAjusteRef.current = false;
        confirmarRestauradoRef.current = false;
        setModoVisual("antes");
        setErroEncaixe("");
      }
      setCatalogoVisual(carregarCatalogoFotografico());
      setCatalogoCarregado(true);
    }
    atualizarCatalogo();
    window.addEventListener("storage", atualizarCatalogo);
    return () => window.removeEventListener("storage", atualizarCatalogo);
  }, [onAjusteChange]);

  useEffect(() => {
    if (!catalogoCarregado) return;
    const disponivel = catalogoVisual.length > 0;
    onCatalogoDisponivelChange?.(disponivel);
    if (!disponivel) {
      setCabeloId(null);
      setAjuste(null);
      setAjusteInicialBase(null);
      setAjusteConfirmado(false);
      setRecompondoAjusteManual(false);
      ultimoAjusteCompostoRef.current = null;
      onCorteChange?.(null);
      onAjusteChange?.(null);
    }
  }, [catalogoCarregado, catalogoVisual.length, onAjusteChange, onCatalogoDisponivelChange, onCorteChange]);

  useEffect(() => {
    if (!catalogoCarregado || catalogoVisual.length === 0) return;
    if (catalogoVisual.some((item) => item.id === cabeloId)) return;
    const selecionado =
      catalogoVisual.find((item) => item.id === ajusteInicial?.templateId) ||
      catalogoVisual.find((item) => item.nome === corteInicial) ||
      catalogoVisual[0];
    setCabeloId(selecionado.id);
  }, [ajusteInicial?.templateId, cabeloId, catalogoCarregado, catalogoVisual, corteInicial]);

  useEffect(() => {
    if (!cabelo) return;
    onCorteChange?.(cabelo.nome);
  }, [cabelo, onCorteChange]);

  useEffect(() => {
    const confirmado =
      composicaoPronta && ajusteConfirmado
        ? confirmarAjusteCabeloManualPrimario(ajuste)
        : null;
    onAjusteChange?.(confirmado);
  }, [ajuste, ajusteConfirmado, composicaoPronta, onAjusteChange]);

  useEffect(() => {
    if (!cabelo) {
      setAnaliseMolde(null);
      setStatusAnaliseMolde("ocioso");
      return undefined;
    }

    let cancelado = false;
    setAnaliseMolde(null);
    setStatusAnaliseMolde("carregando");
    setErroEncaixe("");
    obterAnaliseMolde(cabelo.fonteVisual)
      .then((analise) => {
        if (cancelado) return;
        setAnaliseMolde({ fonte: cabelo.fonteVisual, dados: analise });
        setStatusAnaliseMolde("pronto");
      })
      .catch((erro) => {
        if (cancelado) return;
        setStatusAnaliseMolde("erro");
        setErroEncaixe(erro?.message || "Não foi possível analisar este molde.");
      });
    return () => {
      cancelado = true;
    };
  }, [cabelo, tentativaAnaliseMolde]);

  useEffect(() => {
    if (
      remocao.status !== "pronto" ||
      !cabelo ||
      analiseMolde?.fonte !== cabelo.fonteVisual
    ) {
      setAjuste(null);
      setAjusteInicialBase(null);
      setAjusteConfirmado(false);
      setRecompondoAjusteManual(false);
      setComposicaoPronta(false);
      return;
    }

    const baseInicial = criarAjusteManualPrimarioDoCatalogo(cabelo);
    if (!baseInicial) {
      setAjuste(null);
      setAjusteInicialBase(null);
      setAjusteConfirmado(false);
      setRecompondoAjusteManual(false);
      setComposicaoPronta(false);
      setErroEncaixe("Este molde não pôde ser aberto para o ajuste manual.");
      return;
    }
    const chaveMolde = `${cabelo.id}|${obterRevisaoMoldeCabelo(cabelo)}`;
    const candidato =
      ajustesManuaisRef.current.get(chaveMolde) ||
      ajusteInicialRef.current;
    const ajusteRestaurado = criarAjusteManualPrimarioDoCatalogo(cabelo, candidato);
    confirmarRestauradoRef.current = ajusteCabeloManualPrimarioValido(candidato);
    ajusteInicialRef.current = null;
    if (ajusteRestaurado) {
      ajustesManuaisRef.current.set(chaveMolde, ajusteRestaurado);
    }
    setErroEncaixe("");
    setAjusteInicialBase(baseInicial);
    setAjusteConfirmado(false);
    setRecompondoAjusteManual(false);
    ultimoAjusteCompostoRef.current = null;
    restaurandoUltimoAjusteRef.current = false;
    setComposicaoPronta(false);
    setAjuste(ajusteRestaurado);
  }, [analiseMolde, cabelo, remocao.status]);

  const iniciarPreparacao = useCallback((preservarConfirmado = false) => {
    if (!selfieDataUrl) return;
    if (cabelo && ajuste) {
      const chaveMolde = `${cabelo.id}|${obterRevisaoMoldeCabelo(cabelo)}`;
      ajustesManuaisRef.current.set(chaveMolde, {
        ...ajuste,
        ajusteManual: {
          ...ajuste.ajusteManual,
          confirmado: false
        }
      });
    }
    // Impede que o recibo emitido por esta mesma execução seja interpretado
    // pelo efeito de retomada como motivo para iniciar uma segunda inferência.
    preparoIniciadoRef.current = true;
    if (statusAnaliseMolde === "erro") {
      setTentativaAnaliseMolde((tentativaAtual) => tentativaAtual + 1);
    }
    setModoVisual("antes");
    setAjuste(null);
    setAjusteInicialBase(null);
    setAjusteConfirmado(false);
    setRecompondoAjusteManual(false);
    ultimoAjusteCompostoRef.current = null;
    restaurandoUltimoAjusteRef.current = false;
    confirmarRestauradoRef.current = false;
    setComposicaoPronta(false);
    setErroEncaixe("");
    setRemocao(criarStatusRemocaoCabeloAutomatica("carregando"));
    onAjusteChange?.(null);
    if (!preservarConfirmado) onNeutralizacaoChange?.(null);
    setExecutarToken((tokenAtual) => tokenAtual + 1);
  }, [ajuste, cabelo, onAjusteChange, onNeutralizacaoChange, selfieDataUrl, statusAnaliseMolde]);

  useEffect(() => {
    if (!catalogoCarregado || catalogoVisual.length === 0 || preparoIniciadoRef.current) return;
    const deveRetomar =
      selfieDataUrl === "/demo-cliente.png" ||
      (
        neutralizacaoInicial?.versao === REMOCAO_CABELO_AUTOMATICA_VERSAO &&
        neutralizacaoInicial?.concluida === true
      );
    if (!deveRetomar) return;
    preparoIniciadoRef.current = true;
    iniciarPreparacao(true);
  }, [catalogoCarregado, catalogoVisual.length, iniciarPreparacao, neutralizacaoInicial, selfieDataUrl]);

  function receberStatusRemocao(novoStatus) {
    setRemocao(novoStatus);
    if (novoStatus.status === "pronto") {
      const recibo = criarReciboRemocaoCabeloAutomatica(novoStatus);
      onNeutralizacaoChange?.(recibo);
      return;
    }
    if (novoStatus.status === "erro") {
      setAjuste(null);
      setAjusteInicialBase(null);
      setAjusteConfirmado(false);
      setRecompondoAjusteManual(false);
      ultimoAjusteCompostoRef.current = null;
      restaurandoUltimoAjusteRef.current = false;
      confirmarRestauradoRef.current = false;
      setComposicaoPronta(false);
      setModoVisual("antes");
      onNeutralizacaoChange?.(null);
    }
  }

  function receberComposicao(pronta, erro = null) {
    setComposicaoPronta(pronta === true);
    if (erro) {
      const ultimo = ultimoAjusteCompostoRef.current;
      const geometriaMudou = ultimo && ajuste && (
        ultimo.x !== ajuste.x ||
        ultimo.y !== ajuste.y ||
        ultimo.largura !== ajuste.largura ||
        ultimo.altura !== ajuste.altura ||
        ultimo.rotacao !== ajuste.rotacao
      );
      if (
        recompondoAjusteManual &&
        !restaurandoUltimoAjusteRef.current &&
        geometriaMudou
      ) {
        restaurandoUltimoAjusteRef.current = true;
        confirmarRestauradoRef.current = false;
        onAjusteChange?.(null);
        setAjusteConfirmado(false);
        setErroEncaixe("A correção não pôde ser aplicada. Restaurando o último ajuste manual válido...");
        setRecompondoAjusteManual(true);
        setAjuste({
          ...ultimo,
          ajusteManual: {
            ...ultimo.ajusteManual,
            confirmado: false
          }
        });
        return;
      }
      restaurandoUltimoAjusteRef.current = false;
      confirmarRestauradoRef.current = false;
      setRecompondoAjusteManual(false);
      setAjusteConfirmado(false);
      setErroEncaixe(erro);
      setModoVisual("antes");
      return;
    }
    if (pronta === true) {
      if (cabelo && ajuste) {
        const rascunho = {
          ...ajuste,
          ajusteManual: {
            ...ajuste.ajusteManual,
            confirmado: false
          }
        };
        const chaveMolde = `${cabelo.id}|${obterRevisaoMoldeCabelo(cabelo)}`;
        ajustesManuaisRef.current.set(chaveMolde, rascunho);
        ultimoAjusteCompostoRef.current = rascunho;
      }
      const confirmarRestaurado = confirmarRestauradoRef.current;
      confirmarRestauradoRef.current = false;
      restaurandoUltimoAjusteRef.current = false;
      setRecompondoAjusteManual(false);
      setAjusteConfirmado(confirmarRestaurado);
      setErroEncaixe("");
      setModoVisual("depois");
    }
  }

  function selecionarCabelo(item) {
    if (item.id === cabeloId || ocupado) return;
    // Invalida o contrato externo no mesmo evento do clique. Assim, mesmo um
    // double tap que tente avançar antes do próximo render não reutiliza o
    // placement do corte anterior.
    onAjusteChange?.(null);
    setCabeloId(item.id);
    setAjuste(null);
    setAjusteInicialBase(null);
    setAjusteConfirmado(false);
    setRecompondoAjusteManual(false);
    ultimoAjusteCompostoRef.current = null;
    restaurandoUltimoAjusteRef.current = false;
    confirmarRestauradoRef.current = false;
    setComposicaoPronta(false);
    setErroEncaixe("");
  }

  function aplicarDeltaManual(delta) {
    if (
      !cabelo ||
      !ajuste ||
      remocao.status !== "pronto" ||
      erroEncaixe ||
      recompondoAjusteManual
    ) return;
    const proximo = ajustarCabeloManualmente(ajuste, delta);
    if (
      !proximo ||
      (
        proximo.x === ajuste.x &&
        proximo.y === ajuste.y &&
        proximo.largura === ajuste.largura &&
        proximo.altura === ajuste.altura &&
        proximo.rotacao === ajuste.rotacao
      )
    ) return;

    // O placement externo é invalidado no mesmo evento. A matte será
    // recomposta para a nova geometria antes de liberar o avanço novamente.
    onAjusteChange?.(null);
    setAjusteConfirmado(false);
    setComposicaoPronta(false);
    setRecompondoAjusteManual(true);
    restaurandoUltimoAjusteRef.current = false;
    confirmarRestauradoRef.current = false;
    setErroEncaixe("");
    setModoVisual("depois");
    setAjuste(proximo);
  }

  function restaurarPosicaoInicial() {
    if (!cabelo || !ajusteInicialBase || remocao.status !== "pronto") return;
    onAjusteChange?.(null);
    setAjusteConfirmado(false);
    setComposicaoPronta(false);
    setRecompondoAjusteManual(true);
    restaurandoUltimoAjusteRef.current = false;
    confirmarRestauradoRef.current = false;
    setErroEncaixe("");
    setModoVisual("depois");
    setAjuste({
      ...ajusteInicialBase,
      ajusteManual: {
        ...ajusteInicialBase.ajusteManual,
        confirmado: false
      }
    });
  }

  function confirmarAjusteManual() {
    if (
      !ajuste ||
      !composicaoPronta ||
      recompondoAjusteManual ||
      erroEncaixe ||
      !ajusteCabeloManualPrimarioValido(ajuste, { exigirConfirmacao: false })
    ) return;
    setAjusteConfirmado(true);
    setModoVisual("depois");
  }

  if (!catalogoCarregado) {
    return (
      <div className="flex w-full max-w-4xl items-center justify-center gap-2 rounded-2xl border border-steel/25 bg-white/[0.025] px-6 py-12 text-sm text-steel" role="status">
        <Loader2 size={18} className="animate-spin text-brass" aria-hidden="true" />
        Carregando os cortes da barbearia...
      </div>
    );
  }

  if (catalogoVisual.length === 0) {
    return (
      <section aria-labelledby="catalogo-vazio-titulo" className="w-full max-w-4xl rounded-2xl border border-dashed border-brass/40 bg-brass/[0.045] px-5 py-10 text-center sm:px-8">
        <ImageOff className="mx-auto text-brass" size={34} aria-hidden="true" />
        <h2 id="catalogo-vazio-titulo" className="mt-4 font-display text-lg uppercase tracking-widest2 text-parchment">
          Nenhum corte fotográfico disponível
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-steel">
          O dono precisa cadastrar e publicar pelo menos um recorte transparente antes da simulação.
        </p>
        <Link href="/barbeiro/catalogo" target="_blank" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brass/60 px-4 py-2.5 text-sm font-semibold text-brass transition-colors hover:bg-brass hover:text-ink">
          <Store size={16} aria-hidden="true" /> Abrir catálogo do dono
        </Link>
      </section>
    );
  }

  if (!cabelo) {
    return (
      <div className="flex w-full max-w-4xl items-center justify-center gap-2 py-12 text-sm text-steel" role="status">
        <Loader2 size={18} className="animate-spin text-brass" aria-hidden="true" />
        Preparando o primeiro corte...
      </div>
    );
  }

  const filtroFotografico = ajuste ? criarFiltroFotografico(ajuste) : "none";
  const ajusteManualAtivo = Boolean(ajuste?.ajusteManual?.aplicado);
  const ajusteDisponivel = remocao.status === "pronto" && Boolean(ajuste);
  const podeMostrarDepois = encaixePronto;
  const podeAjustarManualmente =
    encaixePronto &&
    !processando &&
    !recompondoAjusteManual &&
    !erroEncaixe;
  const ajusteNaPosicaoInicial = Boolean(
    ajuste &&
    ajusteInicialBase &&
    ajuste.x === ajusteInicialBase.x &&
    ajuste.y === ajusteInicialBase.y &&
    ajuste.largura === ajusteInicialBase.largura &&
    ajuste.altura === ajusteInicialBase.altura &&
    ajuste.rotacao === ajusteInicialBase.rotacao
  );
  const transformacao = ajuste
    ? [
        "translate(-50%, -50%)",
        `rotate(${ajuste.rotacao}deg)`,
        ajuste.espelhado ? "scaleX(-1)" : "scaleX(1)"
      ].join(" ")
    : "translate(-50%, -50%)";
  const mostrarResultado = modoVisual === "depois" && podeMostrarDepois;
  const mostrarCabelo = mostrarResultado && Boolean(ajuste);
  const textoStatus = recompondoAjusteManual
    ? "Aplicando o ajuste manual..."
    : ajusteConfirmado && encaixePronto
      ? "Posição manual confirmada."
      : ajusteManualAtivo && encaixePronto
        ? "Use os controles à direita e confirme em Pronto."
      : textoStatusPreparo(remocao.status, remocao.resultado, encaixePronto);
  const classeBotaoAjuste =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-steel/30 bg-black/20 text-parchment transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col gap-6">
        <section
          aria-labelledby="titulo-previa-cabelo"
          className="grid w-full grid-cols-[minmax(0,1fr)_minmax(158px,0.9fr)] items-start gap-2 sm:grid-cols-[minmax(260px,360px)_minmax(240px,1fr)] sm:gap-4 md:gap-6"
        >
          <div className="sticky top-2 min-w-0 self-start sm:top-4 md:top-6">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-2 sm:mb-3 sm:gap-3">
              <div className="min-w-0">
                <p
                  id="titulo-previa-cabelo"
                  className="whitespace-nowrap font-display text-[8px] uppercase tracking-[0.04em] text-parchment min-[360px]:text-[10px] min-[360px]:tracking-wider sm:text-sm sm:tracking-widest2"
                >
                  Prévia fotográfica
                </p>
                <p className="mt-1 hidden text-xs text-steel sm:block">
                  {modoVisual === "antes"
                    ? "Confira a selfie original."
                    : "Corte posicionado manualmente por você."}
                </p>
              </div>
              <span className="hidden rounded-full border border-brass/30 bg-brass/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brass sm:inline-flex">No aparelho</span>
            </div>

            <figure className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-2xl border border-steel/30 bg-white/5 shadow-2xl shadow-black" aria-busy={ocupado}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selfieDataUrl} alt="Sua selfie original" draggable="false" className="absolute inset-0 h-full w-full object-cover" />

              <RemocaoCabeloAutomatica
                selfieDataUrl={selfieDataUrl}
                executarToken={executarToken}
                ativo
                fonteMolde={cabelo.fonteVisual}
                ajuste={ajuste}
                onStatusChange={receberStatusRemocao}
                onComposicaoChange={receberComposicao}
                className="z-10"
                style={{ opacity: mostrarResultado ? 1 : 0 }}
              />

              {mostrarCabelo && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute z-20"
                  style={{
                    left: `${ajuste.x}%`,
                    top: `${ajuste.y}%`,
                    width: `${ajuste.largura}%`,
                    height: `${ajuste.altura}%`,
                    opacity: ajuste.opacidade / 100,
                    transform: transformacao,
                    transformOrigin: "center"
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cabelo.fonteVisual} alt="" draggable="false" className="h-full w-full" style={{ filter: filtroFotografico }} />
                </div>
              )}

              {ocupado && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center backdrop-blur-sm" role="status">
                  <Loader2 size={28} className="animate-spin text-brass" aria-hidden="true" />
                  <span className="text-sm font-semibold text-parchment">{textoStatus}</span>
                </div>
              )}

              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-3 pt-10 text-center">
                <span className="text-[11px] font-semibold uppercase tracking-widest2 text-brass">
                  {modoVisual === "antes" ? "Selfie original" : cabelo.nome}
                </span>
              </figcaption>
            </figure>

            <div className="mt-4 grid grid-cols-2 rounded-xl border border-steel/30 bg-white/[0.035] p-1" role="group" aria-label="Comparar antes e depois">
              <button type="button" onClick={() => setModoVisual("antes")} aria-pressed={modoVisual === "antes"} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${modoVisual === "antes" ? "bg-parchment text-ink" : "text-steel hover:text-parchment"}`}>
                Antes
              </button>
              <button type="button" onClick={() => setModoVisual("depois")} disabled={!encaixePronto} aria-pressed={modoVisual === "depois"} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${modoVisual === "depois" ? "bg-brass text-ink" : "text-steel hover:text-parchment"}`}>
                <Eye size={15} aria-hidden="true" /> Depois
              </button>
            </div>
          </div>

          <aside
            id="ajuste-manual-cabelo"
            aria-label="Controles de ajuste manual do cabelo"
            className="sticky top-2 mt-5 max-h-[calc(100dvh-1rem)] min-w-0 self-start overflow-y-auto overscroll-contain rounded-2xl border border-brass/35 bg-brass/[0.055] p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] min-[360px]:mt-[1.4375rem] sm:top-4 sm:mt-[3.25rem] sm:max-h-[calc(100dvh-2rem)] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))] md:top-6 md:max-h-[calc(100dvh-3rem)]"
          >
            <div className="flex items-start gap-1.5 sm:gap-2">
              <SlidersHorizontal size={18} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-parchment sm:text-sm">Ajuste manual</h3>
                <p className="mt-1 hidden text-xs leading-relaxed text-parchment/75 sm:block">
                  Posicione o corte com as setas e ajuste largura, altura e inclinação.
                </p>
              </div>
            </div>

            <div className="mt-2 grid gap-2 sm:mt-4 sm:gap-3">
              <fieldset className="min-w-0 rounded-xl border border-steel/20 bg-black/15 p-1 sm:p-3">
                <legend className="px-1 text-[10px] font-semibold text-parchment sm:text-xs">Mover</legend>
                <div className="mx-auto mt-1 grid w-fit grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ y: -1.5 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.y) <= 0}
                    aria-label="Mover o cabelo um pouco para cima"
                    className={classeBotaoAjuste}
                  >
                    <ArrowUp size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ y: 1.5 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.y) >= 75}
                    aria-label="Mover o cabelo um pouco para baixo"
                    className={classeBotaoAjuste}
                  >
                    <ArrowDown size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ x: -1.5 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.x) <= 0}
                    aria-label="Mover o cabelo um pouco para a esquerda"
                    className={classeBotaoAjuste}
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ x: 1.5 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.x) >= 100}
                    aria-label="Mover o cabelo um pouco para a direita"
                    className={classeBotaoAjuste}
                  >
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </fieldset>

              <fieldset className="min-w-0 rounded-xl border border-steel/20 bg-black/15 p-1 sm:p-3">
                <legend className="px-1 text-[10px] font-semibold text-parchment sm:text-xs">Largura</legend>
                <div className="mt-1 grid grid-cols-[2.75rem_minmax(2.25rem,1fr)_2.75rem] items-center gap-1 sm:mt-3 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ largura: -3 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.largura) <= 28}
                    aria-label="Diminuir a largura do cabelo"
                    className={classeBotaoAjuste}
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <output className="min-w-0 text-center text-[10px] font-semibold text-parchment sm:text-xs" aria-live="polite">
                    {ajuste ? `${Math.round(ajuste.largura)}%` : "--"}
                  </output>
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ largura: 3 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.largura) >= 130}
                    aria-label="Aumentar a largura do cabelo"
                    className={classeBotaoAjuste}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
              </fieldset>

              <fieldset className="min-w-0 rounded-xl border border-steel/20 bg-black/15 p-1 sm:p-3">
                <legend className="px-1 text-[10px] font-semibold text-parchment sm:text-xs">Altura</legend>
                <div className="mt-1 grid grid-cols-[2.75rem_minmax(2.25rem,1fr)_2.75rem] items-center gap-1 sm:mt-3 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ altura: -3 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.altura) <= 12}
                    aria-label="Diminuir a altura do cabelo"
                    className={classeBotaoAjuste}
                  >
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <output className="min-w-0 text-center text-[10px] font-semibold text-parchment sm:text-xs" aria-live="polite">
                    {ajuste ? `${Math.round(ajuste.altura)}%` : "--"}
                  </output>
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ altura: 3 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.altura) >= 100}
                    aria-label="Aumentar a altura do cabelo"
                    className={classeBotaoAjuste}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
              </fieldset>

              <fieldset className="min-w-0 rounded-xl border border-steel/20 bg-black/15 p-1 sm:p-3">
                <legend className="px-1 text-[10px] font-semibold text-parchment sm:text-xs">Inclinação</legend>
                <div className="mt-1 grid grid-cols-[2.75rem_minmax(2.25rem,1fr)_2.75rem] items-center gap-1 sm:mt-3 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ rotacao: -1 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.rotacao) <= -45}
                    aria-label="Girar o cabelo um grau para a esquerda"
                    className={classeBotaoAjuste}
                  >
                    <RotateCcw size={18} aria-hidden="true" />
                  </button>
                  <output className="min-w-0 text-center text-[10px] font-semibold text-parchment sm:text-xs" aria-live="polite">
                    {ajuste ? `${Math.round(ajuste.rotacao)}°` : "--"}
                  </output>
                  <button
                    type="button"
                    onClick={() => aplicarDeltaManual({ rotacao: 1 })}
                    disabled={!podeAjustarManualmente || Number(ajuste?.rotacao) >= 45}
                    aria-label="Girar o cabelo um grau para a direita"
                    className={classeBotaoAjuste}
                  >
                    <RotateCw size={18} aria-hidden="true" />
                  </button>
                </div>
              </fieldset>
            </div>

            <div className="mt-2 grid gap-2 sm:mt-4">
              <button
                type="button"
                onClick={restaurarPosicaoInicial}
                disabled={!podeAjustarManualmente || ajusteNaPosicaoInicial}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-steel/30 px-1.5 py-2 text-xs font-semibold text-parchment transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-35 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
              >
                <RefreshCw size={16} className="shrink-0" aria-hidden="true" /> Restaurar posição inicial
              </button>
              <button
                type="button"
                onClick={confirmarAjusteManual}
                disabled={!podeAjustarManualmente || ajusteConfirmado}
                className="flex min-h-11 items-center justify-center rounded-lg bg-brass px-2 py-2 text-xs font-bold text-ink transition-colors hover:bg-brass-dim hover:text-parchment disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-2.5 sm:text-sm"
              >
                {ajusteConfirmado ? "Ajuste confirmado" : "Pronto"}
              </button>
            </div>

            <p className="mt-2 text-center text-[9px] leading-relaxed text-parchment/70 sm:mt-3 sm:text-[11px]" role="status" aria-live="polite">
              {recompondoAjusteManual
                ? "Atualizando a cobertura..."
                : ajusteConfirmado
                  ? "Posição manual confirmada."
                  : ajusteDisponivel
                    ? "Ajuste o corte, confira as bordas e toque em Pronto."
                    : "Prepare a foto para liberar os controles."}
            </p>
          </aside>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="titulo-preparo-foto" className="rounded-2xl border border-brass/30 bg-brass/[0.045] p-4" aria-busy={ocupado}>
            <div className="flex items-start gap-3">
              <ScanFace size={20} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 id="titulo-preparo-foto" className="font-display text-sm uppercase tracking-widest2 text-parchment">1. Preparo da foto</h2>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  O preparo local remove o cabelo original. Ele não posiciona o novo corte: o encaixe é feito por você no painel à direita.
                </p>
              </div>
            </div>

            <div className={`mt-4 rounded-xl border p-3 ${remocao.status === "erro" || erroEncaixe ? "border-barber/60 bg-barber/10" : encaixePronto ? "border-emerald-500/40 bg-emerald-500/10" : "border-steel/25 bg-black/15"}`}>
              <p className="flex items-start gap-2 text-sm leading-relaxed text-parchment" role={remocao.status === "erro" || erroEncaixe ? "alert" : "status"} aria-live="polite">
                {ocupado ? <Loader2 size={17} className="mt-0.5 shrink-0 animate-spin text-brass" aria-hidden="true" /> : encaixePronto ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" /> : remocao.status === "erro" || erroEncaixe ? <TriangleAlert size={17} className="mt-0.5 shrink-0 text-barber" aria-hidden="true" /> : <Sparkles size={17} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />}
                <span>{remocao.status === "erro" ? remocao.erro : erroEncaixe || textoStatus}</span>
              </p>
            </div>

            <button type="button" onClick={() => iniciarPreparacao(false)} disabled={ocupado || statusAnaliseMolde === "carregando"} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brass px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-brass-dim hover:text-parchment disabled:cursor-wait disabled:opacity-50">
              {ocupado ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ScanFace size={18} aria-hidden="true" />}
              {processando ? "Preparando a foto..." : finalizando ? "Montando a posição inicial..." : encaixePronto ? "Refazer preparo da foto" : remocao.status === "erro" || erroEncaixe ? "Tentar novamente" : "Preparar foto"}
            </button>

            {(remocao.status === "erro" || erroEncaixe) && (
              <Link href={`/b/${barbearia}/selfie`} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-steel/35 px-4 py-2.5 text-sm font-semibold text-parchment transition-colors hover:border-brass">
                <RefreshCw size={16} aria-hidden="true" /> Trocar ou refazer a selfie
              </Link>
            )}
          </section>

          <section aria-labelledby="titulo-catalogo-cabelo">
            <div className="mb-3">
              <h2 id="titulo-catalogo-cabelo" className="font-display text-sm uppercase tracking-widest2 text-parchment">2. Escolha o corte</h2>
              <p className="mt-1 text-xs leading-relaxed text-steel">Ao trocar o estilo, ele abre na posição inicial do próprio molde. Ajuste o novo corte no painel à direita.</p>
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-3 sm:overflow-visible" aria-label="Catálogo fotográfico de cabelos">
              {catalogoVisual.map((item) => {
                const selecionado = item.id === cabelo.id;
                return (
                  <button key={item.id} type="button" onClick={() => selecionarCabelo(item)} disabled={ocupado} aria-pressed={selecionado} className={`w-28 shrink-0 snap-start overflow-hidden rounded-xl border text-left transition-colors disabled:cursor-wait disabled:opacity-50 sm:w-auto ${selecionado ? "border-brass bg-brass/10 text-parchment" : "border-steel/25 bg-white/[0.035] text-steel hover:border-brass/60 hover:text-parchment"}`}>
                    <span className="flex h-24 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.13),_transparent_70%)] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.fonteVisual} alt="" aria-hidden="true" className="h-full w-full object-contain" />
                    </span>
                    <span className="block min-h-12 px-2.5 py-2 text-xs font-semibold leading-tight">{item.nome}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="titulo-ajuste-manual" className="rounded-2xl border border-steel/25 bg-white/[0.025] p-4">
            <div className="flex items-start gap-3">
              {encaixePronto ? <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" /> : <Sparkles size={19} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />}
              <div>
                <h2 id="titulo-ajuste-manual" className="font-display text-sm uppercase tracking-widest2 text-parchment">3. Confirme o ajuste manual</h2>
                <p className="mt-2 text-xs leading-relaxed text-steel">
                  {encaixePronto
                    ? ajusteConfirmado
                      ? `${cabelo.nome} está na posição manual confirmada por você.`
                      : `${cabelo.nome} está pronto para ser movido, redimensionado e girado por você.`
                    : statusAnaliseMolde === "carregando"
                      ? "Lendo o recorte transparente deste corte..."
                      : "Os controles serão liberados assim que a foto for preparada."}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-steel">Prévia 2D aproximada. Confira se o cabelo antigo não reapareceu nas bordas antes de tocar em Pronto.</p>
              </div>
            </div>
          </section>

          <p className="sr-only" aria-live="polite">
            Corte selecionado: {cabelo.nome}. {ajusteConfirmado ? "Ajuste manual confirmado." : encaixePronto ? "Aguardando sua confirmação manual." : "Aguardando preparo e composição."}
          </p>
        </div>
      </div>
    </div>
  );
}
