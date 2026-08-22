import Link from "next/link";
import { Scissors, ShieldCheck, Store } from "lucide-react";
import Logo from "@/components/Logo";
import { barbeariaExemplo, promocoesExemplo } from "@/lib/mockData";

export default async function Home({ searchParams }) {
  const parametros = await searchParams;
  const modoSeguro = parametros?.modo === "seguro";
  const promoAtiva = promocoesExemplo.find((p) => p.ativa);

  return (
    <main className="min-h-screen flex flex-col bg-ink">
      <div className="flex flex-col items-center pt-10 pb-6 px-6">
        <Logo size="md" />
        <p className="text-steel text-xs uppercase tracking-widest2 mt-3">Escolha como você quer entrar</p>
      </div>

      {modoSeguro && (
        <div
          role="alert"
          className="mx-6 mb-4 flex items-start justify-center gap-3 rounded-xl border border-brass/40 bg-brass/10 px-4 py-3 text-parchment"
        >
          <ShieldCheck className="mt-0.5 shrink-0 text-brass" size={20} aria-hidden="true" />
          <p className="max-w-2xl text-sm">
            O painel interno de demonstração está bloqueado neste ambiente. A área do cliente continua disponível.
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Lado do cliente */}
        <Link
          href={`/b/${barbeariaExemplo.slug}`}
          className="group flex-1 flex flex-col items-center justify-center gap-5 px-8 py-14 border-t md:border-t-0 md:border-r border-steel/20 transition-colors hover:bg-white/5"
        >
          <Scissors className="text-brass" size={40} />
          <div className="text-center">
            <h2 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Sou cliente</h2>
            <p className="text-steel text-sm mt-2 max-w-xs">
              Simule seu próximo corte e veja as promoções da sua barbearia.
            </p>
          </div>
          {promoAtiva && (
            <div className="bg-white/5 border border-brass/30 rounded-xl px-4 py-3 max-w-xs text-center">
              <p className="text-brass text-xs uppercase tracking-widest2">Promoção ativa</p>
              <p className="text-parchment text-sm mt-1">{promoAtiva.titulo}</p>
            </div>
          )}
          <span className="text-brass text-sm font-semibold group-hover:underline">Entrar como cliente →</span>
        </Link>

        {/* Lado da loja / barbeiro */}
        <Link
          href="/barbeiro/login"
          className="group flex-1 flex flex-col items-center justify-center gap-5 px-8 py-14 transition-colors hover:bg-white/5"
        >
          <Store className="text-barber" size={40} />
          <div className="text-center">
            <h2 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Sou a loja</h2>
            <p className="text-steel text-sm mt-2 max-w-xs">
              Acompanhe o funil de vendas, cadastre promoções e novos cortes pros seus clientes.
            </p>
          </div>
          <span className="text-barber text-sm font-semibold group-hover:underline">Entrar como barbearia →</span>
        </Link>
      </div>
    </main>
  );
}
