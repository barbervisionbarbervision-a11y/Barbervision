# API e integrações

Última atualização: **22/08/2026**. Evidência operacional atual: [Estado de validação](ESTADO-VALIDACAO.md).

## Visão geral

O Barber Vision não depende de API de geração de imagens ou servidor de inferência. O navegador:

- normaliza a selfie;
- executa Face Landmarker e Image Segmenter locais;
- sintetiza a cobertura do cabelo original em Canvas;
- valida o alpha do cutout;
- cria uma posição inicial fixa a partir do catálogo;
- permite que o cliente ajuste manualmente `x`, `y`, `largura`, `altura` e `rotacao`;
- recompõe o matte localmente;
- publica o placement somente quando o cliente toca **Pronto**.

O placement ativo é **v7**, `manual-placement-v1`, `manual-local`, `automatico: false`. Landmarks continuam no preparo/remoção, mas não posicionam o novo cabelo.

Existem integrações server-side estreitas para Auth, incluindo callbacks, clientes Supabase SSR, Server Actions e o worker protegido da outbox. Em 23/08, reset, lint, pgTAP 192/192, rollback/roll-forward 8–4, concorrência e E2E atualizado passaram.

Não há endpoints de domínio para clientes, catálogo, agenda, simulações, avaliações, produtos, estoque, pedidos, pagamentos, fechamento financeiro, obrigações fiscais ou assinaturas. O painel ainda lê mocks/armazenamento local, e a jornada pública não persiste no Supabase. A vitrine pode criar um link `wa.me` somente quando o dono demo informa um número comercial; não existe integração com a API oficial do WhatsApp.

## Plataforma HTTP e modo seguro

O runtime usa Next `16.3.0`. `proxy.js` corresponde a `/admin/:path*`, `/barbeiro/:path*` e `/auth/:path*` e seleciona um de dois modos:

- **sem variáveis Supabase:** desenvolvimento preserva a demonstração local; em produção, `/admin` permanece sempre bloqueado e `/barbeiro/*` responde `307` para `/?modo=seguro`, salvo `BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=true`;
- **com variáveis Supabase:** renova cookies e valida claims com `getClaims()`; permite `/barbeiro/login`, `/barbeiro/esqueci-senha` e `/auth/*`; protege as demais rotas `/barbeiro/*`; redireciona anônimo ao login e usuário autenticado no login ao dashboard;
- `/admin` permanece bloqueado em produção e sempre que o Supabase está configurado, pois o Auth da plataforma ainda não foi criado;
- a flag insegura nunca contorna Auth quando o Supabase está configurado.

O redirect substitui a query anterior, usa `Cache-Control: private, no-store, max-age=0` e informa `X-BarberVision-Safe-Mode: active`. A flag é server-only e não pode receber o prefixo `NEXT_PUBLIC_`.

`next.config.mjs` desativa `X-Powered-By` e aplica a páginas e assets:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()`;
- `Cross-Origin-Opener-Policy: same-origin`.

CSP e HSTS continuam pendentes. A CSP precisa ser testada contra scripts/estilos do Next e MediaPipe/WASM; HSTS deve ser configurado somente no host HTTPS definitivo.

No modo real, o Proxy é apenas a primeira fronteira. Os layouts consultam perfil/membership/tenant no servidor, os módulos exclusivos do dono exigem AAL2 e a migration `auth_assurance` pretende repetir esse requisito em RLS/Storage. No modo demo, o `sessionStorage` continua adulterável e não constitui autorização. Em ambos os modos, chunks mock não são confidenciais e não podem conter dados reais.

Inventário de 14/08/2026:

- 31 páginas, dois Route Handlers e Proxy;
- 10 páginas públicas, 20 páginas `/barbeiro` e uma página `/admin`;
- modelos `.task`/`.tflite` e WASM continuam same-origin;
- simulador manual permanece congelado nesta etapa;
- validação de Auth, e-mail, MFA, SQL e RLS com infraestrutura real continua pendente.

## Geração de imagem

Não há endpoint, SDK, chave ou dependência de geração em runtime. A prévia é um overlay 2D local.

Os PNGs demonstrativos foram criados/revisados offline com imagegen e remoção local de chroma. Esse processo de autoria está documentado em [Assets de demonstração](ASSETS-DEMONSTRACAO.md) e não é executado pelo produto.

## Visão computacional local

O simulador usa:

- `@mediapipe/tasks-vision` `0.10.35`;
- `public/modelos/selfie_multiclass_256x256.tflite`;
- `public/modelos/face_landmarker.task`;
- `public/mediapipe/wasm/`;
- componente `RemocaoCabeloAutomatica.jsx`;
- utilitário `remocaoCabeloAutomaticaLocal.js`.

Artefatos:

| Artefato | SHA-256 |
| --- | --- |
| SelfieMulticlass | `C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0` |
| Face Landmarker | `64184E229B263107BC2B804C6625DB1341FF2BB731874B0BCC2FE6544E0BC9FF` |

Modelos + variantes WASM somam `53.885.062` bytes, aproximadamente `51,4 MiB`. Isso não afirma que todas as variantes são baixadas em cada execução.

O preparo executa uma detecção de landmarks e uma segmentação. Movimento, largura, altura, rotação, reset e troca de corte recompõem somente o matte; não repetem as inferências.

Selfie, runtime e modelos têm limite inicial de `45 s`. Estouro gera erro recuperável. “Local” significa processamento no navegador, não operação integralmente offline: arquivos ainda são entregues pela hospedagem.

## Separação de responsabilidades

```text
Face Landmarker + Image Segmenter
        ↓
preparo/remoção local v3
        ↓
Canvas-base efêmero

transformacaoPadrao do catálogo
        ↓
posição inicial fixa
        ↓
ajuste manual absoluto do cliente
        ↓
Pronto
        ↓
placement manual v7 publicado
```

Face Landmarker mede cabeça/pose para limitar o preparo. Ele não calcula o placement. A análise alpha valida o cutout e fornece sua silhueta ao matte; não faz auto-fit.

## Composição local no navegador

A tela `app/b/[barbearia]/simulacao/page.js` usa `CabeloSimuladorLocal`.

```text
selfie JPEG normalizada em sessionStorage
        +
Canvas-base efêmero de MediaPipe/Canvas
        +
PNG empacotado ou Data URL PNG/WebP ativo/autorizado/pronto
        ↓
posição fixa do catálogo + placement manual v7
        ↓
Canvas-base destination-in alpha posicionado
        ↓
selfie → Canvas composto → cutout DOM/CSS
        ↓
cliente confirma em Pronto
        ↓
corte + barba + recibo v3 + placement v7
```

Não é criado PNG/JPG composto. **Antes** mostra a selfie original. **Depois** mostra a cobertura recortada pelo matte atual sob o cutout.

Cada mudança manual:

- invalida o placement live;
- troca `confirmado` para `false`;
- recompõe a matte;
- bloqueia temporariamente os demais controles e a troca de corte;
- mantém o CTA bloqueado;
- exige novo **Pronto**.

## Estado da jornada

Chave:

```text
barbervision:fluxo
```

Campos relevantes:

```js
{
  selfieDataUrl: "data:image/jpeg;base64,... ou /demo-cliente.png",
  corte: "Crop texturizado",
  barba: "Sem barba",
  ajusteCabelo: {
    versao: 7,
    templateId: "demo-crop-texturizado",
    asset: "/demo-cortes/crop-texturizado-realista-v3.png",
    moldeRevisao: "asset:/demo-cortes/crop-texturizado-realista-v3.png:r6",
    corte: "Crop texturizado",
    origem: "manual-local",
    algoritmo: "manual-placement-v1",
    automatico: false,
    x: 50,
    y: 20,
    largura: 72,
    altura: 38,
    rotacao: 0,
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
  },
  neutralizacaoCabelo: {
    versao: 3,
    metodo: "mediapipe-multiclass-local",
    algoritmo: "hair-occlusion-canvas-v3",
    modeloSha256: "C6748B...E0E0",
    concluida: true,
    resultado: "removido"
  }
}
```

O placement v7 contém geometria absoluta. Ele não contém:

- deltas relativos a auto-fit;
- `modeloCabecaSha256`;
- confiança de posicionamento;
- landmarks;
- caixa/cap;
- Canvas ou matte.

O recibo v3 não contém pixels, máscaras ou métricas. Ele permanece semanticamente separado do placement.

## Regras do placement manual

### Base fixa

Valores globais:

```js
{
  x: 50,
  y: 20,
  largura: 72,
  altura: 38,
  rotacao: 0
}
```

`transformacaoPadrao` do catálogo pode alterar deslocamento, escala e rotação iniciais. Essa base é fixa por molde e não lê a selfie.

### Passos e limites

| Campo | Passo | Limite |
| --- | ---: | ---: |
| `x` | `1,5` | `0…100` |
| `y` | `1,5` | `0…75` |
| `largura` | `3` | `28…130` |
| `altura` | `3` | `12…100` |
| `rotacao` | `1°` | `-45°…45°` |

Largura e altura são independentes. **Restaurar posição inicial** recompõe a base fixa e remove a confirmação.

### Confirmação

O pai recebe placement não nulo somente quando:

- recibo da remoção está pronto;
- geometria é válida;
- matte atual terminou;
- `ajusteManual.confirmado === true`.

**Pronto** publica o contrato live. **Continuar para recomendações** grava esse contrato na sessão.

### Fallback

Falha de uma nova composição restaura o último placement manual composto; se ele era a base fixa, restaura essa base. A confirmação não é reaplicada automaticamente.

## Reload e compatibilidade

O candidato salvo nunca é usado diretamente como resultado.

No reload:

1. o v7 confirmado permanece no storage;
2. os dois modelos executam novamente;
3. o Canvas-base é reconstruído;
4. `templateId`, `corte`, `moldeRevisao` e `asset` são validados;
5. a geometria absoluta é recomposta;
6. somente após a matte o placement confirmado é republicado.

Reload repetido restaura o v7 da mesma forma.

**Refazer preparo da foto** guarda a geometria em memória, limpa a confirmação persistida/live e exige novo **Pronto** depois da recomposição.

Trocar de corte usa um rascunho em memória por molde/revisão ou a base fixa do novo molde, sem nova inferência.

## Rejeição de contratos antigos

O caminho ativo rejeita:

- placement v6 `face-landmarks-alpha-v3`;
- `auto-fit-local`;
- `auto-fit-local-refinado-manualmente`;
- `ajusteManual.versao: 1`;
- placements v4/v5;
- qualquer v7 não confirmado;
- identidade/revisão/geometria incompatível.

O v6 permanece apenas como histórico retirado. Não há migração de coordenadas automáticas para o manual v7.

## Layout público

O painel do placement:

- permanece à direita da foto;
- nunca é movido para cima/baixo;
- empilha Mover, Largura, Altura, Inclinação, Restaurar e Pronto;
- mantém botões de `44 × 44 px`;
- usa rolagem própria em pouca altura.

O comportamento foi verificado em `320`, `390`, `768` e desktop.

## Recibo de remoção

Contrato persistido:

```js
{
  versao: 3,
  metodo: "mediapipe-multiclass-local",
  algoritmo: "hair-occlusion-canvas-v3",
  modeloSha256: "C6748B1253A99067EF71F7E26CA71096CD449BAEFA8F101900EA23016507E0E0",
  concluida: true,
  resultado: "removido" | "sem-cabelo"
}
```

Detalhes de gates, cap e matte: [Remoção automática local](REMOCAO-AUTOMATICA-LOCAL.md).

## Validação atual

O último smoke específico do simulador confirmou:

- preparo local sem egress;
- placement manual v7;
- ausência de auto-fit no caminho ativo;
- **Pronto** publicando somente após a matte;
- fallback último manual/base;
- reload e reload repetido;
- refazer exigindo nova confirmação;
- rejeição do v6;
- troca de corte sem reinferência;
- painel à direita nos quatro viewports.

Essa evidência cobre o cabelo congelado, não o Auth adicionado depois. Os números históricos de bundle e contagem de páginas foram aposentados. A baseline atual tem 31 páginas e dois handlers, mas login, callback, e-mail, TOTP, AAL2, RLS e convites ainda precisam de teste integrado contra infraestrutura real.

## Cinco fotos-fonte recebidas em 21/07/2026

As cinco referências estão em `private-assets/cortes-recebidos-2026-07-21/`, fora de `public/` e ignoradas pelo Git.

Elas:

- não criaram endpoint/upload;
- não são servidas ao cliente;
- não foram copiadas como overlay;
- foram usadas apenas como referência ampla de estilo na autoria offline;
- não possuem comprovação de licença comercial/autorização;
- não devem ser publicadas.

Inventário: [Fotos reais recebidas](FOTOS-REAIS-RECEBIDAS.md).

## Catálogo local do dono

Chave:

```text
barbervision:hair-catalog:v1
```

Item normalizado:

```js
{
  id,
  nome,
  categoria,
  imageDataUrl,
  asset,
  metadataRecorte,
  ativo,
  direitosConfirmados,
  prontoParaSimulacao,
  transformacaoPadrao,
  encaixeAutomatico, // legado de catálogo; não posiciona o v7
  revisaoEncaixe: 6,
  origem
}
```

Regras:

- semeia cinco PNGs sintéticos ativos;
- permite desativá-los, mas bloqueia edição/remoção;
- upload aceita PNG/JPG/WebP até `1 MB`;
- JPG não pode virar molde pronto;
- editor trabalha em até `1.200 px`;
- oferece polígono, feather e retoque;
- exporta WebP/PNG transparente de até `1 MB`;
- entrega ao simulador somente item ativo, autorizado e pronto;
- runtime aceita Data URL PNG/WebP validada ou allowlist dos cinco paths;
- persiste no `localStorage` daquele navegador;
- trata JSON corrompido e quota.

`transformacaoPadrao` é a única calibração geométrica inicial usada pelo placement v7. `encaixeAutomatico.nivelTemplo`/âncoras podem permanecer no schema por compatibilidade histórica, mas não alimentam o runtime manual.

`moldeRevisao` usa path+revisão para demos e fingerprint para uploads. A revisão do catálogo permanece `6`; isso não muda a versão do placement, que é `7`.

Limitações:

- não há isolamento real por tenant;
- uploads não sincronizam entre dispositivos;
- Base64 aumenta armazenamento;
- alpha client-side não garante que rosto/fundo/pele foram removidos;
- qualidade/licença continuam sob responsabilidade operacional.

## Pós-venda local

Não existe endpoint de avaliação ou cuidados. O protótipo copia para `barbervision:pos-venda:v1:<slug>` apenas slug, corte, barba e horário. Selfie, nome e telefone não são copiados.

Regras estáticas locais resolvem cuidados conforme corte. Isso não autentica atendimento nem entrega avaliação à barbearia.

Produção exige atendimento persistido, token único/expirável e vínculo server-side entre tenant, cliente, profissional e avaliação.

## Produtos e solicitação assistida

`lib/productCatalog.js` usa:

```text
barbervision:produtos:v1:<slug codificado>
```

O módulo semeia produtos fictícios, normaliza dados e permite imagem Data URL opcional. Recomendações são regras locais, não IA nem estoque real.

`criarLinkWhatsappProduto` gera `wa.me` quando há número configurado. Abrir/copiar mensagem não cria pedido, reserva, pagamento ou baixa de estoque.

Produção exige API/commands validados, RLS, auditoria, idempotência e fonte de verdade.

## Fechamento financeiro e pacote para contador

`lib/fechamentoFinanceiro.js` implementa somente um contrato client-side. Não há integração bancária, contábil, municipal, estadual, Receita Federal, SERPRO, NFS-e, PGMEI ou PGDAS-D.

Persistência atual:

```text
barbervision:financeiro:v1:<slug codificado>:<AAAA-MM>
barbervision:financeiro-perfil:v1:<slug codificado>
```

A primeira chave guarda lançamentos, conciliação, status aberto/fechado, revisão e eventos. A segunda guarda campos empresariais declarados. Porte, natureza jurídica e regime tributário são dimensões distintas; nenhuma delas seleciona fórmula fiscal nesta versão.

A única saída é um download CSV criado com `Blob` no navegador. O arquivo contém contexto, resumo, lançamentos e avisos de que é gerencial. Ele usa BOM UTF-8, `;`, CRLF, quoting e proteção contra CSV injection. Exportar o arquivo não envia nada ao contador nem a terceiro.

O módulo não calcula imposto, lucro, DAS ou PGDAS-D; não transmite declaração, não emite guia e não registra pagamento. Para produção serão necessários ledger persistente por tenant, documentos e recebimentos confiáveis, Auth/RLS, trilha de auditoria, fechamento imutável/versionado e uma etapa explícita de conferência do contador antes de qualquer integração oficial. Consulte [Fechamento financeiro](FECHAMENTO-FINANCEIRO.md).

## Privacidade e LGPD

No fluxo atual:

- selfie fica no `sessionStorage`;
- Canvas, máscaras, matte, landmarks, cap e métricas não são persistidos;
- recibo v3 exclui dados detalhados;
- placement v7 persiste apenas identidade do molde, geometria/filtros e confirmação;
- não há imagem final composta;
- modelos/WASM são same-origin;
- ainda faltam consentimento, retenção, exclusão, política para menores e resposta a incidente.

Uploads do dono podem conter rosto/fundo/metadados enquanto estão no formulário. As referências privadas também podem conter pessoas e marcas. Esta documentação não substitui análise jurídica.

## Supabase

### Clientes e configuração

O código separa quatro clientes:

| Arquivo | Ambiente | Responsabilidade |
| --- | --- | --- |
| `lib/supabase/client.js` | navegador | `createBrowserClient` para Auth interativo |
| `lib/supabase/server.js` | servidor | `createServerClient` ligado a `cookies()` |
| `lib/supabase/proxy.js` | Proxy | atualiza cookies e chama `getClaims()` |
| `lib/supabase/admin.js` | servidor | cliente privilegiado usado pelo envio de convite |

Variáveis:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
BARBERVISION_APP_URL
BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=false
BARBERVISION_TEST_DATABASE_URL
BARBERVISION_ALLOW_REMOTE_DB_TEST=false
BARBERVISION_TEST_DATABASE_CONFIRM
```

As duas públicas precisam existir juntas; configuração parcial falha deliberadamente. A publishable key entra no bundle e depende de grants/RLS. `SUPABASE_SECRET_KEY` é opcional para o modo básico, obrigatória para o envio administrativo de convite e proibida no navegador. `BARBERVISION_APP_URL` define a origem confiável de callbacks fora do desenvolvimento.

`BARBERVISION_TEST_DATABASE_URL`, `BARBERVISION_ALLOW_REMOTE_DB_TEST` e `BARBERVISION_TEST_DATABASE_CONFIRM` são exclusivas do runner concorrente e de um banco descartável; não configuram o runtime da aplicação e nunca devem apontar para produção.

### Contratos de Auth implementados

- login por e-mail/senha e logout local/global;
- recuperação de senha e redefinição após sessão de recovery;
- confirmação PKCE em `/auth/callback` e `token_hash` em `/auth/confirm`;
- matrícula e desafio TOTP;
- resolução server-side de perfil, membership, tenant, papel e AAL;
- e-mail confirmado como pré-requisito SQL de conta ativa;
- AAL2 para todo acesso do dono a dados de negócio/Storage; funcionário permanece AAL1;
- templates locais de convite e recovery em `supabase/templates/`.

O bootstrap do dono em AAL1 retorna uma sessão mínima, sem ler nome/slug da barbearia, apenas para encaminhar a `/barbeiro/mfa`. Essa correção está versionada, mas ainda não foi exercitada contra as policies reais.

### Contratos SQL de onboarding/lifecycle

A migration `20260813010000_onboarding_invites_lifecycle_audit.sql` agora define os contratos consumidos pela aplicação:

```text
public.convites_barbearia
public.eventos_auditoria
criar_convite_funcionario
aceitar_convite_barbearia
revogar_convite_barbearia
marcar_convite_enviado
marcar_convite_falhou
provisionar_dono_controlado
suspender_funcionario
reativar_funcionario
revogar_funcionario
```

Ela também cria `eventos_auditoria` append-only, RLS de leitura para o dono AAL2, estados/expiração de convite, locks de tenant e grants distintos para `authenticated` e `service_role`.

Os UUIDs de procedência são históricos e deliberadamente não têm FK destrutiva para `auth.users`: `barbearias.criado_por`, `clientes.criado_por`, `membros_barbearia.convidado_por`, `atribuicoes_cliente.atribuido_por`, os atores `criado_por`/`aceito_por`/`revogado_por` de `convites_barbearia` e `ator_usuario_id`/`alvo_usuario_id` de `eventos_auditoria`. Isso preserva a trilha quando uma conta Auth é removida; esses campos não devem ser usados como prova de que a conta ainda existe.

Em auditoria, evento de origem `usuario` exige `ator_usuario_id`; evento de origem `sistema` pode ter ator nulo. Uma transição de lifecycle que realmente muda estado gera evento, enquanto replay idempotente que já encontra o estado final é no-op e não duplica auditoria. O `CHECK` de segredos óbvios inspeciona somente chaves no nível superior de `metadados`; conteúdo aninhado ainda precisa de validação/sanitização no comando que grava o evento.

A atribuição de cliente continua disponível por criação/remoção controlada, mas o `UPDATE` direto de `atribuicoes_cliente.usuario_id` foi revogado de `authenticated` e o `UPDATE` da tabela foi revogado de `service_role`. Ainda falta uma RPC estreita de reatribuição, com autorização, idempotência e auditoria, para trocar o funcionário sem reabrir atualização genérica.

### Lacunas que impedem o passo 3 de ser considerado concluído

- as migrations 5–8 estão aplicadas; onboarding/lifecycle passou 112/112 e outbox 21/21; concorrência e rollback 5–4 permanecem evidências históricas;
- `/barbeiro/equipe`, handlers e `npm run auth:provision-owner` possuem evidência funcional contra Supabase/Mailpit locais;
- o envio usa uma outbox durável; o worker chama `inviteUserByEmail`, aplica lease/retry e reconcilia expiração, mas produção ainda depende de scheduler e SMTP hospedados;
- quando a configuração ou o envio falha, as actions executam a compensação, releem o convite por `id + barbearia_id` e só anunciam `revogado`, `expirado` ou `falhou` quando o banco confirma esse estado; falha ou divergência produz mensagem de reconciliação necessária;
- o provisionamento do primeiro dono faz preflight de entrada/origem/slug, resolve Auth existente por RPC server-only, reutiliza a identidade por e-mail e aceita retomada explícita por UUID;
- se a RPC falhar depois da criação Auth, o script retorna o UUID e um comando de retomada que não cria outra identidade; não existe transação distribuída, mas o replay foi comprovado sobre o mesmo tenant;
- `/auth/confirm` tenta aceitar a membership antes de `DefinirSenhaForm` concluir a senha; o portador do link já pode obter sessão/membership ativa e navegar para o painel, comportamento que precisa ser bloqueado ou aceito explicitamente;
- a action de revogação sempre anuncia “Convite revogado”, embora a RPC possa materializar um convite vencido como `expirado`; a resposta precisa reler/retornar o estado autoritativo;
- as RPCs de suspender, reativar e revogar funcionário ainda não possuem UX completa;
- não existe RPC estreita para reatribuir um cliente; o `UPDATE` direto de `atribuicoes_cliente.usuario_id` está revogado;
- a barreira SQL contra nomes de segredo cobre somente o primeiro nível de `eventos_auditoria.metadados`; payloads aninhados exigem hardening e testes próprios;
- transferência/promoção de dono e seletor multi-tenant continuam ausentes; recuperação operacional de TOTP está disponível por comando server-only;
- templates/configuração locais não comprovam SMTP, URLs permitidas ou templates no projeto hospedado;
- replay, reenvio/revogação e duas corridas possuem cobertura em fonte, ainda não executada; sessão, e-mail real, MFA e abuso/rate limit continuam sem E2E.

### Banco versionado

`supabase/schema.sql` é somente um índice documental. A fonte de verdade são oito migrations, incluindo retomada do dono e outbox. Há oito rollbacks; o próximo ensaio integral deve cobrir 8–4. Os scripts não reconciliam automaticamente `supabase_migrations`.

Os pgTAPs passaram 59 + 112 + 21 asserções, totalizando 192/192. O harness `db:test:integration` usa identidades Auth, TOTP/AAL2, JWTs reais e blob real para provar Data API/RLS e Storage. O Playwright anterior comprova callback, e-mail/Mailpit, TOTP, convite, ativação, recuperação, logout e lifecycle; a versão atualizada para outbox aguarda reexecução. Consulte [Estado de validação](ESTADO-VALIDACAO.md), [Banco de dados](BANCO-DE-DADOS.md) e [Outbox de convites](OUTBOX-DE-CONVITES.md).

Configurar somente as variáveis ativa a tentativa de Auth, mas não cria schema, usuários, SMTP, redirects ou integrações de domínio. O modo real não deve ser habilitado para usuários até essas dependências serem aplicadas e testadas.

### Sequência canônica de validação

1. Marcar e confirmar o banco descartável; executar `db:test:concurrency` e guardar a evidência.
2. Usar o runbook existente para ensaiar rollback/roll-forward 8–4 e repetir `db:lint`, as 192 asserções pgTAP e `db:test:concurrency`.
3. Criar um `.env.local` controlado e fixtures/identidades Auth reais para dono em AAL1 e AAL2, funcionário e cenário cross-tenant.
4. Criar harness/scripts e validar Data API e Storage com JWTs reais e cenários adversários.
5. Ampliar o Playwright aprovado para lifecycle completo, refresh/expiração e cenários adversários de callback.
6. Fechar gaps operacionais: outbox/retry, usuário Auth existente, expiração reconciliada, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant.
7. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

## WhatsApp

O único uso externo atual é o link `wa.me` opcional da vitrine de produtos, criado a partir do número comercial que o personagem dono configura localmente. Não existem:

- webhook;
- template aprovado;
- confirmação de entrega;
- opt-in/opt-out persistido;
- integração de agenda;
- persistência/conciliação de pedido.

O CRM não cria mais links com os telefones mock. Para um cliente “sumido”, **Ver mensagem** abre uma prévia dentro da própria página, informa que nada foi enviado e não chama aplicativo, API ou URL externa. Esse bloqueio evita contato acidental com números fictícios; envio real e consentido continua pendente.

## Integrações inexistentes

Não existem atualmente:

- Auth completo e validado de ponta a ponta; o scaffold SSR/TOTP atual é parcial;
- ciclo operacional validado de convite, suspensão, reativação e revogação; provisionamento inicial e falhas distribuídas continuam pendentes;
- banco/Storage para os fluxos de negócio;
- consentimento, retenção e exclusão de selfies;
- jornada pública persistida, tokens de avaliação e agendamento real;
- agenda/calendário;
- e-mail transacional;
- SMS/push;
- pagamentos/assinaturas;
- backend de produtos/estoque/pedidos;
- banco/ledger financeiro, conciliação bancária e integração contábil;
- cálculo tributário, emissão de guia ou transmissão fiscal oficial;
- mapas;
- analytics/CRM;
- webhooks, filas ou jobs;
- moderação server-side de imagens.

## Checklist para nova integração

1. Registrar decisão/finalidade.
2. Definir contrato versionado e validação server-side.
3. Aplicar autenticação, papel e tenant.
4. Limitar tamanho, frequência e custo.
5. Tratar timeout, cancelamento, retry e idempotência.
6. Evitar PII/imagens em logs.
7. Documentar terceiros, retenção e exclusão.
8. Criar testes de sucesso, falha e acesso proibido.
9. Registrar procedência/licença de mídia.
10. Atualizar `README.md`, `AI context.md`, esta documentação e `pendências.md`.
11. Validar preço, termos e região em fontes oficiais atuais.
