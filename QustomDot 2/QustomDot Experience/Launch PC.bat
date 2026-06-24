@echo off
:: QustomDot Experience — PC Launcher
cd /d "%~dp0"

:: Kill any existing instance on port 3457
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3457"') do taskkill /PID %%a /F 2>nul

:: Open the browser first (slight delay so server starts)
ping -n 2 127.0.0.1 > nul
start "" "http://localhost:3457/index.html"

:: Start the local server (python3 or python)
where python3 >nul 2>&1 && (python3 serve.py 3457) || (python serve.py 3457)

pause
