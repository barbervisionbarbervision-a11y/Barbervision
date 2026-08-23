import assert from "node:assert/strict";
import test from "node:test";
import scheduler from "../src/index.js";

test("cron chama a rota protegida com a origem normalizada", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  let execution;
  globalThis.fetch = async (url, options) => {
    request = { options, url };
    return Response.json({ ok: true, processados: 0 });
  };

  try {
    scheduler.scheduled(null, {
      BARBERVISION_APP_URL: "https://barbervision.onrender.com/ignorado",
      BARBERVISION_CRON_SECRET: "segredo-de-teste"
    }, {
      waitUntil(promise) { execution = promise; }
    });
    await execution;

    assert.equal(request.url, "https://barbervision.onrender.com/api/internal/convites/processar");
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers.authorization, "Bearer segredo-de-teste");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("endpoint público do scheduler não expõe controle manual", async () => {
  const response = scheduler.fetch();
  assert.equal(response.status, 404);
});
