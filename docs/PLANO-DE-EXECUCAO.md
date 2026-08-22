# Plano de execução do Barber Vision

> Revisão: **21/08/2026**. Esta é a sequência oficial. Uma etapa só muda para concluída após código, execução e evidência de aceite.

## Objetivo

Transformar o protótipo visual em um produto multiempresa seguro, privativo, persistente e operável sem perder o simulador local que já está adequado para a demonstração.

## Ordem oficial

```text
1. Segurança da demo                         concluído no escopo controlado
2. Supabase, tenant e RLS                    aplicação transitória observada; validação pendente
3. Autenticação real                         parcial; não ponta a ponta
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

1. Estabilizar o Supabase local na sessão `leoto`: reproduzir a inicialização com diagnóstico redigido, corrigir o HTTP `502` do Storage/encerramento e comprovar que `54321`, `54322` e `54323` permanecem disponíveis.
2. Instalar/habilitar o Git e criar uma baseline recuperável antes das próximas mutações, sem versionar secrets nem `.next/`.
3. Aplicar/recriar o banco e executar `db:reset`, `db:lint` e `db:test`, comprovando as 168 asserções pgTAP.
4. Depois do `db:reset`, marcar e confirmar o banco descartável; executar `db:test:concurrency` e guardar a evidência das duas corridas.
5. Escrever um runbook reproduzível de rollback/roll-forward que inclua `supabase_migrations`; ensaiar os rollbacks das migrations 4–5 e o roll-forward e, depois, **repetir** `db:lint`, as 168 asserções pgTAP e `db:test:concurrency`.
6. Criar um `.env.local` controlado e fixtures/identidades Auth reais para dono em AAL1 e AAL2, funcionário e cenário cross-tenant.
7. Criar harness/scripts e validar Data API e Storage com JWTs reais e cenários adversários.
8. Selecionar/configurar o framework E2E, criar a suíte e então executar Auth, e-mail, convite, MFA e lifecycle.
9. Fechar gaps operacionais: resultados das compensações da Equipe, provisionamento retomável com URL validada, decisão explícita sobre a membership do primeiro dono antes da senha, UX completa do lifecycle, outbox/retry, usuário Auth existente, expiração reconciliada, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant.
10. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

Evidências conhecidas não substituem essa sequência: o build de 14/08 passou, o smoke HTTP permanece histórico de 13/08 e o lint foi repetido em 21/08 com exit `0`, zero erros e 18 warnings. Também em 14/08, duas tentativas de `db:start` feitas por `leoto` usaram PostgreSQL `15.8.1.085`, inicializaram o schema, aplicaram as cinco migrations e o seed e chegaram a iniciar os containers. Auth, REST e Studio responderam `200` enquanto as portas `54321`, `54322` e `54323` estiveram disponíveis; o Storage respondeu HTTP `502` e a pilha encerrou. Em 21/08, Docker e essas portas estão novamente inativos. Isso é evidência de aplicação transitória, não de `db:reset`, lint SQL, pgTAP, rollback, concorrência, RLS por JWT, Storage funcional ou Auth E2E: nenhum desses testes foi executado. As tentativas anteriores de `db:lint` e `db:test` terminaram em `ECONNREFUSED 127.0.0.1:54322`.

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

- executar `db:reset`, SQL lint e pgTAP; as tentativas atuais de `db:lint`/`db:test` terminaram em `ECONNREFUSED` e não contam como execução;
- estabilizar primeiro a pilha local; a aplicação transitória das cinco migrations e do seed durante `db:start` não substitui uma recriação limpa e repetível;
- testar Data API/Storage com JWT real;
- provar dois tenants e dois papéis;
- executar e comprovar concorrência do último dono e da atribuição/revogação;
- ensaiar rollback/roll-forward das migrations `13000` e `20260813010000` e reconciliar o histórico;
- criar uma RPC estreita, autorizada, idempotente e auditada para reatribuir cliente sem devolver `UPDATE` genérico;
- registrar evidência reproduzível.

### Gate de saída

Todas as migrations sobem do zero, testes passam e tentativas cross-tenant falham tanto pela API quanto pelo Storage.

### Estado

**Código versionado; aplicação transitória observada e validação pendente.** Em 14/08, duas inicializações locais aplicaram as cinco migrations e o seed, mas o Storage respondeu `502` e a pilha encerrou. Em 21/08, Docker e as portas locais estão inativos. Ainda faltam estabilidade, `db:reset`, lint, os 168 pgTAPs e as provas de RLS/Data API/Storage.

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

- a quinta migration foi aplicada durante as inicializações transitórias de 14/08, mas seu rollback e o pgTAP dedicado não foram executados e a tentativa anterior de lint foi bloqueada antes do PostgreSQL;
- lifecycle de transferência/promoção do dono continua ausente;
- envio de convite ainda é síncrono, sem outbox/retry ou reconciliação durável;
- usuário Auth já existente ainda não possui caminho ponta a ponta comprovado;
- provisionamento inicial não possui preflight, retomada segura por UUID ou compensação para “Auth criado/RPC falhou”;
- `scripts/provision-owner.mjs` constrói a URL de retorno sem o mesmo contrato central de validação de origem; URL inválida pode interromper o processo e uma origem insegura não loopback ainda precisa ser recusada explicitamente;
- as compensações da tela Equipe não conferem o resultado de `revogar_convite_barbearia` quando falta configuração nem de `marcar_convite_falhou` quando o envio falha, podendo apresentar uma conclusão que não foi persistida;
- falta decidir e testar se a membership do primeiro dono pode nascer no provisionamento antes de confirmação de e-mail e definição da senha, incluindo recuperação de falhas entre essas etapas;
- a action de revogação não relê o estado final e pode anunciar “revogado” quando o banco materializou `expirado`;
- a corrida do último dono e a corrida atribuição/revogação possuem runner, mas ainda não foram executadas;
- migrations `13000` e `20260813010000` têm rollback/testes próprios sem ensaio real;
- nenhum fluxo foi executado com Supabase real;
- redirects, SMTP, projeto hospedado e secrets não foram configurados;
- recuperação de TOTP, abuso e seletor multi-membership faltam.
- a tela Equipe lista somente memberships ativas e ainda não oferece UX completa para suspender, reativar e revogar funcionários;
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

**Parcialmente implementado, ainda não operacional ponta a ponta.** Os contratos SQL chegaram a ser aplicados na inicialização transitória, mas rollbacks e testes continuam somente versionados. Isso não altera o estado enquanto estabilidade do ambiente, recriação limpa, ensaio de reversão, integração de e-mail e E2E continuarem pendentes.

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

O próximo trabalho autorizado e recomendado é **estabilizar a pilha local e concluir a validação dos passos 2 e 3**, sem iniciar persistência de selfies ou do fluxo público.
