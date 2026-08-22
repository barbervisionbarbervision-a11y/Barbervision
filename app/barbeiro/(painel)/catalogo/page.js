"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, ImagePlus, Pencil, Plus, Power, PowerOff, Scissors, Trash2, X } from "lucide-react";
import { barbeariaExemplo, categoriasCorte } from "@/lib/mockData";
import { useSessaoDono } from "@/lib/useSessaoDono";
import {
  HAIR_CATALOG_ENCAIXE_REVISAO,
  HAIR_CATALOG_TRANSFORMACAO_PADRAO,
  carregarHairCatalogLocal,
  criarHairCatalogId,
  imagemHairCatalogTemTransparencia,
  lerArquivoHairCatalog,
  salvarHairCatalogLocal,
  validarArquivoHairCatalog
} from "@/lib/hairCatalog";
import Button from "@/components/Button";
import RecorteCabeloEditor from "./_recorte/RecorteCabeloEditor";

const CATEGORIAS = [...categoriasCorte, "Outros"];
const FORMULARIO_VAZIO = {
  nome: "",
  categoria: CATEGORIAS[0],
  imageDataUrl: null,
  asset: null,
  metadataRecorte: null,
  direitosConfirmados: false,
  prontoParaSimulacao: false
};

const ROTULO_ORIGEM = {
  "biblioteca-inicial": "Amostra demonstrativa",
  "upload-local": "Upload local",
  "edicao-local": "Editado localmente"
};

function PreviewMolde({ src, alt, className = "" }) {
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    setFalhou(false);
  }, [src]);

  if (!src || falhou) {
    return (
      <div
        role="img"
        aria-label={`${alt}. Nenhuma foto disponível.`}
        className={`flex flex-col items-center justify-center gap-2 bg-ink/70 text-steel ${className}`}
      >
        <ImagePlus aria-hidden="true" size={28} />
        <span className="px-3 text-center text-xs">Sem foto cadastrada</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFalhou(true)} className={`bg-ink/70 object-contain ${className}`} />
  );
}

export default function Catalogo() {
  const sessao = useSessaoDono();
  const formularioRef = useRef(null);
  const inputArquivoRef = useRef(null);
  const [cortes, setCortes] = useState([]);
  const [catalogoCarregado, setCatalogoCarregado] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [editorRecorteAberto, setEditorRecorteAberto] = useState(false);
  const [validandoMolde, setValidandoMolde] = useState(false);

  useEffect(() => {
    if (!sessao) return;
    setCortes(carregarHairCatalogLocal());
    setCatalogoCarregado(true);
  }, [sessao]);

  if (!sessao) return null;

  const totalAtivos = cortes.filter((corte) => corte.ativo).length;
  const totalAmostras = cortes.filter((corte) => corte.origem === "biblioteca-inicial").length;
  const totalMoldesProprios = cortes.length - totalAmostras;

  function limparFormulario() {
    setFormulario(FORMULARIO_VAZIO);
    setEditandoId(null);
    setEditorRecorteAberto(false);
    setErro("");
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  }

  function persistir(proximosCortes, textoSucesso) {
    try {
      salvarHairCatalogLocal(proximosCortes);
      setCortes(proximosCortes);
      setErro("");
      setMensagem(textoSucesso);
      return true;
    } catch {
      setMensagem("");
      setErro(
        "Não foi possível salvar no navegador. O armazenamento local pode estar cheio; remova alguma foto ou use um arquivo menor."
      );
      return false;
    }
  }

  async function selecionarFoto(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setMensagem("");
    const erroArquivo = validarArquivoHairCatalog(arquivo);
    if (erroArquivo) {
      setErro(erroArquivo);
      evento.target.value = "";
      return;
    }

    try {
      const imageDataUrl = await lerArquivoHairCatalog(arquivo);
      setFormulario((atual) => ({
        ...atual,
        imageDataUrl,
        asset: null,
        metadataRecorte: null,
        prontoParaSimulacao: false
      }));
      setErro("");
    } catch (falha) {
      setErro(falha.message);
      evento.target.value = "";
    }
  }

  function removerFotoDoFormulario() {
    setFormulario((atual) => ({
      ...atual,
      imageDataUrl: null,
      asset: null,
      metadataRecorte: null,
      prontoParaSimulacao: false
    }));
    setMensagem("");
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  }

  async function salvarCorte(evento) {
    evento.preventDefault();
    setMensagem("");

    const nome = formulario.nome.trim();
    if (nome.length < 2) {
      setErro("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (!formulario.categoria) {
      setErro("Escolha uma categoria para o corte.");
      return;
    }
    if (!formulario.imageDataUrl && !formulario.asset) {
      setErro("Selecione uma foto para o molde.");
      return;
    }
    if (!formulario.direitosConfirmados) {
      setErro("Confirme que a barbearia possui autorização para usar esta imagem.");
      return;
    }
    if (formulario.prontoParaSimulacao && formulario.imageDataUrl?.startsWith("data:image/jpeg")) {
      setErro("JPG não possui transparência. Envie um PNG ou WebP recortado antes de marcar o molde como pronto.");
      return;
    }

    const nomeDuplicado = cortes.some(
      (corte) => corte.id !== editandoId && corte.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR")
    );
    if (nomeDuplicado) {
      setErro("Já existe um corte com esse nome no catálogo local.");
      return;
    }

    if (formulario.prontoParaSimulacao && formulario.imageDataUrl && !formulario.metadataRecorte) {
      setValidandoMolde(true);
      const temTransparencia = await imagemHairCatalogTemTransparencia(formulario.imageDataUrl);
      setValidandoMolde(false);
      if (!temTransparencia) {
        setErro("O arquivo não possui transparência suficiente. Use Recortar cabelo antes de publicá-lo no simulador.");
        return;
      }
    }

    const itemAtual = cortes.find((corte) => corte.id === editandoId);
    const item = {
      id: itemAtual?.id || criarHairCatalogId(),
      nome,
      categoria: formulario.categoria,
      imageDataUrl: formulario.imageDataUrl,
      asset: formulario.asset,
      metadataRecorte: formulario.metadataRecorte,
      ativo: itemAtual?.ativo ?? true,
      direitosConfirmados: formulario.direitosConfirmados,
      prontoParaSimulacao: formulario.prontoParaSimulacao,
      transformacaoPadrao: itemAtual?.transformacaoPadrao || { ...HAIR_CATALOG_TRANSFORMACAO_PADRAO },
      encaixeAutomatico: itemAtual?.encaixeAutomatico || { nivelTemplo: 0.65, ancoras: null },
      revisaoEncaixe: itemAtual?.revisaoEncaixe || HAIR_CATALOG_ENCAIXE_REVISAO,
      origem: editandoId ? "edicao-local" : "upload-local"
    };
    const proximosCortes = editandoId
      ? cortes.map((corte) => (corte.id === editandoId ? item : corte))
      : [...cortes, item];

    if (persistir(proximosCortes, editandoId ? "Molde atualizado neste navegador." : "Molde salvo neste navegador.")) {
      limparFormulario();
    }
  }

  function iniciarEdicao(corte) {
    if (corte.origem === "biblioteca-inicial") {
      setMensagem("");
      setErro("Amostras demonstrativas não podem ser editadas. Cadastre um molde próprio para personalizá-lo.");
      return;
    }

    setEditandoId(corte.id);
    setFormulario({
      nome: corte.nome,
      categoria: corte.categoria,
      imageDataUrl: corte.imageDataUrl,
      asset: corte.asset,
      metadataRecorte: corte.metadataRecorte || null,
      direitosConfirmados: corte.direitosConfirmados,
      prontoParaSimulacao: corte.prontoParaSimulacao
    });
    setErro("");
    setMensagem("");
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
    requestAnimationFrame(() => formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function aplicarRecorte({ dataUrl, metadata }) {
    setFormulario((atual) => ({
      ...atual,
      imageDataUrl: dataUrl,
      asset: null,
      metadataRecorte: metadata,
      prontoParaSimulacao: true
    }));
    setEditorRecorteAberto(false);
    setErro("");
    setMensagem(
      `Recorte transparente pronto (${Math.max(1, Math.round(metadata.tamanhoBytes / 1024))} KB). Salve o molde para confirmar.`
    );
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  }

  function alternarAtivo(corte) {
    const proximosCortes = cortes.map((item) =>
      item.id === corte.id
        ? {
            ...item,
            ativo: !item.ativo,
            origem: item.origem === "biblioteca-inicial" ? "biblioteca-inicial" : "edicao-local"
          }
        : item
    );
    persistir(proximosCortes, `${corte.nome} foi ${corte.ativo ? "desativado" : "ativado"} nesta lista local.`);
  }

  function removerCorte(corte) {
    if (corte.origem === "biblioteca-inicial") {
      setMensagem("");
      setErro("Amostras demonstrativas são fixas e não podem ser removidas.");
      return;
    }

    const confirmou = window.confirm(`Remover “${corte.nome}” deste catálogo local?`);
    if (!confirmou) return;

    const proximosCortes = cortes.filter((item) => item.id !== corte.id);
    if (persistir(proximosCortes, `${corte.nome} foi removido deste navegador.`) && editandoId === corte.id) {
      limparFormulario();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">Catálogo de moldes</h1>
          <p className="mt-1 text-sm text-steel">Fotos e estilos de {barbeariaExemplo.nome}</p>
        </div>
        <Link
          href={`/b/${barbeariaExemplo.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brass/60 px-4 py-2 text-sm font-semibold text-brass transition-colors hover:bg-brass hover:text-ink"
        >
          <ExternalLink size={16} aria-hidden="true" />
          Testar como cliente
        </Link>
      </div>

      <div className="rounded-xl border border-brass/30 bg-brass/5 p-4" role="note">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-brass" aria-hidden="true" size={18} />
          <div className="space-y-1 text-sm text-parchment/80">
            <p className="font-medium text-parchment">Protótipo com armazenamento somente local</p>
            <p>
              Fotos e alterações ficam apenas neste navegador e dispositivo. Elas não são enviadas ao Supabase,
              nem são publicadas para clientes em outros aparelhos. Moldes marcados como prontos podem ser testados
              no simulador aberto neste mesmo navegador. Limpar os dados do navegador também remove este catálogo.
            </p>
            <p className="text-xs text-steel">
              Use uma foto real bem iluminada e clique em Recortar cabelo. O editor remove fundo e rosto
              manualmente antes de liberar o molde no simulador fotográfico.
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="especialidades-titulo">
        <h2 id="especialidades-titulo" className="mb-3 font-display text-sm uppercase tracking-widest2 text-steel">
          Especialidades da barbearia
        </h2>
        <div className="flex flex-wrap gap-2">
          {barbeariaExemplo.especialidades.map((especialidade) => (
            <span
              key={especialidade}
              className="rounded-full border border-barber bg-barber/20 px-3 py-1.5 text-sm text-parchment"
            >
              {especialidade}
            </span>
          ))}
        </div>
      </section>

      <form
        ref={formularioRef}
        onSubmit={salvarCorte}
        className="scroll-mt-4 rounded-xl border border-steel/20 bg-white/5 p-5"
        aria-labelledby="formulario-molde-titulo"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="formulario-molde-titulo" className="font-display text-sm uppercase tracking-widest2 text-steel">
              {editandoId ? "Editar molde" : "Adicionar foto ou molde"}
            </h2>
            <p className="mt-1 text-xs text-steel/70">PNG, JPG ou WebP de até 1 MB.</p>
          </div>
          {editandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-steel hover:bg-white/5 hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <X aria-hidden="true" size={14} /> Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex flex-col gap-4">
            <label htmlFor="nome-corte" className="text-sm text-steel">
              Nome do corte
              <input
                id="nome-corte"
                value={formulario.nome}
                onChange={(evento) => setFormulario((atual) => ({ ...atual, nome: evento.target.value }))}
                maxLength={80}
                autoComplete="off"
                placeholder="Ex.: Undercut texturizado"
                className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2 text-sm text-parchment outline-none placeholder:text-steel/50 focus:border-brass"
              />
            </label>

            <label htmlFor="categoria-corte" className="text-sm text-steel">
              Categoria
              <select
                id="categoria-corte"
                value={formulario.categoria}
                onChange={(evento) => setFormulario((atual) => ({ ...atual, categoria: evento.target.value }))}
                className="mt-1 w-full rounded-lg border border-steel/30 bg-ink px-3 py-2 text-sm text-parchment outline-none focus:border-brass"
              >
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <label htmlFor="foto-corte" className="text-sm text-steel">
                {editandoId ? "Substituir foto" : "Foto do molde"}
              </label>
              <input
                ref={inputArquivoRef}
                id="foto-corte"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={selecionarFoto}
                aria-describedby="ajuda-foto-corte"
                className="mt-1 block w-full cursor-pointer rounded-lg border border-steel/30 bg-ink text-sm text-steel file:mr-3 file:border-0 file:bg-brass file:px-4 file:py-2 file:font-semibold file:text-ink hover:file:bg-brass-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              />
              <p id="ajuda-foto-corte" className="mt-1 text-xs text-steel/60">
                A imagem fica codificada somente no armazenamento local deste navegador.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-steel/20 bg-ink/50 p-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-parchment/80">
                <input
                  type="checkbox"
                  checked={formulario.direitosConfirmados}
                  onChange={(evento) =>
                    setFormulario((atual) => ({ ...atual, direitosConfirmados: evento.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brass"
                />
                <span>Confirmo que a barbearia tem autorização para usar esta imagem.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-parchment/80">
                <input
                  type="checkbox"
                  checked={formulario.prontoParaSimulacao}
                  onChange={(evento) =>
                    setFormulario((atual) => ({ ...atual, prontoParaSimulacao: evento.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brass"
                />
                <span>
                  Este arquivo já contém somente o cabelo recortado e está pronto para o simulador local.
                </span>
              </label>
              <p className="text-xs leading-relaxed text-steel/70">
                Marcar como pronto não remove o fundo. O sistema exige transparência real; use o editor abaixo
                ou envie um PNG/WebP já recortado.
              </p>
            </div>
          </div>

          <div>
            <PreviewMolde
              src={formulario.imageDataUrl || formulario.asset}
              alt={`Prévia do molde ${formulario.nome || "selecionado"}`}
              className="aspect-[4/3] w-full rounded-lg border border-steel/20"
            />
            {(formulario.imageDataUrl || formulario.asset) && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setEditorRecorteAberto(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-brass/50 bg-brass/10 px-3 py-2 text-sm font-semibold text-brass hover:bg-brass/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                >
                  <Scissors aria-hidden="true" size={15} />
                  {formulario.metadataRecorte ? "Refazer recorte" : "Recortar cabelo"}
                </button>
                {formulario.metadataRecorte && (
                  <p className="text-center text-xs text-brass" role="status">
                    Recorte transparente · {formulario.metadataRecorte.formato === "image/png" ? "PNG" : "WebP"} ·{" "}
                    {Math.max(1, Math.round(formulario.metadataRecorte.tamanhoBytes / 1024))} KB
                  </p>
                )}
                <button
                  type="button"
                  onClick={removerFotoDoFormulario}
                  className="flex items-center gap-1 text-xs text-barber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                >
                  <Trash2 aria-hidden="true" size={13} /> Remover foto
                </button>
              </div>
            )}
          </div>
        </div>

        {erro && (
          <p className="mt-4 text-sm text-barber" role="alert">
            {erro}
          </p>
        )}
        {mensagem && (
          <p className="mt-4 text-sm text-brass" role="status">
            {mensagem}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={validandoMolde} className="flex items-center justify-center gap-2">
            {editandoId ? <Pencil aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
            {validandoMolde ? "Validando transparência..." : editandoId ? "Salvar alterações" : "Adicionar ao catálogo"}
          </Button>
          {editandoId && (
            <Button type="button" variant="ghost" onClick={limparFormulario}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <section aria-labelledby="lista-moldes-titulo">
        <div className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
          <div>
            <h2 id="lista-moldes-titulo" className="font-display text-sm uppercase tracking-widest2 text-steel">
              Amostras e moldes próprios
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-steel/70">
              As amostras são assets estáticos originais incluídos somente para apresentação e teste do protótipo;
              elas não representam uploads da barbearia e não podem ser editadas ou removidas. Se um arquivo de
              amostra não estiver disponível, a interface usa um placeholder. Seus uploads continuam sendo
              gerenciados normalmente nesta mesma lista.
            </p>
          </div>
          <div className="shrink-0 text-right text-sm text-steel">
            <p><span className="font-semibold text-brass">{totalAtivos}</span> ativos de {cortes.length}</p>
            <p className="mt-1 text-xs text-steel/60">{totalAmostras} amostras · {totalMoldesProprios} próprios</p>
          </div>
        </div>

        {!catalogoCarregado ? (
          <p className="rounded-xl border border-steel/20 bg-white/5 p-6 text-sm text-steel" role="status">
            Carregando catálogo local...
          </p>
        ) : cortes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-steel/30 p-8 text-center">
            <ImagePlus className="mx-auto text-steel" aria-hidden="true" size={30} />
            <p className="mt-3 text-sm text-parchment">Nenhum molde neste navegador.</p>
            <p className="mt-1 text-xs text-steel">Use o formulário acima para cadastrar o primeiro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cortes.map((corte) => (
              <article
                key={corte.id}
                className={`overflow-hidden rounded-xl border bg-white/5 ${
                  corte.ativo ? "border-steel/20" : "border-steel/10 opacity-70"
                }`}
              >
                <div className="relative">
                  <PreviewMolde
                    src={corte.imageDataUrl || corte.asset}
                    alt={`Foto do corte ${corte.nome}`}
                    className="aspect-[4/3] w-full"
                  />
                  <span
                    className={`absolute right-3 top-3 rounded-full border px-2 py-1 text-xs backdrop-blur-sm ${
                      corte.ativo
                        ? "border-brass/50 bg-ink/80 text-brass"
                        : "border-steel/40 bg-ink/80 text-steel"
                    }`}
                  >
                    {corte.ativo ? "Ativo localmente" : "Inativo"}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-parchment">{corte.nome}</h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-steel/30 px-2 py-1 text-steel">{corte.categoria}</span>
                    <span
                      className={`rounded-full border px-2 py-1 ${
                        corte.origem === "biblioteca-inicial"
                          ? "border-brass/35 text-brass"
                          : "border-steel/20 text-steel/70"
                      }`}
                    >
                      {ROTULO_ORIGEM[corte.origem] || "Origem local"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 ${
                        corte.prontoParaSimulacao
                          ? "border-brass/40 text-brass"
                          : "border-steel/20 text-steel/70"
                      }`}
                    >
                      {corte.prontoParaSimulacao ? "Pronto para simular" : "Rascunho para recorte"}
                    </span>
                    {corte.metadataRecorte && (
                      <span className="rounded-full border border-brass/30 px-2 py-1 text-brass/90">
                        Recorte manual · {Math.max(1, Math.round(corte.metadataRecorte.tamanhoBytes / 1024))} KB
                      </span>
                    )}
                  </div>

                  {corte.origem === "biblioteca-inicial" ? (
                    <div className="mt-4 border-t border-steel/10 pt-3">
                      <p className="mb-2 text-xs leading-relaxed text-steel/65">
                        Amostra protegida: edição e remoção não estão disponíveis. Você pode apenas controlar se ela
                        aparece como ativa no protótipo.
                      </p>
                      <button
                        type="button"
                        onClick={() => alternarAtivo(corte)}
                        className="flex w-full items-center justify-center gap-1 rounded-lg border border-steel/30 px-2 py-2 text-xs text-parchment hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                        aria-label={`${corte.ativo ? "Desativar" : "Ativar"} amostra ${corte.nome}`}
                        aria-pressed={corte.ativo}
                      >
                        {corte.ativo ? <PowerOff aria-hidden="true" size={13} /> : <Power aria-hidden="true" size={13} />}
                        {corte.ativo ? "Desativar amostra" : "Ativar amostra"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(corte)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-steel/30 px-2 py-2 text-xs text-parchment hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                        aria-label={`Editar ${corte.nome}`}
                      >
                        <Pencil aria-hidden="true" size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarAtivo(corte)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-steel/30 px-2 py-2 text-xs text-parchment hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                        aria-label={`${corte.ativo ? "Desativar" : "Ativar"} ${corte.nome}`}
                        aria-pressed={corte.ativo}
                      >
                        {corte.ativo ? <PowerOff aria-hidden="true" size={13} /> : <Power aria-hidden="true" size={13} />}
                        {corte.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removerCorte(corte)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-barber/40 px-2 py-2 text-xs text-barber hover:bg-barber/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-barber"
                        aria-label={`Remover ${corte.nome}`}
                      >
                        <Trash2 aria-hidden="true" size={13} /> Remover
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editorRecorteAberto && (formulario.imageDataUrl || formulario.asset) && (
        <RecorteCabeloEditor
          src={formulario.imageDataUrl || formulario.asset}
          nome={formulario.nome || "molde sem nome"}
          onAplicar={aplicarRecorte}
          onCancelar={() => setEditorRecorteAberto(false)}
        />
      )}
    </div>
  );
}
