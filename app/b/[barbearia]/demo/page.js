"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { iniciarFluxo, setFluxo } from "@/lib/clienteFlow";

export default function DemonstracaoPronta() {
  const router = useRouter();
  const { barbearia } = useParams();
  const iniciou = useRef(false);

  useEffect(() => {
    if (!barbearia || iniciou.current) return;
    iniciou.current = true;

    iniciarFluxo(barbearia);
    setFluxo({
      etapa: "simulacao",
      nome: "Cliente de demonstração",
      whatsapp: "(11) 99999-9999",
      selfieDataUrl: "/demo-cliente.png"
    });
    router.replace(`/b/${barbearia}/simulacao`);
  }, [barbearia, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center">
      <Logo size="sm" />
      <div className="flex items-center gap-2 text-sm text-steel" role="status">
        <Loader2 size={18} className="animate-spin text-brass" aria-hidden="true" />
        Preparando demonstração fotográfica...
      </div>
    </main>
  );
}
