"use client";

import { useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Camera,
  Upload,
  Sun,
  Eye,
  ImageIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ProgressSteps from "@/components/ProgressSteps";
import { setFluxo } from "@/lib/clienteFlow";

const DICAS = [
  { icon: Eye, texto: "Olhe de frente" },
  { icon: Sun, texto: "Use luz uniforme" },
  { icon: ImageIcon, texto: "Fundo de cor diferente do cabelo" },
  { icon: UserRound, texto: "Sem boné, chapéu ou fones" }
];

const SELFIE_DEMONSTRACAO = "/demo-cliente.png";
const SELFIE_TIPOS_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const SELFIE_MAX_BYTES = 15 * 1024 * 1024;
const SELFIE_MAX_DIMENSAO = 1600;
const SELFIE_MAX_PIXELS_ORIGINAIS = 25_000_000;
const SELFIE_MAX_LADO_ORIGINAL = 10_000;

function correspondeAssinatura(bytes, inicio, texto) {
  if (inicio + texto.length > bytes.length) return false;
  return [...texto].every((caractere, indice) => bytes[inicio + indice] === caractere.charCodeAt(0));
}

function lerDimensoesJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const marcadoresSof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let posicao = 2;

  while (posicao + 8 < bytes.length) {
    if (bytes[posicao] !== 0xff) {
      posicao += 1;
      continue;
    }
    while (bytes[posicao] === 0xff) posicao += 1;
    const marcador = bytes[posicao];
    posicao += 1;
    if (marcador === 0xd8 || marcador === 0xd9) continue;
    if (marcador === 0xda || posicao + 1 >= bytes.length) break;

    const tamanho = (bytes[posicao] << 8) | bytes[posicao + 1];
    if (tamanho < 2 || posicao + tamanho > bytes.length) return null;
    if (marcadoresSof.has(marcador) && tamanho >= 7) {
      return {
        largura: (bytes[posicao + 5] << 8) | bytes[posicao + 6],
        altura: (bytes[posicao + 3] << 8) | bytes[posicao + 4]
      };
    }
    posicao += tamanho;
  }
  return null;
}

function lerDimensoesWebp(bytes) {
  if (
    bytes.length < 30 ||
    !correspondeAssinatura(bytes, 0, "RIFF") ||
    !correspondeAssinatura(bytes, 8, "WEBP")
  ) return null;

  if (correspondeAssinatura(bytes, 12, "VP8X")) {
    return {
      largura: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      altura: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)
    };
  }
  if (correspondeAssinatura(bytes, 12, "VP8 ") && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      largura: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      altura: (bytes[28] | (bytes[29] << 8)) & 0x3fff
    };
  }
  if (correspondeAssinatura(bytes, 12, "VP8L") && bytes[20] === 0x2f) {
    const bits = (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
    return {
      largura: (bits & 0x3fff) + 1,
      altura: ((bits >>> 14) & 0x3fff) + 1
    };
  }
  return null;
}

async function lerDimensoesCodificadas(arquivo) {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (arquivo.type === "image/jpeg") return lerDimensoesJpeg(bytes);
  if (arquivo.type === "image/png") {
    if (bytes.length < 24 || !correspondeAssinatura(bytes, 1, "PNG")) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { largura: view.getUint32(16), altura: view.getUint32(20) };
  }
  if (arquivo.type === "image/webp") return lerDimensoesWebp(bytes);
  return null;
}

function carregarImagemLocal(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.decoding = "async";
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir esta foto."));
    };
    imagem.src = url;
  });
}

async function prepararSelfieLocal(arquivo) {
  if (!SELFIE_TIPOS_ACEITOS.has(arquivo.type)) {
    throw new Error("Formato não aceito. Use uma foto JPEG, PNG ou WebP.");
  }
  if (arquivo.size > SELFIE_MAX_BYTES) {
    throw new Error("A foto deve ter no máximo 15 MB.");
  }

  const dimensoes = await lerDimensoesCodificadas(arquivo);
  if (!dimensoes?.largura || !dimensoes?.altura) {
    throw new Error("O arquivo parece estar corrompido ou usa uma variação de imagem não compatível.");
  }
  if (dimensoes.largura < 320 || dimensoes.altura < 320) {
    throw new Error("A foto é pequena demais. Use uma imagem com pelo menos 320 pixels de lado.");
  }
  if (
    dimensoes.largura > SELFIE_MAX_LADO_ORIGINAL ||
    dimensoes.altura > SELFIE_MAX_LADO_ORIGINAL ||
    dimensoes.largura * dimensoes.altura > SELFIE_MAX_PIXELS_ORIGINAIS
  ) {
    throw new Error("A resolução desta foto é alta demais para um celular. Escolha uma versão menor, com até 25 megapixels.");
  }

  const escalaDesejada = Math.min(1, SELFIE_MAX_DIMENSAO / Math.max(dimensoes.largura, dimensoes.altura));
  const larguraDesejada = Math.max(1, Math.round(dimensoes.largura * escalaDesejada));
  const alturaDesejada = Math.max(1, Math.round(dimensoes.altura * escalaDesejada));
  let imagem;

  if (typeof createImageBitmap === "function") {
    try {
      const redimensionamento = dimensoes.largura >= dimensoes.altura
        ? { resizeWidth: larguraDesejada }
        : { resizeHeight: alturaDesejada };
      imagem = await createImageBitmap(arquivo, {
        imageOrientation: "from-image",
        ...redimensionamento,
        resizeQuality: "high"
      });
    } catch {
      imagem = null;
    }
  }
  if (!imagem) imagem = await carregarImagemLocal(arquivo);

  const larguraImagem = imagem.naturalWidth || imagem.width;
  const alturaImagem = imagem.naturalHeight || imagem.height;
  const escala = Math.min(1, SELFIE_MAX_DIMENSAO / Math.max(larguraImagem, alturaImagem));
  const largura = Math.max(1, Math.round(larguraImagem * escala));
  const altura = Math.max(1, Math.round(alturaImagem * escala));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d", { alpha: false });
  contexto.drawImage(imagem, 0, 0, largura, altura);
  imagem.close?.();
  return canvas.toDataURL("image/jpeg", 0.88);
}

export default function Selfie() {
  const router = useRouter();
  const { barbearia } = useParams();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const selecaoRef = useRef(0);
  const [preview, setPreview] = useState(null);
  const [erroFoto, setErroFoto] = useState("");
  const [preparandoFoto, setPreparandoFoto] = useState(false);

  async function aoSelecionarArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    e.target.value = "";

    const selecao = selecaoRef.current + 1;
    selecaoRef.current = selecao;
    setErroFoto("");
    setPreview(null);
    setPreparandoFoto(true);

    try {
      const selfiePreparada = await prepararSelfieLocal(arquivo);
      if (selecaoRef.current === selecao) setPreview(selfiePreparada);
    } catch (erro) {
      if (selecaoRef.current === selecao) setErroFoto(erro?.message || "Não foi possível preparar a foto.");
    } finally {
      if (selecaoRef.current === selecao) setPreparandoFoto(false);
    }
  }

  function continuar() {
    if (!preview || preparandoFoto) return;
    try {
      setFluxo({
        barbeariaSlug: barbearia,
        etapa: "processando",
        selfieDataUrl: preview,
        corte: null,
        ajusteCabelo: null,
        neutralizacaoCabelo: null
      });
      setErroFoto("");
      router.push(`/b/${barbearia}/processando`);
    } catch {
      setErroFoto(
        "O navegador não conseguiu guardar esta foto. Escolha uma imagem menor ou libere espaço e tente novamente."
      );
    }
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
        <Logo size="md" />
        <ProgressSteps atual={3} />

        <header className="space-y-2 text-center">
          <h1 className="font-display text-2xl uppercase tracking-widest2 text-parchment">
            Sua selfie
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-parchment/65">
            Fique de frente, com a cabeça reta e inteira no contorno. Use um fundo liso de cor diferente do cabelo
            e retire acessórios da cabeça para esconder melhor o cabelo atual.
          </p>
        </header>

        <section className="w-full max-w-sm" aria-label="Prévia e guia da selfie">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-steel/45 bg-white/[0.06] shadow-2xl shadow-black/40">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Prévia da selfie selecionada"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-steel">
                <Camera size={42} strokeWidth={1.5} aria-hidden="true" />
                <p className="max-w-[12rem] text-sm leading-relaxed">
                  Tire uma foto ou escolha uma da galeria
                </p>
              </div>
            )}

            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 320 400"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="selfie-head-guide">
                  <rect width="320" height="400" fill="white" />
                  <ellipse cx="160" cy="174" rx="92" ry="132" fill="black" />
                  <path d="M56 400c9-71 48-106 104-106s95 35 104 106Z" fill="black" />
                </mask>
              </defs>
              <rect
                width="320"
                height="400"
                fill="rgba(0, 0, 0, 0.25)"
                mask="url(#selfie-head-guide)"
              />
              <ellipse
                cx="160"
                cy="174"
                rx="92"
                ry="132"
                fill="none"
                stroke="rgba(198, 150, 59, 0.95)"
                strokeWidth="2"
                strokeDasharray="8 7"
              />
              <path
                d="M56 400c9-71 48-106 104-106s95 35 104 106"
                fill="none"
                stroke="rgba(198, 150, 59, 0.75)"
                strokeWidth="2"
                strokeDasharray="8 7"
              />
              <path
                d="M160 72v205"
                fill="none"
                stroke="rgba(237, 227, 208, 0.45)"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
            </svg>

            <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/75 px-3 py-1 text-[11px] font-semibold tracking-wide text-parchment backdrop-blur-sm">
              Cabeça reta e centralizada
            </span>
          </div>

          <p className="sr-only" aria-live="polite">
            {preparandoFoto
              ? "Preparando a foto localmente."
              : preview
                ? "Foto selecionada. Você pode trocá-la ou continuar."
                : "Nenhuma foto selecionada."}
          </p>
        </section>

        {preparandoFoto && (
          <p className="flex items-center gap-2 text-sm text-steel" role="status">
            <Loader2 size={16} className="animate-spin text-brass" aria-hidden="true" />
            Reduzindo a foto no seu aparelho...
          </p>
        )}
        {erroFoto && (
          <p className="w-full max-w-sm rounded-lg border border-barber/50 bg-barber/10 px-3 py-2 text-sm text-parchment" role="alert">
            {erroFoto}
          </p>
        )}
        {preview && !preparandoFoto && (
          <p className="max-w-sm text-center text-xs leading-relaxed text-steel">
            Confira: cabeça inteira, posição frontal, sem acessórios e fundo liso de cor diferente do cabelo.
          </p>
        )}

        <ul className="grid w-full max-w-sm grid-cols-2 gap-x-4 gap-y-3 text-sm text-parchment/80">
          {DICAS.map(({ icon: Icon, texto }) => (
            <li key={texto} className="flex items-center gap-2">
              <Icon size={16} className="shrink-0 text-brass" aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>

        <aside
          className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-steel/30 bg-white/[0.04] p-3"
          aria-label="Privacidade da foto"
        >
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-brass" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-parchment/65">
            <strong className="font-semibold text-parchment/90">Processamento local:</strong>{" "}
            durante esta demonstração, a foto fica no navegador e não é enviada para serviços de IA.
          </p>
        </aside>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Escolher selfie da galeria"
          onChange={aoSelecionarArquivo}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          className="hidden"
          aria-label="Tirar selfie com a câmera frontal"
          onChange={aoSelecionarArquivo}
        />

        <div className="grid w-full max-w-sm grid-cols-2 gap-3" aria-label="Opções de foto">
          <Button
            variant="ghost"
            className="flex items-center justify-center gap-2 px-3"
            disabled={preparandoFoto}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera size={18} aria-hidden="true" />
            {preview ? "Tirar outra" : "Tirar foto"}
          </Button>
          <Button
            variant="ghost"
            className="flex items-center justify-center gap-2 px-3"
            disabled={preparandoFoto}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? <RefreshCw size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
            {preview ? "Trocar foto" : "Galeria"}
          </Button>
          <Button
            variant="ghost"
            className="col-span-2 flex items-center justify-center gap-2 border-brass/50 px-3 text-brass"
            disabled={preparandoFoto}
            onClick={() => {
              selecaoRef.current += 1;
              setErroFoto("");
              setPreparandoFoto(false);
              setPreview(SELFIE_DEMONSTRACAO);
            }}
          >
            <UserRound size={18} aria-hidden="true" />
            Usar foto de demonstração
          </Button>
        </div>

        {preview === SELFIE_DEMONSTRACAO && (
          <p className="-mt-2 max-w-sm text-center text-xs leading-relaxed text-steel" role="status">
            Pessoa fictícia e imagem estática incluída somente para apresentar o simulador.
          </p>
        )}

        <Button onClick={continuar} disabled={!preview || preparandoFoto} className="w-full max-w-sm">
          Usar esta foto
        </Button>
      </div>
    </main>
  );
}
