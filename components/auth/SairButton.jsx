"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

export default function SairButton() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await criarClienteSupabaseBrowser().auth.signOut({ scope: "local" });
    router.replace("/barbeiro/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" onClick={sair} disabled={saindo} className="w-full">
      {saindo ? "Saindo..." : "Sair desta conta"}
    </Button>
  );
}
