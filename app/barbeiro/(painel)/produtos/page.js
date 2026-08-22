"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  PowerOff,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import Button from "@/components/Button";
import { barbeariaExemplo } from "@/lib/mockData";
import {
  PRODUCT_CARE_OPTIONS,
  PRODUCT_CATEGORIES,
  carregarCatalogoProdutosLocal,
  criarCatalogoProdutosInicial,
  criarProdutoCatalogoId,
  formatarPrecoProduto,
  lerArquivoImagemProduto,
  salvarCatalogoProdutosLocal,
  validarArquivoImagemProduto,
  validarWhatsappComercial
} from "@/lib/productCatalog";
import { useSessaoDono } from "@/lib/useSessaoDono";

const FORMULARIO_VAZIO = {
  nome: "",
  descricao: "",
  categoria: "finalizador",
  preco: "",
  estoque: "",
  cuidadoIds: ["universal"],
  imagemDataUrl: null
};

const ROTULO_CATEGORIA = Object.fromEntries(
  PRODUCT_CATEGORIES.map((categoria) => [categoria.id, categoria.label])
);

function precoParaCentavos(valor) {
  let texto = String(valor || "").trim().replace(/[^\d,.-]/g, "");
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  const numero = Number(texto);
  return Number.isFinite(numero) ? Math.round(numero * 100) : NaN;
}

function PreviewProduto({ produto, className = "" }) {
  if (produto.imagemDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={produto.imagemDataUrl}
        alt={`Foto de ${produto.nome}`}
        className={`bg-parchment/5 object-contain ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brass/15 via-white/[0.03] to-barber/10 text-brass ${className}`}
      role="img"
      aria-label={`${produto.nome}, sem foto cadastrada`}
    >
      <ShoppingBag size={34} aria-hidden="true" />
      <span className="px-3 text-center text-xs text-steel">Foto opcional</span>
    </div>
  );
}

export default function Produtos() {
  const sessao = useSessaoDono();
  const formularioRef = useRef(null);
  const arquivoRef = useRef(null);
  const [catalogo, setCatalogo] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [whatsapp, setWhatsapp] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erroContato, setErroContato] = useState("");
  const [mensagemContato, setMensagemContato] = useState("");

  useEffect(() => {
    if (!sessao) return;
    const salvo = carregarCatalogoProdutosLocal(barbeariaExemplo.slug);
    setCatalogo(salvo);
    setWhatsapp(salvo.configuracao.whatsappComercial);
  }, [sessao]);

  if (!sessao || !catalogo) return null;

  const ativos = catalogo.itens.filter((produto) => produto.ativo).length;
  const semEstoque = catalogo.itens.filter((produto) => produto.estoque === 0).length;
  const baixoEstoque = catalogo.itens.filter((produto) => produto.estoque > 0 && produto.estoque <= 3).length;

  function limparFormulario() {
    setFormulario(FORMULARIO_VAZIO);
    setEditandoId(null);
    if (arquivoRef.current) arquivoRef.current.value = "";
  }

  function persistir(proximoCatalogo, textoSucesso) {
    try {
      const salvo = salvarCatalogoProdutosLocal(barbeariaExemplo.slug, proximoCatalogo);
      setCatalogo(salvo);
      setWhatsapp(salvo.configuracao.whatsappComercial);
      setErro("");
      setMensagem(textoSucesso);
      return true;
    } catch {
      setMensagem("");
      setErro("Não foi possível salvar. O armazenamento local deste navegador pode estar indisponível ou cheio.");
      return false;
    }
  }

  async function selecionarFoto(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    const falha = validarArquivoImagemProduto(arquivo);
    if (falha) {
      setErro(falha);
      evento.target.value = "";
      return;
    }

    try {
      const imagemDataUrl = await lerArquivoImagemProduto(arquivo);
      setFormulario((atual) => ({ ...atual, imagemDataUrl }));
      setErro("");
    } catch (falhaLeitura) {
      setErro(falhaLeitura.message);
      evento.target.value = "";
    }
  }

  function alternarCuidado(cuidadoId) {
    setFormulario((atual) => {
      const selecionado = atual.cuidadoIds.includes(cuidadoId);
      if (cuidadoId === "universal" && !selecionado) {
        return { ...atual, cuidadoIds: ["universal"] };
      }

      return {
        ...atual,
        cuidadoIds: selecionado
          ? atual.cuidadoIds.filter((id) => id !== cuidadoId)
          : [...atual.cuidadoIds.filter((id) => id !== "universal"), cuidadoId]
      };
    });
  }

  function salvarProduto(evento) {
    evento.preventDefault();
    setMensagem("");

    const nome = formulario.nome.trim();
    const precoCentavos = precoParaCentavos(formulario.preco);
    const estoque = Number(formulario.estoque);

    if (nome.length < 2) {
      setErro("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (!Number.isInteger(precoCentavos) || precoCentavos <= 0) {
      setErro("Informe um preço maior que zero, como 39,90.");
      return;
    }
    if (!Number.isInteger(estoque) || estoque < 0) {
      setErro("Informe uma quantidade inteira igual ou maior que zero.");
      return;
    }
    if (formulario.cuidadoIds.length === 0) {
      setErro("Marque pelo menos um tipo de cuidado para relacionar o produto.");
      return;
    }
    const duplicado = catalogo.itens.some(
      (produto) =>
        produto.id !== editandoId && produto.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR")
    );
    if (duplicado) {
      setErro("Já existe um produto com esse nome.");
      return;
    }

    const anterior = catalogo.itens.find((produto) => produto.id === editandoId);
    const produto = {
      id: anterior?.id || criarProdutoCatalogoId(),
      nome,
      descricao: formulario.descricao.trim(),
      categoria: formulario.categoria,
      precoCentavos,
      estoque,
      ativo: anterior?.ativo ?? true,
      cuidadoIds: formulario.cuidadoIds,
      imagemDataUrl: formulario.imagemDataUrl,
      origem: "cadastro-local"
    };
    const itens = editandoId
      ? catalogo.itens.map((item) => (item.id === editandoId ? produto : item))
      : [...catalogo.itens, produto];

    if (
      persistir(
        { ...catalogo, itens },
        editandoId ? "Produto atualizado neste navegador." : "Produto adicionado à vitrine local."
      )
    ) {
      limparFormulario();
    }
  }

  function iniciarEdicao(produto) {
    setEditandoId(produto.id);
    setFormulario({
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      preco: (produto.precoCentavos / 100).toFixed(2).replace(".", ","),
      estoque: String(produto.estoque),
      cuidadoIds: [...produto.cuidadoIds],
      imagemDataUrl: produto.imagemDataUrl
    });
    setErro("");
    setMensagem("");
    if (arquivoRef.current) arquivoRef.current.value = "";
    requestAnimationFrame(() => formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function alternarAtivo(produto) {
    const itens = catalogo.itens.map((item) =>
      item.id === produto.id ? { ...item, ativo: !item.ativo } : item
    );
    persistir(
      { ...catalogo, itens },
      `${produto.nome} foi ${produto.ativo ? "retirado da" : "adicionado à"} vitrine local.`
    );
  }

  function removerProduto(produto) {
    if (!window.confirm(`Remover “${produto.nome}” da vitrine local?`)) return;
    const itens = catalogo.itens.filter((item) => item.id !== produto.id);
    if (persistir({ ...catalogo, itens }, `${produto.nome} foi removido deste navegador.`)) {
      if (editandoId === produto.id) limparFormulario();
    }
  }

  function salvarWhatsapp(evento) {
    evento.preventDefault();
    const falha = validarWhatsappComercial(whatsapp);
    if (falha) {
      setErroContato(falha);
      setMensagemContato("");
      return;
    }

    try {
      const salvo = salvarCatalogoProdutosLocal(barbeariaExemplo.slug, {
        ...catalogo,
        configuracao: { ...catalogo.configuracao, whatsappComercial: whatsapp }
      });
      setCatalogo(salvo);
      setWhatsapp(salvo.configuracao.whatsappComercial);
      setErroContato("");
      setMensagemContato(
        whatsapp.trim()
          ? "WhatsApp comercial salvo neste navegador."
          : "WhatsApp removido; clientes ainda poderão copiar a solicitação."
      );
    } catch {
      setMensagemContato("");
      setErroContato("Não foi possível salvar o contato neste navegador.");
    }
  }

  function restaurarExemplos() {
    const inicial = criarCatalogoProdutosInicial();
    persistir(
      { ...inicial, configuracao: catalogo.configuracao },
      "Produtos fictícios de demonstração restaurados."
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest2 text-brass">Venda assistida</p>
          <h1 className="mt-2 font-display text-2xl uppercase tracking-widest2 text-parchment">Produtos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">
            Monte a vitrine que aparece junto aos cuidados do cliente. Somente o dono acessa e altera esta área.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Link
            href={`/b/${barbeariaExemplo.slug}/avaliacao`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-brass/50 px-3 text-xs font-semibold text-brass hover:bg-brass/10"
          >
            <ExternalLink size={14} aria-hidden="true" /> Ver como cliente
          </Link>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-steel/20 bg-white/5 px-3 py-2">
              <strong className="block text-lg text-brass">{ativos}</strong><span className="text-steel">ativos</span>
            </div>
            <div className="rounded-lg border border-steel/20 bg-white/5 px-3 py-2">
              <strong className="block text-lg text-parchment">{baixoEstoque}</strong><span className="text-steel">baixos</span>
            </div>
            <div className="rounded-lg border border-steel/20 bg-white/5 px-3 py-2">
              <strong className="block text-lg text-barber">{semEstoque}</strong><span className="text-steel">zerados</span>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-brass/30 bg-brass/5 p-4" role="note">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-brass" size={18} aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-parchment">Vitrine demonstrativa deste navegador</p>
            <p className="mt-1 text-xs leading-relaxed text-steel">
              Produtos, fotos, preços, quantidades e WhatsApp ainda não sincronizam com outros aparelhos. A
              quantidade serve para demonstrar disponibilidade; não existe baixa automática, pedido ou pagamento.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={salvarWhatsapp} className="rounded-xl border border-steel/20 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-brass">
          <MessageCircle size={18} aria-hidden="true" />
          <h2 className="font-display text-sm uppercase tracking-widest2">WhatsApp comercial</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-steel">
          Quando configurado, o cliente abre uma mensagem pronta para consultar disponibilidade. O envio não
          confirma reserva nem venda.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="flex-1 text-sm text-steel">
            Número com DDD
            <input
              type="tel"
              value={whatsapp}
              onChange={(evento) => {
                setWhatsapp(evento.target.value);
                setErroContato("");
                setMensagemContato("");
              }}
              placeholder="Ex.: (84) 99999-9999"
              className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none placeholder:text-steel/50 focus:border-brass"
            />
          </label>
          <Button type="submit" className="self-end">Salvar contato</Button>
        </div>
        <p className="mt-2 text-[11px] text-steel/60">O código do Brasil (55) é acrescentado automaticamente quando necessário.</p>
        {erroContato && <p className="mt-2 text-sm text-barber" role="alert">{erroContato}</p>}
        {mensagemContato && <p className="mt-2 text-sm text-brass" role="status">{mensagemContato}</p>}
      </form>

      <form
        ref={formularioRef}
        onSubmit={salvarProduto}
        className="scroll-mt-4 rounded-xl border border-steel/20 bg-white/5 p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm uppercase tracking-widest2 text-parchment">
              {editandoId ? "Editar produto" : "Adicionar produto"}
            </h2>
            <p className="mt-1 text-xs text-steel">Relacione o item aos cuidados para a recomendação não ser aleatória.</p>
          </div>
          {editandoId && (
            <button type="button" onClick={limparFormulario} className="text-steel hover:text-parchment" aria-label="Cancelar edição">
              <X size={19} />
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_240px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-steel sm:col-span-2">
              Nome do produto
              <input
                value={formulario.nome}
                onChange={(evento) => setFormulario((atual) => ({ ...atual, nome: evento.target.value }))}
                maxLength={90}
                className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
              />
            </label>
            <label className="text-sm text-steel sm:col-span-2">
              Descrição
              <textarea
                value={formulario.descricao}
                onChange={(evento) => setFormulario((atual) => ({ ...atual, descricao: evento.target.value }))}
                rows={2}
                maxLength={320}
                className="mt-1 w-full resize-none rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
              />
            </label>
            <label className="text-sm text-steel">
              Categoria
              <select
                value={formulario.categoria}
                onChange={(evento) => setFormulario((atual) => ({ ...atual, categoria: evento.target.value }))}
                className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
              >
                {PRODUCT_CATEGORIES.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-steel">
              Preço exibido
              <input
                inputMode="decimal"
                value={formulario.preco}
                onChange={(evento) => setFormulario((atual) => ({ ...atual, preco: evento.target.value }))}
                placeholder="39,90"
                className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
              />
            </label>
            <label className="text-sm text-steel">
              Quantidade para exibição
              <input
                type="number"
                min="0"
                step="1"
                value={formulario.estoque}
                onChange={(evento) => setFormulario((atual) => ({ ...atual, estoque: evento.target.value }))}
                className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2.5 text-parchment outline-none focus:border-brass"
              />
            </label>
            <label className="text-sm text-steel sm:col-span-2">
              Foto opcional
              <input
                ref={arquivoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={selecionarFoto}
                className="mt-1 block w-full cursor-pointer rounded-lg border border-steel/30 bg-ink text-sm text-steel file:mr-3 file:border-0 file:bg-brass file:px-4 file:py-2.5 file:font-semibold file:text-ink"
              />
              <span className="mt-1 block text-[11px] text-steel/60">PNG, JPG ou WebP de até 800 KB; salvo somente neste navegador.</span>
            </label>
          </div>

          <div>
            <PreviewProduto
              produto={{ nome: formulario.nome || "Produto", imagemDataUrl: formulario.imagemDataUrl }}
              className="aspect-square w-full rounded-xl border border-steel/20"
            />
            {formulario.imagemDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setFormulario((atual) => ({ ...atual, imagemDataUrl: null }));
                  if (arquivoRef.current) arquivoRef.current.value = "";
                }}
                className="mt-2 flex items-center gap-1 text-xs text-barber hover:underline"
              >
                <Trash2 size={13} /> Remover foto
              </button>
            )}
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm text-steel">Quando este produto deve aparecer?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRODUCT_CARE_OPTIONS.map((cuidado) => {
              const selecionado = formulario.cuidadoIds.includes(cuidado.id);
              return (
                <label
                  key={cuidado.id}
                  className={`cursor-pointer rounded-full border px-3 py-2 text-xs transition-colors ${
                    selecionado ? "border-brass bg-brass/15 text-brass" : "border-steel/25 text-steel"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selecionado}
                    onChange={() => alternarCuidado(cuidado.id)}
                    className="sr-only"
                  />
                  {cuidado.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {erro && <p className="mt-4 text-sm text-barber" role="alert">{erro}</p>}
        {mensagem && <p className="mt-4 text-sm text-brass" role="status">{mensagem}</p>}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" className="flex items-center justify-center gap-2">
            {editandoId ? <Pencil size={16} /> : <Plus size={16} />}
            {editandoId ? "Salvar alterações" : "Adicionar à vitrine"}
          </Button>
          {editandoId && <Button type="button" variant="ghost" onClick={limparFormulario}>Cancelar</Button>}
        </div>
      </form>

      <section aria-labelledby="vitrine-titulo">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="vitrine-titulo" className="font-display text-sm uppercase tracking-widest2 text-steel">Vitrine local</h2>
            <p className="mt-1 text-xs text-steel/70">Os cinco itens iniciais são fictícios e servem somente para apresentação.</p>
          </div>
          <span className="shrink-0 text-sm text-steel"><strong className="text-brass">{catalogo.itens.length}</strong> itens</span>
        </div>

        {catalogo.itens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-steel/30 p-8 text-center">
            <PackagePlus className="mx-auto text-steel" size={34} aria-hidden="true" />
            <p className="mt-3 text-sm text-parchment">Nenhum produto cadastrado.</p>
            <Button type="button" variant="ghost" onClick={restaurarExemplos} className="mt-4">Restaurar exemplos fictícios</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogo.itens.map((produto) => (
              <article key={produto.id} className={`overflow-hidden rounded-xl border bg-white/5 ${produto.ativo ? "border-steel/20" : "border-steel/10 opacity-65"}`}>
                <PreviewProduto produto={produto} className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest2 text-brass">{ROTULO_CATEGORIA[produto.categoria]}</p>
                      <h3 className="mt-1 font-semibold text-parchment">{produto.nome}</h3>
                    </div>
                    <p className="shrink-0 font-semibold text-brass">{formatarPrecoProduto(produto.precoCentavos)}</p>
                  </div>
                  <p className="mt-2 min-h-10 text-xs leading-relaxed text-steel">{produto.descricao || "Sem descrição."}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className={`rounded-full border px-2 py-1 ${produto.estoque > 0 ? "border-steel/30 text-steel" : "border-barber/40 text-barber"}`}>
                      {produto.estoque > 0 ? `${produto.estoque} disponíveis na demo` : "Sem estoque na demo"}
                    </span>
                    {produto.origem === "demonstracao" && <span className="rounded-full border border-brass/30 px-2 py-1 text-brass">Fictício</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-steel/15 pt-3">
                    <button type="button" onClick={() => iniciarEdicao(produto)} className="flex items-center justify-center gap-1 rounded-lg border border-steel/30 px-2 py-2 text-xs text-parchment hover:border-brass hover:text-brass">
                      <Pencil size={13} /> Editar
                    </button>
                    <button type="button" onClick={() => alternarAtivo(produto)} className="flex items-center justify-center gap-1 rounded-lg border border-steel/30 px-2 py-2 text-xs text-parchment hover:border-brass hover:text-brass">
                      {produto.ativo ? <PowerOff size={13} /> : <Power size={13} />} {produto.ativo ? "Ocultar" : "Exibir"}
                    </button>
                    <button type="button" onClick={() => removerProduto(produto)} className="flex items-center justify-center gap-1 rounded-lg border border-barber/40 px-2 py-2 text-xs text-barber hover:bg-barber/10">
                      <Trash2 size={13} /> Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
