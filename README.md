# Barber Vision

Plataforma em desenvolvimento para barbearias apresentarem cortes ao cliente antes do atendimento, registrarem a jornada comercial e, futuramente, operarem clientes, equipe, catálogo, pós-venda e financeiro em um ambiente multiempresa.

> Estado reconciliado em **26/08/2026**. O Render está publicado, o Supabase remoto recebeu doze migrations e o SMTP Brevo está operacional. Cadastro público protegido, primeiro dono, recuperação de senha, convite, ativação e login de funcionário foram comprovados no hospedado. Após um reset remoto integral, dono e funcionário foram recriados e o ciclo ativo → suspenso → reativado → revogado foi confirmado no Render, incluindo corte e retorno de acesso. E-mail confirmado continua obrigatório; TOTP é opcional e recomendado. Veja [Estado de validação](docs/ESTADO-VALIDACAO.md).

## Estado atual

O Barber Vision possui duas áreas distintas:

- uma jornada pública demonstrativa em `/b/[barbearia]`, com selfie, preparação local da foto, escolha do corte, ajuste manual do cabelo, recomendação, avaliação e pós-venda;
- um painel demonstrativo em `/barbeiro`, com dashboard, clientes, catálogo, produtos, financeiro e outras telas de operação.

O simulador de cabelo está **congelado por decisão de produto**: a preparação é automática e local, enquanto o encaixe final do cabelo é manual, com os controles ao lado direito da foto. Essa entrega é suficiente para a demonstração atual e não deve ser reescrita durante as etapas de fundação.

### Progresso oficial

| Passo | Estado real | Observação |
|---|---|---|
| 1. Segurança da demonstração | Concluído para a demo controlada | Em produção sem Auth, `/admin` permanece sempre bloqueado; uma flag explicitamente insegura pode liberar somente a demo de `/barbeiro/*`. |
| 2. Supabase, tenant e RLS | Validado localmente e migrado no hospedado | Doze migrations; reset e pgTAP 205/205 passam, com evidências de concorrência, RLS via JWT e Storage com blob real. |
| 3. Autenticação real | Jornada principal e lifecycle de funcionário aprovados no hospedado | Confirmação, recuperação, convite, senha, login, suspensão, reativação e revogação funcionam. O scheduler da outbox e a matriz adversária remota ainda são gates. |
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
- cadastro de nome, e-mail e WhatsApp, com tentativa server-side de criação/atualização no Supabase;
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
- `convite_email_outbox`, fila privada com lease, retry e estado terminal;
- `eventos_auditoria` append-only;
- campos de e-mail normalizado em `clientes`, com validação e índice por tenant;
- RLS por tenant e papel;
- buckets privados `barbervision-hair-sources`, `barbervision-hair-cutouts` e `barbervision-selfies`;
- exigência de e-mail confirmado, perfil e membership ativos; TOTP opcional para reforçar a conta do dono;
- nove RPCs estreitas para criar, aceitar, revogar e registrar envio/falha de convite, provisionar o primeiro dono e suspender, reativar ou revogar funcionário.

As migrations de onboarding, leitura operacional, retomada do primeiro dono, outbox, consentimento e proteção de cadastro entregam os contratos atuais. Reset e pgTAP 205/205 passam localmente sobre as doze migrations. A criação do convite e o enqueue são atômicos; um worker server-only reivindica itens com lease, aplica backoff exponencial, conclui de forma idempotente e materializa convites vencidos. O disparo imediato usa `after()`, mas produção ainda exige um agendador externo chamando a rota interna protegida. Transferência de dono continua pendente.

## Stack

- Next.js 16.3.0 com App Router e `proxy.js`;
- React 18.3.1;
- Tailwind CSS 3.4;
- MediaPipe Tasks Vision 0.10.35;
- Supabase JS 2.112.2 e `@supabase/ssr` 0.12.4;
- Supabase CLI 2.115.0;
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
- o dono pode configurar TOTP no primeiro acesso ou escolher **Configurar depois**;
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
BARBERVISION_CRON_SECRET=gere-um-segredo-longo-e-aleatorio
BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=false
BARBERVISION_TEST_DATABASE_URL=postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres
BARBERVISION_ALLOW_REMOTE_DB_TEST=false
BARBERVISION_TEST_DATABASE_CONFIRM=127.0.0.1:54322/postgres
```

Regras:

- `SUPABASE_SECRET_KEY` é exclusiva do servidor e nunca pode receber prefixo `NEXT_PUBLIC_`;
- `BARBERVISION_CRON_SECRET` protege o worker HTTP e também é exclusivamente server-side;
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
| `/b/[barbearia]/cadastro` | Coleta nome, e-mail e WhatsApp; chama a API de clientes antes de avançar |
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
| `/barbeiro/criar-conta` | Cadastro público inicial do dono e da barbearia, com convite para confirmação e definição de senha |
| `/barbeiro/esqueci-senha` | Solicitação de recuperação |
| `/barbeiro/redefinir-senha` | Troca de senha após sessão de recuperação |
| `/barbeiro/ativar-conta` | Conclusão do convite; contrato SQL e jornada E2E local aprovados |
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
| `npm run db:test:integration` | Criar Auth/TOTP temporário e validar Data API/RLS/Storage com JWT e blob reais |
| `npm run test:e2e` | Executar a jornada Playwright de Auth, TOTP, convite, recuperação e logout contra Supabase/Mailpit locais |
| `npm run auth:recover-owner-totp -- --usuario-id UUID --confirmar-email EMAIL --confirmar-remocao-totp` | Recuperação operacional do TOTP após verificação externa da identidade do dono |
| `npm run auth:provision-owner` | Provisionamento controlado e retomável; criação, reutilização por e-mail e replay por UUID comprovados localmente |

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

- Em 22/08/2026, `npm run lint`, `npm run build`, `launcher.bat --check` e `npm run db:lint` passaram. O lint possui 0 erros e 18 warnings.
- O build de 24/08 confirmou 32 páginas, 6 Route Handlers e Proxy. Sem rede, ele pode falhar ao buscar Anton e Manrope; as fontes ainda devem ser auto-hospedadas.
- O Supabase necessário está saudável; Imgproxy, Analytics, Vector e Pooler estão intencionalmente desativados/não usados. Storage foi validado com JWT e blob real.
- As quatro suítes pgTAP passam: 59/59, 112/112, 21/21 e 13/13, totalizando 205/205.
- O runner concorrente passou no banco local explicitamente marcado: último dono, revogação/atribuição e dois workers da outbox sem duplicação.
- O Git está operacional, com baseline `7c34dab` confirmado.
- Em 25/08, um reset limpo aplicou as doze migrations e o seed atualizado. pgTAP 205/205 passou; JWT/Data API, Storage, recuperação TOTP, concorrência e rollback/roll-forward 10–9 permanecem aprovados, e a migration 11 teve rollback/roll-forward validado.
- Em 26/08, o banco hospedado foi resetado integralmente e as doze migrations foram reaplicadas. A migration de Storage tornou-se reaplicável no commit `a12a756`; `supabase db lint --linked --level warning` terminou sem erros de schema. Dono e funcionário foram recriados do zero e o lifecycle remoto completo foi aprovado.
- O smoke HTTP de contenção permanece evidência histórica de 13/08/2026, e o simulador continua sujeito a validação em aparelhos reais antes do piloto.

Veja o procedimento em [docs/OPERACAO.md](docs/OPERACAO.md).

## Documentação

- [AI context.md](AI%20context.md): contexto canônico para agentes e próximas sessões;
- [pendências.md](pend%C3%AAncias.md): backlog oficial e próximos passos;
- [docs/ESTADO-VALIDACAO.md](docs/ESTADO-VALIDACAO.md): evidências operacionais mais recentes;
- [docs/PLANO-DE-EXECUCAO.md](docs/PLANO-DE-EXECUCAO.md): sequência de nove passos;
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): fronteiras e fluxo de dados;
- [docs/AUTENTICACAO-E-SESSOES.md](docs/AUTENTICACAO-E-SESSOES.md): Auth, MFA, convites e riscos;
- [docs/OUTBOX-DE-CONVITES.md](docs/OUTBOX-DE-CONVITES.md): fila, retries, scheduler e operação do envio;
- [docs/DEPLOY-GRATUITO.md](docs/DEPLOY-GRATUITO.md): publicação no Render, Supabase e Cloudflare;
- [docs/BANCO-DE-DADOS.md](docs/BANCO-DE-DADOS.md): modelo multi-tenant e RLS;
- [supabase/README.md](supabase/README.md): operação da fundação Supabase;
- [docs/PRIVACIDADE-E-FLUXO-PERSISTIDO.md](docs/PRIVACIDADE-E-FLUXO-PERSISTIDO.md): requisitos dos passos 4 e 5;
- [docs/SIMULADOR-DE-CABELO.md](docs/SIMULADOR-DE-CABELO.md): contrato congelado do simulador;
- [docs/FECHAMENTO-FINANCEIRO.md](docs/FECHAMENTO-FINANCEIRO.md): limite gerencial e fiscal;
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): licenças e artefatos de terceiros.

## Próximos passos

1. Publicar e validar o scheduler Cloudflare da outbox, incluindo processamento recorrente, `401`, retry e logs redigidos.
2. Finalizar os modelos hospedados de convite e recuperação e testar links inválidos, reutilizados e expirados.
3. Executar a matriz remota controlada de isolamento entre dois tenants, papéis e AALs.
4. Completar os comandos administrativos ainda ausentes: reatribuição transacional, transferência de dono e seletor multi-tenant.
5. Implementar privacidade, retenção e exclusão antes de persistir selfies ou iniciar piloto com pessoas reais.

Depois desses gates, o passo 5 persiste o fluxo vertical; painel, catálogo, produtos, financeiro e operação vêm nas fases seguintes.

Não use selfies, telefones, e-mails ou dados financeiros reais antes de concluir esses gates.
