import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEntrada(valor) {
  const nome = String(valor?.nome ?? "").trim();
  const email = String(valor?.email ?? "").trim().toLocaleLowerCase("pt-BR");
  const whatsapp = String(valor?.whatsapp ?? "").trim();
  const whatsappNormalizado = whatsapp.replace(/[^0-9]/g, "");
  const barbeariaSlug = String(valor?.barbeariaSlug ?? "").trim().toLocaleLowerCase("pt-BR");

  if (
    nome.length < 2 || nome.length > 160 ||
    email.length > 254 || !EMAIL_VALIDO.test(email) ||
    whatsapp.length < 8 || whatsapp.length > 32 ||
    !/^[1-9][0-9]{7,14}$/.test(whatsappNormalizado) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(barbeariaSlug)
  ) {
    return null;
  }

  return { nome, email, whatsapp, whatsappNormalizado, barbeariaSlug };
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

    const { data: cliente, error: erroCliente } = await supabase
      .from("clientes")
      .upsert({
        barbearia_id: barbearia.id,
        nome: entrada.nome,
        email: entrada.email,
        email_normalizado: entrada.email,
        whatsapp: entrada.whatsapp,
        whatsapp_normalizado: entrada.whatsappNormalizado
      }, { onConflict: "barbearia_id,whatsapp_normalizado" })
      .select("id")
      .single();

    if (erroCliente) throw erroCliente;
    return Response.json({ ok: true, clienteId: cliente.id }, { status: 201 });
  } catch (error) {
    console.error("[clientes] falha ao salvar cadastro", {
      mensagem: error instanceof Error ? error.message : "erro desconhecido"
    });
    return Response.json({ erro: "Não foi possível salvar o cadastro agora." }, { status: 500 });
  }
}
