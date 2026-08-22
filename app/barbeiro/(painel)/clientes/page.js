"use client";

import { useState } from "react";
import { MessageCircle, Search, X } from "lucide-react";
import { clientesExemplo, etapasFunil, equipeExemplo } from "@/lib/mockData";
import { useSessaoBarbeiro } from "@/lib/barbeiroSession";
import { diasDesde } from "@/lib/dataUtils";

function tituloEtapa(chave) {
  return etapasFunil.find((e) => e.chave === chave)?.titulo || chave;
}

function nomeBarbeiro(id) {
  return equipeExemplo.find((b) => b.id === id)?.nome || "—";
}

function mensagemReativacao(nome) {
  return `Oi ${nome}! Faz tempo que você não vem na barbearia — bora marcar um novo corte? 💈`;
}

function normalizarNome(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function clienteCorrespondeABusca(cliente, busca) {
  const termoNome = normalizarNome(busca);
  if (!termoNome) return true;

  const nomeEncontrado = normalizarNome(cliente.nome).includes(termoNome);
  const digitosBusca = String(busca).replace(/\D/g, "");
  const telefone = String(cliente.whatsapp || "").replace(/\D/g, "");
  const telefoneEncontrado =
    digitosBusca.length > 0 &&
    (telefone.includes(digitosBusca) || `55${telefone}`.includes(digitosBusca));

  return nomeEncontrado || telefoneEncontrado;
}

export default function Clientes() {
  const sessao = useSessaoBarbeiro();
  const [busca, setBusca] = useState("");
  const [clientePreviaId, setClientePreviaId] = useState(null);

  if (!sessao) return null;

  const ehDono = sessao.papel === "dono";
  const clientes = ehDono ? clientesExemplo : clientesExemplo.filter((c) => c.barbeiroId === sessao.id);
  const clientesFiltrados = clientes.filter((cliente) => clienteCorrespondeABusca(cliente, busca));
  const clientePrevia = clientes.find((cliente) => cliente.id === clientePreviaId) || null;
  const buscaAtiva = busca.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">
          {ehDono ? "Clientes" : "Minha carteira de clientes"}
        </h1>
        {!ehDono && <p className="text-sm text-steel mt-1">Só você vê essa lista — os clientes dos outros barbeiros ficam privados.</p>}
      </div>

      <section className="rounded-xl border border-steel/20 bg-white/5 p-4" aria-labelledby="titulo-busca-clientes">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="block flex-1">
            <label id="titulo-busca-clientes" htmlFor="busca-clientes" className="text-sm font-semibold text-parchment">
              Pesquisar cliente
            </label>
            <span className="mt-1 block text-xs text-steel">
              Digite o nome ou o número de telefone, com ou sem formatação.
            </span>
            <span className="relative mt-3 block max-w-2xl">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel"
              />
              <input
                id="busca-clientes"
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Ex.: Carlos Souza ou 99999-1111"
                autoComplete="off"
                className="min-h-11 w-full rounded-lg border border-steel/30 bg-ink py-2.5 pl-10 pr-11 text-parchment outline-none placeholder:text-steel/50 focus:border-brass"
              />
              {buscaAtiva && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  aria-label="Limpar pesquisa de clientes"
                  title="Limpar pesquisa"
                  className="absolute right-1.5 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-md text-steel hover:bg-white/5 hover:text-parchment focus:outline-none focus:ring-2 focus:ring-brass"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              )}
            </span>
          </div>

          <p className="shrink-0 text-xs text-steel" aria-live="polite">
            {buscaAtiva
              ? `${clientesFiltrados.length} de ${clientes.length} cliente(s)`
              : `${clientes.length} cliente(s) na lista`}
          </p>
        </div>
      </section>

      {clientePrevia && (
        <section
          id="previa-reativacao"
          className="rounded-xl border border-brass/35 bg-brass/10 p-4"
          aria-labelledby="titulo-previa-reativacao"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <MessageCircle className="mt-0.5 shrink-0 text-brass" size={18} aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="titulo-previa-reativacao" className="text-sm font-semibold text-parchment">
                  Prévia segura da mensagem
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-steel">
                  Nada foi enviado e nenhum aplicativo externo será aberto. O telefone abaixo é fictício e existe
                  somente para a demonstração.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClientePreviaId(null)}
              aria-label="Fechar prévia da mensagem"
              className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-steel hover:bg-white/5 hover:text-parchment focus:outline-none focus:ring-2 focus:ring-brass"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brass">
            {clientePrevia.nome} · {clientePrevia.whatsapp}
          </p>
          <p className="mt-2 rounded-lg border border-steel/20 bg-ink/70 p-3 text-sm leading-relaxed text-parchment">
            {mensagemReativacao(clientePrevia.nome)}
          </p>
        </section>
      )}

      <div className="overflow-x-auto bg-white/5 border border-steel/20 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-steel border-b border-steel/20">
              <th className="p-4 font-medium">Nome</th>
              <th className="p-4 font-medium">WhatsApp</th>
              <th className="p-4 font-medium">Última visita</th>
              <th className="p-4 font-medium">Último corte</th>
              {ehDono && <th className="p-4 font-medium">Barbeiro</th>}
              <th className="p-4 font-medium">Etapa do funil</th>
              <th className="p-4 font-medium">Indicações</th>
              <th className="p-4 font-medium">Observações</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((c) => {
              const dias = diasDesde(c.ultimaVisita);
              const sumido = dias !== null && dias >= 30;
              return (
                <tr key={c.id} className="border-b border-steel/10 last:border-0">
                  <td className="p-4 text-parchment font-medium">{c.nome}</td>
                  <td className="p-4 text-steel">{c.whatsapp}</td>
                  <td className="p-4 text-steel">
                    {c.ultimaVisita}
                    {sumido && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-barber/20 border border-barber text-barber">
                        sumido há {dias}d
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-steel">{c.ultimoCorte}</td>
                  {ehDono && <td className="p-4 text-steel">{nomeBarbeiro(c.barbeiroId)}</td>}
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs border border-brass/40 text-brass">
                      {tituloEtapa(c.etapaFunil)}
                    </span>
                  </td>
                  <td className="p-4 text-steel">{c.indicacoes}</td>
                  <td className="p-4 text-steel">{c.observacoes || "—"}</td>
                  <td className="p-4">
                    {sumido && (
                      <button
                        type="button"
                        onClick={() => setClientePreviaId(c.id)}
                        aria-expanded={clientePreviaId === c.id}
                        aria-controls="previa-reativacao"
                        className="flex items-center gap-1 whitespace-nowrap text-xs text-brass hover:underline focus:outline-none focus:ring-2 focus:ring-brass"
                      >
                        <MessageCircle size={14} aria-hidden="true" /> Ver mensagem
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={ehDono ? 9 : 8} className="p-8 text-center text-steel/60 text-sm">
                  {buscaAtiva
                    ? `Nenhum cliente encontrado para “${busca.trim()}”.`
                    : "Você ainda não tem clientes na sua carteira."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
