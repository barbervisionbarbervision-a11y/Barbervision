# Runbook de rollback e roll-forward do banco

Última validação: **25/08/2026**. O ensaio 8–4 foi aprovado em 23/08; o incremental 10–9, em 24/08; e o rollback/roll-forward da migration 11, em 25/08.

## Escopo

Este runbook cobre o downgrade manual e defensivo das migrations 11–4. As três migrations mais recentes são:

1. `20260825010000_public_registration_protection`;
2. `20260824020000_owner_mfa_optional`;
3. `20260824010000_clientes_email`.

O conjunto histórico 8–4 é:

1. `20260822030000_invite_email_outbox`;
2. `20260822020000_owner_provisioning_resume`;
3. `20260822010000_owner_reads_inactive_member_profiles`;
4. `20260813010000_onboarding_invites_lifecycle_audit`;
5. `20260808013000_auth_assurance`.

Ele foi desenhado para o Supabase local descartável. Não autoriza execução em produção. Em ambiente persistente, interrompa writers, confirme o alvo, faça backup verificado, defina janela, responsáveis, critérios de abortar e restauração antes de qualquer downgrade.

O ensaio incremental 10–9 executa primeiro `owner_mfa_optional.down.sql`, depois `clientes_email.down.sql`, remove somente essas duas versões do histórico e usa `supabase migration up --local`. Em 24/08, as dez versões retornaram e o pgTAP passou 192/192.

O ensaio da migration 11 executa `20260825010000_public_registration_protection.down.sql`, remove somente a versão `20260825010000` do histórico e usa `supabase migration up --local`. Em 25/08, as onze versões retornaram e o pgTAP passou 205/205.

## Guardas obrigatórias

- confirmar `npx supabase status` e o alvo `127.0.0.1:54322/postgres`;
- confirmar o marcador `barbervision:disposable-concurrency-test` no comentário do banco;
- confirmar zero linhas em `public.convites_barbearia` e `public.eventos_auditoria`;
- confirmar que todo tenant ativo possui dono ativo com perfil ativo;
- parar writers externos durante o ensaio;
- nunca usar `CASCADE` nem desabilitar os preflights dos down scripts.

O rollback 5 também recusa UUIDs históricos incompatíveis com as FKs restauradas. O rollback 4 recusa execução enquanto qualquer objeto da migration 5 existir.

## Downgrade

Execute os cinco arquivos na ordem inversa, começando por `20260822030000` e terminando em `20260808013000`. O ensaio de 23/08 confirmou essa sequência.

```powershell
docker cp supabase/rollback/20260813010000_onboarding_invites_lifecycle_audit.down.sql supabase_db_barbervision:/tmp/barbervision-down-5.sql
docker exec supabase_db_barbervision psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/barbervision-down-5.sql

docker cp supabase/rollback/20260808013000_auth_assurance.down.sql supabase_db_barbervision:/tmp/barbervision-down-4.sql
docker exec supabase_db_barbervision psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/barbervision-down-4.sql
```

Depois de comprovar que os objetos exclusivos foram removidos, reconcilie apenas as cinco versões revertidas:

```powershell
docker exec supabase_db_barbervision psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c "delete from supabase_migrations.schema_migrations where version in ('20260822030000','20260822020000','20260822010000','20260813010000','20260808013000');"
```

As três migrations anteriores devem permanecer no histórico. Se qualquer down script falhar, não altere `schema_migrations`; diagnostique e restaure o estado antes de continuar.

## Roll-forward

Use os arquivos oficiais de `supabase/migrations/`, não cópias manuais:

```powershell
npx.cmd supabase migration up --local
```

Confirme que o histórico voltou a conter exatamente as onze versões e que os objetos das migrations revertidas existem novamente.

## Validação obrigatória posterior

```powershell
npm.cmd run db:lint
npm.cmd run db:test
$env:BARBERVISION_TEST_DATABASE_CONFIRM='127.0.0.1:54322/postgres'
npm.cmd run db:test:concurrency
```

Critérios de aprovação:

- lint PostgreSQL sem erros;
- pgTAP 59/59 + 112/112 + 21/21 + 13/13, total 205/205;
- corrida do último dono permite exatamente uma revogação;
- atribuição/revogação termina com membership revogada, zero atribuições e um evento;
- fixtures concorrentes são removidos;
- onze versões voltam a existir em `supabase_migrations.schema_migrations`.

## Recuperação

Se o roll-forward falhar, preserve logs e não tente corrigir o histórico manualmente às cegas. No banco local descartável, o caminho de recuperação autorizado é `npm.cmd run db:reset`, seguido de lint, pgTAP e concorrência. Em ambiente persistente, restaure o backup validado e siga o plano de incidente aprovado.
