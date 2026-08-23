import { timingSafeEqual } from "node:crypto";
import { processarConvitesEmail } from "@/lib/auth/invite-outbox";

export const runtime = "nodejs";
export const maxDuration = 60;

function autorizado(request) {
  const esperado = process.env.BARBERVISION_CRON_SECRET?.trim();
  const recebido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!esperado || !recebido) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  if (!autorizado(request)) return Response.json({ ok: false }, { status: 401 });
  try {
    const resultados = await processarConvitesEmail({ limite: 25 });
    return Response.json({ ok: true, processados: resultados.length, resultados });
  } catch (error) {
    console.error("[invite-outbox] execução interna falhou", { mensagem: error instanceof Error ? error.message : "erro" });
    return Response.json({ ok: false }, { status: 500 });
  }
}
