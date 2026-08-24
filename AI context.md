# AI context — Barber Vision

Documento canônico para agentes de IA e futuras sessões de desenvolvimento.

> Última revisão integral: **24/08/2026**. Leia este arquivo, `README.md`, `pendências.md`, `docs/ESTADO-VALIDACAO.md`, `docs/PLANO-DE-EXECUCAO.md` e `AGENTS.md` antes de alterar o projeto. Presença de código — ou uma inicialização transitória — não equivale a funcionalidade validada.

## Resumo em 30 segundos

- O Barber Vision é uma plataforma multiempresa em construção para barbearias.
- O protótipo público permite mostrar cortes ao cliente antes do atendimento.
- O processamento visual é local, sem servidor de IA e sem HairFastGAN/Gemini.
- O simulador atual usa preparação automática da foto e **placement manual** do cabelo.
- O painel possui muitas telas, mas quase todos os dados de negócio ainda são mocks ou `localStorage`.
- O passo 1, segurança da demo, está concluído para uma apresentação controlada.
- O passo 2, fundação Supabase/RLS, está validado localmente: CLI 2.115.0, `db:start`, `db:reset`, oito migrations, seed, lint, pgTAP 192/192, concorrência histórica, rollback/roll-forward histórico, JWT/RLS e Storage com blob real passaram.
- O passo 3, Auth, tem jornada e outbox comprovadas localmente. O projeto Supabase hospedado `barbervision` está vinculado e recebeu as oito migrations; o Blueprint Render está conectado ao GitHub, mas o deploy não foi comprovado, e o Worker Cloudflare ainda não foi publicado.
- Uma `SUPABASE_SECRET_KEY` apareceu em captura de tela durante a configuração do Render em 23/08 e teve revogação/substituição confirmada pelo usuário em 24/08; nunca reutilizar ou registrar o valor exposto.
- A correção do bootstrap AAL1 → TOTP do dono foi comprovada com JWT real e E2E. O formulário MFA também foi corrigido para React Strict Mode, e o QR SVG do Supabase usa `<img>` nativo sem liberar SVG globalmente no Next.
- Os passos 4, privacidade, e 5, fluxo persistido, não foram implementados.
- Não usar dados reais de clientes antes de fechar os gates de Auth, privacidade e persistência.

## Intenção do produto confirmada

### Simulação

- O cliente deve ter uma noção convincente de como um corte pode ficar antes de cortar.
- Não é necessário prometer realismo perfeito nem resultado garantido.
- O produto não deve depender de um servidor externo de IA para a simulação básica.
- Cada barbearia deve cadastrar seus próprios cortes e ser responsável pelos direitos de uso das imagens.
- Pinterest pode servir apenas como inspiração ou fonte temporária durante estudo; não deve ser assumido como licença de produção.
- As cinco fotos recebidas em 21/07/2026 são fontes privadas de trabalho, não arquivos públicos do runtime.

### Operação da barbearia

- Cada barbearia é um tenant isolado.
- O dono vê e administra todos os clientes da própria barbearia.
- Funcionários veem apenas os clientes a eles atribuídos.
- Somente o dono gerencia catálogo, produtos, financeiro, promoções, equipe, fidelidade, comissões e funil.
- Papel e tenant devem vir do banco, nunca de `sessionStorage`, metadata editável ou parâmetros confiados do cliente.
- A administração da plataforma `/admin` é um domínio diferente do dono da barbearia e deve ter autorização própria.

### Autenticação

- A conta usa e-mail e senha.
- Confirmação/recuperação usam e-mail.
- O segundo fator do dono é TOTP, compatível com Google Authenticator e outros autenticadores.
- Código enviado por e-mail não deve ser descrito como segundo fator AAL2 nativo.
- Dono só acessa dados de negócio e Storage em AAL2.
- Funcionário ativo pode trabalhar em AAL1, respeitando atribuições e RLS.

### Pós-venda e financeiro

- Depois da avaliação, o app pode sugerir cuidados com o cabelo.
- O dono poderá cadastrar e vender produtos relacionados.
- O fechamento atual é uma demonstração gerencial para organizar dados e exportar um pacote ao contador.
- O app não calcula imposto “exato”, não entrega declaração de IR, DAS, DASN-SIMEI, PGDAS-D, DEFIS ou obrigações de ME/LTDA.
- Tipo empresarial e regime tributário são conceitos distintos e nunca devem virar uma alíquota fixa simplista.

## Estado oficial dos nove passos

| Passo | Estado em 24/08/2026 |
|---|---|
| 1 — Segurança da demo | Concluído para demo controlada |
| 2 — Supabase, tenant e RLS | Validação local completa: SQL, concorrência, rollback, JWT/RLS e Storage |
| 3 — Auth real | Auth e lifecycle de funcionário aprovados em E2E; hardening operacional pendente |
| 4 — Privacidade e consentimento | Não iniciado |
| 5 — Fluxo vertical persistido | Não iniciado |
| 6 — Painel operacional real | Não iniciado |
| 7 — Catálogo e pós-venda reais | Não iniciado |
| 8 — Financeiro persistente | Não iniciado |
| 9 — Operação e release | Não iniciado |

Não avance o status apenas porque uma tela, migration ou scaffold existe. O critério inclui execução, testes e evidência.

## Arquitetura atual

### Stack

- Next.js 16.3.0, App Router;
- React/React DOM 18.3.1;
- Tailwind CSS 3.4.19;
- MediaPipe Tasks Vision 0.10.35;
- `@supabase/ssr` 0.12.4;
- `@supabase/supabase-js` 2.112.2;
- Supabase CLI 2.115.0;
- `pg` 8.23.0, usado somente pelo runner concorrente descartável;
- Lucide React 0.383.0.

### Inventário reconciliado

Após a revisão documental:

- 167 arquivos versionáveis/visíveis retornados por `rg --files`, respeitando os ignores; diretórios ignorados como `tmp/` e `private-assets/` não entram nessa contagem;
- 31 arquivos `page.js`;
- 2 Route Handlers;
- 11 layouts;
- 25 arquivos Markdown, dos quais 17 ficam em `docs/`;
- 8 migrations, 8 rollbacks, seed, schema-aviso e 3 pgTAPs com 192 asserções declaradas;
- código JS/JSX e SQL distribuído entre `app`, `components`, `lib` e Supabase; a contagem de linhas é deliberadamente omitida porque muda a cada migration e não representa avanço funcional.

Os documentos especializados de Auth e dos passos 4–5 são `docs/AUTENTICACAO-E-SESSOES.md` e `docs/PRIVACIDADE-E-FLUXO-PERSISTIDO.md`. Contagens são inventário, não critério de qualidade.

### Fronteiras de execução

```text
Navegador
├─ jornada pública e processamento MediaPipe local
├─ sessionStorage do fluxo público
├─ localStorage dos módulos demonstrativos
└─ Supabase browser client para operações Auth específicas

Next.js server
├─ proxy.js: cookies, claims e bloqueio da superfície interna
├─ Server Components: contexto de perfil/membership/tenant
├─ Route Handlers: callback e confirmação do Auth
├─ Server Actions: scaffold de equipe
└─ cliente admin server-only: convite por e-mail

Supabase versionado e aplicado transitoriamente
├─ Auth: e-mail/senha, confirmação, recuperação e TOTP
├─ Postgres: tenant, perfil, membership, clientes e atribuições
├─ RLS: isolamento por tenant e papel
└─ Storage privado: fontes, recortes e selfies
```

O bloco Supabase está versionado e foi recriado de forma limpa em 23/08 com CLI 2.115.0. Reset, lint, pgTAP 192/192, rollback/roll-forward 8–4, concorrência de domínio/outbox e E2E atualizado passam.

## Dois modos de runtime

### Sem variáveis Supabase

- Em desenvolvimento, `/barbeiro/login` oferece usuários demonstrativos.
- A sessão demo é guardada em `sessionStorage` pela camada `lib/barbeiroSession.js`.
- O layout demo apenas verifica presença da sessão; não fornece segurança de servidor.
- Em produção, `proxy.js` bloqueia `/barbeiro/*` e `/admin/*` por padrão.
- `BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=true` libera de forma explicitamente insegura somente a demonstração de `/barbeiro/*`; nunca libera `/admin` em produção.

### Com variáveis Supabase

- `proxy.js` atualiza cookies via `@supabase/ssr` e valida identidade com `auth.getClaims()`.
- Login e recuperação são públicos; o restante de `/barbeiro` exige sessão.
- Login/callback aceitam `next` somente como path local `/barbeiro/*` e rejeitam `//`; a recuperação exibe mensagem neutra sobre existência da conta. Esses controles ainda não têm E2E/casos adversários.
- `lib/auth/context.js` carrega perfil e memberships ativas sob RLS.
- Até existir seletor de unidade, a membership ativa mais antiga é escolhida.
- Dono em AAL1 recebe contexto mínimo de perfil/membership e deve ir a `/barbeiro/mfa` sem ler dados da barbearia.
- Dono AAL2 pode acessar as áreas autorizadas.
- Layouts server-side exclusivos do dono protegem equipe, funil, promoções, financeiro, comissões, fidelidade, catálogo e produtos.
- Server Actions repetem a autorização sensível; esconder item no menu nunca é autorização.
- `/admin` permanece bloqueado.

A lógica de bootstrap MFA acima foi comprovada pelo harness JWT e pela jornada E2E local.

## Mapa de rotas

### Jornada pública: 10 páginas

- `/`;
- `/b/[barbearia]`;
- `/b/[barbearia]/cadastro`;
- `/b/[barbearia]/selfie`;
- `/b/[barbearia]/processando`;
- `/b/[barbearia]/simulacao`;
- `/b/[barbearia]/recomendacao`;
- `/b/[barbearia]/escolha`;
- `/b/[barbearia]/avaliacao`;
- `/b/[barbearia]/demo`.

### Área da barbearia: 20 páginas

Auth/acesso:

- `/barbeiro/login`;
- `/barbeiro/esqueci-senha`;
- `/barbeiro/redefinir-senha`;
- `/barbeiro/ativar-conta`;
- `/barbeiro/mfa`;
- `/barbeiro/sem-acesso`.

Painel:

- `/barbeiro/dashboard`;
- `/barbeiro/clientes`;
- `/barbeiro/simulacoes`;
- `/barbeiro/historico`;
- `/barbeiro/avaliacoes`;
- `/barbeiro/funil`;
- `/barbeiro/promocoes`;
- `/barbeiro/catalogo`;
- `/barbeiro/produtos`;
- `/barbeiro/financeiro`;
- `/barbeiro/fidelidade`;
- `/barbeiro/comissoes`;
- `/barbeiro/equipe`;
- `/barbeiro/seguranca`.

Além delas, há `/admin` e dois handlers: `/auth/callback` e `/auth/confirm`.

## Estado e persistência atuais

### Jornada do cliente

`lib/clienteFlow.js` usa a chave `barbervision:fluxo`, versão 2, em `sessionStorage`.

Campos atuais:

- `barbeariaSlug`;
- `etapa`;
- `nome`;
- `whatsapp`;
- `codigoIndicacao`;
- `selfieDataUrl`;
- `corte`;
- `barba`;
- `ajusteCabelo`;
- `neutralizacaoCabelo`.

Esse estado:

- pertence somente à aba/navegador;
- não tem ID autoritativo;
- não é sincronizado com o painel;
- desaparece ao limpar a sessão, mas pode sobreviver ao abandono da aba enquanto ela existir;
- não serve como registro de consentimento, agenda ou atendimento.

### Módulos demonstrativos em `localStorage`

- catálogo de cabelos: `lib/hairCatalog.js`;
- produtos: `lib/productCatalog.js`;
- contexto de pós-venda: `lib/posVenda.js`;
- fechamento financeiro: `lib/fechamentoFinanceiro.js`.

Esses dados são adulteráveis, específicos do navegador e inadequados para produção.

### Dados mockados

Dashboard, clientes, simulações, histórico, avaliações, funil, promoções, fidelidade e comissões ainda usam dados estáticos/mocks. O ID de um funcionário Supabase real é UUID e não corresponde aos IDs curtos dos mocks; por isso, mesmo autenticado, o painel não representa dados reais.

## Simulador de cabelo congelado

### Arquivos centrais

- `app/b/[barbearia]/simulacao/page.js`;
- `app/b/[barbearia]/simulacao/_cabelo/CabeloSimuladorLocal.jsx`;
- `app/b/[barbearia]/simulacao/_cabelo/RemocaoCabeloAutomatica.jsx`;
- `app/b/[barbearia]/simulacao/_cabelo/remocaoCabeloAutomaticaLocal.js`;
- `app/b/[barbearia]/simulacao/_cabelo/CoberturaCabeloOriginal.jsx`;
- `app/b/[barbearia]/simulacao/_cabelo/neutralizacaoCabeloLocal.js`;
- `app/b/[barbearia]/simulacao/_cabelo/cabeloCatalogoLocal.js`;
- `lib/hairCatalog.js`.

### Contrato ativo

1. O cliente envia uma selfie frontal.
2. MediaPipe analisa o rosto no próprio navegador.
3. A preparação automática cria uma base visual para reduzir interferência do cabelo original.
4. O cliente escolhe um molde fotográfico preparado.
5. O cabelo nasce em posição-base definida pelo catálogo.
6. O cliente ajusta manualmente posição, largura, altura, escala e inclinação.
7. Os controles ficam à direita da foto em desktop.
8. O ajuste confirmado fica na sessão e pode ser comparado no Antes/Depois.

Não reintroduzir auto-fit como experiência principal. Não transformar novamente a remoção em pincel estilo Paint. Não substituir o placement manual sem decisão explícita do usuário e nova validação visual.

### Limite honesto

- É uma composição fotográfica 2D, não geração neural nem reconstrução 3D.
- A remoção não cria automaticamente couro cabeludo perfeito em qualquer cabelo.
- Qualidade depende de selfie frontal, luz, recorte, alpha e compatibilidade do molde.
- O resultado é uma referência aproximada para conversa com o barbeiro.

## Supabase: conteúdo versionado

### Migrations

1. `20260808010000_tenant_core.sql`: tipos, tabelas, índices e invariantes-base.
2. `20260808011000_tenant_rls.sql`: helpers, grants, policies, atribuição e proteção defensiva do último dono.
3. `20260808012000_private_storage.sql`: três buckets privados e policies de dono por tenant.
4. `20260808013000_auth_assurance.sql`: e-mail confirmado e step-up AAL2 para donos.
5. `20260813010000_onboarding_invites_lifecycle_audit.sql`: convites, provisionamento controlado do primeiro dono, lifecycle de funcionário, locks ordenados, proveniência histórica e auditoria de domínio.

### Tabelas atuais

- `public.barbearias`;
- `public.perfis`;
- `public.membros_barbearia`;
- `public.clientes`;
- `public.atribuicoes_cliente`;
- `public.convites_barbearia`;
- `public.eventos_auditoria`.

No contrato atual do MVP, cliente exige nome e telefone/WhatsApp. A deduplicação é por `barbearia_id + whatsapp_normalizado` (somente dígitos), permitindo que a mesma pessoa exista separadamente em tenants diferentes. Alterar essa regra exige decisão, migration e atualização da UX; ela ainda não foi validada em PostgreSQL real e não autoriza dados reais antes do passo 4.

### Buckets atuais

- `barbervision-hair-sources`;
- `barbervision-hair-cutouts`;
- `barbervision-selfies`.

O bucket de selfies não possui policy de usuário público; o fluxo atual não envia selfies ao Storage.

### Contratos do passo 3 aplicados e validados em pgTAP, ainda sem integração ponta a ponta

- tabela `public.convites_barbearia`, com estados `pendente_envio`, `enviado`, `aceito`, `revogado`, `expirado` e `falhou`;
- tabela append-only `public.eventos_auditoria`;
- RPCs autenticadas `criar_convite_funcionario`, `revogar_convite_barbearia` e `aceitar_convite_barbearia`;
- RPCs server-only `marcar_convite_enviado`, `marcar_convite_falhou` e `provisionar_dono_controlado`;
- RPCs de dono AAL2 `suspender_funcionario`, `reativar_funcionario` e `revogar_funcionario`;
- locks ordenados, bloqueio de mutation direta de membership via `service_role`, bloqueio de `UPDATE(usuario_id)` direto em atribuições, grants explícitos e auditoria transacional das transições efetivas.

Os UUIDs de proveniência em `barbearias.criado_por`, `clientes.criado_por`, `membros_barbearia.convidado_por`, `atribuicoes_cliente.atribuido_por`, convites e auditoria são históricos e não possuem FK destrutiva para `auth.users`. Identidades autoritativas de perfil/membership continuam com FK. Eventos de origem `usuario` exigem ator; eventos de `sistema` podem ter ator nulo. Replay/no-op idempotente não cria um segundo evento.

O check de metadados rejeita chaves sensíveis conhecidas somente no primeiro nível do JSON. Hoje as RPCs constroem objetos pequenos internamente, mas uma validação recursiva deve preceder qualquer aceitação de payload arbitrário.

As RPCs de onboarding/lifecycle e outbox existem em fonte e no banco local. As suítes do passo 3 somam 133/133 (112 + 21); o E2E comprova entrega, falha definitiva e expiração, e dois workers reais reivindicam itens distintos sem duplicação. Continuam pendentes scheduler hospedado, transferência de dono, reatribuição transacional e seleção multi-tenant.

### Evidência disponível

- O teste transacional `step2_tenant_rls.test.sql` declara `plan(59)` e passou 59/59 em 22/08 após a correção dos três cenários de `UPDATE` e do dado que isola a constraint de formato do telefone.
- `step3_auth_onboarding_lifecycle.test.sql` passou 112/112; `step3_invite_email_outbox.test.sql` passou 21/21 para estrutura/ACL, enqueue, lease, retry, idempotência e expiração.
- `provisionar_dono_controlado` e `marcar_convite_falhou` entram apenas nas verificações estruturais/ACL dessa suíte; seus comportamentos funcionais ainda não possuem cenário pgTAP.
- As migrations `13000` e `20260813010000` possuem rollbacks manuais defensivos. Eles preservam dados, recusam estado incompatível, não usam `CASCADE` e não reconciliam automaticamente `supabase_migrations.schema_migrations`.
- `scripts/test-db-concurrency.mjs` usa duas sessões concorrentes e uma terceira conexão observadora/administrativa para último dono e atribuição/revogação. Exige confirmação exata e comentário marcador no banco descartável; passou em análise estática, mas não conectou por ausência de PostgreSQL local.
- Ainda não há JWT, callback, e-mail, TOTP, Data API autorizada ou Storage saudável em teste integrado.
- Em 22/08, a atualização do CLI 2.112.0 para 2.115.0 e a desativação explícita de Analytics/Vector opcionais eliminaram a corrida de health check sem expor o daemon Docker em `2375`.
- `db:start` e `db:reset` encerram com exit `0`; oito migrations, seed, lint e pgTAP 192/192 foram comprovados. Auth, Storage e Studio respondem `200` e os containers necessários estão saudáveis.
- Na auditoria de 22/08, PostgreSQL, API, Studio, Auth, Storage, Realtime, Mailpit e Edge Runtime estão ativos; Imgproxy, Analytics, Vector e Pooler estão intencionalmente desativados/não usados. Não há `.env.local` nem projeto remoto vinculado.
- O reset encerrou com exit `0`; `db:lint` e pgTAP 192/192 passaram, e as oito migrations foram confirmadas. RLS/JWT, Data API, Storage real, e-mail, recuperação, MFA, lifecycle e provisionamento foram exercitados anteriormente.

## Auth: arquivos e contratos

### Clientes e sessão

- `lib/supabase/config.js`;
- `lib/supabase/client.js`;
- `lib/supabase/server.js`;
- `lib/supabase/admin.js`;
- `lib/supabase/proxy.js`;
- `lib/auth/context.js`;
- `lib/auth/site-url.js`;
- `proxy.js`.

### Telas e handlers

- login, esqueci senha, redefinição, ativação, MFA e sem acesso em `app/barbeiro`;
- callback e confirmação em `app/auth`;
- segurança e equipe no painel;
- templates de convite e recuperação em `supabase/templates`.

### Regras de segurança

- Server-side usa `auth.getClaims()`, não `getSession()` como prova autoritativa.
- `SUPABASE_SECRET_KEY` só pode existir no servidor.
- A service role não deve ser usada para executar uma ação em nome do usuário quando a RPC precisa derivar `auth.uid()`.
- Funções `SECURITY DEFINER` devem ter `search_path=''`, nomes qualificados, grants mínimos e ator derivado do JWT.
- Metadata de Auth não autoriza papel nem tenant.
- AAL ausente é AAL1.
- Leitura da própria membership/perfil em AAL1 é necessária para o bootstrap MFA, sem expor dados de negócio.

## Privacidade: estado e lacunas

### O que existe

- processamento visual local;
- nenhuma chamada conhecida a servidor de inferência;
- texto informativo sobre processamento local;
- limpeza explícita do fluxo em parte do encerramento.

### O que falta

- consentimento afirmativo antes da selfie;
- finalidade, controlador, contato e versão do aviso;
- registro mínimo do consentimento quando houver persistência;
- prazo automático de retenção e job de expiração;
- exclusão pelo cliente e pelo dono dentro das permissões;
- limpeza em abandono/cancelamento;
- política para menores;
- processo de acesso, correção, portabilidade e eliminação;
- contrato com operadores, logs, analytics e incidentes;
- decisão documentada sobre armazenar ou não a selfie original.

Processamento local reduz exposição, mas não elimina responsabilidade sobre nome, telefone, imagem e resultados derivados.

## Fluxo vertical: lacunas

Ainda não existem entidades persistidas para:

- sessão pública/token opaco;
- simulação;
- escolha de corte e barbeiro;
- serviços e disponibilidade;
- agendamento;
- atendimento;
- avaliação verificada;
- recomendação/cuidado entregue;
- interesse ou reserva de produto;
- eventos de jornada.

O slug público não resolve uma barbearia real, horários são mocks e o painel não recebe a jornada. Esse é o escopo do passo 5, posterior à privacidade.

## Riscos prioritários

### P0 — antes de chamar Auth de funcional

1. Preservar o Supabase descartável e executar as oito migrations do zero, seed, lint e 192 testes sempre que o schema mudar.
2. Executar o runner de concorrência em banco marcado e guardar a evidência das duas corridas.
3. Ensaiar os dois novos rollbacks/roll-forward e definir o tratamento do histórico `supabase_migrations`.
4. Provar o bootstrap AAL1 → TOTP do dono com JWT real.
5. Executar Data API e Storage em dois tenants e todos os papéis/AALs relevantes.
6. Configurar redirects, templates, SMTP e segredos em ambiente descartável.
7. Operacionalizar a outbox com scheduler/alertas e fechar transferência de dono, reatribuição e seleção multi-tenant.

### P0 — antes de usar clientes reais

1. Concluir Auth e isolamento.
2. Implementar consentimento e aviso de privacidade.
3. Definir retenção/exclusão da selfie e dados derivados.
4. Criar fluxo público estreito sem credencial privilegiada no navegador.
5. Implementar testes E2E, backup, observabilidade e resposta a incidentes.

### P1

- reautenticação para operações sensíveis;
- rate limit/CAPTCHA contra abuso;
- preservar a releitura autoritativa das compensações de convite e ampliar sua cobertura adversária;
- tornar o provisionamento inicial retomável e reconciliável entre Auth e banco, com preflight e validação estrita da URL;
- decidir e testar o estado de onboarding entre confirmação do link, criação da membership e definição da senha;
- [concluído] suspensão, reativação e revogação estão na UI; Playwright prova corte imediato, retomada e revogação com a mesma sessão;
- redução dos 18 warnings de lint;
- manifesto reproduzível dos arquivos congelados do simulador.

## Validação reconciliada em 24/08/2026

### Estado remoto comprovado

- GitHub privado: `barbervisionbarbervision-a11y/Barbervision`, branch `main`, commit remoto inicial `6cea627`.
- Supabase hospedado: projeto `barbervision`, ref pública `ftwdfobgwxjmeickktmy`, região `sa-east-1`, estado `ACTIVE_HEALTHY` no momento da vinculação.
- `supabase link` terminou com sucesso.
- `supabase db push --dry-run` listou exatamente as oito migrations; `supabase db push` aplicou as oito sem erro; uma segunda simulação informou `Remote database is up to date`.
- Render: repositório privado conectado ao Blueprint e formulário das cinco variáveis aberto. Não há evidência de deploy, build remoto, URL final ou health check.
- Segurança: a secret key digitada no formulário apareceu em uma captura; o usuário confirmou sua revogação e substituição em 24/08. O novo valor não foi compartilhado nem registrado.
- Cloudflare: nenhum login, secret, deploy, Cron Trigger ou log remoto foi comprovado.
- Ainda faltam configuração hospedada de Auth redirects, templates, SMTP, signup público e confirmação dupla.

- `npm ls --depth=0`: aprovado;
- `npm run lint`: 0 erros e 18 warnings;
- `npm audit`: 0 vulnerabilidades em 14/08; não foi repetido nesta revisão;
- `launcher.bat --check`: aprovado em 21/08; o atalho da Área de Trabalho permanece como evidência validada em 14/08;
- documentos: UTF-8 válido, links locais e fences íntegros;
- `npm run build`: aprovado em 22/08/2026, com 31 páginas, 2 Route Handlers e Proxy; requer rede enquanto Anton e Manrope vierem do Google Fonts;
- smoke HTTP: evidência histórica de 13/08/2026, com páginas públicas `200` e superfícies internas `307` para o modo seguro;
- Git: repositório operacional, árvore limpa antes desta revisão e baseline `7c34dab` confirmado;
- banco/Supabase: serviços necessários saudáveis; `db:start`, reset, lint e pgTAP 192/192 passam; opcionais não usados estão desativados e Storage foi validado anteriormente com JWT/blob real;
- migrations 4–5: rollbacks defensivos ensaiados no PostgreSQL local, histórico reconciliado e roll-forward reaplicado pelo CLI; lint, pgTAP e concorrência passaram depois;
- pgTAP: três suítes transacionais passaram 59 + 112 + 21, totalizando 192/192 asserções;
- concorrência: runner executado em 22/08 no banco local marcado; as corridas de último dono e atribuição/revogação passaram, e os fixtures foram removidos;
- simulador: arquivos permaneceram sem alteração nesta rodada documental.

O build sem variáveis Supabase prova somente o modo demonstrativo. Ele precisou de rede para obter Anton e Manrope do Google Fonts; isso deve virar fonte auto-hospedada antes de exigir builds offline/reproduzíveis.

## Próxima sequência oficial

1. Concluir o Blueprint Render com os cinco valores privados, registrar a URL efetiva e validar `/api/health`.
2. Corrigir `BARBERVISION_APP_URL` no Render e configurar no Supabase as URLs/redirects, signup, templates e SMTP.
3. Publicar o Worker Cloudflare com os mesmos `BARBERVISION_APP_URL` e `BARBERVISION_CRON_SECRET`; validar cron, `401` adversário, retry e logs redigidos.
4. Executar a matriz remota controlada de Auth, TOTP, convite/outbox e isolamento sem dados reais.
5. Completar reatribuição, transferência de dono e seleção multi-tenant.
6. Implementar privacidade, consentimento, retenção e exclusão antes de persistir dados reais.

Depois desses gates, persistir o fluxo vertical do passo 5 e só então migrar painel, catálogo/produtos, financeiro e operação.

## Regras para futuros agentes

1. Leia `AGENTS.md` e os guias locais do Next em `node_modules/next/dist/docs/` antes de mudar código Next.js.
2. Leia este arquivo, `pendências.md` e o plano oficial.
3. Confirme o estado no código; não confie cegamente em documentação antiga.
4. Não altere o simulador congelado durante trabalho de Auth, banco, privacidade ou painel.
5. Não reintroduza Gemini, HairFastGAN ou dependência obrigatória de IA remota.
6. Não publique fotos-fonte privadas nem assuma direitos de imagens do Pinterest.
7. Não trate `sessionStorage`/`localStorage` como segurança ou banco.
8. Não confie em papel/tenant enviados pelo cliente.
9. Não exponha secret/service role ao navegador.
10. Não use selfie real enquanto privacidade e retenção estiverem incompletas.
11. Não descreva o módulo financeiro como cálculo tributário exato.
12. Ao trabalhar em convites, leia `docs/OUTBOX-DE-CONVITES.md`; não volte a enviar e-mail de forma síncrona na Server Action.
12. Preserve alterações do usuário e não faça ações destrutivas.
13. Ao concluir uma etapa, registre: arquivos, contratos, evidência executada, limitações e rollback.
14. Atualize README, AI context, pendências e documentos afetados na mesma entrega.

## Referências internas

- `README.md` — visão geral e execução;
- `pendências.md` — backlog oficial;
- `docs/PLANO-DE-EXECUCAO.md` — ordem de entrega;
- `docs/AUTENTICACAO-E-SESSOES.md` — Auth e MFA;
- `docs/PRIVACIDADE-E-FLUXO-PERSISTIDO.md` — passos 4 e 5;
- `docs/ARQUITETURA.md` — arquitetura;
- `docs/BANCO-DE-DADOS.md` — SQL/RLS;
- `supabase/README.md` — operação Supabase;
- `docs/SIMULADOR-DE-CABELO.md` — contrato visual congelado;
- `docs/REMOCAO-AUTOMATICA-LOCAL.md` — preparação local;
- `docs/FECHAMENTO-FINANCEIRO.md` — limite financeiro/fiscal;
- `THIRD_PARTY_NOTICES.md` — terceiros e licenças.
