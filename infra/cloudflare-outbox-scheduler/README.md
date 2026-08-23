# Cloudflare scheduler da outbox

Worker mínimo que chama a rota server-only do Barber Vision a cada minuto. Ele não acessa diretamente o Supabase e não contém PII.

## Segredos

Configure pelo Wrangler, sempre a partir deste diretório:

```powershell
npx.cmd wrangler secret put BARBERVISION_APP_URL
npx.cmd wrangler secret put BARBERVISION_CRON_SECRET
npx.cmd wrangler secret put BARBERVISION_ALERT_WEBHOOK_URL
```

`BARBERVISION_APP_URL` deve ser a origem HTTPS do Render. `BARBERVISION_CRON_SECRET` deve ser exatamente o mesmo valor configurado no Render. O webhook é opcional; sem ele, falhas permanecem nos logs/observabilidade do Cloudflare.

## Publicação

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run deploy
```

Depois do deploy, confirme em Workers & Pages → Triggers que `* * * * *` está ativo. Execute um convite controlado e confira os logs antes de considerar o scheduler operacional.
