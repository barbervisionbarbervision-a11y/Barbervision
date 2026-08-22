"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessaoBarbeiro } from "./barbeiroSession";

// Guarda apenas a UX do fallback demonstrativo. No modo real, layouts de
// servidor e RLS fazem a autorização antes desta tela ser renderizada.
export function useSessaoDono() {
  const router = useRouter();
  const sessao = useSessaoBarbeiro();

  useEffect(() => {
    if (sessao && sessao.papel !== "dono") {
      router.replace("/barbeiro/dashboard");
    }
  }, [router, sessao]);

  return sessao?.papel === "dono" ? sessao : null;
}
