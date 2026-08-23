# Estado de validação

> Baseline operacional reconciliada em **23/08/2026**. Este documento concentra evidências temporais. Os documentos de arquitetura e produto descrevem contratos; em caso de divergência sobre o que foi executado, prevalece este registro mais recente.

## Resumo executivo

- O repositório Git está operacional e possui o commit baseline `7c34dab` (`chore: cria baseline inicial do Barber Vision`). A árvore estava limpa antes desta revisão documental.
- O projeto possui oito migrations, oito rollbacks e três suítes pgTAP com 192 asserções. A contagem de páginas/handlers da build anterior é histórica e será atualizada no próximo build.
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

| Passo | Estado em 22/08/2026 | Próximo gate |
| ---: | --- | --- |
| 1 | Concluído para demo controlada | preservar contenção e corrigir warnings sem regressão |
| 2 | Validado localmente | preservar os gates e integrá-los à CI |
| 3 | Jornada principal aprovada localmente; gaps operacionais abertos | completar lifecycle de funcionário e hardening de falhas/recuperação |
| 4 | Não iniciado como implementação de produção | fechar política de consentimento, retenção e descarte |
| 5 | Não iniciado | persistir um fluxo público mínimo e seguro |
| 6 | Não iniciado | substituir mocks após o fluxo vertical |
| 7 | Não iniciado | catálogo/Storage/produtos reais |
| 8 | Não iniciado | livro gerencial persistente e auditável |
| 9 | Não iniciado | CI/CD, observabilidade, backup, segurança e piloto |

## Próxima sequência segura

1. Configurar scheduler, segredo e alertas da outbox no ambiente hospedado.
2. Completar reatribuição, transferência de dono e seleção multi-tenant.
3. Implementar privacidade e só então o fluxo persistido.
