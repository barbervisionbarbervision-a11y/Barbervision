# Autenticação e sessões

> Estado reconciliado em **21/08/2026**: implementação parcial; contratos SQL aplicados apenas em inicializações transitórias e Auth ainda não operacional ponta a ponta.

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

A UI/Actions de equipe já consulta/cria/revoga convites, os callbacks chamam o aceite e `scripts/provision-owner.mjs` chama o provisionamento. As RPCs de suspender, reativar e revogar funcionário ainda não possuem UX completa no painel.

Em 14/08/2026, duas inicializações transitórias com PostgreSQL `15.8.1.085` aplicaram as cinco migrations e o seed. Auth, REST e Studio responderam `200` brevemente; o Storage respondeu HTTP `502`, a pilha encerrou e, em 21/08, Docker e as portas `54321`, `54322` e `54323` estão inativos. Isso prova apenas que o SQL chegou a ser aplicado durante o startup. O rollback defensivo, o pgTAP de 109 asserções e o runner com duas sessões concorrentes mais uma conexão observadora/administrativa não foram executados. Convite, aceite, provisionamento e lifecycle continuam não comprovados e não devem ser tratados como operacionais.

## Arquitetura e lacunas remanescentes dos convites

### Primeiro dono

O fluxo versionado usa onboarding controlado/invite-only:

- `scripts/provision-owner.mjs` normaliza o e-mail e envia o convite pela Admin API no servidor;
- em seguida, o script chama `provisionar_dono_controlado` com `service_role`; a RPC cria perfil, tenant e membership de dono na mesma transação;
- o usuário ainda precisa confirmar o e-mail, definir a senha e matricular o TOTP antes de acessar os dados de negócio;
- se o convite Auth for criado e a RPC falhar, o script apenas informa o UUID para reconciliação manual; não há preflight completo, compensação automática nem modo seguro de retomada por UUID;
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
- envio de e-mail deve migrar para outbox/retry server-only. A implementação atual chama a Admin API de forma síncrona depois de criar o convite e apenas marca envio/falha; não há fila, retentativa durável ou reconciliação automática;
- usuário Auth já existente precisa de um caminho testado de vinculação/aceite. A chamada atual a `inviteUserByEmail` não demonstra esse caso.
- a revogação precisa reler ou receber da RPC o estado final: ao tocar um convite vencido, o banco pode marcá-lo `expirado`, mas a action atual sempre anuncia “Convite revogado”.
- se a criação do cliente admin/URL falha, a action chama `revogar_convite_barbearia` sem conferir o retorno; se o envio falha, chama `marcar_convite_falhou` e também ignora o retorno. Essas compensações precisam ser observáveis e só podem anunciar o estado realmente persistido.

### Lifecycle

- suspensão preserva histórico, mas corta acesso;
- reativação só vale para suspenso;
- revogação remove atribuições na mesma transação;
- reentrada de revogado exige novo convite;
- transferência de dono é um fluxo separado com AAL2 do alvo;
- toda alteração de owner adquire lock do tenant antes da mutation.

A tela de equipe ainda lista somente memberships ativas e não expõe os comandos de suspensão, reativação ou revogação. Também não existe RPC estreita de reatribuição de cliente; o bloqueio do `UPDATE` direto é uma contenção temporária até esse comando ser desenhado e testado.

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
- refresh/expiração;
- suspensão/revogação com JWT existente;
- REST e Storage em dois tenants;
- redirects válidos e inválidos.

## Evidência atual

- cinco migrations e cinco rollbacks presentes;
- duas inicializações transitórias de 14/08 aplicaram as cinco migrations e o seed em PostgreSQL `15.8.1.085`; Auth, REST e Studio responderam `200`, Storage respondeu `502` e a pilha encerrou;
- rollbacks de Auth assurance e onboarding/lifecycle comparados estaticamente à baseline, ainda sem ensaio no banco;
- dois pgTAPs com 168 asserções declaradas: 59 do passo 2 e 109 do passo 3;
- runner com duas sessões concorrentes, uma conexão observadora, marcador obrigatório e cleanup independente; tentativa local bloqueada por ausência de PostgreSQL;
- `.env.local` ausente;
- o engine foi comprovado apenas durante as inicializações transitórias; em 21/08, Docker e `54321`/`54322`/`54323` estão inativos;
- nenhum fluxo Auth do Barber Vision foi executado; os `200` de saúde da plataforma não comprovam login, convite, callback, senha ou TOTP;
- build aprovado novamente em 14/08/2026 sem `.env.local`, validando somente o modo demonstrativo; smoke HTTP permanece histórico de 13/08;
- lint repetido em 21/08/2026: 0 erros e 18 warnings;
- `db:lint` e `db:test` tentados em 14/08/2026, ambos encerrados por `ECONNREFUSED 127.0.0.1:54322`;
- duas suítes pgTAP transacionais versionadas/declaradas, com `plan(59)` e `plan(109)`, ainda não executadas; nenhuma asserção foi comprovada.

## Próxima sequência canônica

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

## Critério de conclusão do passo 3

O passo 3 só termina quando as cinco migrations subirem do zero, os novos contratos receberem rollback e pgTAP, testes de autorização/concorrência passarem e os fluxos reais de convite, usuário Auth existente, confirmação, recuperação, TOTP, logout e revogação forem demonstrados em ambiente descartável com dois tenants. Outbox/retry, recuperação do TOTP, transferência de dono e seletor multi-tenant permanecem gates explícitos.
