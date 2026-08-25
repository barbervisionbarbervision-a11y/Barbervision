# Estado de validação

> Baseline operacional reconciliada em **24/08/2026**. Este documento concentra evidências temporais. Os documentos de arquitetura e produto descrevem contratos; em caso de divergência sobre o que foi executado, prevalece este registro mais recente.

## Resumo executivo

- O repositório Git está operacional e possui o commit baseline `7c34dab` (`chore: cria baseline inicial do Barber Vision`). A árvore estava limpa antes desta revisão documental.
- O projeto possui dez migrations, dez rollbacks e três suítes pgTAP com 192 asserções históricas. As migrations 9 e 10 foram aplicadas no remoto, mas ainda não possuem pgTAP próprio.
- O build de produção e o launcher passam.
- O lint JavaScript passa com zero erros e 18 warnings.
- O Supabase local necessário responde: PostgreSQL, API, Studio, Auth, Storage, Realtime, Mailpit e Edge Runtime estão ativos. Imgproxy, Analytics, Vector e Pooler estão desativados/não usados.
- O lint do schema PostgreSQL passa sem erros.
- As suítes pgTAP do passo 3 passam com 112 + 21 asserções.
- A suíte pgTAP do passo 2 passa com 59/59 asserções após a correção do harness.
- O runner concorrente foi executado no banco local marcado como descartável: as duas corridas passaram e os fixtures foram removidos.
- Com CLI 2.115.0, `db:start` e `db:reset` encerraram com exit `0`. Oito migrations, seed, lint e pgTAP 192/192 foram confirmados.
- O rollback manual das migrations 5 e 4, a reconciliação do histórico e o roll-forward pelo CLI foram ensaiados com sucesso. As migrations/rollbacks 6–8 foram aplicadas por reset e testadas, mas ainda não entraram em um ensaio completo 8–4.
- O harness JWT criou identidades Auth descartáveis, elevou um dono por TOTP a AAL2 e validou Data API/RLS e Storage com blob real. Também confirmou refresh válido, rejeição de access token expirado, logout global invalidando refresh token de outra sessão e recuperação operacional que remove o fator TOTP. A limpeza terminou sem fixtures temporários.
- A suíte Playwright criou fixtures efêmeras e comprovou login do dono, bootstrap AAL1, enrollment/verify TOTP, AAL2, convite por Admin API, entrega no Mailpit, ativação do funcionário, recuperação de senha, revogação de convite e logout. A suíte passou em 29,9 s e removeu os fixtures ao final.
- Durante o E2E foram corrigidos o efeito MFA incompatível com o replay do React Strict Mode, o QR `data:image/svg+xml` bloqueado pelo `next/image` e o redirecionamento do callback para usar a origem canônica validada da aplicação.
- Em 23/08, a outbox de convites foi validada por reset, lint SQL e 21 asserções próprias. O E2E foi atualizado, mas não reexecutado porque a instância `next dev` aberta pelo usuário mantém o lock de `.next` e impede o webServer isolado do Playwright.
- O GitHub privado acompanha `main`; o Supabase hospedado foi vinculado e recebeu dez migrations.
- A entrega hospedada de convite pelo Brevo foi comprovada. O callback de convite foi corrigido para a origem canônica do Render.
- Em 24/08, TOTP passou a ser opcional: o dono pode configurar depois, sem perder o acesso ao painel. E-mail confirmado e isolamento por tenant permanecem obrigatórios.
- O Render está publicado em `https://barbervision.onrender.com`; o health check público respondeu HTTP 200. O conteúdo público do commit `ab97b14` foi conferido na tela de login, que já informa que o autenticador é opcional.
- Site URL e redirects de produção foram configurados no Supabase; signup direto permanece desabilitado, confirmação de e-mail habilitada e SMTP Brevo configurado. A entrega real de convite foi comprovada.
- O cadastro público recebeu campo de e-mail, correção do parâmetro assíncrono do Next.js 16 e `POST /api/clientes`. O reteste no tenant real `barbervision` retornou `201`; uma segunda chamada com o mesmo WhatsApp retornou o mesmo UUID, comprovando o upsert. O slug mock `barbearia-joao` retorna corretamente `404` porque não existe no remoto.
- Uma secret key Supabase apareceu em captura durante esse formulário. O usuário confirmou sua revogação e substituição em 24/08; nenhum valor foi reproduzido neste repositório.

## Evidências de 24/08/2026

| Verificação | Resultado | Interpretação |
| --- | --- | --- |
| `git push -u origin main` | branch `main` criada no GitHub privado | fonte remota disponível ao Render |
| `npx.cmd supabase projects list` | projeto `barbervision`, `sa-east-1`, `ACTIVE_HEALTHY` | conta e projeto hospedado confirmados |
| `npx.cmd supabase link --project-ref ftwdfobgwxjmeickktmy` | `Finished supabase link` | pasta local vinculada ao remoto |
| `npx.cmd supabase db push --dry-run` antes do envio | listou as oito migrations oficiais | escopo conferido antes da mutação |
| `npx.cmd supabase db push` | oito migrations aplicadas sem erro | schema remoto criado |
| `npx.cmd supabase db push --dry-run` após o envio | `Remote database is up to date` | histórico local/remoto sincronizado |
| Render Blueprint | repositório conectado; formulário de cinco variáveis aberto | deploy ainda não comprovado |
| Revisão de segurança | secret key visível em captura | revogação/rotação é gate P0 |
| Rotação da secret key | revogação e substituição confirmadas pelo usuário | incidente encerrado no escopo disponível; novo valor não registrado |
| Primeiro deploy Render | falhou no `next build`: `Cannot find module 'tailwindcss'` | `NODE_ENV=production` fez o `npm ci` omitir ferramentas de build; Blueprint corrigido para `npm ci --include=dev` |
| Segundo deploy Render, commit `fbed47b` | `Build successful`, `Your service is live` | aplicação publicada na URL primária |
| `GET https://barbervision.onrender.com/api/health` | HTTP 200; `ok: true` | processo Next remoto saudável |
| Build dos commits `3125aef`, `681c2a7` e `9ec8bd6` | aprovado; 31 páginas, 5 handlers e Proxy | rota dinâmica corrigida, API de clientes publicada e diagnóstico ampliado |
| `npx.cmd supabase db push` da migration `20260824010000_clientes_email.sql` | aplicada sem erro | remoto passou a aceitar e-mail normalizado em clientes |
| `npx.cmd supabase db push --dry-run` após a migration 10 | `Remote database is up to date`; nenhuma migration pendente | as dez migrations locais e remotas estão sincronizadas |
| Cadastro público hospedado no slug `barbervision` | duas respostas `201`; UUID idêntico na criação e atualização | persistência e deduplicação por tenant/WhatsApp comprovadas com dado sintético |
| Supabase Auth hospedado | Site URL, redirects, signup direto bloqueado, confirmação e SMTP Brevo configurados | entrega de convite comprovada; recuperação e templates finais ainda pendentes |
| Cadastro do primeiro dono | botão `Começar agora`, página/API, criação de tenant e convite exercitados no hospedado | fluxo chegou à ativação e à escolha de MFA |
| Callback público | falha inicial em `0.0.0.0:10000`; depois corrigido para `/auth/complete` e allowlist atualizada | origem interna eliminada do fluxo versionado |
| `npm.cmd run lint` e `npm.cmd run build` após MFA opcional | exit `0`; lint com 18 warnings e build com 31 páginas | alteração compila; warnings preexistentes permanecem |
| `GET /barbeiro/login` após deploy `ab97b14` | conteúdo público contém a regra de autenticador opcional | deploy da alteração confirmado no Render |

## Evidências de 23/08/2026

| Verificação | Resultado | Interpretação |
| --- | --- | --- |
| `npm.cmd run db:reset` | exit `0`; oito migrations + seed | outbox recriada do zero |
| `npm.cmd run db:lint` | exit `0`; sem erros | schema atualizado válido |
| `npm.cmd run db:test` | exit `0`; 192/192 | fila, ACL, retry, idempotência e expiração aprovados |
| `npm.cmd run lint` | exit `0`; 0 erros, 18 warnings | código Next/worker passa o gate estático |
| `node --check` no worker e rota | exit `0` | sintaxe dos módulos server-only válida |
| `npm.cmd run test:e2e` atualizado | exit `0`; 1/1 em 4,0 min | Auth, TOTP, convite/outbox, recuperação, lifecycle, falha e expiração aprovados |

## Evidências de 22/08/2026

| Verificação | Resultado | Interpretação |
| --- | --- | --- |
| `git status --short` | limpo antes da revisão | baseline recuperável existente |
| `git log -1` | `7c34dab` | commit inicial do projeto confirmado |
| `launcher.bat --check` | exit `0` | Node e dependências encontrados |
| `npm.cmd run lint` | exit `0`; 0 erros, 18 warnings | gate passa, dívida React Hooks permanece |
| `npm.cmd run build` | exit `0`; 31 rotas de página, 2 handlers e Proxy | build passa quando há acesso ao Google Fonts |
| `npx.cmd supabase status` | serviços necessários ativos; opcionais desativados | stack local saudável; não equivale a autorização Storage validada |
| `npm.cmd run db:lint` | exit `0`; `No schema errors found` | lint SQL concluído |
| `npm.cmd run db:reset` com CLI 2.115.0 | exit `0` | reconstrução limpa comprovada |
| `npm.cmd run db:test` pós-reset | exit `0`; 192/192 | três suítes passam integralmente sobre o banco reconstruído |
| `npm.cmd run db:test:concurrency` | exit `0` | último dono serializado; atribuição/revogação terminou revogada, sem atribuições e com um evento |
| `npm.cmd run db:test:integration` com chaves locais efêmeras | exit `0` | Auth/TOTP, refresh, expiração, logout global, recuperação TOTP, JWT/RLS e Storage real aprovados |
| `npm.cmd run test:e2e` | exit `0`; 1/1 em 29,9 s | jornada principal Auth/e-mail/TOTP/equipe aprovada com Playwright, Supabase e Mailpit locais |
| `npm.cmd run test:e2e` após lifecycle | exit `0`; 1/1 em 39,4 s | suspensão corta a sessão existente, reativação restaura e revogação encerra o acesso |

## Correção do pgTAP do passo 2

`supabase/tests/database/step2_tenant_rls.test.sql` usava três CTEs com operação de escrita dentro de expressões que não estavam no nível superior. O PostgreSQL retornava:

```text
WITH clause containing a data-modifying statement must be at the top level
```

A correção substituiu os três padrões por blocos que executam o `UPDATE`, capturam `ROW_COUNT` e validam explicitamente a quantidade alterada. Resultado atual: passo 2 com 59/59, onboarding/lifecycle com 112/112 e outbox com 21/21, total 192/192.

## Limites do build

O primeiro build em ambiente sem rede falhou somente ao buscar Anton e Manrope no Google Fonts. Com acesso à rede, o mesmo build passou. O projeto ainda deve auto-hospedar as fontes para obter build offline e reproduzível.

## Estado oficial dos passos

| Passo | Estado em 24/08/2026 | Próximo gate |
| ---: | --- | --- |
| 1 | Concluído para demo controlada | preservar contenção e corrigir warnings sem regressão |
| 2 | Oito migrations validadas localmente; nove sincronizadas no hospedado | atualizar o seed e repetir todos os gates sobre a migration 9; depois integrar à CI |
| 3 | Jornada local aprovada; redirects/SMTP e cadastro web do primeiro dono implementados | validar cadastro/e-mail hospedados, reforçar antiabuso e concluir Cloudflare/matriz remota |
| 4 | Não iniciado como implementação de produção | fechar política de consentimento, retenção e descarte |
| 5 | Não iniciado | persistir um fluxo público mínimo e seguro |
| 6 | Não iniciado | substituir mocks após o fluxo vertical |
| 7 | Não iniciado | catálogo/Storage/produtos reais |
| 8 | Não iniciado | livro gerencial persistente e auditável |
| 9 | Não iniciado | CI/CD, observabilidade, backup, segurança e piloto |

## Próxima sequência segura

1. Corrigir e retestar `POST /api/clientes`, incluindo URL Supabase, secret server-only e existência do tenant do slug.
2. Validar `/barbeiro/criar-conta` no hospedado e reforçar o antiabuso antes do piloto, sem abrir signup irrestrito de funcionários.
3. Provar SMTP/templates hospedados com convite, confirmação e recuperação.
4. Publicar/testar o scheduler Cloudflare e executar a matriz remota controlada.
5. Implementar privacidade e só então ampliar o fluxo persistido.
