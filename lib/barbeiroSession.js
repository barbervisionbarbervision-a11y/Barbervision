"use client";

import { createContext, useContext } from "react";

const CHAVE_DEMO = "barbervision_sessao_barbeiro";
const SessaoBarbeiroContext = createContext(null);

export function SessaoBarbeiroProvider({ sessao, children }) {
  return (
    <SessaoBarbeiroContext.Provider value={sessao}>
      {children}
    </SessaoBarbeiroContext.Provider>
  );
}

export function useSessaoBarbeiro() {
  return useContext(SessaoBarbeiroContext);
}

// As funções abaixo existem somente para o fallback demonstrativo sem Supabase.
export function getSessaoBarbeiroDemo() {
  if (typeof window === "undefined") return null;
  const bruto = sessionStorage.getItem(CHAVE_DEMO);

  try {
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    sessionStorage.removeItem(CHAVE_DEMO);
    return null;
  }
}

export function setSessaoBarbeiroDemo(barbeiro) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CHAVE_DEMO, JSON.stringify(barbeiro));
}

export function sairSessaoBarbeiroDemo() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHAVE_DEMO);
}

export function ehDono(sessao) {
  return sessao?.papel === "dono";
}
