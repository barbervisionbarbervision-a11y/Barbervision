function normalizarOrigem(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("BARBERVISION_APP_URL precisa usar HTTPS no scheduler.");
  }
  return url.origin;
}

async function alertar(env, details) {
  if (!env.BARBERVISION_ALERT_WEBHOOK_URL) return;
  try {
    await fetch(env.BARBERVISION_ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "barbervision-outbox-scheduler",
        occurredAt: new Date().toISOString(),
        ...details
      })
    });
  } catch (error) {
    console.error("Falha ao enviar alerta", {
      message: error instanceof Error ? error.message : "erro"
    });
  }
}

async function processar(env) {
  if (!env.BARBERVISION_APP_URL || !env.BARBERVISION_CRON_SECRET) {
    throw new Error("Segredos obrigatórios do scheduler não configurados.");
  }

  const origin = normalizarOrigem(env.BARBERVISION_APP_URL);
  const response = await fetch(`${origin}/api/internal/convites/processar`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.BARBERVISION_CRON_SECRET}`,
      "user-agent": "barbervision-cloudflare-scheduler/1.0"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.ok !== true) {
    throw new Error(`Worker da aplicação respondeu HTTP ${response.status}.`);
  }

  console.log("Outbox processada", {
    processados: Number(payload.processados || 0),
    status: response.status
  });
}

const scheduler = {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      processar(env).catch(async (error) => {
        const message = error instanceof Error ? error.message : "erro desconhecido";
        console.error("Falha ao processar outbox", { message });
        await alertar(env, { message });
        throw error;
      })
    );
  },

  fetch() {
    return new Response("Not found", { status: 404 });
  }
};

export default scheduler;
