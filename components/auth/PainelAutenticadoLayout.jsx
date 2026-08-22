"use client";

import Sidebar from "@/components/Sidebar";
import { SessaoBarbeiroProvider } from "@/lib/barbeiroSession";

export default function PainelAutenticadoLayout({ sessao, children }) {
  return (
    <SessaoBarbeiroProvider sessao={sessao}>
      <div className="min-h-screen flex flex-col md:flex-row bg-ink">
        <Sidebar sessao={sessao} />
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </div>
    </SessaoBarbeiroProvider>
  );
}
