"use client";

import { useRouter } from "next/navigation";
import Button from "./Button";
import { iniciarFluxo } from "@/lib/clienteFlow";

export default function IniciarAtendimento({ barbeariaSlug }) {
  const router = useRouter();

  function iniciar() {
    if (!barbeariaSlug) return;
    iniciarFluxo(barbeariaSlug);
    router.push(`/b/${encodeURIComponent(barbeariaSlug)}/cadastro`);
  }

  return (
    <Button type="button" onClick={iniciar} className="animate-fadeUp">
      Começar
    </Button>
  );
}
