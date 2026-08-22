# Privacidade e fluxo persistido

> Estado em **21/08/2026**: os passos 4 e 5 não foram implementados. Este documento define o contrato antes de usar dados reais.

## Objetivo

Transformar a jornada visual local em um fluxo persistido que trate nome, telefone, selfie e resultados derivados com finalidade clara, minimização, retenção e exclusão verificáveis.

## Estado atual

Hoje a jornada funciona assim:

```text
landing mock → cadastro local → selfie em Data URL
→ processamento local → ajuste manual → escolha/agenda mock
→ avaliação e pós-venda local
```

Características:

- a imagem é processada no navegador;
- não há servidor externo de inferência;
- nome, telefone e selfie em Data URL ficam em `sessionStorage`;
- Canvas, máscaras, matte, landmarks e métricas faciais permanecem efêmeros na memória dos componentes e não são copiados para o storage;
- `sessionStorage` recebe somente o recibo técnico de neutralização v3 e, após **Continuar**, o placement manual v7, além dos demais campos da jornada;
- catálogos, pós-venda e financeiro usam `localStorage`;
- o slug não resolve um tenant real;
- horários são fictícios;
- o painel não recebe a jornada;
- não existe consentimento afirmativo/versionado;
- não existe TTL de abandono nem exclusão verificável;
- o bucket de selfies é privado e sem policy pública; o fluxo atual não faz upload;
- a quinta migration versiona auditoria de domínio para comandos de Auth/onboarding/lifecycle; ela foi aplicada somente no bootstrap transitório descrito abaixo e não existem eventos persistidos da jornada pública.

Em **14/08/2026**, um `db:start` aplicou transitoriamente as cinco migrations, executou o seed e iniciou containers. O health check do Storage respondeu `502` e a pilha foi encerrada. Em **21/08/2026**, Docker/Supabase estão inativos; `db:reset`, `db:lint`, 168 asserções pgTAP, Data API/Storage com JWT, rollback/roll-forward, teste concorrente e E2E de Auth/e-mail/MFA não foram executados. Esse bootstrap não implementa nem valida privacidade ou persistência da jornada.

Processamento local reduz transferência, mas a Data URL ainda é dado pessoal armazenado no aparelho. “Não enviamos à IA” não substitui política de privacidade.

`public.eventos_auditoria` e suas gravações transacionais existem apenas no SQL versionado do passo 3. Esse log de domínio cobre comandos privilegiados de Auth/onboarding/lifecycle; não captura cadastro público, selfie, simulação, escolha, agenda ou avaliação e não substitui os futuros `eventos_jornada`.

## Inventário mínimo de dados

| Dado | Estado atual | Sensibilidade/risco | Decisão necessária |
|---|---|---|---|
| Slug da barbearia | sessão | identifica contexto/tenant | resolver tenant ativo |
| Nome | sessão | dado pessoal | necessidade, retenção e correção |
| Telefone/WhatsApp | sessão | contato e possível marketing | normalização, opt-in separado |
| Código de indicação | sessão | relação comercial | fraude e expiração |
| Selfie original | Data URL na sessão | imagem pessoal de alto impacto | efêmera ou persistida |
| Canvas, máscaras, matte, landmarks e métricas | memória efêmera do componente | derivados visuais de alto impacto | descartar ao refazer, sair ou concluir; nunca registrar em logs |
| Recibo de neutralização v3 | `sessionStorage` | metadado técnico sem imagem, pixels, máscara, landmarks ou métricas | expiração e compatibilidade de versão |
| Corte/barba escolhidos | sessão | preferência | vincular à simulação/atendimento |
| Placement manual v7 | `sessionStorage` após **Continuar** | identidade/revisão do molde, geometria, filtros e confirmação | persistir sem imagem quando possível |
| Horário/barbeiro | mock | agenda | disponibilidade e anti-overbooking |
| Avaliação | local | opinião ligada ao cliente | verificação e moderação |
| Interesse em produto | local | dado comercial | opt-in e histórico |
| Auditoria de Auth/onboarding/lifecycle | somente SQL versionado, ainda não executado | evento de domínio privilegiado; não é evento da jornada | aplicar/testar, definir retenção e acesso |
| Eventos da jornada/logs operacionais | ausentes | podem vazar PII | modelar minimização, retenção e acesso |

## Passo 4 — contrato de privacidade

### Papéis e responsabilidade

Definir e publicar:

- quem é controlador em cada implantação;
- se Barber Vision atua como operador ou controlador conjunto;
- contato de privacidade;
- suboperadores de hosting, e-mail, logs e comunicação;
- país/região de armazenamento e transferências;
- procedimento de incidente e direitos do titular.

Essa definição precisa de revisão jurídica compatível com a operação real.

### Finalidade e minimização

Para cada dado, documentar:

- finalidade específica;
- base legal adotada;
- se é obrigatório ou opcional;
- quem acessa;
- onde fica;
- prazo de retenção;
- como excluir;
- compartilhamentos.

Não coletar selfie, telefone, data de nascimento ou analytics “para o futuro”. O fluxo deve continuar com o mínimo necessário sempre que possível.

### Consentimento da selfie

Se o fundamento aplicável exigir consentimento para esse tratamento:

- apresentar aviso curto antes da câmera/upload;
- explicar que a simulação é aproximada e processada localmente;
- informar se qualquer original/derivado será salvo;
- usar ação afirmativa não pré-marcada;
- permitir recusa e cancelamento;
- versionar o texto;
- registrar prova mínima apenas quando houver persistência;
- tornar revogação tão simples quanto consentimento.

Consentimento para a selfie deve ser separado de marketing e mensagens no WhatsApp.

### Opção recomendada para o primeiro release

Preferir selfie **efêmera**:

- processar no navegador;
- não enviar original ao servidor;
- persistir somente metadados necessários da escolha, se possível;
- limpar Data URL, canvas e derivados ao concluir, cancelar ou expirar;
- não guardar thumbnail facial por conveniência.

Se a barbearia realmente precisar salvar a imagem, criar opt-in separado, finalidade explícita, bucket privado, URL assinada curta, TTL e exclusão completa.

### Retenção e abandono

Definir prazos concretos, não “enquanto necessário”. Implementar:

- `expires_at` nas entidades efêmeras;
- limpeza local ao cancelar/finalizar;
- detecção segura de fluxo incompatível/expirado;
- job server-side idempotente de expiração;
- exclusão de original, derivados e referências;
- registro de resultado da exclusão sem preservar o conteúdo excluído;
- política de backup e janela de purga.

`sessionStorage` termina com a aba, mas não oferece TTL de negócio nem prova de exclusão.

### Direitos do titular

Criar fluxo autenticado ou verificado para:

- confirmar identidade sem coletar excesso;
- acessar dados;
- corrigir nome/telefone;
- obter portabilidade quando aplicável;
- revogar consentimento;
- apagar selfie, derivados e conta/dados quando aplicável;
- contestar tratamento;
- acompanhar prazo e resposta.

O dono não pode apagar dados de outro tenant; funcionário não recebe autoridade ampla de exclusão.

### Menores

Definir se o produto aceita menores. Se aceitar, criar regra de responsável, linguagem e prova adequadas antes do piloto. Se não aceitar, declarar restrição e tratar o caso na interface.

### Logs, analytics e suporte

Nunca registrar:

- Data URL/base64 da selfie;
- URL assinada completa;
- token de fluxo;
- senha, OTP ou segredo TOTP;
- corpo integral de cadastro;
- telefone sem necessidade operacional.

Sanitizar erros, replay de sessão, gravações de suporte e ferramentas de analytics. Definir acesso, retenção e auditoria dos logs.

A auditoria append-only de domínio versionada na quinta migration passou somente pelo bootstrap efêmero, sem teste funcional ou E2E, e não autoriza registrar mídia ou PII desnecessária. Eventos da jornada pública permanecem ausentes e precisam de contrato próprio de finalidade, conteúdo, retenção e acesso antes do passo 5.

### Critério de conclusão do passo 4

- aviso/política revisados e versionados;
- consentimento/recusa/cancelamento funcionam;
- selfie efêmera ou persistida possui contrato explícito;
- TTL e exclusão são testados;
- direitos do titular têm procedimento;
- tenant e Storage permanecem isolados;
- logs não capturam mídia/tokens;
- incidente e suboperadores estão documentados.

## Passo 5 — fluxo vertical persistido

### Recorte do primeiro fluxo

Persistir somente:

```text
barbearia real → cliente/sessão pública → simulação
→ corte/serviço/barbeiro/horário → agendamento
→ atendimento → avaliação verificada → cuidados
```

Outros módulos permanecem mock até esse caminho funcionar ponta a ponta.

### Entidades mínimas candidatas

Os nomes finais dependem da modelagem, mas o domínio precisa representar:

- `servicos`;
- `disponibilidades`/slots;
- `sessoes_publicas` ou tokens opacos com expiração;
- `simulacoes`;
- `escolhas_simulacao`;
- `agendamentos`;
- `atendimentos`;
- `avaliacoes`;
- `recomendacoes_cuidado`;
- `eventos_jornada` mínimos.

Cada entidade deve ter tenant, estado, timestamps, actor/origem, retenção e constraints de transição.

### Identidade pública

Não entregar credencial privilegiada ao navegador. Opções seguras incluem:

- token opaco aleatório, curto e expirável;
- sessão anônima limitada por RLS e comandos estreitos, se validada;
- Route Handler/RPC que valida slug, token, tenant e transição.

O token:

- não pode conter PII em claro;
- deve ter entropia suficiente;
- deve expirar e poder ser rotacionado;
- não pode autorizar leitura enumerável de outros clientes;
- deve ser armazenado com cuidado e removido dos logs/URLs quando possível.

### Slug e tenant

A rota pública deve resolver somente dados publicados de uma barbearia ativa. Nunca aceitar `barbearia_id` fornecido pelo cliente como autoridade. O servidor deriva tenant do slug resolvido e repete essa validação em cada comando.

### Cadastro e deduplicação

Definir:

- telefone normalizado;
- se telefone é obrigatório;
- escopo da unicidade por tenant;
- como atualizar nome/telefone com prova adequada;
- como evitar enumeração de cadastro existente;
- como tratar múltiplos clientes compartilhando telefone;
- idempotência em retry/duplo clique.

### Simulação

Preferir salvar:

- tenant e cliente/sessão;
- corte/barba selecionados;
- versão do asset;
- parâmetros de ajuste;
- timestamps e status;
- recibo técnico sem a selfie, quando suficiente.

Salvar imagem composta ou selfie exige o contrato adicional do passo 4.

### Agenda e concorrência

- disponibilidade é autoritativa no servidor;
- reserva precisa expirar;
- constraint/lock impede dois agendamentos no mesmo recurso/horário;
- criação é idempotente;
- cancelamento/liberação são transacionais;
- fuso horário da barbearia é explícito;
- estados e transições são allowlisted.

### Avaliação verificada

Uma avaliação deve:

- estar ligada a atendimento concluído;
- usar token curto/expirável ou sessão verificada;
- aceitar uma submissão idempotente conforme regra;
- impedir edição cross-tenant;
- ter moderação e trilha de alteração se publicada;
- gerar cuidados sem alegações médicas indevidas.

### Integração com o painel

O primeiro fluxo termina quando:

- dono vê o novo cliente/agendamento;
- funcionário atribuído vê apenas o próprio cliente;
- escolha/simulação aparecem no atendimento;
- conclusão libera avaliação;
- avaliação aparece no tenant correto;
- nenhum dado depende do mock ID `b1/b2`.

### APIs e comandos

Para cada Route Handler/RPC:

- schema de entrada e limite de tamanho;
- validação de tenant e token;
- rate limit;
- idempotency key;
- transação e constraint;
- retorno mínimo;
- erro neutro contra enumeração;
- auditoria sem PII desnecessária;
- teste cross-tenant.

### Testes obrigatórios

- fluxo feliz completo;
- slug inativo/inexistente;
- token inválido, expirado e reutilizado;
- retry e duplo clique;
- dois clientes no mesmo horário;
- cliente/funcionário de outro tenant;
- avaliação antes do atendimento, repetida ou expirada;
- abandono e job de expiração;
- cancelamento e exclusão;
- mobile, câmera e acessibilidade;
- falha de rede e retomada segura.

### Critério de conclusão do passo 5

Uma jornada cria dados reais sob IDs autoritativos, aparece para o papel correto no painel, resiste a retry/concorrência, respeita privacidade/retention e falha fechada em tentativa cross-tenant. Só então o restante do painel deve abandonar os mocks.

## Dependências entre os passos

```text
Passo 2 validado + Passo 3 validado
                ↓
Passo 4: contrato e controles de privacidade
                ↓
Passo 5: persistência mínima da jornada
                ↓
Passo 6: migração progressiva do painel
```

Não persistir a selfie primeiro para “resolver depois”. A política determina o modelo, o Storage e a API, e não o contrário.
