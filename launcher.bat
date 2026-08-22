@echo off
setlocal EnableExtensions
chcp 65001 >nul

cd /d "%~dp0"
title Barber Vision - Servidor local

echo.
echo ==================================================
echo              BARBER VISION - LAUNCHER
echo ==================================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado.
  echo Instale o Node.js 22 ou superior e tente novamente.
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm.cmd nao foi encontrado no PATH.
  echo Reinstale o Node.js com o npm e tente novamente.
  echo.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%V in (`node -p "Number(process.versions.node.split('.')[0])"`) do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
  echo [ERRO] Nao foi possivel identificar a versao do Node.js.
  echo.
  pause
  exit /b 1
)

if %NODE_MAJOR% LSS 22 (
  echo [ERRO] Node.js %NODE_MAJOR% detectado. Este projeto requer Node.js 22 ou superior.
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if /I "%~1"=="--check" goto :check

if not exist "node_modules\.bin\next.cmd" (
  echo [INFO] Dependencias ainda nao instaladas. Executando npm ci...
  echo.
  call npm.cmd ci
  if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel instalar as dependencias.
    echo Verifique a internet e as mensagens acima.
    echo.
    pause
    exit /b 1
  )
)

powershell.exe -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 (
  powershell.exe -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.Content -match 'Barber Vision') { exit 0 } } catch {}; exit 1" >nul 2>&1
  if errorlevel 1 (
    echo [ERRO] A porta 3000 esta ocupada por outro servico.
    echo Feche o outro programa e tente novamente.
    echo.
    pause
    exit /b 1
  )
  echo [INFO] O servidor ja esta respondendo em http://127.0.0.1:3000
  start "" "http://127.0.0.1:3000"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

echo [INFO] Iniciando o projeto em http://127.0.0.1:3000
echo [INFO] O navegador abrira automaticamente quando o servidor estiver pronto.
echo [INFO] Para encerrar, pressione Ctrl+C nesta janela.
echo.

start "" /min powershell.exe -NoProfile -WindowStyle Hidden -Command "$limite = (Get-Date).AddSeconds(90); while ((Get-Date) -lt $limite) { try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.Content -match 'Barber Vision') { Start-Process 'http://127.0.0.1:3000'; exit 0 } } catch {}; Start-Sleep -Milliseconds 800 }; exit 1"

call npm.cmd run dev
set "LAUNCH_EXIT=%ERRORLEVEL%"

echo.
if not "%LAUNCH_EXIT%"=="0" (
  echo [ERRO] O servidor foi encerrado com o codigo %LAUNCH_EXIT%.
) else (
  echo [INFO] Servidor encerrado.
)
echo.
pause
exit /b %LAUNCH_EXIT%

:check
if not exist "package.json" (
  echo [ERRO] package.json nao encontrado em %CD%.
  exit /b 1
)
if not exist "node_modules\.bin\next.cmd" (
  echo [AVISO] Launcher valido, mas as dependencias ainda precisam ser instaladas.
  exit /b 2
)
echo [OK] Launcher valido. Node.js pronto e dependencias encontradas.
exit /b 0
