@echo off
title Push ATM Security System to GitHub
echo ========================================================
echo Pushing ATM Security & Transaction Verification System
echo Course: 25DC205 Digital System Design Micro-Project
echo ========================================================
echo.
cd /d "%~dp0"

echo Ensuring all latest files are tracked...
git add .
git commit -m "Update ATM Security & Verification System codebase" --allow-empty

echo Setting default branch to main...
git branch -M main

:: Check if remote origin exists
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo No remote origin detected.
    set /p REPO_URL="Enter your GitHub repository URL (e.g. https://github.com/Rohit-Nadar/DSD-Micro-Project.git): "
    if not "%REPO_URL%"=="" (
        git remote add origin %REPO_URL%
    ) else (
        echo Using default repository URL...
        git remote add origin https://github.com/Rohit-Nadar/DSD-Micro-Project.git
    )
)

echo.
echo Pushing to GitHub...
echo If prompted, please click "Sign in with your browser" to authorize GitHub.
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo SUCCESS! Your project has been pushed to GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo Git push encountered an issue. Please check the message above.
    echo ========================================================
)
echo.
pause

