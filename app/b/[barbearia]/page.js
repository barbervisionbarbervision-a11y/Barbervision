import Link from "next/link";
import { PlayCircle } from "lucide-react";
import Logo from "@/components/Logo";
import IniciarAtendimento from "@/components/IniciarAtendimento";
import PoleDivider from "@/components/PoleDivider";
import { barbeariaExemplo, promocoesExemplo } from "@/lib/mockData";

export default async function TelaInicial({ params }) {
  // Fase futura: buscar a barbearia no Supabase pelo slug (params.barbearia).
  const { barbearia: barbeariaSlug } = await params;
  const barbearia = { ...barbeariaExemplo, slug: barbeariaSlug };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8 bg-ink">
      <div className="animate-fadeUp flex flex-col items-center gap-6">
        <Logo size="lg" />
        <p className="text-steel text-sm uppercase tracking-widest2">{barbearia.nome}</p>
      </div>

      <PoleDivider className="max-w-[220px]" />

      <p className="animate-fadeUp max-w-sm text-lg md:text-xl text-parchment/90 font-medium">
        Descubra como você ficará antes mesmo de cortar o cabelo.
      </p>

      {promocoesExemplo.filter((p) => p.ativa).length > 0 && (
        <div className="animate-fadeUp flex flex-col gap-2 w-full max-w-sm">
          {promocoesExemplo
            .filter((p) => p.ativa)
            .map((p) => (
              <div key={p.id} className="bg-white/5 border border-brass/30 rounded-xl px-4 py-3 text-left">
                <p className="text-brass text-xs uppercase tracking-widest2">{p.titulo}</p>
                <p className="text-parchment/80 text-sm mt-1">{p.descricao}</p>
              </div>
            ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <IniciarAtendimento barbeariaSlug={barbearia.slug} />
        <Link
          href={`/b/${barbearia.slug}/demo`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brass/60 px-5 py-3 text-sm font-semibold text-brass transition-colors hover:bg-brass hover:text-ink"
        >
          <PlayCircle size={18} aria-hidden="true" />
          Ver demonstração pronta
        </Link>
        <p className="max-w-xs text-xs leading-relaxed text-steel/70">
          Usa uma pessoa fictícia e cinco cortes fotográficos de amostra.
        </p>
      </div>
    </main>
  );
}
