export const POS_VENDA_VERSAO = 1;

const PREFIXO_CHAVE = "barbervision:pos-venda:v1";

function normalizarTexto(valor, fallback = "") {
  if (typeof valor !== "string") return fallback;
  const texto = valor.trim().replace(/\s+/g, " ");
  return texto || fallback;
}

function normalizarSlug(valor) {
  return normalizarTexto(Array.isArray(valor) ? valor[0] : valor);
}

function chavePosVenda(barbeariaSlug) {
  const slug = normalizarSlug(barbeariaSlug);
  return slug ? `${PREFIXO_CHAVE}:${encodeURIComponent(slug)}` : null;
}

function normalizarCorte(corte) {
  if (corte && typeof corte === "object" && !Array.isArray(corte)) {
    return {
      nome: normalizarTexto(corte.nome, "Corte personalizado"),
      categoria: normalizarTexto(corte.categoria, "Outros")
    };
  }

  return {
    nome: normalizarTexto(corte, "Corte personalizado"),
    categoria: "Outros"
  };
}

function normalizarAvaliacao(avaliacao) {
  if (!avaliacao || typeof avaliacao !== "object") return null;

  const nota = Number(avaliacao.nota);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return null;

  return {
    nota,
    comentario: normalizarTexto(avaliacao.comentario).slice(0, 600),
    avaliadoEm: normalizarTexto(avaliacao.avaliadoEm, new Date().toISOString())
  };
}

function normalizarContexto(contexto, slugEsperado) {
  if (!contexto || typeof contexto !== "object" || contexto.versao !== POS_VENDA_VERSAO) return null;

  const barbeariaSlug = normalizarSlug(contexto.barbeariaSlug);
  if (!barbeariaSlug || (slugEsperado && barbeariaSlug !== slugEsperado)) return null;

  return {
    versao: POS_VENDA_VERSAO,
    barbeariaSlug,
    corte: normalizarCorte(contexto.corte),
    barba: normalizarTexto(contexto.barba, "Não informada"),
    horario: normalizarTexto(contexto.horario, "Horário não informado"),
    criadoEm: normalizarTexto(contexto.criadoEm, new Date().toISOString()),
    avaliacao: normalizarAvaliacao(contexto.avaliacao)
  };
}

/**
 * Guarda apenas o necessário para demonstrar o pós-venda no mesmo navegador.
 * Selfie, nome e telefone nunca fazem parte deste registro.
 */
export function salvarContextoPosVenda({ barbeariaSlug, corte, barba, horario }) {
  if (typeof window === "undefined") return null;

  const slug = normalizarSlug(barbeariaSlug);
  const chave = chavePosVenda(slug);
  if (!chave) return null;

  const contexto = {
    versao: POS_VENDA_VERSAO,
    barbeariaSlug: slug,
    corte: normalizarCorte(corte),
    barba: normalizarTexto(barba, "Não informada"),
    horario: normalizarTexto(horario, "Horário não informado"),
    criadoEm: new Date().toISOString(),
    avaliacao: null
  };

  try {
    localStorage.setItem(chave, JSON.stringify(contexto));
    return contexto;
  } catch {
    // Evita que uma confirmação atual reutilize por engano o recibo antigo
    // quando o navegador bloqueia ou fica sem espaço no armazenamento.
    try {
      localStorage.removeItem(chave);
    } catch {}
    return null;
  }
}

export function carregarContextoPosVenda(barbeariaSlug) {
  if (typeof window === "undefined") return null;

  const slug = normalizarSlug(barbeariaSlug);
  const chave = chavePosVenda(slug);
  if (!chave) return null;

  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    return normalizarContexto(JSON.parse(bruto), slug);
  } catch {
    return null;
  }
}

export function salvarAvaliacaoPosVenda(barbeariaSlug, { nota, comentario }) {
  if (typeof window === "undefined") return null;

  const atual = carregarContextoPosVenda(barbeariaSlug);
  if (!atual) return null;

  const avaliacao = normalizarAvaliacao({
    nota,
    comentario,
    avaliadoEm: new Date().toISOString()
  });
  if (!avaliacao) return null;

  const atualizado = { ...atual, avaliacao };
  const chave = chavePosVenda(atual.barbeariaSlug);

  try {
    localStorage.setItem(chave, JSON.stringify(atualizado));
    return atualizado;
  } catch {
    return null;
  }
}
