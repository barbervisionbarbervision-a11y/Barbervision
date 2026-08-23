# Autenticação e sessões

> Estado reconciliado em **22/08/2026**: Auth, lifecycle e provisionamento retomável do primeiro dono aprovados localmente; hardening operacional permanece parcial. O pgTAP do passo 3 passa 112/112. Evidência: [Estado de validação](ESTADO-VALIDACAO.md).

## Objetivo

Autenticar donos e funcionários por e-mail/senha, confirmar a identidade por e-mail, exigir TOTP do dono e derivar tenant/papel exclusivamente do banco sob RLS.

## Princípios

- Identidade server-side é validada por `auth.getClaims()`.
- Cookie de sessão não é autorização de negócio por si só.
- Papel e tenant vêm de `membros_barbearia` e estado atual no banco.
- Metadata de usuário, `sessionStorage`, query string e payload do cliente não autorizam papel.
- Dono acessa dados de negócio somente em AAL2.
- Funcionário ativo pode trabalhar em AAL1, limitado às atribuições.
- A conta precisa ter e-mail confirmado e perfil ativo.
- `/admin` não compartilha a autoridade do dono da barbearia.
- Secret/service role nunca chega ao navegador.

## Modos de execução

### Demo sem Supabase

Em desenvolvimento, o login escolhe um usuário fictício e grava uma sessão em `sessionStorage`. Esse modo existe apenas para demonstração e não resiste a adulteração.

Em produção, a superfície interna fica bloqueada por padrão. A flag `BARBERVISION_ENABLE_UNSAFE_INTERNAL_DEMO=true` só libera a demonstração de `/barbeiro/*` para uma apresentação isolada, nunca `/admin`, e não cria autenticação.

### Supabase configurado

Quando URL e publishable key válidas estão presentes:

1. `proxy.js` atualiza os cookies SSR.
2. `auth.getClaims()` determina se existe identidade válida.
3. Rotas privadas sem identidade vão para `/barbeiro/login`.
4. O layout do painel chama `exigirSessaoBarbearia()`.
5. Perfil e memberships ativas são lidos sob RLS.
6. A membership ativa mais antiga é escolhida provisoriamente.
7. Dono em AAL1 recebe somente contexto mínimo e vai para `/barbeiro/mfa`.
8. Dono AAL2 ou funcionário autorizado entra no painel.
9. Layouts de área e Server Actions repetem autorização de dono quando necessário.

## Arquivos

### Infraestrutura

- `proxy.js`;
- `lib/supabase/config.js`;
- `lib/supabase/client.js`;
- `lib/supabase/server.js`;
- `lib/supabase/admin.js`;
- `lib/supabase/proxy.js`;
- `lib/auth/context.js`;
- `lib/auth/site-url.js`;
- `lib/barbeiroSession.js`.

### Interface e handlers

- `app/barbeiro/login/page.js`;
- `app/barbeiro/esqueci-senha/page.js`;
- `app/barbeiro/redefinir-senha/page.js`;
- `app/barbeiro/ativar-conta/page.js`;
- `app/barbeiro/mfa/page.js`;
- `app/barbeiro/sem-acesso/page.js`;
- `app/barbeiro/(painel)/seguranca/page.js`;
- `app/barbeiro/(painel)/equipe/*`;
- `app/auth/callback/route.js`;
- `app/auth/confirm/route.js`;
- `components/auth/*`;
- `supabase/templates/invite.html`;
- `supabase/templates/recovery.html`.

## Rotas públicas e privadas

Com Auth configurado:

- públicas: `/barbeiro/login`, `/barbeiro/esqueci-senha`, `/auth/*`;
- autenticadas: redefinição, ativação, MFA, sem acesso e painel, conforme o estado da sessão;
- exclusivas do dono: equipe, funil, promoções, financeiro, comissões, fidelidade, catálogo e produtos;
- bloqueada: `/admin`.

Ocultar link no Sidebar não substitui layout server-side, RLS nem autorização dentro da mutation.

## Bootstrap do MFA do dono

A migration `20260808013000_auth_assurance.sql` impede o dono AAL1 de ler dados de negócio. Portanto, o contexto não pode exigir leitura da barbearia antes de descobrir que o usuário é dono.

O código atual segue esta sequência:

```text
claims → próprio perfil → próprias memberships
  ├─ dono AAL1: montar sessão mínima, motivo=mfa_pendente
  └─ funcionário ou dono AAL2: consultar tenant ativo e montar sessão completa
```

Essa correção está versionada, porém ainda precisa ser provada contra policies reais. O teste deve demonstrar simultaneamente:

- dono AAL1 consegue abrir a tela MFA;
- dono AAL1 não lê barbearia/clientes/perfis alheios/Storage;
- depois do challenge TOTP, novo JWT AAL2 libera o próprio tenant;
- claim `aal` ausente permanece negada como AAL1.

## Confirmação e recuperação por e-mail

O projeto possui callback de código PKCE e confirmação por token hash. A configuração local desabilita signup público e habilita confirmação de e-mail, troca segura de senha e TOTP.

O login e o callback sanitizam `next`: aceitam somente paths locais iniciados por `/barbeiro/` e rejeitam destinos protocol-relative. O formulário de recuperação sempre mostra resposta neutra sobre a existência da conta. Esses controles estão presentes em código, mas ainda precisam de testes de browser, casos codificados/malformados e análise de tempo/resposta nos demais fluxos.

Isso não configura automaticamente o projeto hospedado. Antes do uso real:

- definir Site URL e redirects exatos;
- usar HTTPS;
- configurar SMTP e remetente;
- publicar templates;
- testar expiração, replay e erro;
- estender e testar a neutralização de enumeração em login, convite e confirmação;
- aplicar rate limits e, se necessário, CAPTCHA.

## TOTP

O TOTP é gerenciado pelas APIs do Supabase Auth. O segredo não deve ser salvo em tabela de aplicação nem lido diretamente de `auth.mfa_factors`.

Quando o dono perde o autenticador, não existe remoção self-service do último fator. Um operador privilegiado deve verificar a identidade fora do sistema e executar `npm run auth:recover-owner-totp -- --usuario-id UUID --confirmar-email EMAIL --confirmar-remocao-totp`. O comando confirma que UUID/e-mail correspondem, exige membership ativa de dono e remove fatores pela Admin API; `--enviar-acesso` também envia recuperação de senha. Access tokens já emitidos podem sobreviver até o TTL, por isso incidentes exigem também logout global/monitoramento. No próximo login, o dono volta a AAL1 e precisa matricular novo TOTP.

Fluxo esperado:

1. dono confirma e-mail e entra em AAL1;
2. cadastra fator TOTP e recebe QR Code;
3. confirma o primeiro código;
4. faz challenge/verify;
5. sessão alcança AAL2;
6. acesso do dono é reavaliado no banco.

Ainda faltam política de recuperação do fator, reautenticação para remoção/troca e resposta a conta comprometida.

## Convites, provisionamento e lifecycle

### Contratos SQL versionados e aplicação transitória

A migration `20260813010000_onboarding_invites_lifecycle_audit.sql` adiciona:

- `convites_barbearia`, separada da membership, com tenant, e-mail normalizado, expiração, versão e estados `pendente_envio`, `enviado`, `aceito`, `revogado`, `expirado` e `falhou`;
- `eventos_auditoria`, append-only, com ações allowlisted e metadados pequenos; o constraint atual recusa chaves óbvias de senha, token, OTP, TOTP, link, selfie, imagem e e-mail **somente no primeiro nível do JSON**;
- RLS de leitura para o dono AAL2 do tenant e DML direto revogado;
- nove RPCs públicas estreitas: `criar_convite_funcionario`, `revogar_convite_barbearia`, `aceitar_convite_barbearia`, `marcar_convite_enviado`, `marcar_convite_falhou`, `provisionar_dono_controlado`, `suspender_funcionario`, `reativar_funcionario` e `revogar_funcionario`;
- grants separados: dono autenticado executa os comandos do próprio tenant; marcação de envio/falha e provisionamento do primeiro dono ficam restritos a `service_role` no servidor;
- locks de tenant, proteção adicional das memberships e do perfil de dono ativo, além da remoção transacional das atribuições quando um funcionário é revogado;
- UUIDs históricos de autoria/proveniência sem FK destrutiva em `barbearias.criado_por`, `clientes.criado_por`, `membros_barbearia.convidado_por`, `atribuicoes_cliente.atribuido_por`, convites e ator/alvo da auditoria;
- `UPDATE` direto de `atribuicoes_cliente.usuario_id` revogado de `authenticated` e todo `UPDATE` da tabela revogado de `service_role`; a reatribuição ainda precisa de uma RPC estreita própria.

A UI/Actions de equipe consulta/cria/revoga convites e expõe suspensão, reativação e revogação de funcionários. Os callbacks chamam o aceite e `scripts/provision-owner.mjs` chama o provisionamento.

Em 22/08/2026, lint, pgTAP 112/112, convite, aceite, e-mail, TOTP e lifecycle foram aprovados localmente. O provisionamento inicial também foi exercitado por CLI com criação, reutilização por e-mail e retomada explícita por UUID sobre o mesmo tenant.

## Arquitetura e lacunas remanescentes dos convites

### Primeiro dono

O fluxo versionado usa onboarding controlado/invite-only:

- `scripts/provision-owner.mjs` normaliza o e-mail e envia o convite pela Admin API no servidor;
- em seguida, o script chama `provisionar_dono_controlado` com `service_role`; a RPC cria perfil, tenant e membership de dono na mesma transação;
- o usuário ainda precisa confirmar o e-mail, definir a senha e matricular o TOTP antes de acessar os dados de negócio;
- se o convite Auth for criado e a RPC falhar, o script informa o UUID e aceita retomada segura com `--usuario-id`; todo input, origem HTTPS/loopback e conflito de slug são verificados antes da criação da identidade;
- o script constrói `new URL(BARBERVISION_APP_URL).origin` fora do contrato central de URL segura; uma URL inválida pode interromper o processo e uma origem HTTP não loopback ainda precisa ser recusada;
- falta uma decisão explícita, com threat model e teste de recuperação, sobre criar a membership do primeiro dono antes de ele confirmar o e-mail e definir a senha;
- contas Auth já existentes não possuem caminho de provisionamento comprovado, porque `inviteUserByEmail` pode não criar um novo convite;
- nenhum tenant ativo deve nascer sem owner ativo;
- não usar `raw_user_meta_data` como autorização;
- não usar trigger genérico em `auth.users` para toda a semântica do negócio.

### Funcionário

Separar convite de membership:

- convite possui tenant, e-mail, papel, estado, expiração e actor;
- membership nasce/reativa somente no aceite válido;
- aceite exige identidade autenticada, e-mail confirmado e correspondência exata;
- constraints, locks e transições da RPC foram desenhados para controlar duplicidade, replay e expiração, mas ainda não foram testados em PostgreSQL real;
- usuário já existente deve seguir fluxo de login e aceite pelo mesmo e-mail, porém esse caminho ainda não está comprovado ponta a ponta;
- envio de e-mail usa outbox/retry server-only com enqueue transacional, lease, backoff, conclusão idempotente e reconciliação automática; ainda faltam scheduler/alertas hospedados e reexecução do E2E atualizado;
- usuário Auth já existente é resolvido por e-mail via RPC exclusiva de `service_role`, provisionado idempotentemente e pode receber acesso com `--enviar-acesso` sem novo convite Auth.
- a revogação precisa reler ou receber da RPC o estado final: ao tocar um convite vencido, o banco pode marcá-lo `expirado`, mas a action atual sempre anuncia “Convite revogado”.
- se a criação do cliente admin/URL ou o envio falha, a action executa a compensação e relê o estado por `id + barbearia_id`; ela só anuncia revogação, expiração ou falha persistida quando esse estado é confirmado. Erro/divergência é registrado sem PII e apresentado como estado não confirmado.

### Lifecycle

- suspensão preserva histórico, mas corta acesso;
- reativação só vale para suspenso;
- revogação remove atribuições na mesma transação;
- reentrada de revogado exige novo convite;
- transferência de dono é um fluxo separado com AAL2 do alvo;
- toda alteração de owner adquire lock do tenant antes da mutation.

A tela de equipe lista memberships ativas, suspensas e revogadas e expõe os comandos válidos por estado. Também não existe RPC estreita de reatribuição de cliente; o bloqueio do `UPDATE` direto é uma contenção temporária até esse comando ser desenhado e testado.

## Auditoria

`eventos_auditoria` implementa um log de domínio append-only para as transições efetivas cobertas pelas nove RPCs. Replays e chamadas idempotentes que não alteram estado retornam sem duplicar o evento:

- tenant;
- instante;
- UUID histórico do ator e do alvo, sem FK destrutiva;
- ação allowlisted;
- entidade e ID;
- metadados mínimos sanitizados.

Evento com `origem = usuario` exige ator não nulo; evento de `sistema` pode ter ator nulo. O código atual não registra e-mail bruto, senha, token, segredo TOTP, link mágico, selfie nem request completo nas chamadas existentes. O constraint de metadados protege somente chaves de primeiro nível, portanto objetos aninhados ainda exigem hardening e teste antes de aceitar metadados arbitrários. Logs de login, reset e MFA do Supabase Auth continuam separados; request/session ID, retenção, exportação e correlação operacional ainda precisam ser definidos.

## Segurança de funções SQL

Para `SECURITY DEFINER`:

- `search_path=''`;
- nomes de tabela/função qualificados;
- actor derivado de `auth.uid()`;
- tenant, e-mail, AAL e estado revalidados;
- lock antes da mutation de lifecycle;
- sem SQL dinâmico;
- retorno mínimo;
- `REVOKE` de `PUBLIC` e `GRANT` exato na migration.

Não chamar uma RPC em nome do usuário com um cliente service-role quando a autorização depende de `auth.uid()`: isso apaga a identidade que deveria ser validada.

## Matriz de acesso pretendida

| Ator | AAL | Próprio perfil/membership | Dados do tenant | Equipe/configuração | Storage de catálogo |
|---|---:|---:|---:|---:|---:|
| Anônimo | — | não | não | não | não |
| Dono ativo | AAL1 | mínimo para MFA | não | não | não |
| Dono ativo | AAL2 | sim | todos do tenant | sim | sim |
| Funcionário ativo | AAL1 | sim | clientes atribuídos | não | não |
| Perfil/membership inativo | qualquer | somente o estritamente necessário à tela de bloqueio | não | não | não |
| Admin da plataforma | — | fora deste domínio | fora deste domínio | fora deste domínio | fora deste domínio |

## Testes obrigatórios

### SQL/pgTAP

- e-mail não confirmado negado;
- dono AAL1 negado em todas as tabelas de negócio e Storage;
- dono AAL2 autorizado apenas no próprio tenant;
- funcionário AAL1 limitado às atribuições;
- metadata forjada irrelevante;
- convite cross-tenant/duplicado/expirado/revogado/replay/e-mail divergente;
- lifecycle permitido e proibido;
- evento de auditoria único e imutável;
- proveniência histórica preservada após exclusão da identidade Auth;
- bloqueio de `UPDATE`, `DELETE` e `TRUNCATE` da auditoria e de reatribuição direta por `authenticated`/`service_role`;
- metadados aninhados com chaves sensíveis recusados após o hardening correspondente;
- outbox invisível, quando ela for implementada;
- concorrência com duas sessões simultâneas alterando donos, convite/aceite/revogação e atribuição/revogação de funcionário.

### Integração/E2E

- convite real e e-mail;
- confirmação e criação de senha;
- AAL1 → cadastro/challenge TOTP → AAL2;
- recuperação de senha;
- logout local/global;
- refresh válido, expiração e revogação global estão cobertos no harness de integração;
- suspensão/revogação com JWT existente;
- REST e Storage em dois tenants;
- redirects válidos e inválidos.

## Evidência atual

- oito migrations e oito rollbacks presentes;
- CLI 2.115.0, `db:start`, reset, lint e pgTAP 192/192 aprovados; Auth, Storage e Studio respondem `200`;
- rollbacks de Auth assurance e onboarding/lifecycle ensaiados, com roll-forward e repetição dos gates aprovados;
- três pgTAPs com 192 asserções: 59 do passo 2, 112 de onboarding/lifecycle e 21 da outbox;
- runner com duas sessões concorrentes, uma conexão observadora, marcador obrigatório e cleanup independente; as duas corridas passaram localmente;
- `.env.local` ausente;
- serviços necessários do Supabase estão saudáveis; opcionais não usados estão desativados;
- o Playwright comprovou login, convite/Mailpit, callback, ativação, recuperação de senha, TOTP/AAL2, revogação de convite e logout local; o harness prova refresh, expiração, logout global e recuperação TOTP;
- build aprovado novamente em 14/08/2026 sem `.env.local`, validando somente o modo demonstrativo; smoke HTTP permanece histórico de 13/08;
- lint repetido em 21/08/2026: 0 erros e 18 warnings;
- `db:lint` aprovado; onboarding/lifecycle 112/112 e outbox 21/21 aprovados em 23/08;
- três suítes pgTAP aprovadas, com `plan(59)`, `plan(112)` e `plan(21)`, totalizando 192/192.

## Próxima sequência canônica

1. Executar o runner concorrente no banco local explicitamente marcado como descartável e guardar evidência.
2. Usar o runbook existente para ensaiar rollback/roll-forward 8–4 e repetir `db:lint`, as 192 asserções pgTAP e `db:test:concurrency`.
3. Criar um `.env.local` controlado e fixtures/identidades reais no Supabase Auth para dono AAL1/AAL2, funcionário e cenário cross-tenant.
4. Criar harness/scripts de integração e validar Data API e Storage com JWTs reais e cenários adversários.
5. Preservar no harness as provas de refresh/expiração/logout global/recuperação TOTP e ampliar casos adversários de callback.
6. Fechar gaps operacionais: provisionamento retomável com URL validada, decisão explícita sobre a membership do primeiro dono antes da senha, outbox/retry, usuário Auth existente, expiração reconciliada, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant.
7. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

## Critério de conclusão do passo 3

O passo 3 só termina quando as oito migrations subirem do zero, o rollback 8–4 for ensaiado, o E2E atualizado passar e a outbox tiver scheduler/alertas hospedados. Transferência de dono e seletor multi-tenant permanecem gates explícitos.
