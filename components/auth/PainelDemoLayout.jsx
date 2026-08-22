"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  getSessaoBarbeiroDemo,
  SessaoBarbeiroProvider
} from "@/lib/barbeiroSession";

export default function PainelDemoLayout({ children }) {
  const router = useRouter();
  const [sessao, setSessao] = useState(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const atual = getSessaoBarbeiroDemo();
      if (!atual) {
        router.replace("/barbeiro/login");
        return;
      }
      setSessao({ ...atual, origem: "demo" });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  if (!sessao) return null;

  return (
    <SessaoBarbeiroProvider sessao={sessao}>
      <div className="min-h-screen flex flex-col md:flex-row bg-ink">
        <Sidebar sessao={sessao} />
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </div>
    </SessaoBarbeiroProvider>
  );
}
