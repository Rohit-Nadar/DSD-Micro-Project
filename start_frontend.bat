@echo off
echo ========================================================
echo Starting ATM Security & Verification System Frontend
echo React + Vite + Three.js Application (Port 3000)
echo ========================================================
cd /d "%~dp0frontend"
npm.cmd run dev -- --host
pause

