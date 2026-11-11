@echo off
setlocal
cd /d "%~dp0backend"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\astral-sh.uv_Microsoft.Winget.Source_8wekyb3d8bbwe;%PATH%"
set PYTHONUNBUFFERED=1

echo ========================================================
echo   Starting SmartHire AI Backend on http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo ========================================================
uv run python run.py
if errorlevel 1 (
    echo.
    echo Backend encountered an error. Press any key to close...
    pause >nul
)
