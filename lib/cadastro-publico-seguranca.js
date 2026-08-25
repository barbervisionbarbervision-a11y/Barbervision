import { createHmac, randomUUID } from "node:crypto";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const ACAO_TURNSTILE = "cadastro_cliente";

export const CONSENTIMENTO_CADASTRO_VERSAO = "cadastro-v1";

export function obterEnderecoRede(headers) {
  const cloudflare = headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;

  const encaminhado = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || null;
}

export function criarIdentificadorRateLimit(escopo, valor, segredo) {
  if (!segredo || segredo.length < 32) {
    throw new Error("BARBERVISION_RATE_LIMIT_SECRET deve ter pelo menos 32 caracteres.");
  }

  return createHmac("sha256", segredo)
    .update(`${escopo}:${valor}`, "utf8")
    .digest("hex");
}

export function validarRespostaTurnstile(resultado, hostnamesPermitidos = [], permitirAcaoTeste = false) {
  const acaoValida = resultado?.action === ACAO_TURNSTILE ||
    (permitirAcaoTeste && (resultado?.action === "test" || resultado?.action == null));
  if (!resultado?.success || !acaoValida) return false;
  if (hostnamesPermitidos.length === 0) return true;
  return hostnamesPermitidos.includes(String(resultado.hostname || "").toLocaleLowerCase("pt-BR"));
}

export async function verificarTurnstile({ token, enderecoRede, fetchImpl = fetch }) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() ||
    (process.env.NODE_ENV === "development" ? "1x0000000000000000000000000000000AA" : "");
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY não configurada.");
  if (typeof token !== "string" || token.length < 1 || token.length > 2048) return false;

  const corpo = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: randomUUID()
  });
  if (enderecoRede) corpo.set("remoteip", enderecoRede);

  const resposta = await fetchImpl(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });
  if (!resposta.ok) throw new Error(`Siteverify respondeu ${resposta.status}.`);

  const hostnamesPermitidos = (process.env.BARBERVISION_TURNSTILE_HOSTNAMES || "")
    .split(",")
    .map((item) => item.trim().toLocaleLowerCase("pt-BR"))
    .filter(Boolean);

  return validarRespostaTurnstile(
    await resposta.json(),
    hostnamesPermitidos,
    process.env.NODE_ENV !== "production"
  );
}
