@echo off
title SmartHire AI Server
echo ===================================================
echo     SmartHire AI - Platform Server Launcher
echo ===================================================
echo.
cd /d "%~dp0backend"
echo [1/2] Checking Python Virtual Environment...
if exist ".\venv\Scripts\python.exe" (
    echo [2/2] Starting SmartHire AI Server on http://127.0.0.1:8000 ...
    echo.
    echo ---------------------------------------------------
    echo  Website:    http://127.0.0.1:8000/
    echo  Login:      http://127.0.0.1:8000/login
    echo  Register:   http://127.0.0.1:8000/register
    echo  Swagger UI: http://127.0.0.1:8000/docs
    echo ---------------------------------------------------
    echo.
    echo (Keep this terminal open while using the website. Press CTRL+C to stop.)
    echo.
    .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo [2/2] Starting with system Python...
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
)
pause

