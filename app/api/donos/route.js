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
  const slug = String(valor?.slug || "").trim().toLocaleLowerCase("pt-BR");
  const email = String(valor?.email || "").trim().toLocaleLowerCase("pt-BR");
  const website = String(valor?.website || "").trim();

  if (website) return null;
  if (nome.length < 2 || nome.length > 120 || /[\p{Cc}]/u.test(nome)) return null;
  if (barbearia.length < 2 || barbearia.length > 120 || /[\p{Cc}]/u.test(barbearia)) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 80) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  return { nome, barbearia, slug, email };
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
  const { data: tenant } = await admin.from("barbearias").select("id").eq("slug", entrada.slug).maybeSingle();
  if (tenant) return NextResponse.json({ erro: "Esse endereço público já está em uso." }, { status: 409 });

  const origem = obterUrlBaseAplicacao();
  const convite = await admin.auth.admin.inviteUserByEmail(entrada.email, {
    redirectTo: `${origem}/auth/callback?next=/barbeiro/ativar-conta`,
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
    p_slug: entrada.slug
  });

  if (provisionamento.error) {
    await admin.auth.admin.deleteUser(usuarioId).catch(() => null);
    console.error("[donos] provisionamento falhou", { codigo: provisionamento.error.code || null });
    return NextResponse.json({ erro: "Não foi possível concluir o cadastro agora." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
