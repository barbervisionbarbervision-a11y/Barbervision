import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterUrlBaseAplicacao } from "@/lib/auth/site-url";

const tentativas = new Map();
const JANELA = 60 * 60 * 1000;
const LIMITE = 3;

function identificador(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
}

function excedeuLimite(chave) {
  const agora = Date.now();
  const anteriores = (tentativas.get(chave) || []).filter((data) => agora - data < JANELA);
  anteriores.push(agora);
  tentativas.set(chave, anteriores);
  return anteriores.length > LIMITE;
}

function validar(valor) {
  const nome = String(valor?.nome || "").trim();
  const barbearia = String(valor?.barbearia || "").trim();
  const email = String(valor?.email || "").trim().toLocaleLowerCase("pt-BR");
  const website = String(valor?.website || "").trim();

  if (website) return null;
  if (nome.length < 2 || nome.length > 120 || /[\p{Cc}]/u.test(nome)) return null;
  if (barbearia.length < 2 || barbearia.length > 120 || /[\p{Cc}]/u.test(barbearia)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  return { nome, barbearia, email };
}

function slugBase(nome) {
  const slug = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  return slug.length >= 3 ? slug : `barbearia-${slug || "nova"}`;
}

async function encontrarSlugDisponivel(admin, nome) {
  const base = slugBase(nome);
  for (let numero = 1; numero <= 50; numero += 1) {
    const candidato = numero === 1 ? base : `${base}-${numero}`;
    const { data, error } = await admin.from("barbearias").select("id").eq("slug", candidato).maybeSingle();
    if (error) throw new Error("Falha ao verificar o link da barbearia.");
    if (!data) return candidato;
  }
  throw new Error("Não foi possível gerar um link disponível.");
}

export async function POST(request) {
  if (excedeuLimite(identificador(request))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde uma hora e tente novamente." }, { status: 429 });
  }

  let entrada;
  try {
    entrada = validar(await request.json());
  } catch {
    entrada = null;
  }
  if (!entrada) return NextResponse.json({ erro: "Revise os dados informados." }, { status: 400 });

  const admin = criarClienteSupabaseAdmin();
  let slug;
  try {
    slug = await encontrarSlugDisponivel(admin, entrada.barbearia);
  } catch {
    return NextResponse.json({ erro: "Não foi possível preparar a página da barbearia agora." }, { status: 500 });
  }

  const origem = obterUrlBaseAplicacao();
  const convite = await admin.auth.admin.inviteUserByEmail(entrada.email, {
    redirectTo: `${origem}/auth/complete?next=/barbeiro/ativar-conta`,
    data: { nome: entrada.nome, barbervision_onboarding: "dono_publico", barbervision_convite_id: "" }
  });

  if (convite.error || !convite.data.user?.id) {
    return NextResponse.json({ erro: "Não foi possível iniciar a conta. Confira se esse e-mail já está cadastrado." }, { status: 409 });
  }

  const usuarioId = convite.data.user.id;
  const provisionamento = await admin.rpc("provisionar_dono_controlado", {
    p_usuario_id: usuarioId,
    p_nome: entrada.nome,
    p_barbearia_nome: entrada.barbearia,
    p_slug: slug
  });

  if (provisionamento.error) {
    await admin.auth.admin.deleteUser(usuarioId).catch(() => null);
    console.error("[donos] provisionamento falhou", { codigo: provisionamento.error.code || null });
    return NextResponse.json({ erro: "Não foi possível concluir o cadastro agora." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, link: `${origem}/b/${slug}` }, { status: 201 });
}
