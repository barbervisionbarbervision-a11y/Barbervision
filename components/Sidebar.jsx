"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, UserRoundCog, ShieldCheck, Wand2, History, Gift, BookOpen, Filter, Percent, Star, Trophy, LogOut, ShoppingBag, WalletCards } from "lucide-react";
import Logo from "./Logo";
import { sairSessaoBarbeiroDemo } from "@/lib/barbeiroSession";
import { criarClienteSupabaseBrowser } from "@/lib/supabase/client";

// somenteDono: true = só o dono da barbearia vê esse item no menu.
const ITENS = [
  { href: "/barbeiro/dashboard", label: "Dashboard", icon: LayoutDashboard, somenteDono: false },
  { href: "/barbeiro/equipe", label: "Equipe", icon: UserRoundCog, somenteDono: true },
  { href: "/barbeiro/funil", label: "Funil de vendas", icon: Filter, somenteDono: true },
  { href: "/barbeiro/promocoes", label: "Promoções", icon: Percent, somenteDono: true },
  { href: "/barbeiro/clientes", label: "Clientes", icon: Users, somenteDono: false },
  { href: "/barbeiro/simulacoes", label: "Simulações", icon: Wand2, somenteDono: false },
  { href: "/barbeiro/historico", label: "Histórico", icon: History, somenteDono: false },
  { href: "/barbeiro/avaliacoes", label: "Avaliações", icon: Star, somenteDono: false },
  { href: "/barbeiro/financeiro", label: "Fechamento", icon: WalletCards, somenteDono: true },
  { href: "/barbeiro/comissoes", label: "Comissões & Ranking", icon: Trophy, somenteDono: true },
  { href: "/barbeiro/fidelidade", label: "Fidelidade", icon: Gift, somenteDono: true },
  { href: "/barbeiro/catalogo", label: "Catálogo", icon: BookOpen, somenteDono: true },
  { href: "/barbeiro/produtos", label: "Produtos", icon: ShoppingBag, somenteDono: true },
  { href: "/barbeiro/seguranca", label: "Segurança", icon: ShieldCheck, somenteDono: false }
];

export default function Sidebar({ sessao }) {
  const pathname = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const ehDono = sessao?.papel === "dono";
  const itensVisiveis = ITENS.filter((item) => !item.somenteDono || ehDono);

  async function sair() {
    if (saindo) return;
    setSaindo(true);

    if (sessao?.origem === "supabase") {
      await criarClienteSupabaseBrowser().auth.signOut({ scope: "local" });
    } else {
      sairSessaoBarbeiroDemo();
    }

    router.replace("/barbeiro/login");
    router.refresh();
  }

  return (
    <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-steel/20 md:min-h-screen p-4 md:p-6 flex md:flex-col">
      <div className="mb-8 hidden md:block">
        <Logo size="sm" />
        {sessao && (
          <div className="mt-3">
            <p className="text-parchment text-sm font-medium">{sessao.nome}</p>
            <p className="text-xs text-steel uppercase tracking-widest2">
              {ehDono ? "Dono da barbearia" : "Barbeiro"}
            </p>
          </div>
        )}
      </div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible flex-1">
        {itensVisiveis.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                ativo ? "bg-brass text-ink font-semibold" : "text-parchment/80 hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={sair}
        disabled={saindo}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm whitespace-nowrap text-steel hover:text-barber hover:bg-white/5 md:mt-4 disabled:opacity-50"
      >
        <LogOut size={16} /> {saindo ? "Saindo..." : "Sair"}
      </button>
    </aside>
  );
}
