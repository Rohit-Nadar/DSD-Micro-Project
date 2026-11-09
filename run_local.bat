@echo off
echo ============================================================================
echo   ATM Security & Transaction Verification System - Local Launcher
echo   Course 25DC205 - Digital System Design for Data Science & Cybersecurity
echo   Karunya Institute of Technology and Sciences
echo ============================================================================
echo.
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "ATM Backend (FastAPI)" cmd /c "%~dp0start_backend.bat"

timeout /t 3 /nobreak >nul

echo [2/2] Launching React Vite Frontend on http://localhost:3000 ...
start "ATM Frontend (Vite)" cmd /c "%~dp0start_frontend.bat"

echo.
echo ============================================================================
echo Both services are now running!
echo Frontend: http://localhost:3000
echo Backend Docs: http://127.0.0.1:8000/docs
echo ============================================================================

