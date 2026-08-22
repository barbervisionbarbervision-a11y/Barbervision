export const HAIR_CATALOG_STORAGE_KEY = "barbervision:hair-catalog:v1";
export const HAIR_CATALOG_MAX_IMAGE_BYTES = 1024 * 1024;
export const HAIR_CATALOG_ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const HAIR_CATALOG_TRANSFORMACAO_PADRAO = Object.freeze({
  escala: 1,
  deslocamentoX: 0,
  deslocamentoY: 0,
  rotacao: 0
});
export const HAIR_CATALOG_ENCAIXE_REVISAO = 6;

const HAIR_CATALOG_DEMOS = Object.freeze([
  {
    id: "demo-crop-texturizado",
    nome: "Crop texturizado",
    categoria: "Degradê",
    asset: "/demo-cortes/crop-texturizado-realista-v3.png",
    transformacaoPadrao: { escala: 1, deslocamentoX: 0, deslocamentoY: 0, rotacao: 0 },
    encaixeAutomatico: { nivelTemplo: 0 },
    revisaoEncaixe: HAIR_CATALOG_ENCAIXE_REVISAO
  },
  {
    id: "demo-quiff-moderno",
    nome: "Quiff moderno",
    categoria: "Social",
    asset: "/demo-cortes/quiff-moderno-realista-v4.png",
    transformacaoPadrao: { escala: 1, deslocamentoX: 0, deslocamentoY: 0, rotacao: 0 },
    encaixeAutomatico: { nivelTemplo: 0.3 },
    revisaoEncaixe: HAIR_CATALOG_ENCAIXE_REVISAO
  },
  {
    id: "demo-cachos-taper",
    nome: "Cachos taper",
    categoria: "Cacheado",
    asset: "/demo-cortes/cachos-taper-realista-v2.png",
    transformacaoPadrao: { escala: 1, deslocamentoX: 0, deslocamentoY: 0, rotacao: 0 },
    encaixeAutomatico: { nivelTemplo: 0.9 },
    revisaoEncaixe: HAIR_CATALOG_ENCAIXE_REVISAO
  },
  {
    id: "demo-slick-back",
    nome: "Slick back",
    categoria: "Longo",
    asset: "/demo-cortes/slick-back-realista-v2.png",
    transformacaoPadrao: { escala: 1, deslocamentoX: 0, deslocamentoY: 0, rotacao: 0 },
    encaixeAutomatico: { nivelTemplo: 1 },
    revisaoEncaixe: HAIR_CATALOG_ENCAIXE_REVISAO
  },
  {
    id: "demo-topo-volumoso",
    nome: "Topo volumoso",
    categoria: "Social",
    asset: "/demo-cortes/topo-volumoso-realista-v2.png",
    transformacaoPadrao: { escala: 1, deslocamentoX: 0, deslocamentoY: 0, rotacao: 0 },
    encaixeAutomatico: { nivelTemplo: 1 },
    revisaoEncaixe: HAIR_CATALOG_ENCAIXE_REVISAO
  }
]);

/**
 * Contrato local de um molde de cabelo.
 *
 * @typedef {Object} HairCatalogItem
 * @property {string} id
 * @property {string} nome
 * @property {string} categoria
 * @property {string|null} imageDataUrl Imagem enviada e salva localmente.
 * @property {string|null} asset Caminho de um asset empacotado no projeto.
 * @property {Object|null} metadataRecorte Dados do recorte manual transparente feito no navegador.
 * @property {boolean} ativo
 * @property {boolean} direitosConfirmados Confirmação declarada pelo dono para uso da imagem.
 * @property {boolean} prontoParaSimulacao Indica que o arquivo já é um recorte revisado, não uma foto bruta.
 * @property {{escala: number, deslocamentoX: number, deslocamentoY: number, rotacao: number}} transformacaoPadrao
 * @property {{nivelTemplo: number, ancoras: Object|null}} encaixeAutomatico Calibração do molde, nunca da selfie.
 * @property {number} revisaoEncaixe Revisão que invalida defaults demonstrativos antigos.
 * @property {"biblioteca-inicial"|"upload-local"|"edicao-local"} origem
 */

function normalizarTexto(valor, fallback = "") {
  return typeof valor === "string" && valor.trim() ? valor.trim() : fallback;
}

function normalizarTransformacao(transformacao) {
  const atual = transformacao && typeof transformacao === "object" ? transformacao : {};
  return Object.fromEntries(
    Object.entries(HAIR_CATALOG_TRANSFORMACAO_PADRAO).map(([chave, fallback]) => [
      chave,
      Number.isFinite(atual[chave]) ? atual[chave] : fallback
    ])
  );
}

function normalizarEncaixeAutomatico(encaixe) {
  const atual = encaixe && typeof encaixe === "object" ? encaixe : {};
  const nivel = Number(atual.nivelTemplo);
  const normalizarPonto = (ponto) => {
    const x = Number(ponto?.x);
    const y = Number(ponto?.y);
    if (![x, y].every(Number.isFinite) || x < 0 || y < 0) return null;
    return {
      x: Math.min(10_000, x),
      y: Math.min(10_000, y)
    };
  };
  const origem = atual.ancoras && typeof atual.ancoras === "object" ? atual.ancoras : null;
  const ancoras = origem
    ? {
      temploEsquerdo: normalizarPonto(origem.temploEsquerdo),
      frenteCentro: normalizarPonto(origem.frenteCentro),
      temploDireito: normalizarPonto(origem.temploDireito)
    }
    : null;
  return {
    nivelTemplo: Number.isFinite(nivel) ? Math.min(1, Math.max(0, nivel)) : 0.65,
    ancoras: ancoras && Object.values(ancoras).every(Boolean) ? ancoras : null
  };
}

function normalizarMetadataRecorte(metadata) {
  if (!metadata || typeof metadata !== "object" || metadata.metodo !== "poligono-manual") return null;

  const numeroPositivo = (valor) => (Number.isFinite(valor) && valor >= 0 ? valor : 0);
  return {
    metodo: "poligono-manual",
    formato: metadata.formato === "image/png" ? "image/png" : "image/webp",
    featherPx: numeroPositivo(metadata.featherPx),
    largura: numeroPositivo(metadata.largura),
    altura: numeroPositivo(metadata.altura),
    larguraFonte: numeroPositivo(metadata.larguraFonte),
    alturaFonte: numeroPositivo(metadata.alturaFonte),
    larguraOriginal: numeroPositivo(metadata.larguraOriginal),
    alturaOriginal: numeroPositivo(metadata.alturaOriginal),
    tamanhoBytes: numeroPositivo(metadata.tamanhoBytes),
    editadoEm: typeof metadata.editadoEm === "string" ? metadata.editadoEm : null
  };
}

function normalizarItem(item, indice) {
  if (!item || typeof item !== "object") return null;

  const nome = normalizarTexto(item.nome);
  if (!nome) return null;

  const imageDataUrl =
    typeof item.imageDataUrl === "string" && /^data:image\/(png|jpeg|webp);base64,/i.test(item.imageDataUrl)
      ? item.imageDataUrl
      : null;
  const asset = typeof item.asset === "string" && item.asset.startsWith("/") ? item.asset : null;
  const origensValidas = ["biblioteca-inicial", "upload-local", "edicao-local"];

  return {
    id: normalizarTexto(item.id, `corte-local-${indice}`),
    nome,
    categoria: normalizarTexto(item.categoria, "Outros"),
    imageDataUrl,
    asset,
    metadataRecorte: normalizarMetadataRecorte(item.metadataRecorte),
    ativo: item.ativo !== false,
    direitosConfirmados: item.origem === "biblioteca-inicial" || item.direitosConfirmados === true,
    prontoParaSimulacao: item.prontoParaSimulacao === true,
    transformacaoPadrao: normalizarTransformacao(item.transformacaoPadrao),
    encaixeAutomatico: normalizarEncaixeAutomatico(item.encaixeAutomatico),
    revisaoEncaixe: Number.isInteger(item.revisaoEncaixe) && item.revisaoEncaixe > 0
      ? item.revisaoEncaixe
      : 0,
    origem: origensValidas.includes(item.origem) ? item.origem : "edicao-local"
  };
}

function mesclarDemosComCatalogo(itens) {
  const demos = criarHairCatalogInicial();
  const idsDemo = new Set(demos.map((item) => item.id));
  const estadoDemoPorId = new Map();
  const uploadsDoDono = [];

  itens
    .map(normalizarItem)
    .filter(Boolean)
    .forEach((item) => {
      if (idsDemo.has(item.id)) {
        estadoDemoPorId.set(item.id, item);
        return;
      }

      // Moldes da biblioteca antiga não possuíam os recortes fotográficos
      // empacotados atuais. Uploads e edições do dono continuam preservados.
      if (item.origem !== "biblioteca-inicial") uploadsDoDono.push(item);
    });

  const demosMesclados = demos.map((demo) => {
    const salvo = estadoDemoPorId.get(demo.id);
    if (!salvo) return demo;

    return {
      ...demo,
      ativo: salvo.ativo,
      transformacaoPadrao: (
        salvo.asset !== demo.asset ||
        salvo.revisaoEncaixe !== demo.revisaoEncaixe
      )
        ? { ...demo.transformacaoPadrao }
        : { ...salvo.transformacaoPadrao },
      encaixeAutomatico: { ...demo.encaixeAutomatico },
      revisaoEncaixe: demo.revisaoEncaixe
    };
  });

  return [...demosMesclados, ...uploadsDoDono];
}

/** @returns {HairCatalogItem[]} */
export function criarHairCatalogInicial() {
  return HAIR_CATALOG_DEMOS.map((demo) => ({
    ...demo,
    imageDataUrl: null,
    metadataRecorte: null,
    ativo: true,
    direitosConfirmados: true,
    prontoParaSimulacao: true,
    transformacaoPadrao: normalizarTransformacao(demo.transformacaoPadrao),
    encaixeAutomatico: normalizarEncaixeAutomatico(demo.encaixeAutomatico),
    origem: "biblioteca-inicial"
  }));
}

/** @returns {HairCatalogItem[]} */
export function carregarHairCatalogLocal() {
  const inicial = criarHairCatalogInicial();
  if (typeof window === "undefined") return inicial;

  try {
    const bruto = localStorage.getItem(HAIR_CATALOG_STORAGE_KEY);
    if (!bruto) return inicial;

    const salvo = JSON.parse(bruto);
    const itens = Array.isArray(salvo) ? salvo : salvo?.itens;
    if (!Array.isArray(itens)) return inicial;

    return mesclarDemosComCatalogo(itens);
  } catch {
    return inicial;
  }
}

/** @param {HairCatalogItem[]} itens */
export function salvarHairCatalogLocal(itens) {
  if (typeof window === "undefined") return;
  const normalizados = mesclarDemosComCatalogo(itens);
  localStorage.setItem(
    HAIR_CATALOG_STORAGE_KEY,
    JSON.stringify({ versao: 1, atualizadoEm: new Date().toISOString(), itens: normalizados })
  );
}

export function criarHairCatalogId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `corte-${crypto.randomUUID()}`;
  }
  return `corte-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function validarArquivoHairCatalog(arquivo) {
  if (!arquivo) return "Selecione uma imagem para o molde.";
  if (!HAIR_CATALOG_ALLOWED_IMAGE_TYPES.includes(arquivo.type)) {
    return "Formato não aceito. Use PNG, JPG ou WebP.";
  }
  if (arquivo.size > HAIR_CATALOG_MAX_IMAGE_BYTES) {
    return "A imagem deve ter no máximo 1 MB.";
  }
  return null;
}

export function lerArquivoHairCatalog(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    leitor.readAsDataURL(arquivo);
  });
}

export function imagemHairCatalogTemTransparencia(dataUrl) {
  return new Promise((resolve) => {
    if (
      typeof document === "undefined" ||
      typeof dataUrl !== "string" ||
      !/^data:image\/(png|webp);base64,/i.test(dataUrl)
    ) {
      resolve(false);
      return;
    }

    const imagem = new Image();
    imagem.onload = () => {
      try {
        const maiorLado = Math.max(imagem.naturalWidth, imagem.naturalHeight);
        const escala = Math.min(1, 256 / maiorLado);
        const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
        const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const contexto = canvas.getContext("2d", { willReadFrequently: true });
        contexto.drawImage(imagem, 0, 0, largura, altura);
        const pixels = contexto.getImageData(0, 0, largura, altura).data;
        let transparentes = 0;
        const total = largura * altura;

        for (let indice = 3; indice < pixels.length; indice += 4) {
          if (pixels[indice] < 250) transparentes += 1;
        }

        resolve(transparentes / total >= 0.005);
      } catch {
        resolve(false);
      }
    };
    imagem.onerror = () => resolve(false);
    imagem.src = dataUrl;
  });
}
