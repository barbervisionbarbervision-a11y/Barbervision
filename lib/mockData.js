export const equipeExemplo = [
  { id: "b1", nome: "João (dono)", papel: "dono" },
  { id: "b2", nome: "Marcos", papel: "funcionario" },
  { id: "b3", nome: "Diego", papel: "funcionario" }
];

export const barbeariaExemplo = {
  slug: "barbearia-joao",
  nome: "Barbearia João",
  especialidades: ["Navalhado", "Degradê americano", "Corte freestyle", "Pigmentação"],
  // Cada barbearia define suas próprias regras de fidelidade/desconto.
  regrasFidelidade: {
    visitasParaDesconto: 10,
    descricaoDesconto: "20% de desconto no próximo corte",
    indicacoesParaBonus: 3,
    descricaoBonusIndicacao: "1 corte grátis a cada 3 amigos indicados que virarem clientes"
  },
  // Usado para calcular comissão estimada por barbeiro (ideia nova).
  ticketMedio: 45,
  percentualComissao: 40 // % do valor do corte que fica para o barbeiro
};

// Horários fictícios oferecidos na tela de Escolha Final do cliente (ideia
// nova: agenda simples). Numa fase futura isso vem do Supabase, cruzando com
// a agenda real de cada barbeiro.
export const horariosDisponiveisExemplo = [
  "Hoje, 16:00",
  "Hoje, 17:30",
  "Amanhã, 09:00",
  "Amanhã, 14:00",
  "Amanhã, 16:30"
];

// Etapas do funil de vendas: todo cliente que interage com o app passa por
// aqui. O barbeiro acompanha em qual etapa cada cliente está no painel.
export const etapasFunil = [
  { chave: "novo_lead", titulo: "Novo lead", descricao: "Abriu o link/QR Code mas ainda não simulou um corte" },
  { chave: "simulou", titulo: "Simulou corte", descricao: "Já testou pelo menos uma simulação de corte" },
  { chave: "agendou", titulo: "Agendou", descricao: "Enviou a escolha final para o barbeiro" },
  { chave: "cliente_fidelizado", titulo: "Fidelizado", descricao: "Já é cliente recorrente, acumulando visitas" },
  { chave: "indicador", titulo: "Indicador", descricao: "Já trouxe pelo menos um amigo que virou cliente" }
];

export const categoriasCorte = [
  "Degradê",
  "Social",
  "Taper Fade",
  "Buzz Cut",
  "Moicano",
  "Americano",
  "Disfarçado",
  "Freestyle",
  "Infantil",
  "Cacheado",
  "Longo"
];

// A interface local apenas anota a barba escolhida; não altera a barba na foto.
export const barbas = ["Barba cheia", "Barba baixa", "Cavanhaque", "Bigode", "Sem barba"];

export const clientesExemplo = [
  {
    id: "1",
    nome: "Carlos Souza",
    whatsapp: "(84) 99999-1111",
    ultimaVisita: "12/07/2026",
    ultimoCorte: "Degradê Baixo",
    observacoes: "Cliente prefere degradê baixo.",
    cortesRegistrados: 8,
    indicacoes: 1,
    etapaFunil: "cliente_fidelizado",
    barbeiroId: "b2"
  },
  {
    id: "2",
    nome: "Rafael Lima",
    whatsapp: "(84) 99999-2222",
    ultimaVisita: "09/07/2026",
    ultimoCorte: "Taper Fade",
    observacoes: "Não gosta da máquina muito alta.",
    cortesRegistrados: 3,
    indicacoes: 0,
    etapaFunil: "agendou",
    barbeiroId: "b2"
  },
  {
    id: "3",
    nome: "Pedro Alves",
    whatsapp: "(84) 99999-3333",
    ultimaVisita: "01/07/2026",
    ultimoCorte: "Social",
    observacoes: "",
    cortesRegistrados: 10,
    indicacoes: 3,
    etapaFunil: "indicador",
    barbeiroId: "b3"
  },
  {
    id: "4",
    nome: "Lucas Ferreira",
    whatsapp: "(84) 99999-4444",
    ultimaVisita: "—",
    ultimoCorte: "—",
    observacoes: "Abriu o link mas ainda não simulou.",
    cortesRegistrados: 0,
    indicacoes: 0,
    etapaFunil: "novo_lead",
    barbeiroId: "b3"
  },
  {
    id: "5",
    nome: "Bruno Costa",
    whatsapp: "(84) 99999-5555",
    ultimaVisita: "—",
    ultimoCorte: "Buzz Cut",
    observacoes: "Simulou mas ainda não veio na barbearia.",
    cortesRegistrados: 0,
    indicacoes: 0,
    etapaFunil: "simulou",
    barbeiroId: "b2"
  }
];

export const promocoesExemplo = [
  {
    id: "1",
    titulo: "Terça é dia de desconto",
    descricao: "20% de desconto em qualquer corte às terças-feiras.",
    ativa: true
  },
  {
    id: "2",
    titulo: "Combo Corte + Barba",
    descricao: "Faça corte e barba no mesmo dia e pague só R$ 45.",
    ativa: true
  },
  {
    id: "3",
    titulo: "Indique um amigo",
    descricao: "A cada amigo indicado que virar cliente, ganhe um bônus de fidelidade.",
    ativa: false
  }
];
export function gerarRecomendacoesMock() {
  return [
    { posicao: 1, corte: "Degradê Baixo", explicacao: "Acabamento discreto nas laterais e manutenção simples." },
    { posicao: 2, corte: "Taper Fade", explicacao: "Transição suave nas têmporas e na nuca." },
    { posicao: 3, corte: "Social", explicacao: "Opção clássica e versátil para o dia a dia." }
  ];
}

// Avaliações que os clientes deixam depois do corte (ideia nova).
export const avaliacoesExemplo = [
  { id: "1", clienteNome: "Carlos Souza", barbeiroId: "b2", nota: 5, comentario: "Ficou show, como no simulador!" },
  { id: "2", clienteNome: "Pedro Alves", barbeiroId: "b3", nota: 5, comentario: "Atendimento excelente." },
  { id: "3", clienteNome: "Rafael Lima", barbeiroId: "b2", nota: 4, comentario: "Bom, mas demorou um pouco." }
];

// Barbearias assinantes da plataforma — só pro painel master (super admin),
// que é seu (dono do Barber Vision), não do dono de uma barbearia individual.
export const barbeariasAssinantesExemplo = [
  { id: "1", nome: "Barbearia João", slug: "barbearia-joao", plano: "Mensal", status: "ativa", valorMensal: 79 },
  { id: "2", nome: "Barbearia Vintage", slug: "barbearia-vintage", plano: "Trial (7 dias)", status: "trial", valorMensal: 0 },
  { id: "3", nome: "Corte Certo", slug: "corte-certo", plano: "Mensal", status: "inadimplente", valorMensal: 79 }
];
