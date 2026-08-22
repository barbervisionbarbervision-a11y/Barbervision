# Operação, segurança e qualidade

Estado reconciliado em **21/08/2026**.

Este documento descreve o que pode ser executado hoje, os dois modos de operação do painel e os gates que ainda impedem um deploy com dados reais. O simulador de cabelo permanece congelado na versão de placement manual; esta revisão documental não altera seu comportamento.

## Resumo executivo

O Barber Vision é uma aplicação Next.js 16 executável localmente. A jornada pública e quase todas as telas de negócio ainda são uma demonstração baseada em mocks, `sessionStorage` e `localStorage`. Existe uma integração parcial de Auth/SSR com Supabase. A pilha local chegou a inicializar transitoriamente, mas nenhuma jornada Auth do Barber Vision foi exercitada.

Situação confirmada nesta revisão:

- modo de demonstração sem variáveis Supabase continua disponível em desenvolvimento;
- produção sem Supabase bloqueia `/admin` e `/barbeiro/*` por padrão;
- com Supabase configurado, o Proxy usa cookies e `getClaims()` para proteger o painel da barbearia;
- login, recuperação, redefinição, confirmação, ativação e TOTP estão versionados;
- o contexto server-side valida perfil, membership e tenant; oito layouts internos exigem papel de dono;
- dados de clientes, simulações, catálogo, produtos, financeiro e demais módulos continuam mocks ou persistência local;
- em 14/08, `leoto` executou duas inicializações com PostgreSQL `15.8.1.085`; ambas aplicaram as cinco migrations e o seed e chegaram a iniciar containers;
- Auth, REST e Studio responderam `200` e `54321`, `54322` e `54323` ficaram disponíveis brevemente; Storage respondeu HTTP `502` e a pilha encerrou;
- em 21/08 não há `.env.local`; Docker e as três portas estão inativos. A sandbox continua sem acesso ao pipe quando o engine pertence à sessão interativa;
- o Git CLI não está instalado e o diretório `.git/` existente está vazio, portanto ainda não há versionamento operacional;
- convites de funcionário e provisionamento do primeiro dono têm código de aplicação e contratos SQL aplicados transitoriamente, mas nenhuma jornada foi executada/testada;
- o lint foi repetido em 21/08 e terminou com zero erros e 18 warnings; o build aprovado continua sendo o de 14/08 e o smoke HTTP permanece evidência histórica de 13/08;
- `db:reset`, lint SQL, as 168 asserções pgTAP, rollback, concorrência, JWT/Data API, Storage funcional e Auth/E2E não foram executados; as tentativas anteriores de `db:lint` e `db:test` terminaram em `ECONNREFUSED 127.0.0.1:54322`;
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
| Supabase CLI | `2.112.0` |
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
- donos em AAL1 são enviados para `/barbeiro/mfa` e só acessam dados de negócio em AAL2;
- funcionários podem operar em AAL1 conforme a política versionada;
- oito áreas do painel possuem layout server-side exclusivo do dono: Catálogo, Comissões, Equipe, Fidelidade, Financeiro, Funil, Produtos e Promoções;
- `/admin` permanece bloqueado, pois o painel master não faz parte deste Auth;
- a flag de demonstração insegura não ignora Auth quando Supabase está configurado.

O bootstrap do dono em AAL1 foi ajustado para ler apenas o próprio perfil e a própria membership antes do TOTP, sem consultar dados do tenant. Esse caminho está versionado, mas ainda não foi testado com JWT e banco reais.

Mesmo nesse modo, as páginas de negócio ainda consomem mocks e `localStorage`. Auth real sobre dados fictícios não equivale a um painel operacional conectado.

## Variáveis de ambiente

O repositório contém apenas `.env.example`. Não existe `.env.local` nesta revisão.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave
SUPABASE_SECRET_KEY=sb_secret_sua-chave
BARBERVISION_APP_URL=http://127.0.0.1:3000
BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=false
BARBERVISION_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
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
| `npm run db:start` | Inicia Supabase local | Executado duas vezes por `leoto` em 14/08; migrations/seed e containers iniciaram, Auth/REST/Studio responderam `200`, Storage respondeu `502` e a pilha encerrou |
| `npm run db:reset` | Aplica migrations e seed | Não executado |
| `npm run db:test` | Executa pgTAP | 2 suítes, 168 asserções declaradas; nenhuma executada |
| `npm run db:test:concurrency` | Executa duas corridas com conexões reais | Runner/guardas validados; banco local ausente (`ECONNREFUSED`) |
| `npm run db:lint` | Lint do PostgreSQL local | Tentado em 14/08; `ECONNREFUSED 127.0.0.1:54322`, sem resultado SQL |
| `npm run db:stop` | Encerra a pilha local | Não executado como validação; a pilha encerrou durante as tentativas de startup |
| `npm run auth:provision-owner -- ...` | Convida e provisiona o primeiro dono | RPC versionada; fluxo não executado/testado |
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

As duas suítes pgTAP transacionais precisam comprovar as 168 asserções. Só execute `db:test:concurrency` depois do reset, de configurar as três variáveis de teste e de marcar explicitamente o banco descartável conforme a seção anterior. Após o ensaio documentado de rollback/roll-forward, repita `db:lint`, as 168 asserções e a concorrência.

No smoke HTTP histórico de 13/08 do build sem `.env.local`, `/` e `/b/barbearia-exemplo` responderam `200`; `/barbeiro/login`, `/barbeiro/dashboard` e `/admin` responderam `307` para `/?modo=seguro`. Isso comprova a contenção desse modo, não o Auth Supabase nem o smoke visual.

## Banco e Storage

Cinco migrations estão versionadas:

1. `20260808010000_tenant_core.sql`: `barbearias`, `perfis`, `membros_barbearia`, `clientes` e `atribuicoes_cliente`;
2. `20260808011000_tenant_rls.sql`: grants, policies e funções de escopo por tenant/papel;
3. `20260808012000_private_storage.sql`: buckets privados para fontes, cutouts e selfies;
4. `20260808013000_auth_assurance.sql`: e-mail confirmado e AAL2 obrigatório para o dono acessar dados de negócio e Storage.
5. `20260813010000_onboarding_invites_lifecycle_audit.sql`: convites, auditoria append-only e nove RPCs de onboarding/lifecycle.

Limites atuais:

- as cinco migrations e o seed foram aplicados nas duas inicializações transitórias, mas não houve `db:reset` limpo nem prova de estado persistente/repetível;
- os dois pgTAPs declaram 59 + 109 asserções ainda não executadas; o segundo cobre AAL1/AAL2, confirmação de e-mail, convites, lifecycle, ACLs e auditoria;
- não há JWT real, TOTP, callback ou Data API nos testes SQL;
- o bucket de selfies permanece deliberadamente sem policy pública/cliente até a etapa de privacidade;
- os rollbacks 4–5 estão versionados e revisados estaticamente, mas não foram ensaiados nem reconciliam o histórico `supabase_migrations` automaticamente;
- a quinta migration foi aplicada no startup, mas ainda não passou por `db:reset`; `db:lint`/`db:test` não produziram resultado SQL;
- o runner concorrente exige confirmação exata e comentário marcador dentro do banco descartável; nenhuma corrida foi executada;
- seed e fixtures SQL não equivalem a contas utilizáveis por `signInWithPassword`.

O código de Equipe chama contratos agora versionados (`criar_convite_funcionario`, `revogar_convite_barbearia`, `marcar_convite_enviado` e `marcar_convite_falhou`). Não use a presença do SQL ou da tela como evidência de convite funcional: banco, SMTP, Admin API, callback, aceite e estados de erro ainda precisam ser exercitados juntos. Há um risco P1 adicional: a compensação que revoga o convite quando falta configuração ignora o retorno da RPC, e a compensação que marca falha após erro de envio também ignora o retorno. A interface só pode afirmar o estado que o banco confirmou.

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
| Clientes/tenant SQL | PostgreSQL planejado | Migrations aplicadas apenas em startup transitório; não validadas |

Não há sincronização, backup, trilha auditável, retenção ou recuperação para as persistências do navegador.

## Registro de riscos

| Risco | Situação | Mitigação exigida |
| --- | --- | --- |
| Dados reais em mocks/localStorage | Alto | Proibir dados reais até fluxo persistido e RLS validados |
| Selfie sem consentimento/expiração | Alto | Implementar passo 4 antes de qualquer piloto |
| Isolamento entre barbearias não exercitado | Alto | Rodar migrations, pgTAP e testes negativos cruzados |
| Owner AAL1/AAL2 não testado | Alto | Testar matrícula, challenge, refresh e acesso aos dados |
| Convite/provisionamento não validados | Alto | Executar os contratos SQL e testar ciclo de vida, concorrência e e-mail |
| Compensações da Equipe ignoram falha | Alto | Conferir cada RPC compensatória, registrar correlação e nunca anunciar estado não persistido |
| Primeiro dono não retomável/URL divergente | Alto | Adicionar preflight, retomada por UUID, compensação e validação central da origem |
| Membership do dono antes da senha sem decisão | Alto | Definir threat model, estado intermediário, expiração e recuperação antes do E2E |
| Lifecycle sem UX operacional | Alto | Integrar suspensão, reativação e revogação com estado autoritativo e E2E |
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
- [ ] diagnosticar o HTTP `502` do Storage/encerramento e manter `54321`, `54322` e `54323` disponíveis;
- [ ] executar `db:reset`, `db:lint` e `db:test` sem falhas;
- [x] versionar testes para e-mail não confirmado, dono AAL1, dono AAL2, funcionário, convites, lifecycle e auditoria;
- [ ] executar as 168 asserções e o runner concorrente;
- [ ] confirmar que o bucket de selfies não possui acesso acidental;
- [x] adicionar down scripts defensivos para assurance e onboarding/lifecycle;
- [ ] ensaiar rollback/roll-forward e definir o tratamento do histórico de migrations.

### Auth

- [ ] testar login, logout local/global, refresh e expiração;
- [ ] testar confirmação, recuperação e redefinição com links reais;
- [ ] testar matrícula e challenge TOTP do dono;
- [ ] testar bootstrap AAL1 sem liberar dados da barbearia;
- [ ] executar e testar convites, aceite, revogação, expiração, provisionamento e auditoria;
- [ ] tornar o provisionamento inicial retomável com preflight, retomada segura por UUID e compensação documentada para “Auth criado/RPC falhou”;
- [ ] validar `BARBERVISION_APP_URL` no provisionamento com o mesmo contrato central de origem segura e tratar URL inválida sem deixar onboarding órfão;
- [ ] conferir e registrar o resultado das RPCs compensatórias da Equipe antes de informar revogação ou falha persistida;
- [ ] decidir/testar se a membership do primeiro dono nasce antes da confirmação e da definição da senha;
- [ ] fazer a UI reler/usar o estado final de convite e não anunciar revogação quando a RPC o materializar como expirado;
- [ ] implementar UX de suspensão, reativação e revogação, incluindo memberships não ativas e estado autoritativo;
- [ ] criar/testar a RPC estreita de reatribuição sem restaurar `UPDATE` direto;
- [ ] sanitizar e testar segredos em `metadados`, inclusive conteúdo aninhado;
- [ ] implementar outbox/retry e reconciliação do envio, inclusive para usuário Auth já existente;
- [ ] definir transferência segura do dono;
- [ ] definir seleção de tenant para usuários com mais de uma membership;
- [ ] validar allowlist de redirects, templates, SMTP, rate limits e proteção contra abuso;
- [ ] definir recuperação segura quando o dono perde o TOTP.

### Aplicação

- [x] executar `npm.cmd run lint`: repetido em 21/08/2026, com 0 erros e 18 warnings;
- [x] executar `npm.cmd run build`: aprovado em 14/08/2026 no modo sem Supabase;
- [ ] auto-hospedar Anton e Manrope para eliminar a dependência de rede do build;
- [ ] testar rotas em produção nos modos sem e com Supabase;
- [ ] verificar que a flag insegura não contorna Auth configurado;
- [ ] verificar headers e ausência de segredos no bundle;
- [ ] executar smoke da jornada pública sem alterar o placement manual congelado.

## Sequência canônica de validação

1. Estabilizar o Supabase local na sessão `leoto`: reproduzir a inicialização com diagnóstico redigido, corrigir o HTTP `502` do Storage/encerramento e comprovar que `54321`, `54322` e `54323` permanecem disponíveis.
2. Instalar/habilitar o Git e criar um baseline recuperável antes das próximas mutações, sem versionar segredos, `.env.local` ou `.next/`.
3. Executar `db:reset`, `db:lint` e `db:test`, comprovando as 168 asserções das duas suítes pgTAP transacionais.
4. Depois do `db:reset`, marcar e confirmar o banco descartável; executar `db:test:concurrency` e guardar a evidência.
5. Escrever um runbook reproduzível de rollback/roll-forward que inclua `supabase_migrations`; ensaiar os rollbacks 4–5 e o roll-forward e, ao final, repetir `db:lint`, as 168 asserções pgTAP e `db:test:concurrency`.
6. Criar um `.env.local` controlado e fixtures/identidades reais no Supabase Auth para dono AAL1/AAL2, funcionário e cenário cross-tenant.
7. Criar harness/scripts de integração e validar Data API e Storage com JWTs reais e cenários adversários.
8. Selecionar/configurar o framework E2E, criar a suíte e então executar Auth, e-mail, convite, MFA e lifecycle.
9. Fechar gaps operacionais: resultados das compensações da Equipe, provisionamento retomável com URL validada, decisão explícita sobre a membership do primeiro dono antes da senha, UX completa do lifecycle, outbox/retry, usuário Auth existente, expiração reconciliada, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant.
10. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

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

Confirme que a quinta migration foi aplicada e que a sessão é de dono AAL2. Depois revise a Admin API, SMTP, callbacks e o status do convite. O contrato SQL existe em fonte, mas ainda não há ambiente validado nem outbox/retry.

### `auth:provision-owner` convida, mas não cria a barbearia

A RPC `provisionar_dono_controlado` foi aplicada apenas no startup transitório, mas o fluxo não foi executado. Não repita convites cegamente: reconcilie primeiro o usuário Auth e o tenant, estabilize/recrie o banco, valide a URL segura e registre o resultado. O script ainda não possui retomada segura, e o caso de usuário Auth já existente continua sem prova ponta a ponta.

### Supabase não recebe clientes, catálogo ou financeiro

Esse é o comportamento atual. As páginas de negócio continuam em mocks/armazenamento local e ainda não foram migradas.

### `db:start` inicia e depois encerra

Em 14/08, o engine da sessão `leoto` iniciou PostgreSQL/containers duas vezes, aplicou migrations/seed e abriu os endpoints brevemente. O estado atual não é uma falha de instalação não investigada: o sintoma conhecido é Storage HTTP `502`, seguido do encerramento da pilha. Execute o procedimento diagnóstico redigido da seção **Comandos**, preserve o primeiro erro causal do container e confirme a saúde persistente das três portas. Não trate o aviso de Analytics/`2375` como causa sem evidência e não exponha o daemon Docker sem autenticação. Em 21/08, Docker e as portas estão inativos; a sandbox não substitui o terminal interativo de `leoto` para esse diagnóstico.

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
