@echo off
REM Kill old Metro and start fresh

echo Cleaning up and starting Metro bundler...

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Kill any process on port 8081
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start Metro bundler
echo Starting Metro bundler...
npm start
