# Supabase — fundação multi-tenant e Auth parcial

Última atualização: **22/08/2026**. Evidência operacional atual: [Estado de validação](../docs/ESTADO-VALIDACAO.md).

Esta pasta é a fonte de verdade versionada do banco, Storage e configuração local de Auth do Barber Vision. O estado atual deve ser lido em três partes:

| Parte | Estado real |
| --- | --- |
| Baseline multi-tenant do passo 2 | Reset, lint, pgTAP, concorrência, JWT/RLS e Storage com blob real aprovados |
| Auth SSR/e-mail/TOTP do passo 3 | SQL 112/112, outbox 21/21 e jornada Playwright anterior aprovados |
| Convites, lifecycle, auditoria e provisionamento | Convites e lifecycle de funcionário aprovados em UX/E2E; provisionamento/hardening ainda parciais |

As telas de negócio e a jornada pública continuam usando mocks, `sessionStorage` e `localStorage`. Não use esta pasta como evidência de que o backend está ativo nem receba dados reais antes de aplicar e testar todo o conjunto.

## Inventário

```text
supabase/
├── config.toml
├── migrations/
│   ├── 20260808010000_tenant_core.sql
│   ├── 20260808011000_tenant_rls.sql
│   ├── 20260808012000_private_storage.sql
│   ├── 20260808013000_auth_assurance.sql
│   └── 20260813010000_onboarding_invites_lifecycle_audit.sql
├── rollback/
│   ├── 20260808010000_tenant_core.down.sql
│   ├── 20260808011000_tenant_rls.down.sql
│   ├── 20260808012000_private_storage.down.sql
│   ├── 20260808013000_auth_assurance.down.sql
│   └── 20260813010000_onboarding_invites_lifecycle_audit.down.sql
├── templates/
│   ├── invite.html
│   └── recovery.html
├── tests/database/
│   ├── step2_tenant_rls.test.sql
│   └── step3_auth_onboarding_lifecycle.test.sql
├── seed.sql
├── schema.sql
└── README.md
```

`schema.sql` é somente um índice histórico. Não o aplique no SQL Editor. As migrations, na ordem do nome, são a única fonte de verdade.

## Pré-requisitos e situação deste ambiente

Para o Supabase local são necessários:

- Node.js 22+;
- dependências instaladas com `npm ci`;
- Docker Desktop ou runtime compatível em execução.

O CLI está fixado como `supabase@2.115.0`. Em 23/08, `db:start` e `db:reset` encerraram com exit `0`; o reset aplicou oito migrations e `seed.sql`, e lint + pgTAP 192/192 passaram. Os rollbacks 5–4 e o roll-forward foram ensaiados historicamente; as migrations 6–8 aguardam o próximo ensaio completo 8–4. Data API/RLS por JWT e Storage com blob real passaram anteriormente. Analytics/Vector opcionais estão desativados.

Na auditoria de 23/08, os serviços necessários estão saudáveis; Imgproxy, Analytics, Vector e Pooler estão desativados/não usados. `db:lint` e pgTAP passaram 192/192. Projeto remoto vinculado continua ausente. Storage foi validado anteriormente por operação real com JWT e blob.

## Comandos locais

```powershell
npm.cmd run db:start
npm.cmd run db:reset
npm.cmd run db:test
npm.cmd run db:test:concurrency
npm.cmd run db:test:integration
npm.cmd run db:lint
npm.cmd run db:stop
```

`db:reset` recria o banco local, aplica as oito migrations e executa o seed. `db:test` roda os três arquivos em `tests/database/`. `db:test:concurrency` prova locks com conexões reais. `db:test:integration` cria identidades temporárias, faz login e TOTP/AAL2, testa Data API/RLS e Storage com blob real e exige a mesma confirmação/marcação de banco descartável. O cadastro público permanece bloqueado: o provider de e-mail fica disponível para login/convites administrados, enquanto `[auth].enable_signup = false` impede signup público. Nunca use `service_role` como prova de RLS: esse papel ignora policies.

Para um projeto remoto de teste explicitamente criado e revisado:

```powershell
npm.cmd exec supabase -- link --project-ref SEU_PROJECT_REF
npm.cmd exec supabase -- db push --dry-run
npm.cmd exec supabase -- db push
```

Antes de retirar `--dry-run`, confira o project ref, tenha backup, revise o diff e execute a matriz de testes. Não cole migrations parcialmente no SQL Editor.

## Ordem e responsabilidade das migrations

1. `tenant_core`: tipos, cinco tabelas, constraints, FKs compostas, índices e timestamps.
2. `tenant_rls`: helpers privados, grants mínimos, gatilhos e policies de dono/funcionário.
3. `private_storage`: três buckets privados, formato de path e policies owner-only para fontes/cutouts.
4. `auth_assurance`: confirmação de e-mail para conta ativa e AAL2 obrigatório para o dono em dados de negócio e Storage.
5. `onboarding_invites_lifecycle_audit`: convites, auditoria append-only, provisionamento controlado do primeiro dono, lifecycle de funcionário, locks ordenados e proveniência histórica.

Todas usam transação. A quarta migration substitui helpers usados pelas policies. A quinta depende dessa garantia de e-mail/AAL2 e cria comandos de domínio; ela não envia e-mail, não matricula fator TOTP e não implementa transferência de dono.

## Modelo de identidade e autorização

- `perfis` guarda dados globais mínimos e referencia `auth.users` pela PK;
- `membros_barbearia` é a fonte de papel/status por tenant;
- uma conta pode ser dona em uma barbearia e funcionária em outra;
- `user_metadata` e `app_metadata` não autorizam acesso;
- uma identidade Auth anônima é rejeitada mesmo usando o papel PostgreSQL `authenticated`;
- acesso de negócio exige e-mail confirmado, perfil ativo, membership ativa e barbearia ativa;
- dono exige claim `aal2`; claim ausente é tratada como `aal1`;
- funcionário pode ler seu escopo atribuído em AAL1;
- o próprio perfil e a própria membership permanecem legíveis em AAL1 para permitir o bootstrap do MFA sem expor dados da barbearia;
- membership não possui mutation direta pelo cliente web;
- a quinta migration também revoga mutation direta de `membros_barbearia` por `service_role`;
- `UPDATE(usuario_id)` direto de `atribuicoes_cliente` é revogado de `authenticated` e `service_role`; reatribuição precisa de uma futura RPC estreita;
- mutations de membership adquirem lock do tenant antes da alteração;
- gatilhos impedem remover/rebaixar o último dono ativo e desativar/excluir um perfil que ainda seja dono ativo.

Campos de proveniência (`barbearias.criado_por`, `clientes.criado_por`, `membros_barbearia.convidado_por`, `atribuicoes_cliente.atribuido_por` e atores/alvos de convites/auditoria) preservam UUIDs históricos sem FK destrutiva para `auth.users`. Já `perfis.usuario_id` e `membros_barbearia.usuario_id` continuam sendo identidades autoritativas com FK.

Helpers relevantes:

```text
private.usuario_auth_permanente()
private.usuario_email_confirmado()
private.usuario_tem_aal2()
private.usuario_conta_ativa()
private.usuario_eh_membro(uuid)
private.usuario_eh_dono(uuid)
private.usuario_pode_gerenciar_tenant(uuid)
private.usuario_pode_ver_perfil(uuid)
private.usuario_pode_ver_cliente(uuid, uuid)
private.storage_path_valido(text)
private.usuario_eh_dono_do_storage_path(text)
```

Funções `SECURITY DEFINER` usam nomes qualificados e `search_path = ''`; execução é revogada de `PUBLIC` e concedida somente onde necessário.

## Matriz RLS pretendida pelo SQL atual

| Recurso | Dono ativo + AAL2 | Funcionário ativo + AAL1/AAL2 | Dono AAL1, suspenso, outsider ou anônimo |
| --- | --- | --- | --- |
| Barbearia | Lê a própria; altera nome/slug/logo | Lê a própria | Sem acesso de negócio |
| Perfil | Próprio + equipe ativa | Somente o próprio | Identidade permanente: somente o próprio |
| Membership | Equipe do tenant | Somente a própria | Identidade permanente: somente a própria |
| Cliente | CRUD no tenant | Lê cliente atribuído | Sem acesso |
| Atribuição | Lê, cria e remove no tenant; reatribuição direta bloqueada | Lê a própria | Sem acesso |
| Convite | Lê e comanda no próprio tenant | Sem acesso direto | Sem acesso |
| Auditoria de domínio | Lê eventos do próprio tenant | Sem acesso | Sem acesso |
| Fontes/cutouts no Storage | CRUD no path do tenant | Sem acesso direto | Sem acesso |
| Selfies no Storage | Sem policy | Sem policy | Sem acesso |

Todas as tabelas de negócio têm `barbearia_id NOT NULL`. As FKs compostas impedem atribuir cliente de um tenant a membro de outro, mesmo se uma policy for alterada incorretamente.

## Auth no runtime e configuração local

`supabase/config.toml` define para o ambiente local:

- cadastro público desativado;
- confirmação de e-mail habilitada;
- confirmação dupla de troca de e-mail;
- troca segura de senha;
- frequência máxima de e-mail de um minuto;
- matrícula e verificação TOTP habilitadas;
- templates locais de convite e recovery.

O aplicativo possui clientes separados para browser, Server Components, Proxy e administração. O Proxy usa cookies SSR e `getClaims()`; os layouts resolvem perfil/membership/tenant. No modo real, dono AAL1 é encaminhado ao TOTP sem ler a barbearia protegida.

Variáveis esperadas estão em `.env.example`:

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

As duas variáveis públicas ativam juntas o modo Supabase. `SUPABASE_SECRET_KEY` é server-only; nunca a exponha ao navegador. As três variáveis `BARBERVISION_*DATABASE*` são exclusivas do runner concorrente e devem identificar/confirmar um banco descartável; não fazem parte do runtime da aplicação. A configuração local não altera automaticamente o projeto hospedado: URLs permitidas, SMTP, templates, rate limits e MFA devem ser confirmados no ambiente alvo.

## Contratos do passo 3 versionados

A migration `20260813010000_onboarding_invites_lifecycle_audit.sql` define três enums, duas tabelas, 16 funções — nove delas RPCs no schema `public` —, duas policies e cinco triggers:

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

O contrato separa autoridade:

- dono autenticado em AAL2 cria/revoga convites e suspende, reativa ou revoga somente funcionários do próprio tenant;
- identidade autenticada, permanente, com e-mail confirmado e igual ao convite pode aceitá-lo;
- `service_role` pode apenas marcar envio/falha e provisionar o primeiro dono pelas RPCs próprias;
- leitura de convites e auditoria usa RLS de dono AAL2; não há DML direto dessas tabelas para `authenticated`;
- cada transição efetiva coberta grava o evento na mesma transação; replay/no-op idempotente não duplica evento;
- evento de origem `usuario` exige ator histórico; evento de `sistema` pode ter ator nulo;
- metadados recusam chaves explícitas de senha, token, OTP/TOTP, link, selfie, imagem ou e-mail bruto no primeiro nível do JSON; validação recursiva continua pendente antes de aceitar payload arbitrário;
- convite aberto é único por tenant/e-mail e possui estado, expiração, autoria histórica, timestamps e versão.

A fundação foi reaplicada por `db:reset`, passou lint e seu pgTAP dedicado 112/112. Concorrência, Data API/RLS, Storage e a jornada Auth/lifecycle foram executadas localmente. `/barbeiro/equipe` confirma estados autoritativos. `npm run auth:provision-owner` foi exercitado com criação, reutilização por e-mail e retomada por UUID, sempre sobre o mesmo tenant.

O provisionamento continua sem transação distribuída entre Auth e Postgres, mas preflight e retomada fecham o caso “Auth criado/RPC falhou” sem duplicar identidades. A outbox torna criação/enqueue atômicos e implementa lease, retry, conclusão idempotente e reconciliação de vencidos; dois workers reais passaram sem duplicação. Ainda faltam scheduler hospedado, transferência de dono, RPC de reatribuição e seletor de tenant.

## Storage

Buckets privados definidos:

- `barbervision-hair-sources`: JPEG/PNG/WebP, até 15 MiB;
- `barbervision-hair-cutouts`: PNG/WebP, até 2 MiB;
- `barbervision-selfies`: JPEG/PNG/WebP, até 15 MiB.

Formato obrigatório:

```text
<barbearia_uuid>/<namespace_uuid>/<arquivo>
```

O path tem exatamente dois diretórios UUID, rejeita `..` e usa o primeiro segmento como tenant. O segundo UUID evita colisões, mas ainda não é validado contra uma entidade de template/selfie. `owner_id` do objeto não autoriza tenant.

Somente fontes e cutouts têm policies, exclusivas do dono AAL2. Selfies permanecem sem policy até o passo 4 definir base legal/consentimento, finalidade, retenção, expiração, exclusão e resposta a direitos. Limite de bucket não substitui validação de magic bytes, dimensões, EXIF/GPS, conteúdo, licença ou quarentena.

O HTTP 502 observado em 14/08 foi um incidente histórico de inicialização. Em 22/08, Auth, Storage e Studio responderam HTTP 200, e upload/download/remove com JWT AAL2 e cenários negados foram comprovados pelo harness de integração.

## Seed e testes

`seed.sql` cria fixtures fictícias com e-mails `.invalid`: dois tenants, donos diferentes, funcionário ativo, membro suspenso, clientes e atribuição. As identidades não são uma preparação de contas reais para login com senha.

`tests/database/step2_tenant_rls.test.sql` passou 59/59. `step3_auth_onboarding_lifecycle.test.sql` passou 112/112 e `step3_invite_email_outbox.test.sql` passou 21/21. Total aprovado: 192/192.

Limites da suíte:

- as três suítes passaram integralmente; preservar a cobertura nas próximas mudanças;
- a contagem conferida em fonte é `plan(59)` + `plan(109)`;
- TOTP, callbacks, outbox e concorrência real não cabem no pgTAP;
- não usa JWTs reais na Data API nem prova upload/download de blob no endpoint de Storage.

`scripts/test-db-concurrency.mjs` cobre, com conexões reais, duas revogações concorrentes de donos e a corrida entre nova atribuição e revogação de funcionário. Em 22/08, ambas passaram no banco local marcado como descartável; os fixtures foram removidos ao final.

## Rollback

Há oito rollbacks manuais. O ensaio 8–4 passou em 23/08: cinco versões foram removidas do histórico após os downs, reaplicadas pelo CLI e validadas com lint, pgTAP 192/192 e concorrência. Os scripts usam transação/locks e não usam `CASCADE`.

Os down scripts não atualizam automaticamente `supabase_migrations.schema_migrations`. O procedimento aprovado está no [Runbook de rollback do banco](../docs/ROLLBACK-BANCO.md): reverter 5–4, remover somente essas duas versões do histórico e usar `supabase migration up --local`. O ensaio de 22/08 restaurou as cinco entradas e passou novamente lint, 168 asserções e concorrência. Em ambiente persistente, ainda é obrigatório validar o alvo, exportar dados, documentar a janela e testar a restauração.

## Próxima ordem segura

1. operacionalizar a outbox com scheduler, segredo, alertas e E2E atualizado;
2. definir reatribuição estreita, transferência de dono e seleção multi-tenant;
4. integrar lint, SQL, integração e E2E à CI;
5. implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

Depois desses gates, persistir o fluxo vertical do passo 5 e somente então substituir mocks e migrar painel, catálogo, produtos, financeiro e operação.

Até lá, os passos 2 e 3 não devem ser marcados como concluídos e nenhum dado real deve entrar no projeto.
