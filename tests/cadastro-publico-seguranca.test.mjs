import test from "node:test";
import assert from "node:assert/strict";
import {
  CONSENTIMENTO_CADASTRO_VERSAO,
  criarIdentificadorRateLimit,
  obterEnderecoRede,
  validarRespostaTurnstile
} from "../lib/cadastro-publico-seguranca.js";

test("prioriza o IP informado pela Cloudflare", () => {
  const headers = new Headers({ "cf-connecting-ip": "203.0.113.8", "x-forwarded-for": "198.51.100.3" });
  assert.equal(obterEnderecoRede(headers), "203.0.113.8");
});

test("usa o primeiro IP encaminhado quando não há Cloudflare", () => {
  const headers = new Headers({ "x-forwarded-for": "198.51.100.3, 10.0.0.1" });
  assert.equal(obterEnderecoRede(headers), "198.51.100.3");
});

test("gera HMAC estável sem expor o valor original", () => {
  const hash = criarIdentificadorRateLimit("rede", "203.0.113.8", "s".repeat(32));
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes("203.0.113.8"), false);
  assert.equal(hash, criarIdentificadorRateLimit("rede", "203.0.113.8", "s".repeat(32)));
});

test("recusa segredo curto", () => {
  assert.throws(() => criarIdentificadorRateLimit("rede", "valor", "curto"));
});

test("valida sucesso, ação e hostname do Turnstile", () => {
  const resposta = { success: true, action: "cadastro_cliente", hostname: "barbervision.onrender.com" };
  assert.equal(validarRespostaTurnstile(resposta, ["barbervision.onrender.com"]), true);
  assert.equal(validarRespostaTurnstile({ ...resposta, action: "login" }, ["barbervision.onrender.com"]), false);
  assert.equal(validarRespostaTurnstile(resposta, ["outro.example"]), false);
  assert.equal(validarRespostaTurnstile({ ...resposta, action: "test" }, [], true), true);
  assert.equal(validarRespostaTurnstile({ ...resposta, action: "test" }, [], false), false);
  assert.equal(validarRespostaTurnstile({ ...resposta, action: null }, [], true), true);
  assert.equal(CONSENTIMENTO_CADASTRO_VERSAO, "cadastro-v1");
});
