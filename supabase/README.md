# Supabase — fundação multi-tenant e Auth parcial

Última atualização: **21/08/2026**.

Esta pasta é a fonte de verdade versionada do banco, Storage e configuração local de Auth do Barber Vision. O estado atual deve ser lido em três partes:

| Parte | Estado real |
| --- | --- |
| Baseline multi-tenant do passo 2 | Cinco migrations + seed aplicados somente num bootstrap transitório; reset e validação operacional pendentes |
| Auth SSR/e-mail/TOTP do passo 3 | Código e reforço SQL parciais; sem teste de ponta a ponta |
| Convites, lifecycle, auditoria e provisionamento | Contratos e rollback versionados; bootstrap do schema observado, mas cobertura funcional, pgTAP, concorrência e Auth real pendentes |

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

O CLI está fixado como `supabase@2.112.0`. Em 14/08, um `db:start` executado na sessão Windows de `leoto` inicializou o banco, aplicou as cinco migrations e `seed.sql` e chegou a **Starting containers**. Em seguida o endpoint de Storage respondeu HTTP 502, a pilha encerrou e as portas fecharam. Essa passagem prova apenas um bootstrap transitório; não prova estado durável nem `db:reset`, lint, 168 pgTAPs, Data API/Storage com JWT, concorrência ou rollback.

Na auditoria de 21/08, Docker Desktop/Supabase estão inativos: o serviço Docker está parado, não há listeners em `54320–54324` e `supabase status` falha. Projeto remoto vinculado continua ausente. Antes daquele bootstrap, `db:lint` e `db:test` terminaram em `ECONNREFUSED 127.0.0.1:54322`; essas tentativas não constituem lint ou pgTAP executado. O HTTP 502 deve ser diagnosticado como saúde/infraestrutura sem causa conhecida, não atribuído a RLS sem evidência.

## Comandos locais

```powershell
npm.cmd run db:start
npm.cmd run db:reset
npm.cmd run db:test
npm.cmd run db:test:concurrency
npm.cmd run db:lint
npm.cmd run db:stop
```

`db:reset` recria o banco local, aplica as cinco migrations e executa o seed. `db:test` roda os dois arquivos em `tests/database/`. `db:test:concurrency` usa duas sessões concorrentes e uma terceira conexão observadora/administrativa via `pg@8.23.0`, exige confirmação exata de `host:porta/database` e o comentário `barbervision:disposable-concurrency-test` no próprio banco. Nunca use `service_role` como prova de RLS: esse papel ignora policies.

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

A migration passou apenas pelo bootstrap transitório de 14/08; não foi validada por `db:reset`, lint, pgTAP, concorrência, Data API ou jornada Auth. Rollback, 109 asserções dedicadas e runner concorrente estão presentes em fonte, não executados. Portanto `/barbeiro/equipe`, callbacks e `npm run auth:provision-owner` continuam não validados no modo real. A UI ainda não chama as RPCs de suspender, reativar e revogar nem lista memberships encerradas. A action também anuncia “Convite revogado” mesmo quando a RPC pode materializar o estado `expirado`.

Três riscos P1 permanecem abertos. As actions de convite ignoram o resultado das compensações de revogação/marcação de falha e podem anunciar neutralização sem confirmação do banco. O primeiro provisionamento cria/convida a identidade Auth antes da RPC e não tem atomicidade distribuída, preflight, retomada segura por UUID, compensação ou reconciliação; pode deixar identidade órfã ou tenant/membership de dono ativo antes de a conta estar operacional. O callback de confirmação aceita a membership antes de a senha ser definida, permitindo que o portador do link já tenha sessão e membership ativa. Também faltam outbox/retry, reconciliação automática de convites vencidos, transferência de dono, RPC de reatribuição, recuperação de TOTP, seletor de tenant e a orquestração completa quando o usuário Auth já existe.

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

O HTTP 502 observado em 14/08 é uma falha de saúde/infraestrutura do serviço ainda sem causa determinada. Não é evidência de negação RLS e não valida upload/download: isso exige a stack saudável, JWTs reais e cenários permitidos/negados controlados.

## Seed e testes

`seed.sql` cria fixtures fictícias com e-mails `.invalid`: dois tenants, donos diferentes, funcionário ativo, membro suspenso, clientes e atribuição. As identidades não são uma preparação de contas reais para login com senha.

`tests/database/step2_tenant_rls.test.sql` declara 59 asserções dentro de `BEGIN ... ROLLBACK`, cobrindo estrutura, grants, isolamento de tenant, funcionário atribuído, estados inativos, metadata forjada, FKs, último dono, constraints e paths do Storage. `step3_auth_onboarding_lifecycle.test.sql` acrescenta 109 asserções para ACLs, AAL1/AAL2, confirmação de e-mail, convites, lifecycle, replay e auditoria append-only. Nenhuma das 168 asserções foi executada.

Limites da suíte:

- a execução das suítes ainda não ocorreu;
- as duas suítes transacionais estão versionadas/declaradas, mas não executadas; a contagem conferida em fonte é `plan(59)` + `plan(109)`;
- TOTP, callbacks, outbox e concorrência real não cabem no pgTAP;
- não usa JWTs reais na Data API nem prova upload/download de blob no endpoint de Storage.

`scripts/test-db-concurrency.mjs` cobre, com conexões reais, duas revogações concorrentes de donos e a corrida entre nova atribuição e revogação de funcionário. O runner passou em `node --check` e nas guardas de destino; a tentativa local confirmada terminou em `ECONNREFUSED` porque a porta `54322` não possui PostgreSQL ativo.

## Rollback

Há cinco rollbacks manuais. Os dois novos down scripts devem rodar primeiro, na ordem inversa: onboarding/lifecycle/auditoria e depois auth assurance; só então vêm Storage, RLS e core. Eles fazem preflight, usam transação/locks, não usam `CASCADE` e recusam perda silenciosa de convites, auditoria ou proveniência incompatível.

Os down scripts não atualizam automaticamente `supabase_migrations.schema_migrations`. Ensaiar rollback exige uma estratégia explícita para o histórico e o roll-forward. O projeto ainda não possui um runbook reproduzível com comandos aprovados para essa reconciliação; escrevê-lo e validá-lo em clone descartável é gate anterior ao ensaio. Em ambiente persistente, valide o alvo, exporte dados, documente a janela e teste a restauração. Depois do roll-forward, repita lint, as 168 asserções e o runner concorrente para provar que o estado restaurado equivale à baseline.

## Próxima ordem segura

1. estabilizar a stack local: abrir o Docker Desktop na sessão Windows, confirmar WSL 2/engine, reproduzir o HTTP 502 e capturar `status`/logs de Storage, gateway e banco antes de prosseguir; não atribuir o erro a RLS sem evidência;
2. instalar/habilitar o Git e criar uma baseline recuperável antes de novas mutações, excluindo secrets e `.next`;
3. aplicar/recriar o banco e executar `db:reset`, `db:lint` e os 168 testes pgTAP;
4. depois do `db:reset`, marcar e confirmar o banco descartável, executar `db:test:concurrency` e guardar a evidência;
5. escrever o runbook de rollback/roll-forward e `supabase_migrations`, ensaiar os rollbacks 4–5 e o roll-forward e então repetir `db:lint`, os 168 pgTAPs e o runner concorrente;
6. criar `.env.local` no ambiente controlado e preparar fixtures/identidades Auth reais para dono AAL1/AAL2, funcionário e cenário cross-tenant;
7. criar o harness de integração e validar Data API e Storage com JWTs reais e cenários adversários;
8. selecionar/configurar o framework E2E, criar a suíte e então executar Auth, e-mail, convite, MFA e lifecycle;
9. fechar gaps operacionais: outbox/retry, usuário Auth existente, expiração reconciliada, UX do lifecycle, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant;
10. implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

Depois desses gates, persistir o fluxo vertical do passo 5 e somente então substituir mocks e migrar painel, catálogo, produtos, financeiro e operação.

Até lá, os passos 2 e 3 não devem ser marcados como concluídos e nenhum dado real deve entrar no projeto.
