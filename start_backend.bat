@echo off
echo ========================================================
echo Starting Chennai Disaster Simulation Backend (FastAPI)...
echo ========================================================
cd /d "%~dp0"

echo Checking and freeing port 8000 if in use...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo Launching API server on http://localhost:8000 ...
python backend/run_server.py
pause
