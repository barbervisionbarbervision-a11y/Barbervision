"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, MessageCircle, ShoppingBag, Store } from "lucide-react";
import { barbeariaExemplo } from "@/lib/mockData";
import {
  PRODUCT_CARE_OPTIONS,
  PRODUCT_CATEGORIES,
  carregarCatalogoProdutosLocal,
  criarLinkWhatsappProduto,
  criarMensagemInteresseProduto,
  formatarPrecoProduto,
  recomendarProdutosParaPlano
} from "@/lib/productCatalog";

const ROTULO_CATEGORIA = Object.fromEntries(
  PRODUCT_CATEGORIES.map((categoria) => [categoria.id, categoria.label])
);
const ROTULO_CUIDADO = Object.fromEntries(PRODUCT_CARE_OPTIONS.map((cuidado) => [cuidado.id, cuidado.label]));

function ImagemProduto({ produto }) {
  if (produto.imagemDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={produto.imagemDataUrl}
        alt={`Foto de ${produto.nome}`}
        className="aspect-[4/3] w-full bg-parchment/5 object-contain"
      />
    );
  }

  return (
    <div
      className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-brass/15 via-white/[0.025] to-barber/10 text-brass"
      role="img"
      aria-label={`${produto.nome}, sem foto cadastrada`}
    >
      <ShoppingBag size={38} aria-hidden="true" />
    </div>
  );
}

export default function VitrineProdutosCuidados({ barbeariaSlug, plano }) {
  const [catalogo, setCatalogo] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [mensagemManual, setMensagemManual] = useState("");

  useEffect(() => {
    if (!barbeariaSlug) return;
    setCatalogo(carregarCatalogoProdutosLocal(barbeariaSlug));
  }, [barbeariaSlug]);

  const recomendados = useMemo(
    () => recomendarProdutosParaPlano(catalogo?.itens, plano, 3),
    [catalogo?.itens, plano]
  );

  if (!catalogo || recomendados.length === 0) return null;

  const nomeBarbearia =
    barbeariaSlug === barbeariaExemplo.slug ? barbeariaExemplo.nome : "a barbearia deste atendimento";

  function dadosContato(produto) {
    const mensagem = criarMensagemInteresseProduto({
      produto,
      corteNome: plano?.corte?.nome,
      barbeariaNome: nomeBarbearia
    });
    return {
      mensagem,
      link: criarLinkWhatsappProduto(catalogo.configuracao.whatsappComercial, mensagem)
    };
  }

  async function copiarSolicitacao(produto) {
    const { mensagem } = dadosContato(produto);
    setMensagemManual("");

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponível");
      await navigator.clipboard.writeText(mensagem);
      setFeedback(`Mensagem sobre ${produto.nome} copiada.`);
    } catch {
      setFeedback("Não foi possível copiar automaticamente. Selecione a mensagem abaixo.");
      setMensagemManual(mensagem);
    }
  }

  return (
    <section className="mt-8 w-full" aria-labelledby="produtos-cuidados-titulo">
      <div className="rounded-2xl border border-brass/35 bg-gradient-to-br from-brass/[0.10] via-white/[0.025] to-transparent p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-brass">
              <Store size={19} aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-widest2">Vitrine da barbearia</p>
            </div>
            <h2 id="produtos-cuidados-titulo" className="mt-3 font-display text-xl uppercase tracking-widest2 text-parchment">
              Produtos para manter o resultado
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
              Selecionados conforme os cuidados do seu corte. Comprar é opcional: sua orientação continua completa
              mesmo sem nenhum produto da vitrine.
            </p>
          </div>
          <span className="self-start rounded-full border border-brass/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest2 text-brass">
            Demonstração local
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {recomendados.map((produto) => {
            const { link } = dadosContato(produto);
            const cuidadoRelacionado = produto.correspondencias[0];

            return (
              <article key={produto.id} className="overflow-hidden rounded-xl border border-steel/20 bg-ink/70">
                <ImagemProduto produto={produto} />
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest2 text-brass">
                    {ROTULO_CATEGORIA[produto.categoria] || "Produto"}
                  </p>
                  <h3 className="mt-2 font-semibold leading-snug text-parchment">{produto.nome}</h3>
                  <p className="mt-2 min-h-14 text-xs leading-relaxed text-steel">{produto.descricao}</p>
                  {cuidadoRelacionado && (
                    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-parchment/70">
                      <Check className="mt-0.5 shrink-0 text-brass" size={13} aria-hidden="true" />
                      Combina com: {ROTULO_CUIDADO[cuidadoRelacionado] || "seus cuidados"}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-steel/15 pt-3">
                    <p className="font-semibold text-brass">{formatarPrecoProduto(produto.precoCentavos)}</p>
                    <span className="text-[10px] text-steel">Consulte disponibilidade</span>
                  </div>

                  {link ? (
                    <div className="mt-4 space-y-2">
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setFeedback(`Consulta de ${produto.nome} preparada no WhatsApp.`)}
                        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-brass px-3 py-2 text-center text-xs font-semibold text-ink transition-colors hover:bg-brass-dim hover:text-parchment"
                      >
                        <MessageCircle size={15} aria-hidden="true" /> Consultar no WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => copiarSolicitacao(produto)}
                        className="flex w-full items-center justify-center gap-1 text-[11px] text-steel hover:text-brass"
                      >
                        <Copy size={12} aria-hidden="true" /> Copiar mensagem
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => copiarSolicitacao(produto)}
                      className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-brass/50 px-3 py-2 text-xs font-semibold text-brass hover:bg-brass/10"
                    >
                      <Copy size={14} aria-hidden="true" /> Copiar solicitação
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-steel">
          {catalogo.configuracao.whatsappComercial
            ? "O WhatsApp abre uma consulta. A barbearia ainda precisa confirmar produto, preço, disponibilidade e retirada."
            : "O dono ainda não configurou o WhatsApp comercial neste navegador. Você pode copiar a solicitação e enviá-la pelo canal informado pela barbearia."}
        </p>
        <p className="mt-2 min-h-4 text-xs text-brass" aria-live="polite">{feedback}</p>
        {mensagemManual && (
          <textarea
            readOnly
            value={mensagemManual}
            onFocus={(evento) => evento.target.select()}
            rows={4}
            aria-label="Mensagem de interesse no produto"
            className="mt-2 w-full resize-none rounded-lg border border-brass/40 bg-ink px-3 py-2 text-xs text-parchment outline-none focus:border-brass"
          />
        )}
      </div>
    </section>
  );
}
