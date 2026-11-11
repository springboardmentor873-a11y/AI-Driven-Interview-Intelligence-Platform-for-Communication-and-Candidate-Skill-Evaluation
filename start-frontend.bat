@echo off
setlocal
cd /d "%~dp0frontend"

echo ========================================================
echo   Starting SmartHire AI Frontend on http://localhost:5173
echo ========================================================
cmd /c npm.cmd run dev
if errorlevel 1 (
    echo.
    echo Frontend encountered an error. Press any key to close...
    pause >nul
)
