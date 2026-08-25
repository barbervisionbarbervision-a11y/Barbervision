# Roadmap técnico e de produto

Estado reconciliado em **25/08/2026**. Supabase e Render estão operacionais; cadastro público protegido e recuperação de senha foram comprovados no hospedado. O convite de funcionário corrigido ainda precisa de reteste e o scheduler Cloudflare não foi publicado. Evidências completas: [Estado de validação](ESTADO-VALIDACAO.md).

## Objetivo

Transformar a demonstração do Barber Vision em um produto multi-tenant seguro sem reabrir prematuramente o simulador de cabelo, que está aceito provisoriamente com placement manual.

A sequência abaixo é obrigatória porque Auth isolado não protege dados locais, uma migration aplicada apenas durante uma inicialização que falhou não prova RLS e uma jornada visual não equivale a um agendamento persistido.

## Situação dos nove passos

| Passo | Entrega | Estado real | Próximo gate |
| ---: | --- | --- | --- |
| 1 | Segurança da demonstração | **Concluído para demo controlada** | Manter regressões e não usar dados reais |
| 2 | Supabase, tenant, RLS e Storage | **Validado localmente** | Preservar os gates e integrar à CI |
| 3 | Auth real, sessões e MFA | **Jornada principal E2E aprovada** | Completar lifecycle e fechar lacunas operacionais |
| 4 | Privacidade e consentimento | **Não iniciado como produção** | Definir/aplicar consentimento, retenção e descarte |
| 5 | Primeiro fluxo vertical persistido | **Não iniciado** | Persistir cliente → simulação/escolha → agendamento → avaliação |
| 6 | Painel operacional real | **Não iniciado** | Migrar CRM, atribuições, busca, histórico e funil |
| 7 | Catálogo e pós-venda reais | **Não iniciado** | Storage/publicação, produtos, interesse/reserva e auditoria |
| 8 | Financeiro persistente | **Não iniciado** | Livro gerencial auditável e integração com contador |
| 9 | Operação e release | **Não iniciado** | CI/CD, observabilidade, backup, restore, segurança e piloto |

“Não iniciado” nos passos 4 e 5 significa que a implementação de produção ainda não começou. Existem telas locais de selfie, consentimentos informativos, escolha e avaliação, mas elas não possuem o contrato de privacidade nem a persistência exigidos.

## Evidências atuais

- lint JS: exit `0`, zero erros e 18 warnings;
- build: aprovado em 22/08 com 31 páginas, dois handlers e Proxy; ainda depende de rede para Google Fonts;
- launcher: aprovado;
- Git: baseline `7c34dab` e árvore limpa antes da revisão;
- Supabase local: serviços necessários saudáveis; Imgproxy, Analytics, Vector e Pooler desativados/não usados;
- lint SQL: aprovado sem erros;
- pgTAP de onboarding/lifecycle: 112/112; outbox: 21/21;
- pgTAP total: 59 + 112 + 21 + 13, totalizando 205/205;
- concorrência: duas corridas aprovadas no banco local marcado como descartável;
- onze rollbacks presentes; rollback/roll-forward 8–4, 10–9 e migration 11 aprovados nas respectivas rodadas;
- somente `.env.example`; não existe `.env.local`;
- `db:start`, `db:reset` e `db:lint` encerraram com exit `0`; pgTAP 205/205 passou; concorrência, rollback 5–4, JWT/Data API, Storage e Auth/E2E anterior permanecem evidências históricas válidas no escopo testado;
- simulador manual congelado e não alterado.

## Passo 1 — segurança da demonstração

Estado: **concluído em 08/08/2026 para apresentação controlada**.

Entregas preservadas:

- Next `16.3.0` e PostCSS `8.5.26`;
- lint configurado;
- `dev`/`start` em loopback;
- bloqueio seguro das rotas internas em produção sem Auth;
- flag server-only explícita para demonstração isolada;
- headers básicos de segurança e remoção de `X-Powered-By`;
- login fictício sem campos que pareçam credenciais reais;
- CRM demo sem envio automático para números plausíveis;
- `.env*` protegido, com apenas `.env.example` versionado;
- launcher/atalho local validados;
- simulador de cabelo congelado.

Limite: este passo contém uma demo; não implementa identidade, autorização de dados, privacidade ou produção.

## Passo 2 — Supabase, tenant, RLS e Storage

Estado: **validado localmente, inclusive concorrência, rollback, JWT/RLS e Storage real**.

### Já existe

- tabelas `barbearias`, `perfis`, `membros_barbearia`, `clientes` e `atribuicoes_cliente`;
- enums e constraints do núcleo multi-tenant;
- funções de autorização para conta ativa, membership, dono e escopo de cliente;
- policies RLS para tenant, papel e carteira do funcionário;
- proteção do último dono;
- buckets privados para fontes, cutouts e selfies;
- policies de Storage do dono para fontes/cutouts;
- formato de path iniciado por UUID do tenant;
- seed/fixtures e 59 asserções pgTAP do passo 2;
- 112 asserções de onboarding/lifecycle, 21 da outbox, rollbacks 4–5 e runner concorrente;
- migration de assurance que exige e-mail confirmado; a migration 10 torna AAL2 opcional para o dono.
- UUIDs históricos de procedência sem FK destrutiva para Auth em barbearias, clientes, memberships, atribuições, convites e auditoria;
- revogação do `UPDATE` direto de `atribuicoes_cliente.usuario_id` para `authenticated` e do `UPDATE` da tabela para `service_role`.

### Falta para concluir

- executar e comprovar o runner concorrente no banco local explicitamente marcado como descartável;
- criar uma RPC estreita, autorizada e auditada para reatribuição sem devolver `UPDATE` genérico;
- corrigir qualquer divergência revelada pelos testes;
- executar os casos já versionados para e-mail não confirmado e AAL1/AAL2;
- testar JWT de dono, funcionário, usuário sem membership e tenant adversário;
- verificar grants e acesso aos três buckets;
- confirmar que selfies continuam sem policy até o passo 4;
- preservar o runbook já ensaiado de rollback/roll-forward e repetir seus gates quando migrations 4–5 mudarem;
- registrar evidências reproduzíveis em CI.

Critério de conclusão: banco recriado do zero, lint SQL e suíte de isolamento aprovados, com resultado repetível fora da máquina do autor.

## Passo 3 — Auth real, sessões e MFA

Estado: **validado localmente; primeiro dono e recuperação aprovados no hospedado; convite de funcionário em reteste**.

### Já existe no código

- clientes Supabase browser, server, admin e Proxy;
- cookies SSR e validação por `getClaims()`;
- login por e-mail/senha;
- confirmação, recuperação, redefinição e ativação;
- matrícula/challenge TOTP;
- contexto server-side de perfil, membership e barbearia;
- escolha temporária da membership ativa mais antiga;
- redirecionamento do dono AAL1 para MFA;
- oito layouts server-side exclusivos do dono;
- logout local e global;
- templates locais de convite/recuperação;
- tela/ações de equipe e script de provisionamento;
- migration de onboarding/lifecycle com convites, auditoria append-only e nove RPCs estreitas.
- auditoria em que origem `usuario` exige ator, origem `sistema` pode ter ator nulo, transição efetiva gera evento e replay no-op não duplica;
- bloqueio nominal de segredos apenas nas chaves de nível superior de `eventos_auditoria.metadados`.

### Lacunas bloqueadoras

- Supabase hospedado, redirects, SMTP Brevo, primeiro dono e recuperação foram testados; falta fechar o convite novo de funcionário, isolamento remoto e os casos adversários;
- as migrations de onboarding/lifecycle, leitura operacional, retomada e outbox estão aplicadas; pgTAP 133/133 do passo 3 passou;
- envio de convite usa outbox durável com lease/retry e expiração reconciliada; E2E e dois workers concorrentes passaram, restando scheduler hospedado;
- usuário Auth existente e retomada por UUID foram comprovados pelo script contra o ambiente local;
- provisionamento inicial possui preflight de entrada/origem/slug e replay idempotente do contrato SQL;
- o provisionamento não reutiliza o contrato central de URL segura; URL inválida pode interromper o script e origem insegura não loopback precisa ser rejeitada;
- as compensações da Equipe e a revogação agora releem o estado autoritativo antes de responder; o E2E adversário cobre falha real da Admin API e convite vencido;
- falta decidir/testar se a membership do primeiro dono deve existir antes da confirmação e da definição da senha;
- revogação não relê o estado final e pode anunciar “revogado” quando a RPC materializou `expirado`;
- suspensão, reativação e revogação possuem UX e E2E com corte/retomada de sessão existente;
- transferência/promoção de dono continua ausente;
- bootstrap do dono em AAL1 foi comprovado com JWT e Playwright;
- há E2E de login/redefinição/TOTP/logout local e harness para refresh, expiração e logout global;
- recuperação de TOTP perdido usa comando server-only validado, após verificação externa da identidade;
- CAPTCHA/rate limit/abuso e política de sessão precisam ser fechados;
- usuário com múltiplas memberships ainda não possui seletor de tenant;
- `/admin` continua sem Auth próprio;
- páginas de negócio continuam mocks/localStorage.
- payloads aninhados de auditoria ainda precisam de sanitização/allowlist e testes;
- não existe RPC estreita de reatribuição de cliente; o `UPDATE` direto permanece revogado.

### Sequência canônica para concluir a fundação

1. Revogar o convite antigo de funcionário e emitir um novo após `def60d3`.
2. Comprovar aceite, definição de senha, login, membership e isolamento do funcionário no hospedado.
3. Provar **Configurar depois** e ativação posterior de TOTP; revisar templates e links adversários.
4. Publicar o Worker Cloudflare e validar cron, segredo inválido, retry e logs sem PII.
5. Executar a matriz remota controlada de Auth, TOTP opcional, convite/outbox e isolamento.
6. Fechar gaps administrativos: reatribuição estreita, transferência de dono e seleção multi-tenant.
7. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

Critério de conclusão: um dono e um funcionário são provisionados por caminhos controlados, confirmam e-mail, autenticam, respeitam MFA/papel/tenant e têm ciclo de vida testado, sem usar mocks como autoridade.

## Passo 4 — privacidade e consentimento

Estado: **não iniciado como implementação de produção**.

Escopo mínimo:

- inventário de dados e finalidades;
- aviso de privacidade versionado antes da selfie;
- aceite/consentimento quando aplicável, com prova mínima;
- base legal por dado e operação;
- retenção distinta para selfie, derivadas efêmeras, material-fonte e cutout publicado;
- expiração e limpeza em abandono, conclusão e solicitação;
- canal de acesso, correção, portabilidade quando aplicável e exclusão;
- política de logs, analytics, suporte e subprocessadores;
- criptografia em trânsito/repouso e URLs assinadas de curta duração;
- segregação do material-fonte privado;
- resposta a incidente e responsável operacional;
- termos de uso e declarações de direito sobre fotos de corte.

Decisões obrigatórias:

- a selfie precisa mesmo ser enviada ao backend no MVP ou pode permanecer local?;
- quando houver upload, qual é a duração máxima e quem pode consultar?;
- o resultado composto será persistido ou regenerado?;
- quais eventos podem conter IDs sem conter imagem, telefone ou token?;
- qual procedimento encerra dados de uma barbearia cancelada?

Critério de conclusão: o fluxo coleta apenas o necessário, registra a versão do aviso, aplica TTL/descarte verificável e atende uma solicitação de exclusão ponta a ponta.

## Passo 5 — primeiro fluxo vertical persistido

Estado: **não iniciado**.

O primeiro recorte deve ser pequeno e completo:

```text
slug ativo
  → cliente/lead consentido
  → simulação e escolha
  → solicitação/agendamento idempotente
  → visualização autorizada no painel
  → conclusão do atendimento
  → token de avaliação
  → avaliação e cuidados
```

Entregas:

- modelar serviços, profissionais, disponibilidade, simulações, escolhas, agendamentos e avaliações;
- resolver slug para tenant ativo sem vazar dados internos;
- criar operações públicas estreitas por Route Handler/RPC;
- validar entrada, limites, idempotência e abuso;
- gerar protocolo somente após commit do servidor;
- permitir busca por nome/telefone no escopo autorizado, paginada no servidor;
- registrar timeline mínima e atribuição do profissional;
- emitir token único, expirável e revogável para avaliação;
- demonstrar leitura do registro no painel correto;
- testar negação para outro tenant, funcionário não atribuído e usuário anônimo;
- definir falha/retry sem apagar a jornada antes da confirmação persistida.

O corte pode continuar sendo composto localmente. Persistir o fluxo não exige enviar a selfie, desde que o contrato de produto seja desenhado para isso.

Critério de conclusão: uma jornada real aparece no painel do tenant certo e pode ser avaliada uma única vez, com testes de erro, repetição e autorização.

## Passo 6 — painel operacional real

Estado: **não iniciado**.

Prioridades:

- substituir `mockData` por queries server-side autorizadas;
- dashboard calculado a partir de eventos persistidos;
- CRM com busca paginada por nome/telefone;
- criação, edição, atribuição e desativação de cliente;
- carteira do funcionário imposta no banco;
- histórico como timeline de eventos;
- simulações como entidade própria;
- funil baseado em eventos e timestamps;
- promoções persistidas e publicadas para o tenant;
- avaliações verificadas;
- auditoria de alterações privilegiadas.

Critério de conclusão: nenhuma tela operacional depende do array completo no bundle nem de `localStorage` como fonte de verdade.

## Passo 7 — catálogo e pós-venda reais

Estado: **não iniciado**.

Entregas:

- upload privado de foto-fonte pelo dono;
- declaração de direitos e retenção do original;
- pipeline de validação de MIME, assinatura, tamanho, dimensões e metadados;
- recorte transparente versionado, revisão e publicação;
- distribuição pública somente do cutout aprovado, sem rosto/fundo;
- catálogo por tenant com ativação e revisão de encaixe;
- produtos, preços, quantidade/estoque e vínculos com cuidados persistidos;
- interesse/reserva/pedido com status claros;
- confirmação humana e retirada/pagamento presencial no primeiro MVP;
- auditoria e testes de acesso a fonte/cutout.

Critério de conclusão: cliente vê somente material publicado da barbearia correta, e o dono gerencia fontes/produtos sem exposição entre tenants.

## Passo 8 — financeiro persistente

Estado: **não iniciado**.

Entregas:

- lançamentos derivados de operações reais e ajustes manuais auditados;
- separação entre serviços, produtos, descontos, estornos e taxas;
- conciliação por competência e origem;
- fechamento com snapshot, bloqueio e reabertura justificada;
- exportação gerencial reproduzível;
- papel futuro de contador com escopo mínimo;
- anexos/documentos privados quando necessários;
- backup, integridade e trilha imutável de ações relevantes.

O sistema não calculará imposto apenas por “MEI”, “ME” ou “LTDA”; porte, natureza e regime são conceitos diferentes. O primeiro produto financeiro continua gerencial e depende de conferência humana do contador.

Critério de conclusão: relatório persistido, conciliado e auditável, sem se apresentar como guia, declaração ou obrigação oficial.

## Passo 9 — operação e release

Estado: **não iniciado**.

Gates:

- ambientes separados e configuração por segredo;
- CI com install, lint, build, testes de unidade, integração, SQL e E2E;
- migration/rollback/restore ensaiados;
- monitoramento de disponibilidade, erro, fila/e-mail e banco;
- logs estruturados sem selfie, token ou PII desnecessária;
- backups automáticos e teste periódico de restauração;
- limites de custo e capacidade;
- CSP/HSTS e revisão de headers;
- resposta a incidente e contato de suporte;
- termos, privacidade, licenças e contratos com subprocessadores;
- piloto pequeno com barbearia e clientes consentidos;
- plano de rollback de aplicação e dados.

Critério de conclusão: release observável, recuperável e documentado, com responsabilidades operacionais definidas.

## Trilha congelada do simulador

O cabelo não é a frente imediata. O contrato preservado é:

- processamento local sem IA generativa;
- remoção/preparo automático em um toque;
- placement manual v7;
- foto à esquerda, controles à direita;
- X/Y, largura, altura e inclinação independentes;
- confirmação em **Pronto**;
- cinco cutouts sintéticos demonstrativos;
- editor de recorte do dono separado do cliente.

Antes do piloto, mas sem bloquear os passos de fundação enquanto congelado:

- matriz consentida de formatos de cabeça, tons de pele, cabelos, fundos e poses;
- teste Chrome Android e Safari iOS reais;
- residual do cabelo antigo e cobertura após ajustes extremos;
- regressão visual por asset/revisão;
- tempo frio/quente, cache, memória e timeout;
- licenças e autorizações dos assets;
- mensagens que deixem claro que a prévia é aproximada.

## Decisões ainda abertas

- Supabase local com Docker ou projeto remoto descartável para a primeira validação;
- política de múltiplas barbearias por usuário;
- recuperação do dono que perde o TOTP;
- retenção da selfie e necessidade de upload no fluxo inicial;
- canal de e-mail transacional e limites de envio;
- política de telefone/deduplicação de clientes;
- modelo mínimo de disponibilidade/agendamento;
- interesse, reserva ou pedido como primeira entidade comercial;
- papel e acesso do contador;
- hospedagem, região, domínio e orçamento operacional;
- métricas de sucesso do piloto.

## Definição de pronto transversal

Uma funcionalidade só está pronta quando:

- o comportamento observável corresponde ao texto da interface;
- autorização ocorre no servidor/banco, não só pelo menu;
- sucesso só é exibido após confirmação persistida;
- falha, repetição e concorrência têm tratamento;
- dados possuem finalidade, retenção e descarte definidos;
- tenant e papel adversários são testados;
- logs não contêm segredos ou dados pessoais desnecessários;
- lint/build/testes relevantes passam no mesmo commit;
- documentação e runbook são atualizados;
- há caminho de rollback ou recuperação.

## Próximos passos imediatos

1. Retestar um convite novo de funcionário após `def60d3`; recuperação hospedada já foi aprovada.
2. Integrar à CI os gates locais já aprovados e adicionar casos específicos para as constraints de e-mail da migration 9.
3. Provar **Configurar depois** e ativação posterior de TOTP no ambiente hospedado.
4. Publicar o Worker Cloudflare e validar cron, segredo inválido, retry e logs sem PII.
5. Executar a matriz remota de Auth, TOTP opcional, convite/outbox, RLS e isolamento.
6. Implementar privacidade, consentimento, retenção e exclusão antes de persistir selfies ou clientes reais.

Referência oficial detalhada: [Plano de execução](PLANO-DE-EXECUCAO.md). Pendências rastreáveis: [pendências.md](../pend%C3%AAncias.md).
