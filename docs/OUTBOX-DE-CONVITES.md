# Outbox de convites

## Estado

A fila durável de e-mail está implementada na migration `20260822030000_invite_email_outbox.sql`. A criação de `convites_barbearia` dispara o enqueue na mesma transação PostgreSQL, eliminando a janela em que um convite poderia existir sem trabalho de entrega registrado.

Desde o commit `def60d3`, novos convites usam `/auth/complete?next=/barbeiro/ativar-conta&convite=...`. Essa página consome a sessão enviada pelo Supabase no fragmento da URL, executa `aceitar_convite_barbearia` e só então segue para a definição de senha. Convites emitidos antes dessa correção não servem como evidência e devem ser revogados antes do reteste hospedado.

O worker está em `lib/auth/invite-outbox.js`. Ele reivindica lotes por RPC com `FOR UPDATE SKIP LOCKED`, lease de cinco minutos e contador de tentativas. Falhas transitórias (timeout, HTTP 408/429 e 5xx) recebem backoff exponencial de 15 a 900 segundos; falha permanente ou quinta tentativa encerra o convite como `falhou`. A conclusão pode ser repetida sem duplicar a transição.

Cada reivindicação também:

- materializa convites vencidos como `expirado` e registra auditoria;
- cancela trabalhos ligados a convites já terminais;
- recupera itens cujo lease venceu;
- evita expor a tabela ou as RPCs a clientes `anon`/`authenticated`.

## Disparo

A Server Action de Equipe agenda uma tentativa imediata com `after()`. Isso reduz latência, mas não substitui o agendador durável: uma aplicação pode reiniciar ou não receber tráfego enquanto houver retries futuros.

Em produção, configure `BARBERVISION_CRON_SECRET` com um valor longo e aleatório e programe uma chamada frequente:

```http
POST /api/internal/convites/processar
Authorization: Bearer <BARBERVISION_CRON_SECRET>
```

A rota processa até 25 itens, usa runtime Node.js e devolve apenas IDs e estados, sem e-mail ou outro PII. Nunca exponha o segredo ao navegador nem use prefixo `NEXT_PUBLIC_`.

Cadência inicial recomendada: uma chamada por minuto. A configuração escolhida está versionada em `infra/cloudflare-outbox-scheduler`, com observabilidade Cloudflare e webhook opcional. O deploy das contas e a validação remota continuam sendo gates externos; consulte `DEPLOY-GRATUITO.md`.

## Operação e diagnóstico

Consultar a fila exige acesso operacional privilegiado. Verifique principalmente `status`, `tentativas`, `proxima_tentativa_em`, `lease_ate`, `codigo_ultimo_erro` e `enviado_em`. Não registre destinatário, token ou link em logs externos.

Se um worker cair depois de enviar o e-mail e antes de confirmar no banco, o lease libera uma nova tentativa. Em replay, uma resposta Auth 422 indicando usuário já registrado é interpretada como confirmação provável do envio anterior. Outros 422 permanecem falha permanente.

## Validação

Após a migration, passaram localmente:

- `npm run db:reset` com doze migrations e seed atualizado;
- `npm run db:lint` sem erros;
- `npm run db:test` com 59 + 112 + 21 + 13 = 205 asserções;
- `npm run lint` com zero erros e 18 warnings já existentes;
- verificação sintática dos módulos do worker e da rota.

Em 23/08, o E2E atualizado passou em 4,0 minutos após validar login, TOTP, entrega, ativação, recuperação, lifecycle, falha definitiva e expiração. O rollback/roll-forward 8–4 passou, seguido de lint, pgTAP 192/192 e runner concorrente; dois workers PostgreSQL reivindicaram itens distintos sem duplicação.

## Rollback

O rollback defensivo está em `supabase/rollback/20260822030000_invite_email_outbox.down.sql`. Antes de qualquer ensaio, use somente um banco descartável, preserve evidências e reconcilie conscientemente o histórico de `supabase_migrations` conforme o runbook de rollback.
