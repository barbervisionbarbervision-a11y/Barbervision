# Pendências — Barber Vision

Backlog oficial do projeto, reconciliado com o código e as evidências de execução em **24/08/2026**. A evidência temporal detalhada está em [Estado de validação](docs/ESTADO-VALIDACAO.md).

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
| 2 — Supabase, tenant e RLS | Oito migrations validadas localmente; nove aplicadas no hospedado | Atualizar o seed para a migration 9, repetir os gates e integrá-los à CI |
| 3 — Auth real | Auth/lifecycle locais aprovados; redirects, SMTP e cadastro web do primeiro dono implementados | Validar o novo fluxo hospedado e concluir a matriz remota |
| 4 — Privacidade e consentimento | Não iniciado | Definir e implementar governança antes de persistir selfies |
| 5 — Fluxo vertical persistido | Não iniciado | Modelar e persistir um único fluxo público seguro |
| 6 — Painel operacional | Não iniciado | Remover mocks somente após o fluxo vertical |
| 7 — Catálogo e pós-venda | Não iniciado | Upload/licença/estoque/reserva reais |
| 8 — Financeiro persistente | Não iniciado | Persistir dados gerenciais sem prometer imposto exato |
| 9 — Operação e release | Não iniciado | CI, observabilidade, backups, segurança e piloto |

## O que já está concluído no protótipo

### Demonstração e interface

- [x] Landing pública por slug visual.
- [x] Formulário público de nome, e-mail e WhatsApp.
- [x] `POST /api/clientes` server-side e migration remota de e-mail de cliente.
- [ ] Corrigir e comprovar a gravação hospedada; tentativa atual termina em erro do Supabase.
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

1. **P0 — concluir o cadastro público mínimo**: corrigir a conexão remota de `POST /api/clientes`, confirmar tenant por slug e provar insert/upsert sem duplicação.
2. **P0 — atualizar e revalidar o banco local**: adicionar e-mails válidos ao seed e repetir reset, lint, pgTAP, integração e rollback/roll-forward com as nove migrations.
3. **P0 — validar o primeiro usuário/dono**: testar `/barbeiro/criar-conta`, confirmação, senha, tenant e MFA no hospedado; trocar o rate limit em memória por proteção distribuída/CAPTCHA antes do piloto.
4. **P0 — provar Auth hospedado**: validar Brevo, remetente, templates, convite, confirmação e recuperação; depois publicar Cloudflare e testar a outbox.
5. **P0 — implementar privacidade, consentimento, retenção e exclusão** antes de persistir selfies ou usar pessoas reais.
6. **P1 — completar comandos administrativos**: reatribuição transacional, transferência de dono e seleção multi-tenant.

Concluídos nesta fundação: lifecycle de funcionário, Auth/e-mail/TOTP, compensações autoritativas, provisionamento retomável, sessão/recuperação, E2E atualizado da outbox, rollback/roll-forward 8–4 e corrida real entre dois workers.

Depois desses gates, implementar o fluxo vertical do passo 5 e só então migrar painel, catálogo, produtos, financeiro e operação.

## P0 — baseline recuperável antes dos ensaios

- [x] Git CLI e repositório operacional disponíveis.
- [x] Baseline recuperável criado no commit `7c34dab`.
- [x] `.gitignore` exclui `.env.local`, `.next`, temporários e artefatos privados relevantes.
- [ ] Criar tags de marcos futuros após cada gate integralmente validado.

# Passo 2 — Supabase, tenant e RLS

## Entregue em fonte

- [x] Migration de tipos, `barbearias`, `perfis`, `membros_barbearia`, `clientes` e `atribuicoes_cliente`.
- [x] Índices, timestamps e constraints-base.
- [x] RLS e grants por tenant/papel.
- [x] Funcionário limitado a clientes atribuídos.
- [x] Três buckets privados: fontes, recortes e selfies.
- [x] Path de Storage iniciado pelo UUID do tenant.
- [x] Seed de dois tenants e papéis de teste.
- [x] Suíte pgTAP transacional do passo 2 declarada com 59 asserções; 27 rodaram sem falha em 22/08 e a suíte abortou por SQL inválido no teste antes das 32 restantes.
- [x] Três rollbacks para as três primeiras migrations.
- [x] Rollbacks defensivos das migrations 4–5, sem `CASCADE` e com preflight transacional.
- [x] Suíte pgTAP transacional do passo 3 ampliada e aprovada com 112/112 asserções em 22/08.
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
- [x] Corrigir a saúde local atualizando o CLI para 2.115.0 e desativando Analytics/Vector opcionais; `54321`, `54322`, `54323`, Auth, Storage e Studio permanecem disponíveis sem expor `2375`.
- [x] Executar `npm run db:reset` do zero: migrations e seed aplicados; validação pós-reset aprovada.
- [x] Atualizar Supabase CLI para 2.115.0, desativar Analytics/Vector opcionais e obter `db:start` + `db:reset` com exit `0`.
- [x] Executar `npm run db:lint`: aprovado sem erros em 22/08.
- [x] Executar `npm run db:test`: aprovado em 22/08 com 59/59 no passo 2 e 112/112 no passo 3.
- [x] Corrigir os três cenários de `UPDATE` e o fixture que isola a constraint de formato do telefone.
- [x] Confirmar que todas as 192 asserções passam após reset limpo.
- [ ] Após o roll-forward, repetir `db:lint`, os 168 pgTAPs e o runner concorrente e comparar o resultado com a baseline.
- [x] Criar fixtures efêmeras Auth reais para dono AAL1/AAL2, funcionário e usuário cross-tenant nos harnesses locais, com limpeza ao final.
- [x] Criar harness reproduzível para Data API e Storage: `npm run db:test:integration` aprovado com JWT/TOTP e blob reais.
- [x] Testar Data API com JWTs reais, incluindo AAL1/AAL2, funcionário atribuído, suspenso, sem membership e cross-tenant.
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
- [x] Criar outbox/fila server-only para envio idempotente, lease e retry com backoff.
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
- [x] Tornar o primeiro provisionamento retomável: prevalidar antes do convite Auth, reutilizar identidade por e-mail, aceitar retomada segura por UUID e emitir comando seguro quando o Auth nasce mas a RPC falha.
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
- [x] Testar enrollment, challenge e verify TOTP com sessão real no harness JWT e no Playwright.
- [x] Não oferecer remoção self-service do último fator; recuperação exige comando server-only, UUID, e-mail coincidente, dono ativo e confirmação operacional explícita.
- [ ] Definir recuperação quando o dono perde o autenticador.
- [ ] Definir política de reautenticação para ações críticas.
- [x] Testar refresh válido, access token expirado, logout local no Playwright e logout global invalidando refresh token de outra sessão.
- [ ] Fazer `SairButton` funcionar também na tela de sem acesso quando o Supabase não estiver configurado, sem lançar erro no modo demo.
- [x] Exibir falha explícita do logout global na tela de Segurança.
- [ ] Testar suspensão com JWT ainda válido.
- [ ] Adicionar seletor de barbearia para múltiplas memberships.
- [ ] Não escolher silenciosamente a membership mais antiga no produto final.

## P0 — e-mail, convite e recuperação

- [ ] Criar `.env.local` apenas no ambiente controlado.
- [ ] Configurar `NEXT_PUBLIC_SUPABASE_URL` e publishable key.
- [ ] Configurar `SUPABASE_SECRET_KEY` somente no servidor.
- [ ] Definir `BARBERVISION_APP_URL` HTTPS em produção.
- [ ] Configurar allowlist exata de redirects no projeto hospedado.
- [x] Configurar SMTP Brevo no Supabase e desativar bloqueio de IP incompatível com IP dinâmico do Render.
- [ ] Provar entrega real de convite, confirmação e recuperação pelo SMTP hospedado.
- [ ] Publicar templates de convite e recuperação.
- [x] Testar convite real pelo Admin API, entrega no Mailpit, confirmação e ativação pela aplicação.
- [ ] Testar confirmação de e-mail.
- [ ] Testar link expirado, reutilizado, inválido e e-mail divergente.
- [ ] Decidir se o link confirmado basta para ativar a membership antes de definir a senha; se não, criar e testar um estado de onboarding incompleto até a senha ser gravada.
- [x] Criar reconciliação idempotente para materializar convites vencidos como `expirado` durante cada lote do worker.
- [ ] Configurar um agendador no ambiente hospedado para chamar periodicamente a rota protegida do worker.
- [x] Versionar Blueprint Render Free, health check e Cloudflare Cron Trigger a cada minuto com webhook opcional.
- [x] Criar o projeto Supabase hospedado em São Paulo, vincular a CLI e aplicar as nove migrations atuais.
- [x] Conectar o repositório privado ao Blueprint Render e chegar ao formulário das cinco variáveis.
- [x] Revogar a `SUPABASE_SECRET_KEY` exposta em captura e criar uma substituta antes do deploy; confirmação do usuário em 24/08, sem registrar o novo valor.
- [x] Concluir o deploy Render no commit `fbed47b`; URL `https://barbervision.onrender.com` Live e `/api/health` validado com HTTP 200.
- [x] Diagnosticar o primeiro build Render: `tailwindcss` foi omitido pelo `npm ci` sob `NODE_ENV=production`; corrigir o Blueprint com `--include=dev`.
- [x] Configurar Site URL e redirects exatos de `/auth/confirm` e `/auth/callback` no Supabase hospedado.
- [x] Manter signup público desabilitado e confirmação de e-mail habilitada.
- [ ] Aplicar/revisar templates hospedados e provar SMTP em entrega real.
- [x] Implementar `/barbeiro/criar-conta` e o botão `Começar agora`, reutilizando a RPC controlada e confirmação por convite.
- [ ] Validar o fluxo hospedado e reforçar a proteção contra abuso com mecanismo distribuído/CAPTCHA.
- [ ] Publicar o Worker Cloudflare e provar o cron em logs remotos com convite controlado.
- [x] Fazer a revogação reler/retornar o estado autoritativo e exibir `expirado` quando a RPC expirar um convite vencido, em vez de sempre anunciar “Convite revogado”.
- [x] Verificar e tratar o erro da compensação `revogar_convite_barbearia`; não afirmar que nenhum convite ficou ativo sem confirmação do banco.
- [x] Verificar e tratar o erro de `marcar_convite_falhou`; deixar um estado explícito de reconciliação quando a compensação também falhar.
- [x] Testar solicitação, e-mail, callback e redefinição de senha pela aplicação local.
- [x] Sanitizar `next` no login e callback para aceitar somente paths locais iniciados por `/barbeiro/` e rejeitar `//`.
- [ ] Testar `next` absoluto, protocol-relative, codificado e malformado no browser/E2E.
- [x] Tratar falha entre gravação do convite e envio do e-mail com enqueue atômico, lease, retry e conclusão idempotente.

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
- [x] Testar estrutura, ACL server-only, enqueue, lease, retry, conclusão idempotente, expiração e cancelamento da outbox em pgTAP.
- [ ] Testar dois workers simultâneos reivindicando a outbox em conexões PostgreSQL reais.
- [ ] Criar cenário funcional de banco para `provisionar_dono_controlado`; `marcar_convite_falhou` já está coberta no E2E pela rejeição real da Admin API.
- [x] Criar runner com duas sessões concorrentes e uma conexão observadora para último dono e atribuição/revogação.
- [x] Executar o runner em PostgreSQL descartável e guardar evidência de lock/resultado: duas corridas aprovadas em 22/08.
- [x] Criar E2E Playwright com Supabase e Mailpit locais e fixtures efêmeras.
- [x] Cobrir login, confirmação/ativação, recuperação, convite, TOTP, logout e revogação de convite.

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
- [x] Recuperação operacional server-only com verificação externa de identidade, UUID + e-mail coincidentes, membership de dono ativa e confirmação explícita; remove fatores via Admin API e força novo enrollment.
- [ ] Qual autoridade da plataforma provisiona o primeiro dono?
- [ ] Qual provedor de e-mail será usado?
- [ ] Qual provedor/API de WhatsApp será usado, se houver automação?
- [ ] Agendamento será interno ou integrado a calendário existente?
- [ ] Quais métricas e dados são realmente necessários?
- [ ] Qual país/município e escopo jurídico inicial do financeiro?
- [ ] Quem revisará LGPD, termos, licenças e afirmações fiscais?

# Evidência atual e manutenção

## Verificado em 22/08/2026

- [x] `npm ls --depth=0` passou.
- [x] `npm run lint` passou com 0 erros e 18 warnings.
- [x] `npm audit` passou com 0 vulnerabilidades em 14/08; não foi repetido em 21/08.
- [x] `launcher.bat --check` passou.
- [x] `node --check` passou em `scripts/provision-owner.mjs` e `scripts/test-db-concurrency.mjs`.
- [x] Atalho da Área de Trabalho corrigido e revalidado para o `launcher.bat` atual em 14/08.
- [x] Inventário de 24/08: 195 arquivos visíveis a `rg --files`, 31 páginas e 5 Route Handlers.
- [x] Integridade documental: UTF-8, links locais e fences sem falhas.
- [x] 31 páginas e 5 Route Handlers identificados em fonte.
- [x] Inventário atual: 10 migrations, 10 rollbacks e 3 pgTAPs com 192 asserções históricas.
- [x] Tornar o autenticador TOTP opcional, com ação **Configurar depois** e acesso posterior pela tela de Segurança.
- [ ] Criar step-up explícito para futuras operações de alto risco, sem voltar a bloquear todo o painel em AAL1.
- [ ] Adicionar testes de banco para a migration 9 e repetir reset/lint/pgTAP.
- [x] Git operacional e baseline `7c34dab` confirmados; árvore limpa antes desta revisão.
- [x] `npm run build` aprovado em 22/08 com 31 páginas, 2 Route Handlers e Proxy.
- [x] `npm run db:lint` aprovado em 22/08 sem erros de schema.
- [x] pgTAP do passo 3 aprovado com 112/112 asserções.
- [x] pgTAP do passo 2 aprovado com 59/59.
- [x] Migration `20260813010000` identificada em fonte com duas tabelas e nove RPCs no schema `public`.
- [x] Docker Desktop 4.86.0 e Docker CLI 29.7.2 instalados; ativação elevada do WSL terminou com exit `0`.
- [x] Reset limpo de 23/08 aplicou as oito migrations e `supabase/seed.sql`.
- [x] Auth, Storage e Studio responderam `200`; containers necessários estão saudáveis.
- [x] Simulador não foi alterado nesta revisão documental.

`npm run build` foi aprovado novamente em **22/08/2026**, com 31 páginas, 2 Route Handlers e o Proxy. O smoke sem Supabase permanece evidência histórica de **13/08/2026**, quando confirmou públicas `200` e superfícies internas redirecionadas ao modo seguro.

## Não verificado

- [ ] Tornar o build independente da rede, auto-hospedando Anton e Manrope ou adotando fontes locais equivalentes.
- [x] Serviços necessários saudáveis; Imgproxy, Analytics, Vector e Pooler explicitamente desativados/não usados.
- [x] Reproduzir a aplicação das migrations e do seed por `db:reset`; cinco versões e duas barbearias confirmadas.
- [x] Obter encerramento limpo do CLI no reset com Supabase CLI 2.115.0.
- [x] SQL lint em PostgreSQL local aprovado.
- [x] Corrigir e repetir o pgTAP do passo 2: aprovado 59/59.
- [x] As três suítes pgTAP aprovadas integralmente: 192/192.
- [x] Rollbacks 4–5 ensaiados historicamente, com histórico reconciliado e roll-forward comprovado.
- [x] Ensaiar o conjunto atual 8–4, reconciliar cinco versões e repetir lint, pgTAP 192/192 e concorrência em 23/08.
- [x] Runner concorrente executado em 22/08 no banco local marcado: duas corridas aprovadas e limpeza dos fixtures concluída.
- [ ] Data API autorizada por JWT e Storage funcional com upload/download real; health check `200` não encerra este gate.
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
