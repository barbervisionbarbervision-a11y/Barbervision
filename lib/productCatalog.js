export const PRODUCT_CATALOG_VERSION = 1;
export const PRODUCT_CATALOG_KEY_PREFIX = "barbervision:produtos:v1";
export const PRODUCT_IMAGE_MAX_BYTES = 800 * 1024;
export const PRODUCT_IMAGE_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const PRODUCT_CATEGORIES = Object.freeze([
  { id: "shampoo", label: "Shampoo" },
  { id: "condicionador", label: "Condicionador" },
  { id: "finalizador", label: "Finalizador" },
  { id: "protecao", label: "Proteção para modelagem" },
  { id: "kit", label: "Kit de cuidados" },
  { id: "outros", label: "Outros" }
]);

export const PRODUCT_CARE_OPTIONS = Object.freeze([
  { id: "limpeza-suave", label: "Limpeza suave" },
  { id: "condicionamento", label: "Condicionamento" },
  { id: "textura-matte", label: "Textura e efeito matte" },
  { id: "protecao-termica", label: "Modelagem com calor" },
  { id: "definicao-cachos", label: "Definição de cachos" },
  { id: "fixacao-flexivel", label: "Fixação flexível" },
  { id: "alinhamento", label: "Alinhamento" },
  { id: "volume", label: "Volume" },
  { id: "universal", label: "Uso geral" }
]);

const IDS_CATEGORIA = new Set(PRODUCT_CATEGORIES.map((categoria) => categoria.id));
const IDS_CUIDADO = new Set(PRODUCT_CARE_OPTIONS.map((cuidado) => cuidado.id));

const PRODUTOS_DEMONSTRACAO = Object.freeze([
  {
    id: "produto-demo-pasta-matte",
    nome: "Pasta matte essencial",
    descricao: "Textura e controle com acabamento sem brilho para usar em pequena quantidade.",
    categoria: "finalizador",
    precoCentavos: 3990,
    estoque: 8,
    ativo: true,
    cuidadoIds: ["textura-matte", "volume"],
    origem: "demonstracao"
  },
  {
    id: "produto-demo-creme-cachos",
    nome: "Creme definidor de cachos",
    descricao: "Finalização leve para ajudar a organizar os cachos sem retirar o movimento.",
    categoria: "finalizador",
    precoCentavos: 3490,
    estoque: 6,
    ativo: true,
    cuidadoIds: ["definicao-cachos", "condicionamento"],
    origem: "demonstracao"
  },
  {
    id: "produto-demo-protetor-termico",
    nome: "Protetor térmico diário",
    descricao: "Preparação para rotinas que usam secador em temperatura moderada.",
    categoria: "protecao",
    precoCentavos: 2990,
    estoque: 10,
    ativo: true,
    cuidadoIds: ["protecao-termica", "volume", "alinhamento"],
    origem: "demonstracao"
  },
  {
    id: "produto-demo-pomada-agua",
    nome: "Pomada flexível à base de água",
    descricao: "Controle gradual e alinhamento com remoção simples durante a lavagem.",
    categoria: "finalizador",
    precoCentavos: 4290,
    estoque: 5,
    ativo: true,
    cuidadoIds: ["fixacao-flexivel", "alinhamento"],
    origem: "demonstracao"
  },
  {
    id: "produto-demo-shampoo-suave",
    nome: "Shampoo suave de uso regular",
    descricao: "Limpeza para a rotina cotidiana, sem promessa de tratamento clínico.",
    categoria: "shampoo",
    precoCentavos: 3190,
    estoque: 12,
    ativo: true,
    cuidadoIds: ["limpeza-suave", "universal"],
    origem: "demonstracao"
  }
]);

const CUIDADOS_POR_PERFIL = Object.freeze({
  cropTexturizado: ["textura-matte", "limpeza-suave"],
  quiffModerno: ["protecao-termica", "fixacao-flexivel", "volume"],
  cachosTaper: ["definicao-cachos", "condicionamento", "limpeza-suave"],
  slickBack: ["alinhamento", "fixacao-flexivel", "condicionamento"],
  topoVolumoso: ["protecao-termica", "volume", "textura-matte"],
  curtoComLaterais: ["textura-matte", "fixacao-flexivel", "limpeza-suave"],
  social: ["fixacao-flexivel", "alinhamento", "protecao-termica"],
  cachos: ["definicao-cachos", "condicionamento", "limpeza-suave"],
  longo: ["condicionamento", "alinhamento", "protecao-termica"],
  geral: ["limpeza-suave", "condicionamento", "universal"]
});

function normalizarTexto(valor, fallback = "", limite = 240) {
  if (typeof valor !== "string") return fallback;
  const texto = valor.trim().replace(/\s+/g, " ");
  return (texto || fallback).slice(0, limite);
}

function normalizarSlug(valor) {
  return normalizarTexto(Array.isArray(valor) ? valor[0] : valor, "", 120);
}

function chaveCatalogo(barbeariaSlug) {
  const slug = normalizarSlug(barbeariaSlug);
  return slug ? `${PRODUCT_CATALOG_KEY_PREFIX}:${encodeURIComponent(slug)}` : null;
}

function inteiroNoIntervalo(valor, minimo, maximo, fallback) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return fallback;
  return Math.min(maximo, Math.max(minimo, Math.round(numero)));
}

function tamanhoAproximadoDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

export function validarImagemDataUrlProduto(dataUrl) {
  if (dataUrl == null || dataUrl === "") return true;
  if (typeof dataUrl !== "string" || !/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) return false;
  return tamanhoAproximadoDataUrl(dataUrl) <= PRODUCT_IMAGE_MAX_BYTES;
}

export function validarArquivoImagemProduto(arquivo) {
  if (!arquivo) return "Selecione uma foto do produto.";
  if (!PRODUCT_IMAGE_ALLOWED_TYPES.includes(arquivo.type)) return "Use uma imagem PNG, JPG ou WebP.";
  if (arquivo.size > PRODUCT_IMAGE_MAX_BYTES) return "A foto do produto deve ter no máximo 800 KB.";
  return null;
}

export function lerArquivoImagemProduto(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Não foi possível ler a foto do produto."));
    leitor.readAsDataURL(arquivo);
  });
}

export function normalizarWhatsappComercial(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (!digitos) return "";
  const comPais = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  return /^[1-9]\d{9,14}$/.test(comPais) ? comPais : "";
}

export function validarWhatsappComercial(valor) {
  if (!String(valor || "").trim()) return null;
  return normalizarWhatsappComercial(valor)
    ? null
    : "Informe DDD e número; o código do Brasil (55) é adicionado quando necessário.";
}

export function normalizarProdutoCatalogo(produto, indice = 0) {
  if (!produto || typeof produto !== "object" || Array.isArray(produto)) return null;
  const nome = normalizarTexto(produto.nome, "", 90);
  if (!nome) return null;

  const cuidadoIds = Array.isArray(produto.cuidadoIds)
    ? [...new Set(produto.cuidadoIds.filter((id) => IDS_CUIDADO.has(id)))]
    : [];
  const imagemDataUrl = validarImagemDataUrlProduto(produto.imagemDataUrl) ? produto.imagemDataUrl || null : null;

  return {
    id: normalizarTexto(produto.id, `produto-${indice}`, 120),
    nome,
    descricao: normalizarTexto(produto.descricao, "", 320),
    categoria: IDS_CATEGORIA.has(produto.categoria) ? produto.categoria : "outros",
    precoCentavos: inteiroNoIntervalo(produto.precoCentavos, 0, 100_000_000, 0),
    estoque: inteiroNoIntervalo(produto.estoque, 0, 999_999, 0),
    ativo: produto.ativo !== false,
    cuidadoIds: cuidadoIds.length ? cuidadoIds : ["universal"],
    imagemDataUrl,
    origem: produto.origem === "demonstracao" ? "demonstracao" : "cadastro-local"
  };
}

function normalizarConfiguracao(configuracao) {
  return {
    whatsappComercial: normalizarWhatsappComercial(configuracao?.whatsappComercial)
  };
}

function normalizarCatalogo(catalogo) {
  const itens = Array.isArray(catalogo?.itens)
    ? catalogo.itens.map(normalizarProdutoCatalogo).filter(Boolean)
    : [];

  return {
    versao: PRODUCT_CATALOG_VERSION,
    atualizadoEm: normalizarTexto(catalogo?.atualizadoEm, new Date().toISOString(), 40),
    configuracao: normalizarConfiguracao(catalogo?.configuracao),
    itens
  };
}

export function criarCatalogoProdutosInicial() {
  return normalizarCatalogo({
    configuracao: { whatsappComercial: "" },
    itens: PRODUTOS_DEMONSTRACAO
  });
}

export function carregarCatalogoProdutosLocal(barbeariaSlug) {
  const inicial = criarCatalogoProdutosInicial();
  if (typeof window === "undefined") return inicial;

  const chave = chaveCatalogo(barbeariaSlug);
  if (!chave) return inicial;

  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return inicial;
    const salvo = JSON.parse(bruto);
    if (salvo?.versao !== PRODUCT_CATALOG_VERSION || !Array.isArray(salvo.itens)) return inicial;
    return normalizarCatalogo(salvo);
  } catch {
    return inicial;
  }
}

export function salvarCatalogoProdutosLocal(barbeariaSlug, catalogo) {
  if (typeof window === "undefined") return null;
  const chave = chaveCatalogo(barbeariaSlug);
  if (!chave) throw new Error("Barbearia inválida para salvar o catálogo.");

  const normalizado = normalizarCatalogo({ ...catalogo, atualizadoEm: new Date().toISOString() });
  localStorage.setItem(chave, JSON.stringify(normalizado));
  return normalizado;
}

export function criarProdutoCatalogoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `produto-${crypto.randomUUID()}`;
  }
  return `produto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function salvarProdutoCatalogoLocal(barbeariaSlug, produto) {
  const catalogo = carregarCatalogoProdutosLocal(barbeariaSlug);
  const normalizado = normalizarProdutoCatalogo(produto, catalogo.itens.length);
  if (!normalizado) throw new Error("Produto inválido.");

  const existe = catalogo.itens.some((item) => item.id === normalizado.id);
  const itens = existe
    ? catalogo.itens.map((item) => (item.id === normalizado.id ? normalizado : item))
    : [...catalogo.itens, normalizado];
  return salvarCatalogoProdutosLocal(barbeariaSlug, { ...catalogo, itens });
}

export function removerProdutoCatalogoLocal(barbeariaSlug, produtoId) {
  const catalogo = carregarCatalogoProdutosLocal(barbeariaSlug);
  const itens = catalogo.itens.filter((item) => item.id !== produtoId);
  return salvarCatalogoProdutosLocal(barbeariaSlug, { ...catalogo, itens });
}

export function salvarConfiguracaoProdutosLocal(barbeariaSlug, configuracao) {
  const catalogo = carregarCatalogoProdutosLocal(barbeariaSlug);
  return salvarCatalogoProdutosLocal(barbeariaSlug, {
    ...catalogo,
    configuracao: { ...catalogo.configuracao, ...configuracao }
  });
}

export function formatarPrecoProduto(precoCentavos) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    inteiroNoIntervalo(precoCentavos, 0, 100_000_000, 0) / 100
  );
}

export function recomendarProdutosParaPlano(itens, plano, limite = 3) {
  const cuidados = new Set(CUIDADOS_POR_PERFIL[plano?.perfilId] || CUIDADOS_POR_PERFIL.geral);
  const maximo = inteiroNoIntervalo(limite, 1, 12, 3);

  return (Array.isArray(itens) ? itens : [])
    .map(normalizarProdutoCatalogo)
    .filter((produto) => produto && produto.ativo && produto.estoque > 0)
    .map((produto) => {
      const correspondencias = produto.cuidadoIds.filter((id) => cuidados.has(id));
      const score = correspondencias.length * 10 + (produto.cuidadoIds.includes("universal") ? 1 : 0);
      return { produto, score, correspondencias };
    })
    .filter((resultado) => resultado.score > 0)
    .sort((a, b) => b.score - a.score || a.produto.precoCentavos - b.produto.precoCentavos)
    .slice(0, maximo)
    .map(({ produto, correspondencias }) => ({ ...produto, correspondencias }));
}

export function criarMensagemInteresseProduto({ produto, corteNome, barbeariaNome }) {
  const nomeProduto = normalizarTexto(produto?.nome, "produto indicado", 90);
  const nomeCorte = normalizarTexto(corteNome, "meu corte", 90);
  const nomeBarbearia = normalizarTexto(barbeariaNome, "a barbearia", 90);
  const preco = formatarPrecoProduto(produto?.precoCentavos);

  return `Olá, ${nomeBarbearia}! Vi no Barber Vision o produto “${nomeProduto}” por ${preco}, indicado para cuidar do corte ${nomeCorte}. Gostaria de confirmar a disponibilidade e saber se posso separar para retirada. Código: ${normalizarTexto(produto?.id, "sem código", 120)}.`;
}

export function criarLinkWhatsappProduto(whatsappComercial, mensagem) {
  const numero = normalizarWhatsappComercial(whatsappComercial);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(normalizarTexto(mensagem, "Olá!", 900))}`;
}
