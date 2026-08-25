import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import {
  CONSENTIMENTO_CADASTRO_VERSAO,
  criarIdentificadorRateLimit,
  obterEnderecoRede,
  verificarTurnstile
} from "@/lib/cadastro-publico-seguranca";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEntrada(valor) {
  const nome = String(valor?.nome ?? "").trim();
  const email = String(valor?.email ?? "").trim().toLocaleLowerCase("pt-BR");
  const whatsapp = String(valor?.whatsapp ?? "").trim();
  const whatsappNormalizado = whatsapp.replace(/[^0-9]/g, "");
  const barbeariaSlug = String(valor?.barbeariaSlug ?? "").trim().toLocaleLowerCase("pt-BR");
  const turnstileToken = String(valor?.turnstileToken ?? "").trim();
  const aceiteCadastro = valor?.aceiteCadastro === true;

  if (
    nome.length < 2 || nome.length > 160 ||
    email.length > 254 || !EMAIL_VALIDO.test(email) ||
    whatsapp.length < 8 || whatsapp.length > 32 ||
    !/^[1-9][0-9]{7,14}$/.test(whatsappNormalizado) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(barbeariaSlug) ||
    turnstileToken.length < 1 || turnstileToken.length > 2048 ||
    !aceiteCadastro
  ) {
    return null;
  }

  return { nome, email, whatsapp, whatsappNormalizado, barbeariaSlug, turnstileToken };
}

async function consumirRateLimit(supabase, identificadorHash, limite, janelaSegundos) {
  const { data, error } = await supabase.rpc("consumir_limite_api", {
    p_identificador_hash: identificadorHash,
    p_limite: limite,
    p_janela_segundos: janelaSegundos
  });
  if (error) throw error;
  return data?.[0];
}

function respostaRateLimit(tentarNovamenteEm) {
  return Response.json(
    { erro: "Muitas tentativas. Aguarde um pouco e tente novamente." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, tentarNovamenteEm || 60)) } }
  );
}

export async function POST(request) {
  let entrada;

  try {
    entrada = validarEntrada(await request.json());
  } catch {
    return Response.json({ erro: "Dados de cadastro inválidos." }, { status: 400 });
  }

  if (!entrada) {
    return Response.json({ erro: "Confira nome, e-mail e WhatsApp." }, { status: 400 });
  }

  try {
    const supabase = criarClienteSupabaseAdmin();
    const enderecoRede = obterEnderecoRede(request.headers) ||
      (process.env.NODE_ENV === "development" ? "desenvolvimento-local" : null);
    const segredoRateLimit = process.env.BARBERVISION_RATE_LIMIT_SECRET?.trim() ||
      (process.env.NODE_ENV === "development" ? "barbervision-development-rate-limit-secret" : "");

    if (!enderecoRede) {
      return Response.json({ erro: "Não foi possível validar a origem da solicitação." }, { status: 503 });
    }

    const { data: barbearia, error: erroBarbearia } = await supabase
      .from("barbearias")
      .select("id")
      .eq("slug", entrada.barbeariaSlug)
      .eq("status", "ativa")
      .maybeSingle();

    if (erroBarbearia) throw erroBarbearia;
    if (!barbearia) {
      return Response.json({ erro: "Barbearia não encontrada ou inativa." }, { status: 404 });
    }

    const limiteRede = await consumirRateLimit(
      supabase,
      criarIdentificadorRateLimit(`cadastro-rede:${barbearia.id}`, enderecoRede, segredoRateLimit),
      10,
      600
    );
    if (!limiteRede?.permitido) return respostaRateLimit(limiteRede?.tentar_novamente_em);

    if (!await verificarTurnstile({ token: entrada.turnstileToken, enderecoRede })) {
      return Response.json({ erro: "A verificação de segurança expirou ou não foi concluída." }, { status: 403 });
    }

    const limiteContato = await consumirRateLimit(
      supabase,
      criarIdentificadorRateLimit(`cadastro-contato:${barbearia.id}`, entrada.whatsappNormalizado, segredoRateLimit),
      5,
      3600
    );
    if (!limiteContato?.permitido) return respostaRateLimit(limiteContato?.tentar_novamente_em);

    const { data: cliente, error: erroCliente } = await supabase
      .from("clientes")
      .upsert({
        barbearia_id: barbearia.id,
        nome: entrada.nome,
        email: entrada.email,
        email_normalizado: entrada.email,
        whatsapp: entrada.whatsapp,
        whatsapp_normalizado: entrada.whatsappNormalizado,
        consentimento_cadastro_versao: CONSENTIMENTO_CADASTRO_VERSAO,
        consentimento_cadastro_em: new Date().toISOString()
      }, { onConflict: "barbearia_id,whatsapp_normalizado" })
      .select("id")
      .single();

    if (erroCliente) throw erroCliente;
    return Response.json({ ok: true, clienteId: cliente.id }, { status: 201 });
  } catch (error) {
    console.error("[clientes] falha ao salvar cadastro", {
      codigo: typeof error?.code === "string" ? error.code : null,
      mensagem: typeof error?.message === "string" ? error.message : "erro desconhecido",
      detalhes: typeof error?.details === "string" ? error.details : null,
      dica: typeof error?.hint === "string" ? error.hint : null
    });
    return Response.json({ erro: "Não foi possível salvar o cadastro agora." }, { status: 500 });
  }
}
