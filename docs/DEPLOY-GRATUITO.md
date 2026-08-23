# Deploy gratuito: Render + Cloudflare + Supabase

## Arquitetura

- **Render Free** executa a aplicação Next.js definida em `render.yaml`.
- **Supabase** fornece Auth, PostgreSQL, RLS, Storage e templates de e-mail.
- **Cloudflare Workers Free** executa `infra/cloudflare-outbox-scheduler` a cada minuto e chama a rota interna do Render.

Essa composição serve para demonstração e piloto técnico. O Render Free pode dormir, reiniciar ou suspender o serviço e não oferece SLA de produção. Antes de usar clientes reais, revise plano, backups, SMTP, privacidade e observabilidade.

## 1. Preparar o Supabase hospedado

1. Crie um projeto Supabase controlado.
2. Aplique as oito migrations oficiais em ordem.
3. Publique os templates `supabase/templates/invite.html` e `recovery.html`.
4. Mantenha signup público desabilitado.
5. Anote URL, publishable key e secret key. Nunca coloque a secret key no navegador ou Git.

O deploy remoto e qualquer migration destrutiva exigem backup e revisão próprios. Os testes locais não autorizam executar rollbacks no projeto hospedado.

## 2. Criar o segredo compartilhado

Gere localmente um valor de 32 bytes:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use exatamente o mesmo valor em `BARBERVISION_CRON_SECRET` no Render e no Cloudflare. Não reutilize senha, chave Supabase ou token de conta.

## 3. Publicar no Render

1. Envie o repositório para uma conta Git privada no GitHub/GitLab/Bitbucket.
2. No Render, escolha **New → Blueprint** e conecte o repositório.
3. Confirme o plano `free` e o arquivo `render.yaml`.
4. Preencha os segredos solicitados:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL HTTPS do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável |
| `SUPABASE_SECRET_KEY` | chave server-only |
| `BARBERVISION_APP_URL` | origem final `https://barbervision.onrender.com` ou domínio próprio |
| `BARBERVISION_CRON_SECRET` | segredo aleatório compartilhado |

5. Após o deploy, abra `/api/health` e confirme `200` com `ok: true`.
6. Adicione a origem final às URLs permitidas do Supabase Auth.
7. Faça login real antes de configurar o scheduler.

O nome `barbervision` pode já estar ocupado no Render; se a URL recebida for diferente, use a origem efetiva em todas as configurações.

## 4. Publicar o scheduler no Cloudflare

No diretório `infra/cloudflare-outbox-scheduler`:

```powershell
npm.cmd install
npx.cmd wrangler login
npx.cmd wrangler secret put BARBERVISION_APP_URL
npx.cmd wrangler secret put BARBERVISION_CRON_SECRET
npm.cmd run check
npm.cmd run deploy
```

Informe a origem HTTPS do Render e o mesmo segredo do passo anterior. Para alertas, configure opcionalmente um webhook HTTPS:

```powershell
npx.cmd wrangler secret put BARBERVISION_ALERT_WEBHOOK_URL
```

O cron `* * * * *` é UTC e executa a cada minuto. O Worker público responde `404`; somente o handler agendado chama a aplicação.

## 5. Validação obrigatória

1. Confira o Cron Trigger no painel Cloudflare.
2. Abra os logs em tempo real com `npx.cmd wrangler tail`.
3. Crie um convite usando uma conta de dono AAL2 controlada.
4. Confirme `Outbox processada` nos logs e a entrega do e-mail.
5. Teste segredo inválido: a rota deve responder `401`.
6. Pare temporariamente a aplicação e confirme que o Worker registra erro e aciona o webhook, se configurado.
7. Restaure a aplicação e confirme que o lease/retry entrega o item pendente.

Não considere o deploy operacional antes dessa matriz. Nunca inclua e-mail, token, link ou conteúdo do convite nos alertas.

## Limites e saída

O Render Free fornece 750 horas mensais compartilhadas e pode suspender/reiniciar serviços. O Cloudflare Workers Free limita requisições, CPU e quantidade de Cron Triggers. Se os limites deixarem de servir ao piloto, mantenha a mesma rota protegida e mova apenas o agendador/hospedagem; a outbox PostgreSQL permanece independente do provedor.
