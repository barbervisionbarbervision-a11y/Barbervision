# Operação, segurança e qualidade

Estado reconciliado em **22/08/2026**. Evidência detalhada: [Estado de validação](ESTADO-VALIDACAO.md).

Este documento descreve o que pode ser executado hoje, os dois modos de operação do painel e os gates que ainda impedem um deploy com dados reais. O simulador de cabelo permanece congelado na versão de placement manual; esta revisão documental não altera seu comportamento.

## Resumo executivo

O Barber Vision é uma aplicação Next.js 16 executável localmente. A jornada pública e quase todas as telas de negócio ainda são uma demonstração baseada em mocks, `sessionStorage` e `localStorage`. A integração Auth/SSR principal foi exercitada contra Supabase e Mailpit locais por harness JWT/Storage e Playwright; os gaps operacionais descritos abaixo ainda impedem uso real.

Situação confirmada nesta revisão:

- modo de demonstração sem variáveis Supabase continua disponível em desenvolvimento;
- produção sem Supabase bloqueia `/admin` e `/barbeiro/*` por padrão;
- com Supabase configurado, o Proxy usa cookies e `getClaims()` para proteger o painel da barbearia;
- login, recuperação, redefinição, confirmação, ativação e TOTP estão versionados;
- o contexto server-side valida perfil, membership e tenant; oito layouts internos exigem papel de dono;
- dados de clientes, simulações, catálogo, produtos, financeiro e demais módulos continuam mocks ou persistência local;
- em 14/08, `leoto` executou duas inicializações com PostgreSQL `15.8.1.085`; ambas aplicaram as cinco migrations e o seed e chegaram a iniciar containers;
- Auth, Storage e Studio respondem `200`; API, banco e serviços necessários permanecem saudáveis;
- não há `.env.local`; serviços necessários do Supabase estão saudáveis e opcionais não usados estão desativados;
- o Git está operacional e o commit baseline `7c34dab` foi confirmado;
- convites e provisionamento têm código e contratos SQL cobertos por pgTAP, mas nenhuma jornada real foi executada/testada;
- o lint foi repetido em 21/08 e terminou com zero erros e 18 warnings; o build aprovado continua sendo o de 14/08 e o smoke HTTP permanece evidência histórica de 13/08;
- reset das dez migrations, pgTAP 192/192, concorrência, rollback/roll-forward 10–9, JWT/Data API, Storage com blob real e Auth/E2E com lifecycle passam localmente; o lint amplo do PostgreSQL 17 ainda inclui falsos positivos internos do pgTAP;
- privacidade de selfies e primeiro fluxo vertical persistido ainda não começaram como implementação de produção.

Consequência operacional: o projeto está adequado para demonstração controlada com dados fictícios. Ainda não está adequado para cadastrar barbearias, usuários ou clientes reais.

## Pré-requisitos

- Node.js 22 ou superior;
- npm compatível com lockfile v3;
- Docker Desktop 4.86.0 na sessão `leoto`; o engine foi comprovado pelas inicializações transitórias, mas precisa permanecer ativo durante o diagnóstico e toda a validação;
- Git instalado/habilitado para criar um baseline recuperável antes de novas mutações, sem incluir segredos, `.env.local` ou `.next/`;
- um projeto Supabase e serviço de e-mail configurados, apenas para testar o modo Auth real.

Dependências principais resolvidas no repositório:

| Pacote | Versão |
| --- | --- |
| Next | `16.3.0` |
| React / React DOM | `18.3.1` |
| `@supabase/ssr` | `0.12.4` |
| `@supabase/supabase-js` | `2.112.2` |
| `@mediapipe/tasks-vision` | `0.10.35` |
| Supabase CLI | `2.115.0` |
| `pg` | `8.23.0`, somente para o runner concorrente descartável |

## Instalação local

No Windows PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

No macOS/Linux:

```bash
npm ci
npm run dev
```

O servidor de desenvolvimento escuta apenas em `http://127.0.0.1:3000`. No Windows, use `npm.cmd` se a política de execução impedir `npm.ps1`.

Também existe `launcher.bat` para o fluxo local. Em 14/08, a checagem `launcher.bat --check` passou e o atalho da Área de Trabalho foi revalidado com alvo e diretório de trabalho apontando para este repositório. Isso confirma launcher/atalho, não a integração Supabase nem as jornadas de Auth.

## Modos de execução

### 1. Demonstração sem Supabase

Este modo é selecionado quando `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estão ausentes.

- em desenvolvimento, `/barbeiro/login` mostra a seleção de personagens fictícios;
- a sessão demonstrativa fica em `sessionStorage` sob `barbervision_sessao_barbeiro`;
- as telas carregam mocks e persistências locais;
- não existe autenticação, token, expiração, isolamento seguro ou autorização real;
- em produção, `/admin` e `/barbeiro/*` são bloqueados por padrão;
- a flag server-only `BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=true` libera somente a demo de `/barbeiro/*` para uma apresentação isolada; `/admin` permanece bloqueado.

A flag insegura não transforma a seleção de personagem em login real. Nunca use dados pessoais ou comerciais reais nesse modo.

### 2. Auth Supabase configurado

Este modo é selecionado quando URL e publishable key estão presentes juntas.

- `proxy.js` atualiza cookies SSR e valida a identidade por `auth.getClaims()`;
- `/barbeiro/login`, `/barbeiro/esqueci-senha` e `/auth/*` formam a superfície pública de Auth;
- as demais rotas `/barbeiro/*` exigem sessão;
- o layout do painel obtém perfil, memberships ativas e tenant no servidor;
- até existir seletor de unidade, a membership ativa mais antiga é escolhida;
- donos em AAL1 acessam o painel e podem configurar TOTP opcionalmente em `/barbeiro/mfa` ou pela tela de Segurança;
- funcionários podem operar em AAL1 conforme a política versionada;
- oito áreas do painel possuem layout server-side exclusivo do dono: Catálogo, Comissões, Equipe, Fidelidade, Financeiro, Funil, Produtos e Promoções;
- `/admin` permanece bloqueado, pois o painel master não faz parte deste Auth;
- a flag de demonstração insegura não ignora Auth quando Supabase está configurado.

O contexto do dono valida perfil, membership e tenant no servidor. O harness JWT e o Playwright preservam evidência histórica de AAL1/AAL2; desde a migration 10, TOTP não bloqueia o painel.

Mesmo nesse modo, as páginas de negócio ainda consomem mocks e `localStorage`. Auth real sobre dados fictícios não equivale a um painel operacional conectado.

## Variáveis de ambiente

O repositório contém apenas `.env.example`. Não existe `.env.local` nesta revisão.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave
SUPABASE_SECRET_KEY=sb_secret_sua-chave
BARBERVISION_APP_URL=http://127.0.0.1:3000
BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=false
BARBERVISION_TEST_DATABASE_URL=postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres
BARBERVISION_ALLOW_REMOTE_DB_TEST=false
BARBERVISION_TEST_DATABASE_CONFIRM=127.0.0.1:54322/postgres
```

Regras obrigatórias:

- URL e publishable key devem ser configuradas juntas;
- `SUPABASE_SECRET_KEY` é server-only e nunca pode receber prefixo `NEXT_PUBLIC_`;
- `BARBERVISION_APP_URL` precisa usar a origem exata; em produção, HTTPS;
- a publishable key depende de RLS e grants corretos, não é autorização por si só;
- nenhuma chave real deve entrar no Git, documentação, logs ou captura de tela;
- links permitidos, templates e SMTP do projeto hospedado precisam ser configurados e testados separadamente;
- `supabase/config.toml` descreve a pilha local; ele não prova que o projeto hospedado recebeu as mesmas configurações.
- as três variáveis `BARBERVISION_TEST_DATABASE_*` servem somente ao runner destrutivo em banco descartável;
- antes da concorrência, o banco também precisa receber `COMMENT ON DATABASE postgres IS 'barbervision:disposable-concurrency-test';` numa instância exclusiva de teste.

## Comandos

| Comando | Finalidade | Evidência reconciliada em 21/08/2026 |
| --- | --- | --- |
| `npm run dev` | Desenvolvimento em loopback | Disponível |
| `npm run build` | Build otimizado | Aprovado novamente em 14/08; 31 páginas, 2 handlers e Proxy |
| `npm run start` | Serve o build em loopback | Smoke do build aprovado em 13/08 no modo sem Supabase |
| `npm run lint` | ESLint | Repetido em 21/08: exit `0`, zero erros e 18 warnings |
| `npm run db:start` | Inicia Supabase local | aprovado com exit `0`; serviços necessários saudáveis |
| `npm run db:reset` | Aplica migrations e seed | aprovado com exit `0` no CLI 2.115.0 |
| `npm run db:test` | Executa pgTAP | aprovado: 59/59 + 112/112 + 21/21 = 192/192 |
| `npm run db:test:concurrency` | Executa duas corridas com conexões reais | aprovado: último dono e atribuição/revogação serializados corretamente |
| `npm run db:test:integration` | Executa Auth/TOTP, JWT-RLS e Storage com blob real | aprovado; cenários permitidos/negados e limpeza 0/0/0 |
| `npm run db:lint` | Lint do PostgreSQL local | aprovado sem erros em 22/08 |
| `npm run db:stop` | Encerra a pilha local | aprovado com exit `0`, preservando backup |
| `npm run auth:provision-owner -- ...` | Provisiona o primeiro dono | Criação e retomada por e-mail/UUID aprovadas localmente; `--enviar-acesso` é explícito para Auth existente |
| `npm run auth:recover-owner-totp -- ...` | Remove TOTP perdido após verificação externa | Exige UUID, e-mail coincidente, dono ativo e confirmação explícita; validado com fator real |
| `launcher.bat --check` | Valida o launcher | Aprovado |

`next build` e ESLint são verificações independentes no Next 16. Um build aprovado não implica lint aprovado, nem valida RLS, Auth, e-mail ou browser runtime.

Com o Docker Desktop aberto na sessão `leoto`, reproduza primeiro a falha e mantenha dois terminais. No primeiro:

```powershell
wsl.exe --status
docker version
$env:SUPABASE_TELEMETRY_DISABLED = "1"
npm.cmd run db:start -- --debug
```

No segundo terminal, enquanto a inicialização ocorre:

```powershell
npm.cmd exec supabase -- status
docker ps -a --filter "name=supabase"
Get-NetTCPConnection -State Listen -LocalPort 54321,54322,54323 -ErrorAction SilentlyContinue
```

Identifique o nome real do container de Storage em `docker ps -a` e capture somente o trecho necessário:

```powershell
docker logs NOME_DO_CONTAINER_STORAGE --tail 200
```

`supabase status`, `db:start --debug` e logs podem exibir chaves, JWTs, senhas ou URLs com credenciais. Redija esses valores antes de salvar, colar ou anexar evidências; registre apenas timestamps, versões, nomes de serviços, estados e mensagens necessárias ao diagnóstico. O aviso sobre Analytics no Windows e `tcp://localhost:2375` foi observado, mas não está demonstrado como causa do `502` ou do encerramento. Não exponha uma API Docker não autenticada apenas para silenciar o aviso.

O gate desta etapa é manter `54321`, `54322` e `54323` disponíveis e obter resposta saudável do Storage, além de Auth/REST/Studio. Com a pilha estável, instale/habilite o Git e crie um baseline recuperável do repositório, sem segredos, `.env.local` ou `.next/`. Só então execute:

```powershell
npm.cmd run db:reset
npm.cmd run db:lint
npm.cmd run db:test
```

As três suítes pgTAP precisam comprovar as 192 asserções. Só execute `db:test:concurrency` depois do reset, de configurar as três variáveis de teste e de marcar explicitamente o banco descartável conforme a seção anterior. Após o ensaio documentado de rollback/roll-forward, repita `db:lint`, as 192 asserções e a concorrência.

No smoke HTTP histórico de 13/08 do build sem `.env.local`, `/` e `/b/barbearia-exemplo` responderam `200`; `/barbeiro/login`, `/barbeiro/dashboard` e `/admin` responderam `307` para `/?modo=seguro`. Isso comprova a contenção desse modo, não o Auth Supabase nem o smoke visual.

## Banco e Storage

Dez migrations estão versionadas:

1. `20260808010000_tenant_core.sql`: `barbearias`, `perfis`, `membros_barbearia`, `clientes` e `atribuicoes_cliente`;
2. `20260808011000_tenant_rls.sql`: grants, policies e funções de escopo por tenant/papel;
3. `20260808012000_private_storage.sql`: buckets privados para fontes, cutouts e selfies;
4. `20260808013000_auth_assurance.sql`: e-mail confirmado e requisito histórico de AAL2;
5. `20260813010000_onboarding_invites_lifecycle_audit.sql`: convites, auditoria append-only e nove RPCs de onboarding/lifecycle.
6. `20260822010000_owner_reads_inactive_member_profiles.sql`: leitura operacional de perfis inativos vinculados.
7. `20260822020000_owner_provisioning_resume.sql`: retomada segura do provisionamento do primeiro dono.
8. `20260822030000_invite_email_outbox.sql`: fila privada, lease, retry e reconciliação de expiração.
9. `20260824010000_clientes_email.sql`: e-mail exibido/normalizado do cliente público.
10. `20260824020000_owner_mfa_optional.sql`: TOTP recomendado, mas opcional para o dono permanente.

Limites atuais:

- as dez migrations e o seed atualizado foram aplicados por `db:reset` em 24/08, com encerramento limpo e validação pós-reset aprovada;
- os três pgTAPs passaram 59 + 112 + 21 asserções; cobrem RLS, assurance/onboarding/lifecycle e outbox;
- não há JWT real, TOTP, callback ou Data API nos testes SQL;
- o bucket de selfies permanece deliberadamente sem policy pública/cliente até a etapa de privacidade;
- os rollbacks históricos 8–4 e o ensaio incremental 10–9, com reconciliação de `supabase_migrations` e roll-forward, estão registrados no [Runbook de rollback do banco](ROLLBACK-BANCO.md);
- todas as migrations passaram por `db:reset`; `db:test` 192/192 passou depois;
- o runner concorrente exige confirmação exata e comentário marcador; último dono, atribuição/revogação e dois workers da outbox passaram no banco local descartável em 24/08;
- seed e fixtures SQL não equivalem a contas utilizáveis por `signInWithPassword`.

O código de Equipe chama contratos versionados (`criar_convite_funcionario`, `revogar_convite_barbearia`, `marcar_convite_enviado` e `marcar_convite_falhou`). Depois de cada transição de envio/compensação/revogação, a action relê o convite por `id + barbearia_id`; a interface só afirma o estado confirmado pelo banco e orienta revisão quando a confirmação falha. Banco, SMTP, Admin API, callback, aceite e estados adversários ainda precisam permanecer cobertos em conjunto.

Os UUIDs `barbearias.criado_por`, `clientes.criado_por`, `membros_barbearia.convidado_por`, `atribuicoes_cliente.atribuido_por`, os atores dos convites e ator/alvo da auditoria são procedência histórica sem FK destrutiva para `auth.users`. Eventos de origem `usuario` exigem ator; origem `sistema` pode ter ator nulo. Transição efetiva audita, mas replay idempotente no estado final é no-op e não duplica evento. O bloqueio de nomes de segredo em `eventos_auditoria.metadados` inspeciona apenas chaves de primeiro nível.

O `UPDATE` direto de `atribuicoes_cliente.usuario_id` foi revogado de `authenticated`, e `service_role` perdeu `UPDATE` na tabela. Criar/remover a atribuição continua sendo o contrato disponível; falta uma RPC estreita, autorizada e auditada para reatribuição.

## Simulador congelado

O simulador continua sem IA generativa e sem servidor de inferência. O navegador entrega e executa MediaPipe/Canvas localmente:

- selfie normalizada para JPEG e guardada no fluxo local;
- FaceLandmarker e ImageSegmenter usados no preparo/remoção visual do cabelo original;
- cinco cutouts sintéticos demonstrativos e uploads locais elegíveis;
- novo corte posicionado manualmente por botões de X/Y, largura, altura e inclinação;
- foto à esquerda e controles sempre à direita, inclusive em telas estreitas;
- confirmação explícita em **Pronto** antes de continuar;
- recibo de neutralização v3 e placement manual v7;
- nenhuma geometria automática define o novo corte.

O cabelo está aceito provisoriamente para a demonstração e não deve ser refatorado enquanto as frentes de Auth, privacidade e persistência forem concluídas. Antes de piloto ainda são obrigatórios testes com matriz consentida, aparelhos reais, cabelo residual, cobertura, performance e regressão visual.

## Persistência atual e classificação dos dados

| Dado | Local atual | Classificação operacional |
| --- | --- | --- |
| Jornada e selfie | `sessionStorage`, `barbervision:fluxo` | Demonstração; inclui Data URL da selfie |
| Sessão do personagem | `sessionStorage` | Demonstração sem Auth |
| Catálogo de cortes | `localStorage` | Demonstração local |
| Produtos | `localStorage` | Demonstração local |
| Pós-venda/avaliação | `localStorage` | Demonstração local, não verificável |
| Fechamento financeiro | `localStorage` | Gerencial fictício, não fiscal |
| Auth Supabase | Cookies SSR | Código parcial, ambiente não validado |
| Clientes/tenant SQL | Supabase local validado | reset/lint/pgTAP/concorrência/JWT-RLS/Storage e jornada Auth principal aprovados |

Não há sincronização, backup, trilha auditável, retenção ou recuperação para as persistências do navegador.

## Registro de riscos

| Risco | Situação | Mitigação exigida |
| --- | --- | --- |
| Dados reais em mocks/localStorage | Alto | Proibir dados reais até fluxo persistido e RLS validados |
| Selfie sem consentimento/expiração | Alto | Implementar passo 4 antes de qualquer piloto |
| Isolamento entre barbearias não exercitado | Alto | Rodar migrations, pgTAP e testes negativos cruzados |
| Owner AAL1/AAL2 não testado | Alto | Testar matrícula, challenge, refresh e acesso aos dados |
| Convite/provisionamento não validados | Alto | Executar os contratos SQL e testar ciclo de vida, concorrência e e-mail |
| Regressão na confirmação de compensações da Equipe | Alto | Manter releitura autoritativa, logs sem PII e E2E de falha/expiração |
| Regressão no provisionamento do primeiro dono | Alto | Preservar preflight, origem HTTPS/loopback, resolução server-only e replay por UUID |
| Membership do dono antes da senha sem decisão | Alto | Definir threat model, estado intermediário, expiração e recuperação antes do E2E |
| Lifecycle de funcionário | Mitigado localmente | UX e E2E aprovados; preservar gates e observabilidade |
| Reatribuição sem comando estreito | Alto | Criar RPC autorizada/idempotente/auditada e testes; não devolver `UPDATE` genérico |
| Metadados aninhados podem escapar do filtro nominal | Alto | Sanitizar/allowlistar payloads no comando e testar profundidade |
| E-mail/SMTP/redirects não validados | Alto | Configurar ambiente hospedado e testar links válidos/expirados |
| Páginas Auth sobre mocks | Médio | Migrar um fluxo vertical antes do restante do painel |
| 18 warnings de lint | Médio | Reduzir com cobertura sem tocar no simulador congelado |
| Build depende do Google Fonts | Médio | Auto-hospedar Anton e Manrope para build offline/reproduzível |
| Dependência de modelos visuais no aparelho | Médio | Testes Android/iOS, cache, timeout e memória |
| Assets-fonte sem licença comprovada | Alto | Manter privados; publicar apenas material autorizado e revisado |

## Checklist de validação antes do próximo passo

### Fundação Supabase

- [x] instalar Docker Desktop 4.86.0 e solicitar a ativação do WSL;
- [x] confirmar que `RebootPending` não aparece nesta sessão;
- [x] confirmar que o agente isolado não pertence a `docker-users`, enquanto `leoto` pertence; a tentativa do agente não criou backend e o processo foi encerrado;
- [x] abrir o Docker Desktop como `leoto`; processos de interface e backend ficaram ativos;
- [x] comprovar que o engine da sessão `leoto` inicia PostgreSQL/containers e aplica migrations/seed; observado transitoriamente em 14/08;
- [x] manter `54321`, `54322`, `54323`, Auth, Storage e Studio saudáveis com CLI 2.115.0;
- [x] repetir `db:reset` até exit `0`; dez migrations, seed e pgTAP pós-reset aprovados em 24/08;
- [x] versionar testes para e-mail não confirmado, dono AAL1, dono AAL2, funcionário, convites, lifecycle e auditoria;
- [x] executar as 192 asserções e repetir integração/concorrência após atualizar fixtures para as migrations 9–10;
- [ ] confirmar que o bucket de selfies não possui acesso acidental;
- [x] adicionar down scripts defensivos para assurance e onboarding/lifecycle;
- [x] ensaiar rollback/roll-forward e definir o tratamento do histórico de migrations.

### Auth

- [x] testar login, logout local/global, refresh e expiração;
- [ ] testar confirmação, recuperação e redefinição com links reais;
- [ ] testar matrícula e challenge TOTP do dono;
- [ ] testar bootstrap AAL1 sem liberar dados da barbearia;
- [ ] executar e testar convites, aceite, revogação, expiração, provisionamento e auditoria;
- [ ] tornar o provisionamento inicial retomável com preflight, retomada segura por UUID e compensação documentada para “Auth criado/RPC falhou”;
- [ ] validar `BARBERVISION_APP_URL` no provisionamento com o mesmo contrato central de origem segura e tratar URL inválida sem deixar onboarding órfão;
- [x] conferir e registrar o resultado das RPCs compensatórias da Equipe antes de informar revogação ou falha persistida;
- [ ] decidir/testar se a membership do primeiro dono nasce antes da confirmação e da definição da senha;
- [ ] fazer a UI reler/usar o estado final de convite e não anunciar revogação quando a RPC o materializar como expirado;
- [x] implementar UX de suspensão, reativação e revogação, incluindo memberships não ativas e estado autoritativo;
- [ ] criar/testar a RPC estreita de reatribuição sem restaurar `UPDATE` direto;
- [ ] sanitizar e testar segredos em `metadados`, inclusive conteúdo aninhado;
- [x] implementar outbox/retry e reconciliação do envio com enqueue atômico, lease e conclusão idempotente;
- [ ] configurar scheduler, segredo e alertas no ambiente hospedado;
- [ ] definir transferência segura do dono;
- [ ] definir seleção de tenant para usuários com mais de uma membership;
- [ ] validar allowlist de redirects, templates, SMTP, rate limits e proteção contra abuso;
- [x] definir e testar recuperação operacional server-only quando o dono perde o TOTP.

### Aplicação

- [x] executar `npm.cmd run lint`: repetido em 21/08/2026, com 0 erros e 18 warnings;
- [x] executar `npm.cmd run build`: aprovado em 14/08/2026 no modo sem Supabase;
- [ ] auto-hospedar Anton e Manrope para eliminar a dependência de rede do build;
- [ ] testar rotas em produção nos modos sem e com Supabase;
- [ ] verificar que a flag insegura não contorna Auth configurado;
- [ ] verificar headers e ausência de segredos no bundle;
- [ ] executar smoke da jornada pública sem alterar o placement manual congelado.

## Sequência canônica de validação

1. Marcar o banco descartável, executar pgTAP, integração JWT/Storage e concorrência e guardar evidência.
2. Usar o runbook para ensaiar rollbacks incrementais e repetir os gates após o roll-forward.
3. Restringir o lint às schemas do aplicativo para não tratar incompatibilidades internas do pgTAP/PostgreSQL 17 como falha do produto.
4. Preservar a suíte Playwright aprovada e ampliá-la para lifecycle completo, refresh/expiração e falhas.
5. Fechar gaps operacionais: proteção distribuída, scheduler da outbox, reatribuição estreita, transferência de dono e seleção multi-tenant.
6. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

## Privacidade e operação real

O passo 4 ainda não foi implementado. Hoje a selfie pode permanecer como Data URL em `sessionStorage` até o fluxo ser concluído, limpo ou o contexto do navegador ser descartado. Isso não constitui política de retenção.

Antes de qualquer uso com clientes reais, são necessários:

- aviso de privacidade e consentimento/aceite versionado antes da captura;
- finalidade, base legal, prazo de retenção e descarte por estado do fluxo;
- remoção por abandono, expiração, conclusão e solicitação do titular;
- canal para acesso, correção e exclusão;
- inventário de logs, analytics, suporte e subprocessadores;
- política para material-fonte, cutouts, selfie e resultado composto;
- resposta a incidente e registro mínimo auditável, sem guardar imagem ou token em logs.

## Deploy e release

Ainda não existem configuração de hospedagem, CI/CD, ambientes, monitoramento, alertas, backup, restore testado, health check ou runbook de incidente.

Gates mínimos de release:

1. build e lint atuais aprovados;
2. migrations e pgTAP executados em ambiente descartável;
3. Auth, e-mail e MFA testados ponta a ponta;
4. passo 4 de privacidade concluído;
5. ao menos um fluxo vertical persistido com RLS e idempotência;
6. backups e restauração testados;
7. logs sem segredos/PII, métricas, alertas e procedimento de incidente;
8. testes E2E por papel e tenant;
9. validação visual/mobile consentida do simulador;
10. revisão de licenças e termos.

## Solução de problemas

### O painel redireciona para `/?modo=seguro`

Sem Supabase, isso é esperado em produção quando a flag insegura não está exatamente em `true`. Com Supabase configurado, `/admin` continua bloqueado e o painel da barbearia exige sessão real.

### O painel redireciona para `/barbeiro/login`

Supabase está configurado e `getClaims()` não encontrou sessão válida. Verifique cookies, URL/key, origem e callback. Não habilite a flag insegura como correção.

### O dono entra em ciclo no MFA

Verifique confirmação de e-mail, membership ativa, claim `aal`, factors TOTP e aplicação da migration `auth_assurance`. O bootstrap AAL1 está versionado, mas precisa de teste real.

### A tela Equipe falha

Confirme que as dez migrations foram aplicadas e que a sessão pertence a um dono ativo do tenant correto. Depois revise a Admin API, SMTP, callbacks e o status do convite. TOTP não é mais obrigatório para esse fluxo.

### `auth:provision-owner` convida, mas não cria a barbearia

A RPC `provisionar_dono_controlado` e a resolução server-only por e-mail foram aplicadas por reset. O fluxo foi executado com uma identidade nova e repetido por e-mail e por `--usuario-id`, sempre retornando o mesmo tenant. Em falha após criar Auth, repita os mesmos argumentos com o UUID informado; para identidade existente que precise receber acesso, acrescente `--enviar-acesso`.

### Supabase não recebe clientes, catálogo ou financeiro

Esse é o comportamento atual. As páginas de negócio continuam em mocks/armazenamento local e ainda não foram migradas.

### `db:start` inicia e depois encerra

Em 22/08, a atualização para CLI 2.115.0 e a desativação explícita de Analytics/Vector eliminaram a corrida de health check sem expor o daemon Docker em `2375`. Os serviços necessários estão saudáveis; Storage ainda requer teste funcional com JWT e blob real.

### O cabelo antigo reaparece nas bordas

O placement é manual e reduzir/mover o cutout pode expor cabelo original. Restaure a posição, aumente a cobertura ou refaça uma selfie frontal com o cabelo preso/afastado. A validação automática pós-ajuste continua pendente para o piloto.

## Referências

- [Plano de execução](PLANO-DE-EXECUCAO.md)
- [Banco de dados](BANCO-DE-DADOS.md)
- [API e integrações](API-E-INTEGRACOES.md)
- [Fluxos e regras](FLUXOS-E-REGRAS.md)
- [Decisões de produto](DECISOES-DE-PRODUTO.md)
- [Simulador de cabelo](SIMULADOR-DE-CABELO.md)
- [Pendências oficiais](../pend%C3%AAncias.md)
