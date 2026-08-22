import Link from "next/link";
import Logo from "@/components/Logo";

export default function AuthShell({ titulo, descricao, children, rodape }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-steel/25 bg-white/[0.03] p-6 shadow-2xl sm:p-8">
        <div className="mb-7 flex justify-center">
          <Link href="/" aria-label="Voltar à página inicial">
            <Logo size="md" />
          </Link>
        </div>
        <h1 className="text-center font-display text-2xl uppercase tracking-widest2 text-parchment">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-3 text-center text-sm leading-relaxed text-steel">{descricao}</p>
        )}
        <div className="mt-7">{children}</div>
        {rodape && <div className="mt-6 text-center text-sm text-steel">{rodape}</div>}
      </section>
    </main>
  );
}
