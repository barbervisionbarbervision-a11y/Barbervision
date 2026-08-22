export const CUIDADOS_CABELO_VERSAO = 1;

export const NOMES_DEMOS_CUIDADOS_CABELO = Object.freeze([
  "Crop texturizado",
  "Quiff moderno",
  "Cachos taper",
  "Slick back",
  "Topo volumoso"
]);

const AVISO_PADRAO =
  "Orientações cosméticas gerais, sem diagnóstico ou promessa de resultado. Ajuste a rotina ao comportamento do cabelo e suspenda qualquer produto que cause desconforto.";

const PERFIS = Object.freeze({
  cropTexturizado: {
    resumo:
      "priorize textura leve no topo e acabamento controlado, preservando a leitura limpa das laterais.",
    rotina: [
      "Lave conforme a necessidade com shampoo suave e enxágue completamente.",
      "Retire o excesso de água com a toalha, pressionando os fios sem esfregar.",
      "Distribua uma pequena quantidade de finalizador leve do fundo para a frente.",
      "Modele com os dedos e, se quiser mais volume, use secador em temperatura moderada e a certa distância."
    ],
    produtos: [
      { tipo: "Shampoo suave", finalidade: "limpeza sem deixar resíduo pesado" },
      { tipo: "Condicionador leve", finalidade: "maciez, concentrado onde o fio pedir" },
      { tipo: "Pasta ou argila de efeito matte", finalidade: "textura e fixação leve a média" }
    ],
    evitar: [
      "Excesso de produto, que pode juntar as mechas e reduzir a textura.",
      "Finalizadores muito oleosos quando o objetivo for acabamento matte.",
      "Secador muito quente ou encostado no cabelo."
    ],
    manutencao: {
      intervaloRetorno: "2 a 4 semanas",
      orientacao:
        "Retorne para revisar laterais, contorno e peso do topo; o intervalo pode variar conforme o crescimento e o acabamento desejado."
    }
  },

  quiffModerno: {
    resumo:
      "construa sustentação na raiz e direcione o topo para trás, mantendo movimento em vez de rigidez excessiva.",
    rotina: [
      "Lave e condicione sem concentrar produto na raiz.",
      "Seque com a toalha até o cabelo ficar úmido, sem esfregar.",
      "Aplique protetor térmico e eleve a raiz com escova ou dedos durante a secagem moderada.",
      "Finalize com pouco produto, distribuindo primeiro nas mãos e ajustando o formato aos poucos."
    ],
    produtos: [
      { tipo: "Shampoo de uso regular", finalidade: "limpeza compatível com a frequência da rotina" },
      { tipo: "Protetor térmico", finalidade: "uso antes da modelagem com calor" },
      { tipo: "Pasta ou pomada de fixação média", finalidade: "sustentação com acabamento flexível" }
    ],
    evitar: [
      "Aplicar todo o finalizador diretamente na raiz.",
      "Tentar criar altura apenas com grande quantidade de pomada.",
      "Usar calor alto por tempo prolongado."
    ],
    manutencao: {
      intervaloRetorno: "3 a 5 semanas",
      orientacao:
        "Revise a conexão entre laterais e topo antes que o excesso de peso dificulte a sustentação do quiff."
    }
  },

  cachosTaper: {
    resumo:
      "preserve a definição natural dos cachos no topo e mantenha o taper limpo sem pesar o acabamento.",
    rotina: [
      "Faça uma lavagem suave e use condicionador conforme a necessidade dos fios.",
      "Desembarace com o cabelo úmido, começando pelas pontas e usando dedos ou pente de dentes largos.",
      "Aplique o finalizador em pequenas seções e amasse os cachos de baixo para cima.",
      "Deixe secar sem mexer ou use difusor em fluxo e temperatura moderados."
    ],
    produtos: [
      { tipo: "Shampoo suave", finalidade: "limpeza sem acúmulo excessivo" },
      { tipo: "Condicionador", finalidade: "deslizamento para desembaraçar" },
      { tipo: "Creme ou gel leve para cachos", finalidade: "definição com movimento" }
    ],
    evitar: [
      "Pentear os cachos secos quando a intenção for manter a definição.",
      "Manipular repetidamente o cabelo durante a secagem.",
      "Acumular várias camadas de produto sem observar a resposta dos fios."
    ],
    manutencao: {
      intervaloRetorno: "3 a 5 semanas",
      orientacao:
        "Retorne para limpar nuca, têmporas e transição do taper, preservando o formato escolhido para o topo."
    }
  },

  slickBack: {
    resumo:
      "mantenha o comprimento alinhado para trás com controle e flexibilidade, sem depender de tração ou excesso de brilho.",
    rotina: [
      "Lave o couro cabeludo e deixe a espuma percorrer o comprimento durante o enxágue.",
      "Aplique condicionador principalmente no comprimento e desembarace com cuidado.",
      "Com o cabelo úmido, distribua uma pequena quantidade de finalizador e penteie na direção desejada.",
      "Para maior controle, seque em temperatura moderada acompanhando o sentido do penteado."
    ],
    produtos: [
      { tipo: "Shampoo de uso regular", finalidade: "remoção de oleosidade e resíduos conforme a necessidade" },
      { tipo: "Condicionador leve", finalidade: "desembaraço e alinhamento do comprimento" },
      { tipo: "Creme modelador ou pomada à base de água", finalidade: "controle com fixação flexível" }
    ],
    evitar: [
      "Prender ou pentear com tensão excessiva.",
      "Reaplicar produto continuamente sem remover o acúmulo na lavagem.",
      "Usar calor alto muito próximo dos fios."
    ],
    manutencao: {
      intervaloRetorno: "4 a 8 semanas",
      orientacao:
        "Revise pontas, laterais e distribuição de peso; combine o retorno com o comprimento que deseja preservar."
    }
  },

  topoVolumoso: {
    resumo:
      "favoreça leveza e elevação na raiz, equilibrando o volume do topo com laterais bem conectadas.",
    rotina: [
      "Lave sem deixar resíduos e use condicionador apenas na quantidade necessária.",
      "Seque com a toalha até ficar úmido e aplique protetor térmico.",
      "Direcione o ar da raiz para cima, alternando os lados para criar sustentação sem rigidez.",
      "Finalize com pouco produto leve e solte as mechas com os dedos."
    ],
    produtos: [
      { tipo: "Shampoo de limpeza suave", finalidade: "manter os fios leves para modelar" },
      { tipo: "Protetor térmico", finalidade: "uso antes do secador" },
      { tipo: "Spray de textura ou pasta leve", finalidade: "volume e separação das mechas" }
    ],
    evitar: [
      "Óleos ou cremes pesados próximos à raiz antes da modelagem.",
      "Concentrar todo o produto em uma única área.",
      "Fixar o cabelo até perder completamente o movimento."
    ],
    manutencao: {
      intervaloRetorno: "3 a 5 semanas",
      orientacao:
        "Retorne quando o peso do topo reduzir o volume ou quando a conexão com as laterais perder o formato."
    }
  },

  curtoComLaterais: {
    resumo:
      "mantenha o topo fácil de reorganizar e acompanhe o crescimento das laterais e do contorno.",
    rotina: [
      "Lave conforme a necessidade e enxágue bem.",
      "Retire o excesso de água sem esfregar os fios.",
      "Aplique pouco finalizador e distribua antes de definir a direção do topo.",
      "Reorganize com os dedos ao longo do dia, em vez de acumular novas camadas de produto."
    ],
    produtos: [
      { tipo: "Shampoo suave", finalidade: "limpeza de uso regular" },
      { tipo: "Condicionador leve", finalidade: "maciez sem pesar" },
      { tipo: "Pasta de fixação leve a média", finalidade: "controle e textura" }
    ],
    evitar: [
      "Excesso de finalizador.",
      "Calor alto muito próximo do cabelo.",
      "Adiar o retorno quando o contorno for parte importante do corte."
    ],
    manutencao: {
      intervaloRetorno: "2 a 4 semanas",
      orientacao: "Revise contorno, laterais e transição de comprimentos conforme o crescimento."
    }
  },

  social: {
    resumo:
      "busque direção definida e acabamento flexível, adaptando brilho e volume à proposta do corte.",
    rotina: [
      "Lave e condicione de acordo com a necessidade dos fios.",
      "Remova o excesso de água e escolha a direção do penteado ainda com o cabelo úmido.",
      "Use secador moderado se precisar de forma ou volume, aplicando protetor térmico antes.",
      "Finalize gradualmente e revise o formato com pente ou dedos."
    ],
    produtos: [
      { tipo: "Shampoo de uso regular", finalidade: "limpeza compatível com a rotina" },
      { tipo: "Protetor térmico", finalidade: "preparo para modelagem com calor, quando usada" },
      { tipo: "Creme, pasta ou pomada de fixação média", finalidade: "direção e acabamento flexível" }
    ],
    evitar: [
      "Usar mais produto do que o necessário para manter a forma.",
      "Modelar com calor alto por tempo prolongado.",
      "Escolher acabamento sem considerar o caimento natural do corte."
    ],
    manutencao: {
      intervaloRetorno: "3 a 5 semanas",
      orientacao: "Revise o formato quando laterais e topo deixarem de se conectar com facilidade."
    }
  },

  cachos: {
    resumo:
      "valorize a textura natural com desembaraço cuidadoso, finalização leve e pouca manipulação durante a secagem.",
    rotina: [
      "Lave suavemente e condicione conforme a necessidade.",
      "Desembarace úmido, das pontas para a raiz, com dedos ou pente largo.",
      "Distribua o finalizador por seções e modele sem puxar excessivamente.",
      "Seque naturalmente ou com difusor moderado, evitando tocar repetidamente nos fios."
    ],
    produtos: [
      { tipo: "Shampoo suave", finalidade: "limpeza sem acúmulo pesado" },
      { tipo: "Condicionador", finalidade: "deslizamento no desembaraço" },
      { tipo: "Creme ou gel para textura", finalidade: "definição ajustável ao tipo de fio" }
    ],
    evitar: [
      "Desembaraçar com força.",
      "Mexer continuamente durante a secagem.",
      "Misturar muitos finalizadores de uma vez sem testar a quantidade."
    ],
    manutencao: {
      intervaloRetorno: "3 a 6 semanas",
      orientacao: "Revise formato, volume e contorno respeitando o encolhimento e o caimento dos fios."
    }
  },

  longo: {
    resumo:
      "preserve o caimento do comprimento com limpeza, condicionamento e desembaraço feitos sem pressa.",
    rotina: [
      "Lave principalmente a raiz e enxágue o comprimento por completo.",
      "Condicione o comprimento e desembarace das pontas para cima.",
      "Retire a água pressionando a toalha, sem torcer os fios.",
      "Use pouco finalizador no comprimento e modele na direção proposta pelo corte."
    ],
    produtos: [
      { tipo: "Shampoo de uso regular", finalidade: "limpeza da raiz conforme a necessidade" },
      { tipo: "Condicionador", finalidade: "desembaraço do comprimento" },
      { tipo: "Creme modelador leve", finalidade: "controle e alinhamento sem rigidez" }
    ],
    evitar: [
      "Desembaraçar começando pela raiz.",
      "Prender com tensão excessiva.",
      "Acumular finalizador sem fazer a limpeza adequada."
    ],
    manutencao: {
      intervaloRetorno: "4 a 8 semanas",
      orientacao: "Revise pontas, contorno e distribuição de peso de acordo com o comprimento desejado."
    }
  },

  geral: {
    resumo:
      "comece com uma rotina simples e ajuste produto, quantidade e frequência ao caimento observado no dia a dia.",
    rotina: [
      "Lave conforme a necessidade e remova completamente os resíduos.",
      "Use condicionador onde o cabelo precisar de mais deslizamento.",
      "Seque sem esfregar e modele primeiro com pouca quantidade de produto.",
      "Observe o resultado antes de aumentar a fixação ou adicionar outra camada."
    ],
    produtos: [
      { tipo: "Shampoo suave", finalidade: "limpeza de uso regular" },
      { tipo: "Condicionador adequado ao peso desejado", finalidade: "maciez e desembaraço" },
      { tipo: "Finalizador de fixação leve", finalidade: "primeiro teste de controle e acabamento" }
    ],
    evitar: [
      "Mudar vários produtos ao mesmo tempo, o que dificulta entender o resultado.",
      "Usar calor alto muito próximo do cabelo.",
      "Aplicar grande quantidade de finalizador logo no início."
    ],
    manutencao: {
      intervaloRetorno: "3 a 6 semanas",
      orientacao:
        "Confirme o intervalo com o profissional que conhece o desenho do corte e ajuste-o ao ritmo de crescimento."
    }
  }
});

const PERFIL_POR_NOME = Object.freeze({
  "crop texturizado": "cropTexturizado",
  "quiff moderno": "quiffModerno",
  "cachos taper": "cachosTaper",
  "slick back": "slickBack",
  "topo volumoso": "topoVolumoso"
});

const PERFIL_POR_CATEGORIA = Object.freeze({
  degrade: "curtoComLaterais",
  fade: "curtoComLaterais",
  moderno: "curtoComLaterais",
  infantil: "curtoComLaterais",
  social: "social",
  classico: "social",
  cacheado: "cachos",
  crespo: "cachos",
  longo: "longo"
});

function limparTexto(valor, fallback) {
  if (typeof valor !== "string") return fallback;
  const texto = valor.trim().replace(/\s+/g, " ");
  return texto || fallback;
}

/**
 * Normaliza nomes e categorias sem depender de locale ou de APIs do navegador.
 * @param {unknown} valor
 * @returns {string}
 */
export function normalizarChaveCuidadosCabelo(valor) {
  if (typeof valor !== "string") return "";
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizarEntrada(nomeOuCorte, categoriaInformada) {
  if (nomeOuCorte && typeof nomeOuCorte === "object" && !Array.isArray(nomeOuCorte)) {
    return {
      nome: limparTexto(nomeOuCorte.nome, "Corte personalizado"),
      categoria: limparTexto(nomeOuCorte.categoria, "Outros")
    };
  }

  return {
    nome: limparTexto(nomeOuCorte, "Corte personalizado"),
    categoria: limparTexto(categoriaInformada, "Outros")
  };
}

/**
 * Resolve o perfil usado no plano. O nome exato dos demos tem prioridade;
 * itens enviados pelo dono recebem um fallback por categoria ou o perfil geral.
 *
 * @param {string|{nome?: string, categoria?: string}} nomeOuCorte
 * @param {string} [categoriaInformada]
 * @returns {{nome: string, categoria: string, perfilId: string, correspondencia: "nome"|"categoria"|"fallback"}}
 */
export function resolverPerfilCuidadosCabelo(nomeOuCorte, categoriaInformada) {
  const entrada = normalizarEntrada(nomeOuCorte, categoriaInformada);
  const perfilPorNome = PERFIL_POR_NOME[normalizarChaveCuidadosCabelo(entrada.nome)];

  if (perfilPorNome) {
    return { ...entrada, perfilId: perfilPorNome, correspondencia: "nome" };
  }

  const perfilPorCategoria = PERFIL_POR_CATEGORIA[normalizarChaveCuidadosCabelo(entrada.categoria)];
  if (perfilPorCategoria) {
    return { ...entrada, perfilId: perfilPorCategoria, correspondencia: "categoria" };
  }

  return { ...entrada, perfilId: "geral", correspondencia: "fallback" };
}

/**
 * Cria um plano novo e mutável a cada chamada, sem alterar os modelos internos.
 * Aceita diretamente um HairCatalogItem ou os argumentos (nome, categoria).
 *
 * @param {string|{nome?: string, categoria?: string}} nomeOuCorte
 * @param {string} [categoriaInformada]
 * @returns {{
 *   versao: number,
 *   corte: {nome: string, categoria: string},
 *   perfilId: string,
 *   correspondencia: "nome"|"categoria"|"fallback",
 *   resumo: string,
 *   rotina: string[],
 *   produtos: Array<{tipo: string, finalidade: string}>,
 *   evitar: string[],
 *   manutencao: {intervaloRetorno: string, orientacao: string},
 *   aviso: string
 * }}
 */
export function criarPlanoCuidadosCabelo(nomeOuCorte, categoriaInformada) {
  const resolucao = resolverPerfilCuidadosCabelo(nomeOuCorte, categoriaInformada);
  const perfil = PERFIS[resolucao.perfilId];

  return {
    versao: CUIDADOS_CABELO_VERSAO,
    corte: { nome: resolucao.nome, categoria: resolucao.categoria },
    perfilId: resolucao.perfilId,
    correspondencia: resolucao.correspondencia,
    resumo: `${resolucao.nome}: ${perfil.resumo}`,
    rotina: [...perfil.rotina],
    produtos: perfil.produtos.map((produto) => ({ ...produto })),
    evitar: [...perfil.evitar],
    manutencao: { ...perfil.manutencao },
    aviso: AVISO_PADRAO
  };
}

