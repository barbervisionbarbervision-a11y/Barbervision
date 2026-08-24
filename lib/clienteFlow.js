const KEY = "barbervision:fluxo";
const VERSAO_FLUXO = 3;

const vazio = {
  versao: VERSAO_FLUXO,
  barbeariaSlug: null,
  etapa: "inicio",
  nome: "",
  email: "",
  whatsapp: "",
  codigoIndicacao: null,
  selfieDataUrl: null,
  corte: null,
  barba: null,
  ajusteCabelo: null,
  neutralizacaoCabelo: null
};

export function getFluxo() {
  if (typeof window === "undefined") return vazio;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return vazio;

    const salvo = JSON.parse(raw);
    if (salvo?.versao !== VERSAO_FLUXO) return vazio;
    return { ...vazio, ...salvo };
  } catch {
    return vazio;
  }
}

export function iniciarFluxo(barbeariaSlug) {
  if (typeof window === "undefined") return;
  const novo = {
    ...vazio,
    barbeariaSlug,
    etapa: "cadastro"
  };
  sessionStorage.setItem(KEY, JSON.stringify(novo));
  return novo;
}

export function setFluxo(patch) {
  if (typeof window === "undefined") return;
  const atual = getFluxo();
  const novo = { ...atual, ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(novo));
  return novo;
}

export function limparFluxo() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
