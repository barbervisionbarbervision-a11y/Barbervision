# Barber Vision

Plataforma em desenvolvimento para barbearias apresentarem cortes ao cliente antes do atendimento, registrarem a jornada comercial e, futuramente, operarem clientes, equipe, catálogo, pós-venda e financeiro em um ambiente multiempresa.

> Estado reconciliado em **21/08/2026**. O projeto é uma demonstração funcional local, não um produto pronto para receber dados reais de clientes.

## Estado atual

O Barber Vision possui duas áreas distintas:

- uma jornada pública demonstrativa em `/b/[barbearia]`, com selfie, preparação local da foto, escolha do corte, ajuste manual do cabelo, recomendação, avaliação e pós-venda;
- um painel demonstrativo em `/barbeiro`, com dashboard, clientes, catálogo, produtos, financeiro e outras telas de operação.

O simulador de cabelo está **congelado por decisão de produto**: a preparação é automática e local, enquanto o encaixe final do cabelo é manual, com os controles ao lado direito da foto. Essa entrega é suficiente para a demonstração atual e não deve ser reescrita durante as etapas de fundação.

### Progresso oficial

| Passo | Estado real | Observação |
|---|---|---|
| 1. Segurança da demonstração | Concluído para a demo controlada | Em produção sem Auth, `/admin` permanece sempre bloqueado; uma flag explicitamente insegura pode liberar somente a demo de `/barbeiro/*`. |
| 2. Supabase, tenant e RLS | Execução parcial; validação pendente | `db:start` aplicou as cinco migrations e o seed em PostgreSQL 15.8, e o schema foi consultado. A pilha não permaneceu ativa; `db:reset`, lint, pgTAP, RLS via JWT e Storage continuam sem validação. |
| 3. Autenticação real | Parcial; não operacional ponta a ponta | SSR, login, recuperação, callbacks e TOTP existem. O SQL de convites/lifecycle/auditoria chegou a ser aplicado, mas nenhum fluxo Auth real, pgTAP ou teste de autorização foi executado. |
| 4. Privacidade e consentimento | Não iniciado | Ainda faltam consentimento afirmativo, retenção, exclusão, termos e governança LGPD. |
| 5. Fluxo vertical persistido | Não iniciado | A jornada pública continua em `sessionStorage`/`localStorage`; não cria simulação, agenda ou avaliação no banco. |
| 6. Painel operacional real | Não iniciado | As telas de negócio ainda usam mocks e armazenamento do navegador. |
| 7. Catálogo e pós-venda reais | Não iniciado | Catálogos são locais; upload, estoque, reserva e venda não estão persistidos. |
| 8. Financeiro persistente | Não iniciado | O fechamento é uma demonstração gerencial local, não cálculo tributário nem declaração fiscal. |
| 9. Operação e release | Não iniciado | Faltam ambientes, CI, observabilidade, backups, testes e piloto controlado. |

O plano completo está em [docs/PLANO-DE-EXECUCAO.md](docs/PLANO-DE-EXECUCAO.md), e o backlog oficial em [pendências.md](pend%C3%AAncias.md).

## O que funciona hoje

### Jornada pública demonstrativa

- landing por slug de barbearia;
- cadastro local do cliente;
- captura ou upload de selfie;
- processamento visual inteiramente no navegador;
- preparação automática da região superior da cabeça;
- catálogo demonstrativo com moldes locais de cabelo;
- ajuste manual de posição, largura, altura, escala e inclinação;
- comparação, recomendação, avaliação e cuidados sugeridos;
- catálogo local de produtos e intenção de compra demonstrativa.

A foto permanece no aparelho durante a demonstração, mas ainda pode ficar serializada como Data URL em `sessionStorage`. Isso não equivale a uma solução completa de privacidade, retenção ou consentimento.

### Painel demonstrativo

- dashboard e funil;
- clientes com pesquisa por nome ou telefone;
- simulações, histórico e avaliações;
- catálogo de cortes com editor de recorte;
- produtos e pós-venda;
- promoções, fidelidade e comissões;
- fechamento financeiro gerencial local;
- telas de segurança e equipe associadas ao Auth parcial.

Os dados dessas telas ainda são mocks ou registros do navegador. Autenticar no Supabase não transforma o painel em um sistema persistido.

### Fundação Supabase versionada

As migrations criam:

- `barbearias`;
- `perfis`;
- `membros_barbearia`;
- `clientes`;
- `atribuicoes_cliente`;
- `convites_barbearia`;
- `eventos_auditoria` append-only;
- RLS por tenant e papel;
- buckets privados `barbervision-hair-sources`, `barbervision-hair-cutouts` e `barbervision-selfies`;
- exigência de e-mail confirmado e AAL2 para o dono acessar dados de negócio e Storage;
- nove RPCs estreitas para criar, aceitar, revogar e registrar envio/falha de convite, provisionar o primeiro dono e suspender, reativar ou revogar funcionário.

A migration `20260813010000_onboarding_invites_lifecycle_audit.sql` entrega esses contratos em fonte, com locks, grants mínimos e auditoria na mesma transação das transições efetivas. UUIDs de autoria/proveniência são históricos e não usam FKs destrutivas; replays idempotentes não duplicam eventos. O `UPDATE` direto do responsável por uma atribuição foi fechado até existir uma RPC transacional de reatribuição. As migrations 4–5 possuem rollbacks defensivos e uma suíte dedicada de 109 asserções; há também um runner com duas sessões concorrentes e uma terceira conexão observadora/administrativa. Em 14/08, as cinco migrations e o seed foram aplicados por `db:start`, e as tabelas/RPCs foram criadas no PostgreSQL local. Isso prova aplicação básica, não comportamento: pgTAP, rollbacks, concorrência, JWTs e fluxos Auth continuam sem execução. Outbox/retry de e-mail, expiração reconciliada de convites, transferência de dono, UX do lifecycle e a orquestração completa para um usuário Auth já existente continuam pendentes. O provisionamento inicial não é atômico nem retomável após “Auth criado/RPC falhou”; as compensações de convite hoje ignoram o próprio erro; a mensagem de revogação não distingue o estado autoritativo `expirado`; e o aceite da membership ocorre antes de a tela gravar a senha. Por isso, as telas e scripts consumidores não constituem evidência de um fluxo real funcional.

## Stack

- Next.js 16.3.0 com App Router e `proxy.js`;
- React 18.3.1;
- Tailwind CSS 3.4;
- MediaPipe Tasks Vision 0.10.35;
- Supabase JS 2.112.2 e `@supabase/ssr` 0.12.4;
- Supabase CLI 2.112.0;
- `pg` 8.23.0 para o runner concorrente descartável;
- Lucide React.

## Executar localmente

### Windows

Na raiz do projeto, dê dois cliques em `launcher.bat` ou execute:

```powershell
npm.cmd install
npm.cmd run dev
```

Abra `http://127.0.0.1:3000`.

O launcher valida pré-requisitos e abre a aplicação; ele não configura um projeto Supabase nem torna o Auth real funcional.

### macOS ou Linux

```bash
npm install
npm run dev
```

### Modos de execução

Sem as variáveis públicas do Supabase:

- o ambiente de desenvolvimento usa a sessão demonstrativa do navegador;
- em produção, `/barbeiro/*` e `/admin/*` ficam bloqueados;
- `BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=true` libera apenas a demo de `/barbeiro/*` em produção e não cria segurança real; `/admin` continua bloqueado.

Com Supabase configurado:

- `proxy.js` atualiza cookies e valida claims;
- o painel exige sessão real;
- o dono é direcionado ao TOTP quando está em AAL1;
- papel e tenant são lidos de `membros_barbearia`, não de `sessionStorage` ou metadata editável;
- `/admin` continua bloqueado, pois a administração da plataforma exige um domínio de autorização próprio;
- a flag de demo não contorna o Auth.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha somente quando houver um projeto Supabase controlado:

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

Regras:

- `SUPABASE_SECRET_KEY` é exclusiva do servidor e nunca pode receber prefixo `NEXT_PUBLIC_`;
- `.env.local` não deve ser versionado;
- as três variáveis `BARBERVISION_*DATABASE*` são exclusivas do runner concorrente e devem apontar para um banco explicitamente descartável;
- as configurações de `supabase/config.toml` valem para o ambiente local e não comprovam a configuração do projeto hospedado;
- redirects de produção devem usar HTTPS e allowlist exata.

## Rotas

### Públicas

| Rota | Função atual |
|---|---|
| `/` | Entrada geral |
| `/b/[barbearia]` | Landing demonstrativa da barbearia |
| `/b/[barbearia]/cadastro` | Dados locais do cliente |
| `/b/[barbearia]/selfie` | Captura ou upload da foto |
| `/b/[barbearia]/processando` | Preparação do fluxo |
| `/b/[barbearia]/simulacao` | Simulador local e ajuste manual |
| `/b/[barbearia]/recomendacao` | Escolha e recomendação |
| `/b/[barbearia]/escolha` | Resumo/agendamento demonstrativo |
| `/b/[barbearia]/avaliacao` | Avaliação e cuidados locais |
| `/b/[barbearia]/demo` | Atalho de demonstração |

### Autenticação e acesso da barbearia

| Rota | Estado |
|---|---|
| `/barbeiro/login` | Login real quando Supabase está configurado; seletor demo sem Supabase |
| `/barbeiro/esqueci-senha` | Solicitação de recuperação |
| `/barbeiro/redefinir-senha` | Troca de senha após sessão de recuperação |
| `/barbeiro/ativar-conta` | Conclusão do convite; contrato SQL aplicado na inicialização transitória, ainda sem teste ponta a ponta |
| `/barbeiro/mfa` | Cadastro/desafio TOTP do dono |
| `/barbeiro/sem-acesso` | Conta sem perfil, membership ou tenant válido |
| `/auth/callback` | Troca de código por sessão |
| `/auth/confirm` | Confirmação por token hash |

### Painel

As rotas sob `/barbeiro` incluem dashboard, clientes, simulações, histórico, avaliações, funil, promoções, catálogo, produtos, financeiro, fidelidade, comissões, equipe e segurança. Rotas exclusivas do dono possuem guarda server-side própria. `/admin` permanece uma tela mockada e bloqueada em modo real/produção.

## Scripts

| Comando | Objetivo |
|---|---|
| `npm run dev` | Servidor local em `127.0.0.1:3000` |
| `npm run build` | Build de produção |
| `npm run start` | Executar o build |
| `npm run lint` | ESLint do repositório |
| `npm run db:start` | Iniciar stack Supabase local; requer Docker compatível |
| `npm run db:reset` | Recriar banco local e aplicar migrations/seed |
| `npm run db:lint` | Lint SQL local |
| `npm run db:test` | Executar pgTAP |
| `npm run db:test:concurrency` | Executar duas corridas reais em banco explicitamente marcado como descartável |
| `npm run auth:provision-owner` | Provisionamento controlado; RPC aplicada na inicialização transitória, ainda sem execução funcional comprovada |

## Estrutura principal

```text
app/                     rotas Next.js
  auth/                  callbacks server-side do Supabase Auth
  b/[barbearia]/          jornada pública
  barbeiro/              Auth e painel da barbearia
components/              componentes compartilhados
lib/                     estado local, domínio, Auth e clientes Supabase
public/                  assets públicos e modelos locais
private-assets/          fotos-fonte fora do runtime público
scripts/                 provisionamento do primeiro dono e teste concorrente do banco
supabase/                migrations, seed, templates, rollback e testes
docs/                    documentação técnica e de produto
```

## Validação conhecida

- Em 21/08/2026, `npm ls --depth=0`, `npm run lint -- --no-cache`, os dois `node --check` e `launcher.bat --check` passaram; o lint possui 0 erros e 18 warnings. O `npm audit` com 0 vulnerabilidades e a validação do atalho continuam como evidências de 14/08.
- `npm run build` foi aprovado em 14/08/2026, com 31 páginas, 2 Route Handlers e o Proxy. O smoke HTTP continua sendo evidência histórica de 13/08/2026; o build não foi repetido nesta revisão documental.
- O build sem `.env.local` valida apenas o modo demonstrativo; não testa login, e-mail, TOTP, RLS ou Storage.
- O build precisou de acesso de rede para obter Anton e Manrope do Google Fonts; um ambiente offline falha nessa etapa até as fontes serem auto-hospedadas.
- No smoke do build sem Supabase, `/` e `/b/barbearia-exemplo` responderam `200`; login, dashboard e `/admin` responderam `307` para `/?modo=seguro`.
- Em 14/08, `leoto` executou `db:start`: o CLI aplicou as cinco migrations e o seed. Durante uma janela transitória, `54321`, `54322`, `54323`, `54324` e `54327` aceitaram conexão; PostgreSQL 15.8 registrou as cinco versões, as tabelas core/convites/auditoria existiam e o seed tinha duas barbearias. Auth health, REST e Studio responderam `200`, enquanto Storage respondeu `502`.
- A pilha não permaneceu ativa e a causa final do CLI não foi capturada; todas as portas fecharam. No snapshot de 21/08, Docker/daemon estão parados, não há `.env.local`, `.supabase` persistido, Git operacional, `psql` ou projeto remoto vinculado. Existem apenas resíduos locais ignorados em `supabase/.temp`, `.branches` e `snippets`.
- `db:lint` e `db:test` foram tentados em 14/08/2026 e chegaram à conexão local, mas terminaram em `ECONNREFUSED 127.0.0.1:54322`; não houve lint nem asserção SQL executada.
- As duas suítes SQL transacionais declaram 168 asserções: 59 da fundação e 109 de assurance, AAL1/AAL2, convites, lifecycle, ACLs e auditoria. Elas ainda não foram executadas. Concorrência fica no runner de duas sessões concorrentes mais uma conexão observadora; callbacks e JWTs reais continuam fora do pgTAP.
- O runner concorrente passou em `node --check`, bloqueou destino sem confirmação e banco remoto não autorizado; com o destino local confirmado, parou corretamente em `ECONNREFUSED` porque não há PostgreSQL na porta `54322`.
- O Git CLI não está disponível e o diretório `.git/` está vazio; ainda não existe baseline recuperável por commit/tag para as próximas mudanças.
- O simulador continua sujeito a validação em aparelhos reais antes de qualquer piloto com clientes.

Veja o procedimento em [docs/OPERACAO.md](docs/OPERACAO.md).

## Documentação

- [AI context.md](AI%20context.md): contexto canônico para agentes e próximas sessões;
- [pendências.md](pend%C3%AAncias.md): backlog oficial e próximos passos;
- [docs/PLANO-DE-EXECUCAO.md](docs/PLANO-DE-EXECUCAO.md): sequência de nove passos;
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): fronteiras e fluxo de dados;
- [docs/AUTENTICACAO-E-SESSOES.md](docs/AUTENTICACAO-E-SESSOES.md): Auth, MFA, convites e riscos;
- [docs/BANCO-DE-DADOS.md](docs/BANCO-DE-DADOS.md): modelo multi-tenant e RLS;
- [supabase/README.md](supabase/README.md): operação da fundação Supabase;
- [docs/PRIVACIDADE-E-FLUXO-PERSISTIDO.md](docs/PRIVACIDADE-E-FLUXO-PERSISTIDO.md): requisitos dos passos 4 e 5;
- [docs/SIMULADOR-DE-CABELO.md](docs/SIMULADOR-DE-CABELO.md): contrato congelado do simulador;
- [docs/FECHAMENTO-FINANCEIRO.md](docs/FECHAMENTO-FINANCEIRO.md): limite gerencial e fiscal;
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): licenças e artefatos de terceiros.

## Próximos passos

1. Reabrir o Docker e reproduzir `db:start` guardando a saída completa; diagnosticar o Storage `502` e por que a pilha encerra, até obter `supabase status` e health checks estáveis.
2. Instalar/habilitar o Git e criar uma baseline recuperável antes das correções de código ou SQL, excluindo secrets, `.next` e resíduos locais do Supabase.
3. Com a pilha estável, executar `db:reset`, `db:lint` e os 168 testes pgTAP.
4. Depois do `db:reset`, marcar e confirmar explicitamente o banco descartável; executar `db:test:concurrency` e guardar a evidência das duas corridas.
5. Escrever um runbook reproduzível para rollback/roll-forward e `supabase_migrations`; ensaiar os rollbacks 4–5 e o roll-forward e, ao final, repetir `db:lint`, os 168 pgTAPs e o runner concorrente.
6. Criar `.env.local` somente no ambiente controlado e preparar fixtures/identidades Auth reais para dono AAL1/AAL2, funcionário e cenário cross-tenant.
7. Criar o harness de integração e validar Data API e Storage com JWTs reais e cenários adversários.
8. Selecionar/configurar o framework E2E, criar a suíte e então executar Auth, e-mail, convite, MFA e lifecycle.
9. Fechar gaps operacionais: outbox/retry, usuário Auth existente, expiração reconciliada, UX do lifecycle, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant.
10. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

Depois desses gates, o passo 5 persiste o fluxo vertical; painel, catálogo, produtos, financeiro e operação vêm nas fases seguintes.

Não use selfies, telefones, e-mails ou dados financeiros reais antes de concluir esses gates.
