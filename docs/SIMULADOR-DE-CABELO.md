# Simulador local de cabelo

Última atualização documental: **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

## Estado executivo

O simulador ativo em `/b/[barbearia]/simulacao` separa duas responsabilidades:

1. **preparo automático local da selfie**: MediaPipe e Canvas detectam o rosto/cabelo e criam, no próprio navegador, a cobertura usada para ocultar o cabelo original;
2. **placement manual primário**: o cliente posiciona o novo corte por botões, sem auto-fit de posição, escala ou rotação.

O placement ativo é o contrato **v7**:

- `algoritmo: "manual-placement-v1"`;
- `origem: "manual-local"`;
- `automatico: false`;
- `ajusteManual.versao: 2`;
- geometria absoluta `x`, `y`, `largura`, `altura` e `rotacao`;
- confirmação explícita em **Pronto** antes de publicar o resultado.

O recibo do preparo continua **v3**, `hair-occlusion-canvas-v3`. Face Landmarker e Image Segmenter permanecem necessários para remover o cabelo original, mas landmarks, caixa do cabelo, roll e demais métricas **não calculam o placement v7**.

O painel manual fica sempre na coluna direita da foto. Ele não é movido para cima ou para baixo nos layouts validados de `320 px`, `390 px`, `768 px` e desktop.

O estado correto desta entrega é **protótipo técnico funcional em validação, ainda não aprovado para clientes reais**. A composição é uma prévia 2D aproximada e pode revelar cabelo original quando o molde não cobre toda a região detectada.

Decisão de foco: o cabelo fica **congelado temporariamente** nesse estado porque já está bom para demonstrar a ideia. O congelamento evita novas mudanças visuais enquanto o projeto constrói testes, privacidade, identidade e dados. Ele não significa aparência perfeita, matriz aprovada, piloto concluído nem retirada das limitações abaixo.

## Reconciliação transversal em 21/08/2026

O pipeline descrito neste documento permanece congelado e sem mudança: preparo automático local, placement manual v7 e confirmação em **Pronto**. Nenhum código visual mudou nesta revisão. Auth/lifecycle com sessão Supabase SSR, cookies e membership foram validados localmente; TOTP é opcional, mas isso não torna simulador, catálogo ou jornada persistentes.

Sem variáveis do Supabase, o desenvolvimento continua no fallback demonstrativo. Em produção, `/admin` e `/barbeiro/*` permanecem bloqueados. Os dados do painel, catálogo e jornada continuam em armazenamento local ou mocks. A baseline atual de banco passa 205/205; somente o cadastro básico de clientes possui persistência e consentimento versionado, enquanto selfies continuam sem persistência.

## Objetivo e limite do produto

O simulador ajuda o cliente a responder: **“esse estilo combina comigo o suficiente para conversar com a barbearia?”**

Ele não promete:

- que o corte físico ficará exatamente igual;
- reconstrução real do couro cabeludo ou do fundo escondido;
- resultado hiper-realista em qualquer selfie;
- suporte confiável a perfil, cabeça muito inclinada, acessórios, cabelo comprido ou fundo complexo;
- análise 3D, previsão de crescimento ou recomendação clínica.

O produto não usa IA generativa em runtime. A segmentação e o Face Landmarker são visão computacional/ML local. A cobertura de pele é sintetizada por regras determinísticas em Canvas e recortada pela silhueta alpha do cutout escolhido.

## Arquivos ativos

| Arquivo | Responsabilidade |
| --- | --- |
| `app/b/[barbearia]/simulacao/page.js` | Carrega a jornada, separa candidato salvo de placement live, valida recibo v3 + placement manual v7 confirmado e libera o avanço |
| `app/b/[barbearia]/simulacao/_cabelo/CabeloSimuladorLocal.jsx` | Coordena catálogo, preparo, rascunho manual, recomposição, confirmação, fallback, comparação e painel lateral |
| `app/b/[barbearia]/simulacao/_cabelo/RemocaoCabeloAutomatica.jsx` | Carrega os modelos locais, analisa a selfie, segmenta, sintetiza a cobertura e a recorta pelo matte do placement atual |
| `app/b/[barbearia]/simulacao/_cabelo/remocaoCabeloAutomaticaLocal.js` | Contrato/recibo v3, landmarks anatômicos, máscaras, componente facial, cap, amostragem e feather |
| `app/b/[barbearia]/simulacao/_cabelo/cabeloCatalogoLocal.js` | Base fixa do catálogo, geometria manual absoluta, limites, confirmação v7, identidade e revisão do molde |
| `lib/hairCatalog.js` | Biblioteca demonstrativa e uploads locais do dono |
| `lib/clienteFlow.js` | Jornada local em `sessionStorage` |
| `public/modelos/selfie_multiclass_256x256.tflite` | Modelo local de segmentação multiclasses |
| `public/modelos/face_landmarker.task` | Modelo local usado pelo preparo da selfie |
| `public/mediapipe/wasm/` | Runtime local do MediaPipe Tasks Vision |
| `public/demo-cortes/` | Cutouts demonstrativos permitidos |

`CoberturaCabeloOriginal.jsx`, `neutralizacaoCabeloLocal.js` e o fluxo antigo de pintura não são importados pelo simulador ativo. Os helpers de auto-fit v6 ainda podem existir no utilitário como histórico técnico, mas não são chamados pela tela nem aceitos pelo validador da jornada.

## Separação entre preparo e placement

### Preparo automático local

O preparo:

- exige uma selfie frontal;
- roda uma detecção do Face Landmarker e uma segmentação do Image Segmenter;
- localiza a região segura para sintetizar a cobertura;
- cria um Canvas-base efêmero;
- emite o recibo mínimo v3 quando termina;
- não escolhe `x`, `y`, `largura`, `altura` ou `rotacao` do novo cabelo.

O Face Landmarker continua validando uma única cabeça, roll, assimetria e frontalidade porque essas informações protegem a remoção. Isso não deve ser descrito como “encaixe automático”.

### Placement manual primário

O placement:

- começa numa posição fixa definida pelo catálogo;
- não lê landmarks ou medidas da selfie;
- é alterado apenas pelos controles do cliente;
- recompõe o matte após cada mudança;
- só é publicado ao pai depois que a composição atual está pronta e o cliente toca **Pronto**.

## Fluxo entregue ao cliente

1. A página valida `barbeariaSlug`, nome, WhatsApp e selfie na jornada local.
2. O simulador carrega somente moldes ativos, autorizados, prontos e com fonte visual aceita.
3. O primeiro corte válido é selecionado, ou um corte salvo é recuperado por `templateId`/nome.
4. O canal alpha do cutout é lido em memória para validar a transparência. Essa análise não posiciona o cabelo.
5. O cliente toca **Preparar foto**. A demo e uma retomada com recibo v3 reexecutam esse preparo porque o Canvas não é persistido.
6. A selfie é desenhada com `object-cover` no palco lógico `640 × 800`.
7. Face Landmarker e Image Segmenter analisam a selfie localmente.
8. Os gates de pose, múltiplos rostos, cobertura e confiança são aplicados.
9. A cobertura sintética segura é gerada num Canvas-base efêmero.
10. O simulador cria a posição inicial fixa v7 a partir de `AJUSTE_CABELO_PADRAO` e `transformacaoPadrao`.
11. O alpha do cutout nessa geometria vira o matte de oclusão da cobertura.
12. Quando a composição termina, **Depois** é exibido e os controles manuais são habilitados.
13. O cliente move o corte e altera largura, altura ou inclinação no painel à direita.
14. Cada toque invalida a confirmação anterior, recompõe o matte e mantém **Continuar** bloqueado.
15. O cliente confere as bordas e toca **Pronto**.
16. O placement manual v7 confirmado é publicado ao estado pai.
17. O avanço exige simultaneamente recibo v3 válido e placement v7 confirmado.
18. **Continuar para recomendações** persiste corte, barba, recibo e placement.

Em erro de preparo, aparecem **Tentar novamente** e **Trocar ou refazer a selfie**. Não existe fallback de pincel, clone stamp, drag ou slider contínuo.

## Ordem das camadas

```text
figura responsiva 4:5
├── selfie original com object-cover
├── Canvas 640 × 800 da neutralização recortada pelo matte atual
├── cutout fotográfico no placement manual v7
├── estado de carregamento/erro, quando necessário
└── legenda do corte
```

Canvas e placement usam o mesmo palco lógico. A figura pode mudar de tamanho por CSS, mas a relação permanece `4:5`.

## Posição inicial fixa

O ponto inicial não é um auto-fit. Ele é igual para qualquer selfie que use o mesmo item do catálogo.

Base global:

| Campo | Valor |
| --- | ---: |
| `x` | `50` |
| `y` | `20` |
| `largura` | `72` |
| `altura` | `38` |
| `rotacao` | `0` |

`transformacaoPadrao` do item pode aplicar:

- `deslocamentoX` sobre `x`;
- `deslocamentoY` sobre `y`;
- `escala` simultânea sobre a largura/altura iniciais;
- `rotacao` inicial.

Esses valores são calibração editorial fixa do molde, não uma medição do cliente. **Restaurar posição inicial** recompõe exatamente essa base e remove a confirmação anterior; não existe botão “Voltar ao automático”.

## Ajuste manual absoluto

Os controles ficam sempre visíveis na coluna direita depois que o catálogo é carregado. Antes do preparo, permanecem desabilitados.

| Grupo | Passo por toque | Limite absoluto |
| --- | ---: | ---: |
| Mover em X | `1,5` ponto percentual | `0…100` |
| Mover em Y | `1,5` ponto percentual | `0…75` |
| Largura | `3` pontos percentuais | `28…130` |
| Altura | `3` pontos percentuais | `12…100` |
| Inclinação/rotação | `1°` | `-45°…45°` |

Largura e altura são independentes. O contrato salva a geometria final absoluta; não há `deslocamentoX`, `deslocamentoY` ou `escala` relativos a uma base automática.

Cada mudança:

```text
toque no controle
  → onAjusteChange(null) no mesmo evento
  → ajusteManual.confirmado = false
  → geometria absoluta atualizada e normalizada
  → composicaoPronta = false
  → nova rasterização do alpha no placement atual
  → Canvas-base destination-in matte
  → composição pronta
  → aguarda o cliente tocar Pronto
```

Não há nova chamada a `FaceLandmarker.detect` ou `ImageSegmenter.segment` durante movimento, redimensionamento, rotação, reset ou troca de corte. O Canvas-base é reutilizado.

Enquanto `recompondoAjusteManual === true`, a foto recebe a camada de processamento, os controles manuais e a troca de corte ficam desabilitados, e o placement externo continua `null`. Isso evita acumular uma segunda mudança sobre uma matte ainda incompatível. Quando a composição termina, os controles voltam, mas **Continuar** permanece bloqueado até um novo **Pronto**.

## Confirmação e fallback

**Pronto** é uma ação semântica:

- só habilita com remoção pronta, geometria v7 válida, matte atual composta e ausência de erro;
- troca `ajusteManual.confirmado` para `true`;
- publica o placement ao pai;
- libera o CTA externo apenas enquanto essa mesma geometria continua válida.

Qualquer ajuste posterior volta a `confirmado: false`.

O simulador guarda o último placement manual cuja composição terminou. Se uma correção posterior falhar:

1. o placement externo permanece `null`;
2. a confirmação é removida;
3. o sistema tenta recompor o último manual válido;
4. quando o último válido era apenas a posição inicial, essa base fixa é o fallback;
5. o cliente precisa confirmar novamente em **Pronto**.

Se nem a base puder ser composta, o erro permanece visível e o avanço fica bloqueado. Não existe recuperação por auto-fit.

## Layout foto + painel

A foto e o painel são irmãos na mesma grade:

```text
┌──────────────────────────┬──────────────────────┐
│ foto / Antes e Depois    │ ajuste manual       │
│                          │ mover                │
│                          │ largura              │
│                          │ altura               │
│                          │ inclinação           │
│                          │ restaurar / Pronto   │
└──────────────────────────┴──────────────────────┘
```

Regras:

- a foto fica à esquerda;
- o painel fica à direita e nunca é empilhado acima ou abaixo;
- ambos usam `sticky` com topo adaptado ao viewport;
- o painel usa rolagem vertical própria quando necessário;
- os botões mantêm alvo mínimo de `44 × 44 px`;
- em telas estreitas, textos auxiliares, padding e gaps diminuem, mas as duas colunas são preservadas;
- foram verificados `320 px`, `390 px`, `768 px` e desktop sem sobreposição dos controles.

## Contrato persistido do placement v7

Exemplo:

```js
{
  versao: 7,
  templateId: "demo-crop-texturizado",
  asset: "/demo-cortes/crop-texturizado-realista-v3.png",
  moldeRevisao: "asset:/demo-cortes/crop-texturizado-realista-v3.png:r6",
  corte: "Crop texturizado",
  origem: "manual-local",
  algoritmo: "manual-placement-v1",
  automatico: false,
  x: 48.5,
  y: 18.5,
  largura: 69,
  altura: 41,
  rotacao: -1,
  inclinacao: 0,
  brilho: 100,
  contraste: 100,
  saturacao: 100,
  tonalidade: 0,
  sombra: 20,
  opacidade: 100,
  espelhado: false,
  ajusteManual: {
    versao: 2,
    aplicado: true,
    confirmado: true
  }
}
```

Os números são ilustrativos. A página exige:

- `versao === 7`;
- `algoritmo === "manual-placement-v1"`;
- `origem === "manual-local"`;
- `automatico === false`;
- `ajusteManual.versao === 2`;
- `ajusteManual.aplicado === true`;
- `ajusteManual.confirmado === true`;
- `templateId`, `corte` e `moldeRevisao` não vazios;
- geometria numérica, finita e dentro dos limites;
- corte do placement igual ao corte atual;
- recibo de remoção v3 concluído.

O placement não inclui landmarks, caixa facial, caixa do cabelo, hash do Face Landmarker, confiança automática ou deltas relativos.

## Rejeição do v6

O auto-fit v6 foi retirado do fluxo ativo. Placements com:

- `versao: 6`;
- `algoritmo: "face-landmarks-alpha-v3"`;
- `origem: "auto-fit-local"`;
- `origem: "auto-fit-local-refinado-manualmente"`;
- `ajusteManual.versao: 1`;

não são migrados nem aceitos para liberar **Continuar**. Ao encontrar um candidato antigo, o simulador usa a posição inicial fixa v7 e exige nova confirmação manual.

Os helpers v6 permanecem somente como histórico de implementação e devem ser removidos quando não forem mais necessários para auditoria/regressão.

## Catálogo e elegibilidade

O runtime permite os cinco assets empacotados:

| ID | Nome | Asset |
| --- | --- | --- |
| `demo-crop-texturizado` | Crop texturizado | `/demo-cortes/crop-texturizado-realista-v3.png` |
| `demo-quiff-moderno` | Quiff moderno | `/demo-cortes/quiff-moderno-realista-v4.png` |
| `demo-cachos-taper` | Cachos taper | `/demo-cortes/cachos-taper-realista-v2.png` |
| `demo-slick-back` | Slick back | `/demo-cortes/slick-back-realista-v2.png` |
| `demo-topo-volumoso` | Topo volumoso | `/demo-cortes/topo-volumoso-realista-v2.png` |

O item precisa ter:

- `ativo === true`;
- `direitosConfirmados === true`;
- `prontoParaSimulacao === true`;
- PNG/WebP transparente válido ou um dos cinco paths permitidos.

Assets estáticos entram por allowlist literal. Uploads locais entram somente como Data URL PNG/WebP com assinatura conferida. JPEG não é aceito como molde pronto no runtime.

A análise alpha continua validando a existência de uma silhueta utilizável. Ela pode calcular caixa/contorno por compatibilidade interna, mas esses dados não posicionam o contrato v7.

## Identidade e revisão do molde

`moldeRevisao` impede reaplicar uma geometria a outro conteúdo com o mesmo ID:

- demo: `asset:<path>:r<revisaoEncaixe>`;
- upload: revisão, data de edição, tamanho e hash curto do Data URL.

Uma restauração exige o mesmo:

- `templateId`;
- nome do corte;
- `moldeRevisao`;
- `asset`, quando houver.

`HAIR_CATALOG_ENCAIXE_REVISAO = 6` continua sendo a revisão editorial dos cinco itens demonstrativos. Esse `6` não é a versão do placement: o contrato de placement ativo é v7.

## Persistência, reload e troca de corte

### Persistido na sessão

`barbervision:fluxo` pode conter:

- selfie normalizada ou path da demo;
- nome, WhatsApp, slug e etapa;
- corte e barba;
- placement manual v7 confirmado;
- recibo mínimo de remoção v3.

O placement live só é persistido junto da escolha quando o cliente toca **Continuar para recomendações**. **Pronto** publica o resultado confirmado ao estado da página, mas não cria imagem final.

### Reload

No reload:

1. o placement v7 confirmado do storage é tratado apenas como candidato;
2. Face Landmarker e Image Segmenter executam novamente;
3. o Canvas-base é reconstruído;
4. a identidade/revisão do molde é validada;
5. a geometria absoluta salva é recomposta;
6. somente após a matte pronta o placement confirmado volta a ser publicado.

Reloads repetidos preservam o v7 confirmado no storage enquanto reprocessam a selfie. Um JSON salvo nunca é tratado diretamente como resultado visual pronto.

### Refazer preparo

**Refazer preparo da foto**:

- guarda a geometria atual em memória;
- limpa a confirmação live e persistida junto do recibo anterior;
- executa novamente os dois modelos;
- recompõe a geometria manual preservada;
- exige um novo toque em **Pronto**.

### Trocar corte

Os rascunhos ficam num mapa efêmero por `templateId + moldeRevisao`. Ao trocar de corte:

- o placement externo é invalidado no mesmo evento;
- não há nova inferência da selfie;
- o novo molde usa seu rascunho anterior ou sua base fixa;
- a matte é recomposta;
- o cliente precisa confirmar o corte atual em **Pronto**.

Trocar selfie ou receber atualização do catálogo limpa rascunhos, confirmação e candidatos incompatíveis.

## Privacidade

Não entram no storage:

- Canvas da neutralização;
- imagem final composta;
- máscaras de categoria ou confiança;
- pixels e amostras de pele/cabelo;
- `caixaFace`, `caixaCabelo`, cap ou landmarks;
- análise alpha detalhada e matte;
- métricas de confiança do preparo.

O recibo v3 é pequeno e o placement v7 contém somente identidade do molde, geometria/filtros e estado de confirmação manual.

## Contenção de segurança ao redor do simulador

A revisão de segurança não alterou o pipeline do cabelo. Headers defensivos globais incluem `nosniff`, proteção contra framing, Referrer Policy, Permissions Policy e COOP. Sem configuração do Supabase, o Proxy mantém a jornada pública disponível e bloqueia as superfícies internas de produção conforme a regra descrita na reconciliação acima.

Com o Supabase configurado, o Proxy atualiza/valida a sessão por cookies e os layouts de servidor exigem membership ativa; TOTP é opcional. A jornada de Auth/MFA foi comprovada historicamente pelo Playwright. A quinta migration de convites/lifecycle/auditoria passou reset, pgTAP e validação funcional de convite/aceite. Ela não migra os dados de negócio locais nem isola a jornada pública. RLS/grants e Storage com JWT passaram localmente; CSP compatível com MediaPipe/WASM permanece pendente.

## Evidência histórica da camada congelada

Em **07/08/2026**, antes da inclusão posterior das rotas e dependências de Auth, foi registrado:

- `launcher.bat --check`: aprovado;
- build e lint aprovados naquele snapshot;
- os mesmos `21` arquivos da camada do simulador/assets mantiveram o hash agregado SHA-256 `55AB8710ECD0F52DBA7DA452DCED95CA22EF29CBEE2BBA9B6F507A5B6BAB42EF`.

Os números antigos de rotas, warnings e auditoria de dependências não descrevem mais a árvore atual. O build foi repetido e aprovado em **14/08/2026**; o smoke HTTP de contenção permanece o de **13/08/2026**, e o smoke visual do cabelo não foi repetido. Em 14/08, lint, launcher, atalho da Área de Trabalho, inventário, documentação e hashes dos assets/modelos também foram revalidados. Hashes e smoke visual não foram repetidos em 21/08. Essas verificações não mudaram nem revalidaram visualmente a camada congelada.

### Smoke funcional histórico

No Chrome a `390 px`, foram verificados:

- painel manual à direita da foto;
- largura alterada de `72` para `75` sem deslocar a estrutura;
- **Pronto** confirmando o placement atual;
- avanço para recomendações com placement v7;
- nenhum page error.

O baseline funcional anterior de v7 — posição fixa, controles absolutos, reset, fallback, reload, refazer, rejeição de v6 e troca de corte sem reinferência — permanece tecnicamente inalterado na camada congelada. Ainda assim, hash e smoke pontual não substituem uma suíte E2E versionada, teste em aparelhos reais, matriz consentida ou aprovação visual por barbeiro.

## Histórico retirado: auto-fit v6

Até a revisão anterior, o fluxo usava:

- placement `versao: 6`;
- algoritmo `face-landmarks-alpha-v3`;
- landmarks de testa/têmporas;
- âncoras alpha do cutout;
- cobertura independente X/Y;
- resultado automático ou delta manual v1 relativo ao automático.

Esse desenho foi retirado porque o usuário decidiu que o cliente deve posicionar o cabelo. As coordenadas, envelopes e scores do v6 permanecem somente em histórico de commits/documentos anteriores e não devem ser usados como contrato atual.

O preparo v3 não foi retirado. Face Landmarker e segmentação continuam ativos exclusivamente para validar a selfie e produzir a remoção local.

## Limitações conhecidas

### Bloqueadoras para clientes reais

1. Cabelo fora da cap pode continuar visível nas têmporas.
2. Um placement manual pequeno ou deslocado pode revelar cabelo original.
3. Ainda não existe gate de cabelo residual após aplicar o alpha do corte.
4. O matte endurece alpha `>=36/255`; halo, pele ou fade incorporado ao asset podem virar blocos.
5. Não existe matriz consentida de cabelos, tons de pele, fundos, assets e aparelhos.
6. Face Landmarker e a heurística complementar não garantem recusa de toda montagem.
7. Os assets demonstrativos ainda exigem revisão visual por barbeiro.

### Operação

- modelos e WASM somam cerca de `51,4 MiB` estáticos;
- processamento ocorre na thread principal;
- Chrome Android e Safari iOS reais ainda precisam de validação;
- não há regressão visual automatizada;
- catálogo e jornada continuam locais, sem isolamento real por tenant.

## Ordem atual do projeto

Enquanto o simulador permanece congelado para demonstração, siga a sequência operacional canônica de dez passos do [Plano de execução](PLANO-DE-EXECUCAO.md): reativar/validar a pilha; criar baseline Git; executar reset/lint/168 pgTAP; testar concorrência; ensaiar rollback/roll-forward; preparar Auth real; validar Data API/Storage por JWT; criar E2E; fechar gaps operacionais; e implementar privacidade antes de dados reais. O backlog visual abaixo volta a ser gate na fase de operação e release, antes do piloto.

## Backlog obrigatório do simulador antes do piloto

### P0

1. Calcular `visibleResidualMask = hairMask × (1 - alphaDoCortePosicionado)`.
2. Bloquear **Pronto** quando uma área relevante de cabelo original continuar descoberta.
3. Revisar alpha/matte e laterais dos cinco assets.
4. Montar matriz consentida e critérios de aceite com barbeiro.
5. Versionar testes de contrato v3/v7, confirmação, fallback, reload e rejeição v6.
6. Criar E2E para `320`, `390`, `768` e desktop.

### P1

1. Validar o mesmo alpha antes da publicação pelo dono.
2. Criar calibração editorial clara de `transformacaoPadrao` por molde.
3. Medir desempenho, memória e bateria em aparelhos reais.
4. Remover definitivamente helpers v6 depois de cobrir o histórico por testes.

### P2

1. Tornar catálogo tenant-scoped em banco/Storage.
2. Aplicar RBAC de dono e funcionário.
3. Implementar consentimento, retenção e exclusão da selfie.
4. Configurar CSP, cache e observabilidade sem pixels/landmarks.

## Regra de comunicação

Usar:

> Protótipo de prévia 2D com remoção local e posicionamento manual. O cliente ajusta o molde ao lado da foto e confirma o resultado; a compatibilidade entre cabelo original e cutout ainda está em validação.

Não usar “resultado real garantido”, “remove qualquer cabelo”, “hiper-realista”, “encaixe automático” ou “pronto para clientes”.
