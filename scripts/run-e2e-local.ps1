$ErrorActionPreference = 'Stop'

$rawStatus = npx.cmd supabase status --output json | Out-String
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$status = $rawStatus.TrimStart([char]0xFEFF) | ConvertFrom-Json

$env:NEXT_PUBLIC_SUPABASE_URL = $status.API_URL
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $status.PUBLISHABLE_KEY
$env:SUPABASE_SECRET_KEY = $status.SECRET_KEY
$env:BARBERVISION_E2E_PORT = '3010'
$env:BARBERVISION_E2E_APP_URL = 'http://127.0.0.1:3010'
$env:BARBERVISION_APP_URL = $env:BARBERVISION_E2E_APP_URL
$env:BARBERVISION_TEST_DATABASE_CONFIRM = '127.0.0.1:54322/postgres'
$env:BARBERVISION_E2E_MAILPIT_URL = $status.MAILPIT_URL

npx.cmd playwright test
exit $LASTEXITCODE
