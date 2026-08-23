# Plano de execução do Barber Vision

> Revisão: **22/08/2026**. Esta é a sequência oficial. Uma etapa só muda para concluída após código, execução e evidência de aceite. Consulte [Estado de validação](ESTADO-VALIDACAO.md).

## Objetivo

Transformar o protótipo visual em um produto multiempresa seguro, privativo, persistente e operável sem perder o simulador local que já está adequado para a demonstração.

## Ordem oficial

```text
1. Segurança da demo                         concluído no escopo controlado
2. Supabase, tenant e RLS                    validado localmente, inclusive JWT e Storage
3. Autenticação real                         jornada E2E principal aprovada; hardening pendente
4. Privacidade e consentimento               não iniciado
5. Primeiro fluxo vertical persistido        não iniciado
6. Painel operacional real                   não iniciado
7. Catálogo e pós-venda reais                não iniciado
8. Financeiro persistente                    não iniciado
9. Operação, qualidade e release             não iniciado
```

O simulador de cabelo fica congelado durante os passos 2–5, salvo correção crítica ou decisão explícita do usuário.

## Sequência imediata canônica

Os nove passos acima são fases de produto. Dentro da fase atual, a ordem operacional é única:

1. Marcar/confirmar o banco descartável e executar `db:test:concurrency`.
2. Preservar a baseline pós-reset aprovada: oito migrations, seed, lint e pgTAP 192/192.
3. Marcar e confirmar o banco descartável; executar `db:test:concurrency` e guardar a evidência.
4. Validar Data API e operação real de Storage com JWTs controlados.
5. Usar o runbook existente para ensaiar rollback/roll-forward 8–4 e repetir `db:lint`, as 192 asserções pgTAP e `db:test:concurrency`.
6. Criar um `.env.local` controlado e fixtures/identidades Auth reais para dono em AAL1 e AAL2, funcionário e cenário cross-tenant.
7. Criar harness/scripts e validar Data API e Storage com JWTs reais e cenários adversários.
8. Preservar a suíte Playwright aprovada e ampliá-la para lifecycle completo, refresh/expiração e falhas.
9. Fechar gaps operacionais: provisionamento retomável com URL validada, decisão explícita sobre a membership do primeiro dono antes da senha, outbox/retry, usuário Auth existente, expiração reconciliada, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant.
10. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

Evidências atuais: em 22/08, build, launcher e lint JS passaram; com CLI 2.115.0, `db:start`, `db:reset`, lint SQL, pgTAP 170/170, concorrência, rollbacks 5–4/roll-forward, JWT/RLS, Storage com blob real e a jornada Playwright de Auth/e-mail/TOTP/lifecycle passaram. Falta ensaiar o rollback 6–4.

## Passo 1 — segurança da demonstração

### Objetivo

Permitir apresentação local/controlada sem expor o painel mock como se fosse uma aplicação autenticada.

### Entregue

- bloqueio de `/barbeiro/*` e `/admin/*` em produção sem Auth;
- flag explicitamente insegura apenas para a demo isolada de `/barbeiro/*`, nunca para `/admin`;
- headers de segurança;
- linguagem mais honesta sobre processamento local, simulação e financeiro;
- remoção da dependência operacional de serviços remotos de IA;
- preservação das fotos-fonte fora do runtime público;
- validação do launcher.

### Limite

Esse passo não torna `sessionStorage`, `localStorage` ou mocks seguros. A flag insegura não deve ser usada em um produto público.

### Estado

**Concluído para demonstração controlada em 08/08/2026.** Manutenção contínua obrigatória.

## Passo 2 — Supabase, tenant e RLS

### Objetivo

Criar a fronteira autoritativa entre barbearias, donos, funcionários e clientes.

### Presente em fonte

- cinco tabelas-base de tenant/identidade/cliente;
- policies RLS e grants;
- atribuição de cliente a funcionário;
- três buckets privados;
- seed de dois tenants;
- teste pgTAP com 59 asserções;
- teste pgTAP do passo 3 com 109 asserções;
- rollbacks defensivos das migrations 4–5;
- runner de duas sessões concorrentes mais uma conexão observadora para último dono e atribuição/revogação;
- migration adicional de e-mail confirmado/AAL2, pertencente à preparação do passo 3.
- UUIDs de procedência histórica sem FK destrutiva para Auth em barbearias, clientes, memberships, atribuições, convites e auditoria;
- bloqueio do `UPDATE` direto de `atribuicoes_cliente.usuario_id` para `authenticated` e do `UPDATE` da tabela para `service_role`.

### Falta para concluir

- preservar a recriação limpa já aprovada com `db:reset`, lint e pgTAP 170/170;
- testar Data API/Storage com JWT real;
- provar dois tenants e dois papéis;
- executar e comprovar concorrência do último dono e da atribuição/revogação;
- preservar o ensaio aprovado de rollback/roll-forward das migrations `13000` e `20260813010000` e sua reconciliação de histórico;
- criar uma RPC estreita, autorizada, idempotente e auditada para reatribuir cliente sem devolver `UPDATE` genérico;
- registrar evidência reproduzível.

### Gate de saída

Todas as migrations sobem do zero, testes passam e tentativas cross-tenant falham tanto pela API quanto pelo Storage.

### Estado

**Validado localmente.** Em 22/08, CLI 2.115.0, start/reset/lint, pgTAP 170/170, concorrência, rollback/roll-forward 5–4, Data API/RLS por JWT e Storage com blob real passaram. O rollback 6–4 é o próximo ensaio de banco.

## Passo 3 — autenticação real

### Objetivo

Entregar login, confirmação, recuperação, TOTP do dono, convite e lifecycle de equipe sob autorização server-side e RLS.

### Presente em fonte

- clientes Supabase browser/server/proxy/admin;
- cookies SSR e `auth.getClaims()`;
- login, recuperação, redefinição, confirmação e ativação;
- TOTP enrollment/challenge/verify;
- contexto server-side de perfil/membership/tenant;
- guardas de dono em oito áreas;
- logout local/global;
- UI/Actions de equipe e script de provisionamento;
- configuração local de Auth e templates;
- e-mail confirmado e dono AAL2 no SQL;
- correção em código para construir contexto mínimo do dono AAL1 antes de ler dados de negócio;
- quinta migration com `convites_barbearia`, `eventos_auditoria` append-only e nove RPCs de convite, aceite, marcação de envio/falha, primeiro dono, suspensão, reativação e revogação.
- auditoria em que evento de usuário exige ator, evento de sistema pode ter ator nulo, transição efetiva gera evento e replay no-op não duplica;
- `CHECK` contra nomes de segredo no nível superior de `eventos_auditoria.metadados`.

### Bloqueadores

- a quinta migration, seu pgTAP dedicado, concorrência e rollback/roll-forward passaram no banco local; os fluxos integrados ainda não foram executados;
- lifecycle de transferência/promoção do dono continua ausente;
- envio de convite usa outbox durável, lease, retry e reconciliação de expiração; E2E e concorrência entre workers passaram, restando scheduler hospedado;
- usuário Auth existente é resolvido por e-mail e reutilizado sem novo convite;
- provisionamento inicial possui preflight e retomada segura por e-mail/UUID para “Auth criado/RPC falhou”;
- `scripts/provision-owner.mjs` valida HTTPS e aceita HTTP somente em loopback antes de qualquer mutação;
- as compensações e a revogação da tela Equipe passaram a reler o estado autoritativo por convite/tenant antes de apresentar uma conclusão; o E2E adversário ampliado passou com falha real da Admin API e convite vencido;
- falta decidir e testar se a membership do primeiro dono pode nascer no provisionamento antes de confirmação de e-mail e definição da senha, incluindo recuperação de falhas entre essas etapas;
- a action de revogação não relê o estado final e pode anunciar “revogado” quando o banco materializou `expirado`;
- a corrida do último dono e a corrida atribuição/revogação passaram no banco local descartável em 22/08;
- migrations `13000` e `20260813010000` tiveram rollback/roll-forward ensaiado com sucesso no banco local descartável;
- nenhum fluxo foi executado com Supabase real;
- redirects, SMTP, projeto hospedado e secrets não foram configurados;
- proteção contra abuso e seletor multi-membership faltam; recuperação operacional de TOTP foi validada.
- a tela Equipe lista memberships ativas, suspensas e revogadas e possui UX/E2E para todas as transições válidas de funcionário;
- sanitização/allowlist de conteúdo aninhado de auditoria e testes contra segredos ainda faltam;
- reatribuição de cliente não possui RPC estreita; o `UPDATE` direto permanece corretamente revogado.

### Gate de saída

- dono: convite/onboarding → confirmação → senha → AAL1 → TOTP → AAL2 → painel;
- funcionário: convite → confirmação → login → apenas clientes atribuídos;
- revogação/suspensão corta acesso com JWT existente;
- dois tenants permanecem isolados;
- convite, replay, expiração, e-mail divergente e corrida possuem testes;
- auditoria registra comandos sem tokens/segredos, inclusive após hardening dos objetos aninhados de `metadados`.

### Estado

**Jornada principal operacional e aprovada localmente; hardening pendente.** Além dos contratos SQL, concorrência, rollback e integração JWT/Storage, o Playwright comprovou login, bootstrap AAL1, TOTP/AAL2, convite por Admin API, Mailpit, ativação de funcionário, recuperação de senha, revogação de convite e logout. Lifecycle completo de funcionário, falhas distribuídas e recuperação operacional continuam abertos.

## Passo 4 — privacidade e consentimento

### Objetivo

Tratar nome, telefone, selfie e derivados de forma transparente, limitada e eliminável antes de persistir a jornada.

### Escopo

- inventário e finalidade dos dados;
- aviso curto e política versionada;
- consentimento afirmativo antes da câmera/upload quando essa for a base adotada;
- escolha explícita sobre selfie efêmera ou persistida;
- retenção, TTL e job de expiração;
- cancelamento e exclusão completa;
- direitos do titular e processo de incidente;
- política de menores, analytics, logs e operadores;
- revisão jurídica/LGPD.

### Gate de saída

Recusa, consentimento, revogação, abandono, expiração e exclusão são testados; nenhuma selfie fica pública ou registrada em log.

### Estado

**Não iniciado.** Processamento local e texto informativo são úteis, mas não encerram a governança.

## Passo 5 — fluxo vertical persistido

### Objetivo

Persistir uma única jornada completa antes de migrar todo o painel.

### Recorte mínimo

```text
slug real → cadastro/cliente → selfie sob política → simulação
→ escolha de corte/serviço/horário → confirmação → painel
→ atendimento concluído → avaliação verificada → cuidados
```

### Escopo técnico

- resolver tenant por slug;
- token/sessão pública estreita;
- serviços, disponibilidade e agenda;
- simulação e escolha;
- atendimento e avaliação;
- APIs/RPCs sem service role no browser;
- idempotência, rate limit, anti-enumeração e prevenção de overbooking;
- RLS, retenção e exclusão;
- E2E completo em dois tenants.

### Gate de saída

Uma ação pública cria dados reais visíveis ao papel correto no painel, sem vazar dados para outro tenant e sem depender de mocks/localStorage.

### Estado

**Não iniciado.** A jornada visual existe, mas permanece local.

## Passo 6 — painel operacional real

### Objetivo

Substituir gradualmente os mocks pelas entidades reais já provadas no passo 5.

### Ordem interna

1. clientes e pesquisa;
2. agenda/atendimento e histórico;
3. simulações e avaliações;
4. dashboard e funil;
5. promoções e fidelidade;
6. comissões/ranking;
7. equipe/configurações restantes.

### Gate de saída

Todas as telas do recorte usam banco sob RLS, possuem loading/erro/vazio, paginação e testes de papel/tenant.

### Estado

**Não iniciado.**

## Passo 7 — catálogo e pós-venda reais

### Objetivo

Permitir que o dono publique cortes autorizados e comercialize produtos relacionados com controle operacional.

### Escopo

- upload privado, validação e revisão de fontes/recortes;
- declaração de direitos e rastreabilidade do asset;
- catálogo público somente com versões aprovadas;
- CRUD de produtos, estoque, preço e disponibilidade;
- cuidados, interesse, reserva/venda e WhatsApp com opt-in;
- auditoria de preço/estoque.

### Gate de saída

Um corte e um produto percorrem criação, revisão, publicação, uso, desativação e histórico sem quebrar tenant ou licença.

### Estado

**Não iniciado.** Catálogos atuais são locais.

## Passo 8 — financeiro persistente

### Objetivo

Transformar a demonstração de fechamento em um módulo gerencial auditável para o dono e para exportação ao contador.

### Escopo

- lançamentos, competências, conciliação e anexos;
- fechamento/reabertura auditados;
- relatórios e pacote reproduzível;
- tipo empresarial e regime separados;
- integração fiscal somente após validação especializada.

### Gate de saída

Os valores são reproduzíveis e auditáveis. O produto continua declarando que não calcula imposto exato nem substitui contador enquanto não houver escopo legal específico.

### Estado

**Não iniciado.** O módulo atual é `localStorage` e demonstração gerencial.

## Passo 9 — operação e release

### Objetivo

Preparar um piloto seguro, observável e reversível.

### Escopo

- Git/CI e ambientes separados;
- lint/build/testes/SCA automatizados;
- deploy HTTPS, secrets e migrations controladas;
- logs, métricas e alertas sem PII excessiva;
- backups e restauração;
- runbooks, rotação de secrets e incidente;
- acessibilidade, performance e matriz de aparelhos;
- termos, privacidade, licenças e treinamento;
- piloto com suporte e rollback.

### Gate de saída

Checklist de go/no-go aprovado, isolamento testado, privacidade exercitada, backup restaurado e barbearia piloto treinada.

### Estado

**Não iniciado.**

## Gate paralelo do simulador

O cabelo está “bom por enquanto”, não “pronto para qualquer cliente”. Antes do piloto:

- versionar manifesto/hash reproduzível do conjunto congelado;
- testar aparelhos e navegadores reais;
- testar variedade de cabelo, pele, luz e enquadramento;
- medir memória e tempo;
- revisar fallback, bordas e acessibilidade;
- manter linguagem de resultado aproximado.

Esse gate não autoriza reescrever o simulador durante os passos de fundação.

## Regra de progressão

Para avançar de passo:

1. contratos e riscos estão documentados;
2. implementação está versionada;
3. migrations/rollback existem quando aplicável;
4. testes proporcionais passam no ambiente-alvo;
5. smoke manual é registrado;
6. limitações permanecem explícitas;
7. README, `AI context.md`, `pendências.md` e docs afetados são atualizados.

O próximo trabalho recomendado é **operacionalizar o scheduler/alertas da outbox e concluir os comandos administrativos**, sem iniciar persistência de selfies ou do fluxo público.
