"use client";

import { useCallback, useEffect, useRef } from "react";
import Script from "next/script";

const SITE_KEY_TESTE = "1x00000000000000000000AA";

export default function TurnstileWidget({ onToken, resetKey }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    (process.env.NODE_ENV === "development" ? SITE_KEY_TESTE : "");

  const renderizar = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile || widgetRef.current !== null) return;
    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: "cadastro_cliente",
      theme: "dark",
      size: "flexible",
      callback: (token) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken("")
    });
  }, [onToken, siteKey]);

  useEffect(() => {
    if (widgetRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
      onToken("");
    }
  }, [onToken, resetKey]);

  useEffect(() => () => {
    if (widgetRef.current !== null && window.turnstile) {
      window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    }
  }, []);

  if (!siteKey) {
    return <p role="alert" className="text-sm text-red-400">Verificação de segurança indisponível.</p>;
  }

  return (
    <>
      <div ref={containerRef} className="min-h-[65px] w-full" aria-label="Verificação de segurança" />
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderizar}
        onError={() => onToken("")}
      />
    </>
  );
}

