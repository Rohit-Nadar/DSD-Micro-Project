@echo off
echo ========================================================
echo Starting ATM Security & Verification System Backend
echo Fast API Service (Port 8000)
echo ========================================================
cd /d "%~dp0backend"
echo Seeding initial demo accounts...
python seed_data.py
echo Starting Uvicorn Server...
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause

