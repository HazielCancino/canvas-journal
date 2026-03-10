@echo off
title Canvas Journal
echo.
echo ==============================
echo   Starting Canvas Journal
echo ==============================
echo.

REM =========================
REM 1 - Start Flask Backend
REM =========================
echo [1/2] Starting Flask backend...
cd /d C:\Users\Haziel\Documents\CODE\canvas-journal\backend
start "Flask Backend" cmd /k "python app.py"
timeout /t 3 >nul

REM =========================
REM 2 - Start React Frontend
REM =========================
echo [2/2] Starting React frontend...
cd /d C:\Users\Haziel\Documents\CODE\canvas-journal\frontend
start "React Frontend" cmd /k "npm run dev"
timeout /t 3 >nul

echo.
echo ==============================
echo   All services started!
echo   Backend: http://127.0.0.1:5000
echo   Frontend: http://localhost:5173
echo ==============================
echo.
pause