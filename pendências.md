# Pendências — Barber Vision

Backlog oficial do projeto, reconciliado com o código e as evidências de execução em **21/08/2026**.

Este arquivo separa o que existe em fonte do que foi executado e validado. Uma tela, migration ou função criada não encerra uma etapa sem teste proporcional ao risco.

## Legenda

- [x] concluído e verificado no escopo indicado;
- [ ] pendente;
- **P0**: bloqueia a próxima etapa ou o uso com pessoas reais;
- **P1**: necessário para o primeiro piloto;
- **P2**: melhoria posterior ao piloto.

## Situação executiva

| Passo | Estado | Gate atual |
|---|---|---|
| 1 — Segurança da demo | Concluído para demo controlada | Manter a contenção enquanto não houver Auth comprovado |
| 2 — Supabase, tenant e RLS | Migrations e seed aplicados transitoriamente; validação pendente | Estabilizar a pilha e provar reset/lint/pgTAP/RLS/Storage |
| 3 — Auth real | SQL aplicado transitoriamente; jornadas não operacionais ponta a ponta | Executar testes/rollbacks e provar convite, MFA e lifecycle reais |
| 4 — Privacidade e consentimento | Não iniciado | Definir e implementar governança antes de persistir selfies |
| 5 — Fluxo vertical persistido | Não iniciado | Modelar e persistir um único fluxo público seguro |
| 6 — Painel operacional | Não iniciado | Remover mocks somente após o fluxo vertical |
| 7 — Catálogo e pós-venda | Não iniciado | Upload/licença/estoque/reserva reais |
| 8 — Financeiro persistente | Não iniciado | Persistir dados gerenciais sem prometer imposto exato |
| 9 — Operação e release | Não iniciado | CI, observabilidade, backups, segurança e piloto |

## O que já está concluído no protótipo

### Demonstração e interface

- [x] Landing pública por slug visual.
- [x] Cadastro local de nome e WhatsApp.
- [x] Upload/captura de selfie.
- [x] Processamento visual no navegador com MediaPipe.
- [x] Preparação automática local da região do cabelo.
- [x] Catálogo demonstrativo de cortes.
- [x] Placement manual como fluxo principal.
- [x] Controles à direita da foto em desktop.
- [x] Ajustes de posição, largura, altura, escala e inclinação.
- [x] Comparação e escolha demonstrativa.
- [x] Avaliação local e sugestão de cuidados.
- [x] Produtos e pós-venda demonstrativos.
- [x] Pesquisa de cliente por nome e telefone no painel mock.
- [x] Fechamento financeiro gerencial demonstrativo.

### Contenção da demonstração

- [x] Bloquear `/barbeiro/*` e `/admin/*` em produção sem Supabase por padrão.
- [x] Manter flag insegura de demo explicitamente nomeada.
- [x] Impedir que a flag de demo contorne Auth quando Supabase está configurado.
- [x] Manter `/admin` separado e bloqueado em modo real.
- [x] Adicionar headers de segurança na aplicação.
- [x] Remover dependência operacional de Gemini/HairFastGAN.
- [x] Manter fontes privadas fora do runtime público.

### Auth e contratos já versionados

- [x] Clientes Supabase para browser, Server Components, Proxy e admin server-only.
- [x] Sessão SSR com cookies e validação por `auth.getClaims()`.
- [x] Login por e-mail/senha.
- [x] Esqueci senha e redefinição.
- [x] Callback PKCE e confirmação por token hash.
- [x] Tela de ativação de conta.
- [x] Enrollment, challenge e verify de TOTP.
- [x] Logout local e global.
- [x] Contexto server-side de perfil e membership.
- [x] Guardas server-side para oito áreas exclusivas do dono.
- [x] UI e Server Actions de equipe como scaffold.
- [x] Templates locais de convite e recuperação.
- [x] Signup público desabilitado em `supabase/config.toml`.
- [x] Migration de e-mail confirmado e AAL2 do dono.
- [x] Migration de convites, provisionamento, lifecycle de funcionário, locks e auditoria de domínio.
- [x] Contexto mínimo do dono AAL1 antes de consultar dados da barbearia, permitindo encaminhamento ao MFA em código.

Esses itens indicam presença de implementação, não validação ponta a ponta.

# Próximos passos imediatos

Execute nesta ordem:

1. **P0 — estabilizar o Supabase local na sessão `leoto`**: reproduzir com diagnóstico, corrigir o Storage `502`/encerramento e comprovar `supabase status` e as portas `54321`, `54322` e `54323` persistentes.
2. **P0 — instalar/habilitar o Git e criar uma baseline recuperável antes de correções de código ou SQL**, excluindo secrets, `.next` e resíduos locais do Supabase.
3. **P0 — aplicar/recriar o banco e executar `db:reset`, `db:lint` e os 168 testes pgTAP**.
4. **P0 — depois do `db:reset`, marcar e confirmar explicitamente o banco descartável, executar `db:test:concurrency`** e guardar a evidência das duas corridas reais.
5. **P0 — escrever o runbook e exercitar os rollbacks 4–5 e o roll-forward**, incluindo `supabase_migrations`; depois repetir `db:lint`, os 168 pgTAPs e o runner concorrente.
6. **P0 — criar `.env.local` controlado e fixtures/identidades Auth reais** para dono AAL1/AAL2, funcionário e cenário cross-tenant.
7. **P0 — criar o harness e validar Data API e Storage** com JWTs reais e cenários adversários.
8. **P0 — selecionar/configurar o framework E2E, criar a suíte e então executar Auth, e-mail, convite, MFA e lifecycle**.
9. **P0 — fechar gaps operacionais**: outbox/retry, usuário Auth existente, expiração reconciliada, UX do lifecycle, reatribuição estreita, recuperação de TOTP, transferência de dono e seleção multi-tenant.
10. **P0 — implementar privacidade, consentimento, retenção e exclusão** antes de persistir selfies ou clientes reais.

Depois desses gates, implementar o fluxo vertical do passo 5 e só então migrar painel, catálogo, produtos, financeiro e operação.

## P0 — baseline recuperável antes dos ensaios

- [ ] Instalar/habilitar o Git CLI e substituir o diretório `.git/` vazio por um repositório operacional.
- [ ] Revisar `.gitignore` para excluir `.env.local`, secrets, `.next`, temporários e artefatos privados não destinados ao repositório.
- [ ] Criar commit e tag de baseline após conferir que nenhum segredo ou dado real entrou no histórico.

# Passo 2 — Supabase, tenant e RLS

## Entregue em fonte

- [x] Migration de tipos, `barbearias`, `perfis`, `membros_barbearia`, `clientes` e `atribuicoes_cliente`.
- [x] Índices, timestamps e constraints-base.
- [x] RLS e grants por tenant/papel.
- [x] Funcionário limitado a clientes atribuídos.
- [x] Três buckets privados: fontes, recortes e selfies.
- [x] Path de Storage iniciado pelo UUID do tenant.
- [x] Seed de dois tenants e papéis de teste.
- [x] Suíte pgTAP transacional do passo 2 declarada com 59 asserções; execução ainda pendente.
- [x] Três rollbacks para as três primeiras migrations.
- [x] Rollbacks defensivos das migrations 4–5, sem `CASCADE` e com preflight transacional.
- [x] Suíte pgTAP transacional do passo 3 declarada com 109 asserções; execução ainda pendente.
- [x] Runner de concorrência com duas sessões concorrentes, uma conexão observadora, confirmação exata e marcador de banco descartável.

## P0 — validação que falta

- [x] Instalar Docker Desktop 4.86.0 e solicitar com elevação a ativação do WSL sem distribuição.
- [x] Confirmar que os marcadores CBS/Windows Update `RebootPending` não estão presentes; `PendingFileRenameOperations` ainda aparece e deve ser tratado separadamente, sem atribuir a ele a falha do Supabase sem diagnóstico.
- [x] Diagnosticar a tentativa isolada: o agente é `desktop-pqr0io6\codexsandboxoffline`, não pertence a `docker-users`, não pôde iniciar `com.docker.service` e limpou o processo Docker sem backend que havia aberto.
- [x] No usuário Windows `leoto`, abrir o Docker Desktop; os processos `Docker Desktop` e `com.docker.backend` ficaram ativos.
- [x] Confirmar que o engine ficou funcional pelo menos durante a janela de 14/08: o CLI iniciou PostgreSQL 15.8, aplicou cinco migrations, executou o seed e iniciou containers.
- [x] Executar `npm.cmd run db:start` em terminal de `leoto`; a execução transitória criou as tabelas esperadas e duas barbearias do seed, mas não permaneceu saudável.
- [ ] Reproduzir `db:start -- --debug` preservando a saída final redigida e diagnosticar por que a pilha encerra; não publicar chaves/credenciais locais impressas pelo CLI.
- [ ] Enquanto a falha ocorre, registrar `supabase status`, `docker ps -a` e logs redigidos de Storage, Kong e PostgreSQL.
- [ ] Corrigir o HTTP `502` de Storage e comprovar que `54321`, `54322` e `54323` e os health checks permanecem disponíveis; não expor o daemon Docker em `2375` apenas por causa do aviso de Analytics.
- [ ] Executar `npm run db:reset` do zero.
- [ ] Executar `npm run db:lint`.
- [ ] Executar `npm run db:test` e guardar o resultado.
- [ ] Confirmar que todas as 168 asserções realmente passam.
- [ ] Após o roll-forward, repetir `db:lint`, os 168 pgTAPs e o runner concorrente e comparar o resultado com a baseline.
- [ ] Criar fixtures/identidades Auth reais para dono AAL1, dono AAL2, funcionário e usuário cross-tenant antes dos testes de API.
- [ ] Criar harness/script reproduzível para Data API e Storage; não existe comando correspondente no `package.json` atual.
- [ ] Testar Data API com JWTs reais, não apenas claims simuladas em SQL.
- [ ] Testar leitura/escrita de Storage com URLs assinadas.
- [ ] Testar tenant A sem acesso ao tenant B.
- [ ] Testar funcionário sem acesso a cliente não atribuído.
- [ ] Testar dono AAL2 com acesso ao próprio tenant.
- [ ] Testar conta, perfil, tenant ou membership inativos cortando acesso com JWT ainda válido.
- [ ] Verificar plano de índices com volume representativo.
- [ ] Registrar evidência, versão do PostgreSQL/CLI e procedimento de reprodução.

## P0 — hardening de domínio

- [ ] Definir lifecycle completo de barbearia, perfil e membership; a migration nova cobre somente convites e funcionário.
- [x] Serializar mutations de membership por lock do tenant no SQL versionado.
- [ ] Provar com duas sessões concorrentes a proteção contra corrida de dois donos sendo rebaixados/revogados.
- [x] Bloquear mudança de `barbearia_id`/`usuario_id` e proteger a desativação/exclusão de perfil com dono ativo em fonte.
- [x] Preservar UUIDs de proveniência como histórico sem FK destrutiva para Auth.
- [ ] Definir recuperação administrativa quando o último dono estiver comprometido.
- [x] Restringir o uso direto de `service_role` em `membros_barbearia`.
- [x] Revogar `UPDATE(usuario_id)` direto de atribuições para `authenticated` e `service_role`.
- [ ] Criar RPC estreita e transacional para reatribuir cliente antes de integrar o painel real.
- [x] Manter convite e lifecycle de funcionário em RPCs estreitas e auditadas.
- [ ] Revisar todas as funções `SECURITY DEFINER`, `search_path`, grants e retornos.
- [x] Versionar rollback defensivo da migration `13000`.
- [x] Versionar rollback defensivo da migration `20260813010000`.
- [ ] Escrever runbook reproduzível, com preflight, ordem, evidência, reconciliação de `supabase_migrations` e recuperação em falha.
- [ ] Ensaiar rollback/roll-forward das migrations 4–5 em clone, seguir o runbook e comprovar o estado restaurado com toda a validação de banco.

# Passo 3 — autenticação real

## P0 — contratos SQL aplicados transitoriamente, ainda sem validação comportamental

- [x] Criar `public.convites_barbearia`.
- [x] Normalizar e validar e-mail do convite.
- [x] Modelar estados `pendente_envio`, `enviado`, `aceito`, `revogado`, `expirado` e `falhou`.
- [x] Adicionar expiração, timestamps, versionamento e autoria histórica.
- [x] Impedir dois convites abertos para o mesmo tenant/e-mail.
- [ ] Criar outbox/fila server-only para envio idempotente e retry.
- [x] Criar `criar_convite_funcionario`.
- [x] Criar `revogar_convite_barbearia`.
- [x] Criar `aceitar_convite_barbearia`.
- [x] Criar `marcar_convite_enviado`.
- [x] Criar `marcar_convite_falhou`.
- [x] Criar `provisionar_dono_controlado` com autoridade server-only.
- [x] Derivar ator, tenant e papel do JWT/contexto server-only nos comandos autenticados.
- [x] Exigir AAL2 do dono nas RPCs administrativas de convite e funcionário.
- [x] Exigir e-mail confirmado e exatamente igual ao convite no aceite.
- [x] Tornar aceite idempotente e resistente a replay em fonte.
- [ ] Tratar usuário já existente e confirmado sem duplicar conta.
- [ ] Tornar o primeiro provisionamento retomável: prevalidar antes do convite Auth, aceitar retomada segura por UUID e definir compensação quando o Auth nasce mas a RPC falha.
- [ ] Validar `BARBERVISION_APP_URL` no script de provisionamento com a mesma regra HTTPS/loopback usada pela aplicação.
- [x] Impedir promoção a dono por RPC de funcionário comum; nenhuma RPC genérica de promoção foi exposta.

## P0 — lifecycle da equipe

- [x] Implementar suspensão de funcionário com corte de acesso pelo status da membership.
- [x] Implementar reativação somente de suspenso com perfil/e-mail válidos.
- [x] Implementar revogação e remoção de atribuições na mesma transação.
- [x] Exigir novo convite para reentrada de revogado.
- [ ] Integrar `suspender_funcionario`, `reativar_funcionario` e `revogar_funcionario` à UI de Equipe.
- [ ] Listar memberships suspensas/revogadas e confirmar ações destrutivas com estados de erro/retry.
- [ ] Implementar transferência/promoção de dono em fluxo separado com aceite AAL2 do alvo.
- [x] Reforçar em fonte a proteção do último dono ativo e do perfil que ainda possui ownership.
- [x] Usar lock por tenant antes de alterar membership.
- [x] Diferenciar suspensão operacional de revogação e exclusão de dados.
- [x] Garantir por ator/AAL2 que o dono só gerencie funcionário do próprio tenant.
- [ ] Testar todos esses estados, transições e locks em PostgreSQL real e via Data API.

## P0 — auditoria

- [x] Criar `eventos_auditoria` append-only.
- [x] Registrar provisionamento, criação/envio/falha/expiração/aceite/revogação de convite e suspensão/reativação/revogação de funcionário.
- [ ] Registrar transferência de dono e outros comandos sensíveis quando esses fluxos forem criados.
- [x] Inserir evento na mesma transação de cada mudança efetiva de estado; replay/no-op não duplica evento.
- [x] Guardar ator/alvo como UUID histórico, tenant, instante, ação allowlisted, entidade e metadados sanitizados; ator é obrigatório para origem `usuario` e opcional para `sistema`.
- [x] Bloquear no primeiro nível do JSON chaves explícitas de senha, token, OTP/TOTP, link, selfie, imagem ou e-mail bruto.
- [ ] Adicionar verificação recursiva antes de aceitar qualquer metadado aninhado ou payload arbitrário.
- [x] Tornar eventos imutáveis pela API comum.
- [x] Restringir leitura da auditoria ao dono AAL2 do próprio tenant.
- [x] Manter a tabela restrita a eventos de domínio; logs do Supabase Auth permanecem separados.
- [ ] Definir retenção, exportação, request/session ID e correlação operacional da auditoria.

## P0 — MFA e sessão

- [ ] Testar o contexto mínimo do dono AAL1 em `lib/auth/context.js` contra RLS real.
- [ ] Provar que dono AAL1 chega a `/barbeiro/mfa`.
- [ ] Provar que dono AAL1 não lê barbearia, clientes, perfis alheios nem Storage.
- [ ] Provar que dono AAL2 obtém acesso autorizado.
- [ ] Provar que claim `aal` ausente é tratada como AAL1.
- [ ] Provar que funcionário AAL1 continua no escopo atribuído.
- [ ] Testar enrollment e challenge TOTP com sessão real.
- [ ] Impedir remoção do último fator sem reautenticação e recuperação segura.
- [ ] Definir recuperação quando o dono perde o autenticador.
- [ ] Definir política de reautenticação para ações críticas.
- [ ] Testar refresh, expiração, logout local e logout global.
- [ ] Fazer `SairButton` funcionar também na tela de sem acesso quando o Supabase não estiver configurado, sem lançar erro no modo demo.
- [ ] Exibir/tratar a falha do logout global na tela de Segurança; hoje o erro pode ficar silencioso.
- [ ] Testar suspensão com JWT ainda válido.
- [ ] Adicionar seletor de barbearia para múltiplas memberships.
- [ ] Não escolher silenciosamente a membership mais antiga no produto final.

## P0 — e-mail, convite e recuperação

- [ ] Criar `.env.local` apenas no ambiente controlado.
- [ ] Configurar `NEXT_PUBLIC_SUPABASE_URL` e publishable key.
- [ ] Configurar `SUPABASE_SECRET_KEY` somente no servidor.
- [ ] Definir `BARBERVISION_APP_URL` HTTPS em produção.
- [ ] Configurar allowlist exata de redirects no projeto hospedado.
- [ ] Configurar SMTP transacional e remetente verificado.
- [ ] Publicar templates de convite e recuperação.
- [ ] Testar convite real pelo Admin API.
- [ ] Testar confirmação de e-mail.
- [ ] Testar link expirado, reutilizado, inválido e e-mail divergente.
- [ ] Decidir se o link confirmado basta para ativar a membership antes de definir a senha; se não, criar e testar um estado de onboarding incompleto até a senha ser gravada.
- [ ] Criar reconciliação/job idempotente para materializar convites vencidos como `expirado`, sem depender de tocar a linha por outra RPC.
- [ ] Fazer a revogação reler/retornar o estado autoritativo e exibir `expirado` quando a RPC expirar um convite vencido, em vez de sempre anunciar “Convite revogado”.
- [ ] Verificar e tratar o erro da compensação `revogar_convite_barbearia`; não afirmar que nenhum convite ficou ativo sem confirmação do banco.
- [ ] Verificar e tratar o erro de `marcar_convite_falhou`; deixar um estado explícito de reconciliação quando a compensação também falhar.
- [ ] Testar recuperação de senha e secure password change.
- [x] Sanitizar `next` no login e callback para aceitar somente paths locais iniciados por `/barbeiro/` e rejeitar `//`.
- [ ] Testar `next` absoluto, protocol-relative, codificado e malformado no browser/E2E.
- [ ] Tratar falha entre gravação do convite e envio do e-mail.

## P1 — abuso e segurança de conta

- [ ] Definir rate limits de login, recuperação, convite e confirmação.
- [ ] Avaliar CAPTCHA após comportamento suspeito.
- [x] Exibir resposta neutra na recuperação de senha independentemente de a conta existir.
- [ ] Testar enumeração e padronizar respostas/tempo também em login, convite e confirmação.
- [ ] Definir política e medidor de força de senha.
- [x] Versionar `double_confirm_changes = true` na configuração Supabase local.
- [ ] Replicar/verificar a confirmação dupla no projeto hospedado e testar as duas confirmações ponta a ponta.
- [ ] Implementar tela de fatores/sessões ativas quando aplicável.
- [ ] Documentar resposta a conta comprometida.
- [ ] Configurar alertas para volume anormal de convites/recuperações.

## P0 — testes do passo 3

- [x] Criar pgTAP específico de Auth assurance, onboarding, lifecycle e auditoria com `plan(109)`.
- [ ] Executar a cobertura versionada de e-mail não confirmado.
- [ ] Executar a cobertura versionada de owner AAL1 negado em tabelas e Storage.
- [ ] Executar a cobertura versionada de owner AAL2 permitido no próprio tenant.
- [ ] Testar metadata forjada sem efeito.
- [ ] Testar convite cross-tenant, duplicado, expirado, revogado, replay e e-mail divergente.
- [ ] Testar corrida entre envio, aceite, revogação e expiração de convite.
- [ ] Executar os cenários versionados de lifecycle permitido/proibido e replay.
- [ ] Testar corrida entre atribuição/reatribuição e revogação de funcionário.
- [ ] Executar os cenários versionados de auditoria uma vez por transição efetiva e replay/no-op.
- [ ] Testar append-only e ACLs de auditoria para `UPDATE`, `DELETE`, `TRUNCATE`, insert direto e metadados aninhados.
- [ ] Testar outbox invisível para clientes.
- [ ] Criar cenários funcionais para `provisionar_dono_controlado` e `marcar_convite_falhou`; hoje o pgTAP verifica somente estrutura e ACL dessas RPCs.
- [x] Criar runner com duas sessões concorrentes e uma conexão observadora para último dono e atribuição/revogação.
- [ ] Executar o runner em PostgreSQL descartável e guardar evidência de lock/resultado.
- [ ] Criar E2E com Mailpit/local ou provedor descartável.
- [ ] Cobrir login, confirmação, recuperação, convite, TOTP, logout e revogação.

# Passo 4 — privacidade e consentimento

Detalhes em `docs/PRIVACIDADE-E-FLUXO-PERSISTIDO.md`.

## P0 — decisões e texto

- [ ] Identificar controlador e canal de contato de privacidade.
- [ ] Mapear nome, telefone, selfie, máscara, recorte, escolha, avaliação e eventos.
- [ ] Definir finalidade e base legal por dado/etapa com revisão jurídica adequada.
- [ ] Decidir se a selfie original será apenas efêmera ou persistida.
- [ ] Definir retenção de original, derivados, simulação e logs.
- [ ] Criar aviso de privacidade curto antes da selfie.
- [ ] Criar política completa e versionada.
- [ ] Separar consentimento da selfie de marketing/WhatsApp.
- [ ] Não usar caixa pré-marcada.
- [ ] Definir tratamento de menores de idade.
- [ ] Revisar linguagem para não prometer anonimato ou segurança absoluta.

## P0 — controles técnicos

- [ ] Exigir ação afirmativa antes de abrir câmera/upload.
- [ ] Registrar versão, finalidade, data e prova mínima quando houver persistência.
- [ ] Oferecer cancelamento sem coerção.
- [ ] Adicionar “apagar minha foto e sair”.
- [ ] Limpar selfie e derivados no cancelamento.
- [ ] Limpar dados efêmeros por TTL após abandono.
- [ ] Criar job idempotente de expiração quando houver backend.
- [ ] Excluir original e derivados juntos quando aplicável.
- [ ] Impedir URL pública permanente para selfies.
- [ ] Usar URLs assinadas curtas se Storage for necessário.
- [ ] Remover dados sensíveis de logs, analytics e erros.
- [ ] Definir processo de acesso, correção, portabilidade e eliminação.
- [ ] Registrar e ensaiar incidente de privacidade.
- [ ] Formalizar operadores/suboperadores e transferências internacionais.

## P0 — aceite

- [ ] Testar que não há captura antes da concordância.
- [ ] Testar recusa, revogação, cancelamento e expiração.
- [ ] Testar que exclusão remove todos os objetos e referências.
- [ ] Testar que tenant diferente não obtém foto nem derivado.
- [ ] Fazer revisão jurídica/LGPD antes do primeiro uso real.

# Passo 5 — primeiro fluxo vertical persistido

## P0 — modelo mínimo

- [ ] Resolver slug para tenant ativo sem expor dados internos.
- [ ] Criar serviço/catálogo público mínimo por tenant.
- [ ] Criar sessão pública ou token opaco curto, limitado ao fluxo.
- [ ] Criar entidade de simulação.
- [ ] Criar escolha de corte/barba.
- [ ] Criar disponibilidade e agendamento.
- [ ] Criar atendimento/estado do funil mínimo.
- [ ] Criar avaliação ligada a atendimento concluído.
- [ ] Criar recomendação de cuidados entregue ao cliente.
- [ ] Criar eventos de jornada necessários, sem excesso de dados.
- [ ] Definir IDs, estados, timestamps e idempotência.
- [ ] Definir retenção/exclusão de cada entidade.

## P0 — API pública estreita

- [ ] Não expor service role ao navegador.
- [ ] Criar Route Handlers/RPCs apenas para comandos necessários.
- [ ] Validar slug, token, tenant e transição de estado no servidor.
- [ ] Aplicar rate limit e antifraude básico.
- [ ] Impedir leitura enumerável de clientes, agenda e avaliações.
- [ ] Tornar criação de agendamento idempotente.
- [ ] Evitar overbooking com constraint/lock transacional.
- [ ] Criar expiração de reservas incompletas.
- [ ] Validar telefone e normalizar formato.

## P0 — jornada integrada

- [ ] Landing ler branding/catálogo reais.
- [ ] Cadastro criar ou localizar cliente com regra de deduplicação.
- [ ] Selfie seguir o contrato de privacidade.
- [ ] Simulação registrar metadados sem exigir persistir imagem original.
- [ ] Escolha salvar corte, barba, barbeiro, serviço e horário.
- [ ] Confirmação mostrar protocolo real.
- [ ] Painel receber novo cliente/agendamento.
- [ ] Funcionário ver apenas cliente atribuído.
- [ ] Dono ver todos no próprio tenant.
- [ ] Avaliação aceitar somente token ligado a atendimento concluído.
- [ ] Cuidados e produtos respeitarem o catálogo da barbearia.
- [ ] WhatsApp ser opt-in e usar provedor/modelo aprovado quando automatizado.

## P0 — teste do fluxo vertical

- [ ] E2E completo em tenant A.
- [ ] Tentativa cross-tenant por tenant B.
- [ ] Reload, retorno, expiração e reenvio.
- [ ] Duplo clique/retry sem duplicar cliente ou agenda.
- [ ] Horário concorrente por dois clientes.
- [ ] Avaliação inválida, repetida e expirada.
- [ ] Exclusão/expiração conforme política.
- [ ] Acessibilidade e mobile em aparelhos reais.

# Passo 6 — painel operacional real

## Fundação

- [ ] Substituir `mockData.js` por queries server-side/RLS progressivamente.
- [ ] Não migrar todas as telas de uma vez; começar pelo fluxo do passo 5.
- [ ] Criar estados de loading, vazio, erro e retry.
- [ ] Adotar mutations validadas e idempotentes.
- [ ] Atualizar dados após mutation sem inconsistência.
- [ ] Definir paginação e filtros server-side.

## Dashboard e clientes

- [ ] Métricas reais por tenant e período.
- [ ] Pesquisa por nome e telefone normalizado no banco.
- [ ] Índices adequados para pesquisa.
- [ ] Perfil do cliente com histórico e consentimentos.
- [ ] Atribuir/reatribuir responsável apenas como dono.
- [ ] Usar a futura RPC estreita de reatribuição; não restaurar `UPDATE(usuario_id)` direto.
- [ ] Deduplicar telefone dentro do tenant conforme regra definida.
- [ ] Exportar dados com autorização e auditoria.

## Funil, histórico, simulações e avaliações

- [ ] Estados de funil autoritativos.
- [ ] Timeline de atendimento auditável.
- [ ] Simulações ligadas ao cliente e atendimento.
- [ ] Avaliações verificadas.
- [ ] Filtros por funcionário respeitando RLS.
- [ ] Promoções e fidelidade com regras explícitas.
- [ ] Ranking/comissões derivados de lançamentos reais, não números mockados.

# Passo 7 — catálogo e pós-venda reais

## Cortes

- [ ] Upload de fonte privada pelo dono.
- [ ] Declaração de direito/licença de uso.
- [ ] Validação de MIME, dimensão, tamanho e conteúdo.
- [ ] Pipeline seguro de recorte e alpha.
- [ ] Revisão/aprovação antes de publicar.
- [ ] Versionar fonte, recorte, parâmetros-base e status.
- [ ] URLs assinadas e cache controlado.
- [ ] Desativação sem quebrar histórico.
- [ ] Catálogo público apenas com assets aprovados.

## Produtos e pós-venda

- [ ] CRUD real exclusivo do dono.
- [ ] Estoque, preço, disponibilidade e imagem.
- [ ] Relacionar cuidados e produtos sem alegação médica indevida.
- [ ] Registrar interesse/reserva/venda.
- [ ] Evitar reserva acima do estoque.
- [ ] Definir baixa, cancelamento e devolução.
- [ ] Integrar WhatsApp somente com opt-in.
- [ ] Auditar mudanças de preço e estoque.

# Passo 8 — financeiro persistente

## P0 de escopo

- [ ] Manter rótulo “gerencial” até validação contábil/jurídica.
- [ ] Separar tipo empresarial, regime tributário, município, atividade e competência.
- [ ] Nunca estimar imposto exato apenas por MEI/ME/LTDA.
- [ ] Não gerar declaração oficial sem integração e responsabilidade definidas.

## Persistência

- [ ] Modelar lançamentos, categorias, origem, competência e anexos.
- [ ] Conciliar previsto e recebido com divergência explícita.
- [ ] Fechar/reabrir período com permissão e auditoria.
- [ ] Impedir edição silenciosa de período fechado.
- [ ] Exportar pacote reproduzível para contador.
- [ ] Guardar hash/versão da exportação.
- [ ] Implementar relatórios por tenant e período.
- [ ] Definir retenção fiscal/contábil com especialista.
- [ ] Integrar pagamentos/notas somente em etapa posterior.

# Passo 9 — operação, qualidade e release

## Engenharia

- [ ] Definir estratégia de branches/releases depois da baseline Git P0.
- [ ] Criar CI com instalação limpa, lint, build e testes.
- [ ] Zerar warnings prioritários e impedir novos erros.
- [ ] Integrar à CI os testes unitários, de integração e E2E criados nos passos canônicos anteriores.
- [ ] Criar ambientes local, preview/homologação e produção separados.
- [ ] Gerenciar secrets por ambiente.
- [ ] Fixar redirects e domínios HTTPS.
- [ ] Automatizar migrations com aprovação e rollback/roll-forward.
- [ ] Automatizar `npm audit`/SCA na CI e repetir por release; a baseline manual de 14/08 passou.

## Segurança e disponibilidade

- [ ] Threat model de Auth, tenant, fluxo público, Storage e admin.
- [ ] Headers/CSP final compatível com MediaPipe e Supabase.
- [ ] Rate limiting e WAF/proteção equivalente.
- [ ] Logs estruturados sem PII desnecessária.
- [ ] Alertas de erro, latência, Auth e fila de e-mail.
- [ ] Backups automáticos e teste de restauração.
- [ ] RPO/RTO definidos.
- [ ] Runbooks de incidente, vazamento, indisponibilidade e conta comprometida.
- [ ] Plano de rotação de secrets.
- [ ] Pentest/revisão independente antes de escala.

## Qualidade de experiência

- [ ] Matriz de navegadores e aparelhos suportados.
- [ ] Testar câmera, upload, rotação EXIF e fotos grandes.
- [ ] Testar memória/tempo em celulares modestos.
- [ ] Acessibilidade por teclado, leitor de tela, foco e contraste.
- [ ] Mensagens de erro úteis e não técnicas.
- [ ] Métricas de abandono com privacidade.
- [ ] Suporte e onboarding da barbearia.

## Piloto

- [ ] Termos, privacidade e contratos aprovados.
- [ ] Uma barbearia piloto treinada.
- [ ] Catálogo com direitos confirmados.
- [ ] Dados de teste removidos.
- [ ] Plano de suporte e rollback.
- [ ] Consentimento e exclusão testados.
- [ ] Isolamento de tenant comprovado.
- [ ] Simulador validado em aparelhos reais.
- [ ] Linguagem “referência aproximada” visível.
- [ ] Go/no-go assinado pelos responsáveis.

# Backlog congelado do simulador antes do piloto

Não altera a prioridade atual de Auth/privacidade.

## P1 — validação

- [ ] Versionar manifesto reproduzível dos arquivos congelados com path, bytes e SHA-256.
- [ ] Definir algoritmo do hash agregado.
- [ ] Testar selfie frontal com cabelo curto, médio, longo, cacheado e volumoso.
- [ ] Testar diferentes tons de pele e condições de luz.
- [ ] Testar óculos, barba, tatuagem e acessórios sem regressão.
- [ ] Testar Android/iOS e navegadores suportados.
- [ ] Medir tempo, memória e falhas do MediaPipe.
- [ ] Validar fallback quando o rosto não é detectado.
- [ ] Verificar bordas, oclusão e reaparecimento do cabelo antigo.
- [ ] Revisar acessibilidade dos controles manuais.

## P2 — melhorias futuras

- [ ] Presets de ajuste por tipo de corte, mantendo controle manual.
- [ ] Melhorar recortes e alpha com processo de catálogo.
- [ ] Comparação de mais de um corte salvo.
- [ ] Telemetria de qualidade sem coletar selfie.
- [ ] Pesquisa com usuários antes de qualquer nova automação de encaixe.

# Decisões ainda abertas

- [ ] A selfie original será sempre efêmera ou poderá ser salva com opt-in separado?
- [ ] Qual é o prazo de retenção de simulações e derivados?
- [x] Ratificar no MVP atual que telefone/WhatsApp é obrigatório; qualquer flexibilização exige migration, UX e regra de contato revisadas.
- [x] Ratificar no MVP atual a deduplicação por tenant + telefone normalizado, já exigida pelo schema e pelo cadastro público.
- [ ] Como funcionará a escolha entre múltiplas memberships do mesmo usuário?
- [ ] Qual fluxo recupera o dono que perdeu o TOTP?
- [ ] Qual autoridade da plataforma provisiona o primeiro dono?
- [ ] Qual provedor de e-mail será usado?
- [ ] Qual provedor/API de WhatsApp será usado, se houver automação?
- [ ] Agendamento será interno ou integrado a calendário existente?
- [ ] Quais métricas e dados são realmente necessários?
- [ ] Qual país/município e escopo jurídico inicial do financeiro?
- [ ] Quem revisará LGPD, termos, licenças e afirmações fiscais?

# Evidência atual e manutenção

## Verificado em 21/08/2026

- [x] `npm ls --depth=0` passou.
- [x] `npm run lint` passou com 0 erros e 18 warnings.
- [x] `npm audit` passou com 0 vulnerabilidades em 14/08; não foi repetido em 21/08.
- [x] `launcher.bat --check` passou.
- [x] `node --check` passou em `scripts/provision-owner.mjs` e `scripts/test-db-concurrency.mjs`.
- [x] Atalho da Área de Trabalho corrigido e revalidado para o `launcher.bat` atual em 14/08.
- [x] Inventário atual: 166 arquivos visíveis a `rg --files`, 31 páginas, 2 Route Handlers, 11 layouts e 24 Markdown.
- [x] Integridade documental: UTF-8, links locais e fences sem falhas.
- [x] 31 páginas e 2 Route Handlers identificados em fonte.
- [x] 5 migrations, 5 rollbacks e 2 pgTAPs com 168 asserções declaradas identificados.
- [x] Migration `20260813010000` identificada em fonte com duas tabelas e nove RPCs no schema `public`.
- [x] Docker Desktop 4.86.0 e Docker CLI 29.7.2 instalados; ativação elevada do WSL terminou com exit `0`.
- [x] Bootstrap transitório de 14/08 aplicou as cinco migrations e `supabase/seed.sql`; PostgreSQL 15.8 registrou as cinco versões e duas barbearias do seed.
- [x] Durante a janela transitória, Auth health, REST sem cenário JWT e Studio responderam `200`; Storage respondeu `502`, portanto não está validado.
- [x] Simulador não foi alterado nesta revisão documental.

`npm run build` foi aprovado novamente em **14/08/2026**, com 31 páginas, 2 Route Handlers e o Proxy. O smoke sem Supabase permanece evidência histórica de **13/08/2026**, quando confirmou públicas `200` e superfícies internas redirecionadas ao modo seguro.

## Não verificado

- [ ] Tornar o build independente da rede, auto-hospedando Anton e Manrope ou adotando fontes locais equivalentes.
- [ ] Validar `wsl --status` e a seção `Server` de `docker version` fora do ambiente restrito; em 21/08 o serviço está parado, o pipe do daemon não existe e as portas locais estão fechadas.
- [ ] Reproduzir de forma estável a aplicação das migrations e do seed por `db:reset`; a execução transitória de 14/08 não prova repetibilidade nem estado preservado.
- [ ] SQL lint em PostgreSQL real.
- [ ] Repetir `db:lint` e `db:test` com a pilha ativa; as tentativas de 14/08 terminaram em `ECONNREFUSED 127.0.0.1:54322`.
- [ ] Os dois pgTAPs executados.
- [ ] Rollbacks 4–5 ensaiados e roll-forward comprovado em clone descartável.
- [ ] Runner concorrente executado; a tentativa local atual parou em `ECONNREFUSED` por ausência de PostgreSQL na porta `54322`.
- [ ] Data API autorizada por JWT e Storage funcional; um `200` no REST sem cenário de autorização e um `502` no Storage não encerram este gate.
- [ ] Login, convite, recuperação e MFA reais.
- [ ] Smoke visual atualizado de todas as rotas; o smoke HTTP de contenção já passou.

## Regra de atualização

Ao concluir qualquer item:

1. marque somente o que foi realmente executado;
2. registre o comando, ambiente e resultado;
3. atualize `README.md`, `AI context.md`, este arquivo e o documento técnico afetado;
4. preserve limitações e riscos ainda abertos;
5. não transforme uma evidência histórica em validação atual;
6. mantenha a ordem oficial dos dez gates operacionais, sem confundi-los com as nove fases de produto.

## Definição de “pronto para cliente real”

O Barber Vision só pode ser tratado como pronto para clientes reais quando, no mínimo:

- [ ] Auth, convite, MFA e revogação estiverem funcionando e testados;
- [ ] isolamento multi-tenant e Storage estiverem comprovados;
- [ ] consentimento, privacidade, retenção e exclusão estiverem implementados;
- [ ] o fluxo público estiver persistido com API estreita e antifraude básico;
- [ ] dados do painel vierem do banco sob RLS;
- [ ] catálogo tiver direitos e revisão de conteúdo;
- [ ] backups, logs, alertas, CI e resposta a incidentes existirem;
- [ ] simulador tiver sido validado em aparelhos reais;
- [ ] textos comerciais e financeiros tiverem revisão responsável;
- [ ] piloto controlado tiver plano de suporte e rollback.

Até lá, use somente dados fictícios e apresente o sistema como protótipo demonstrativo.
