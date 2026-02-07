@echo off
REM Kill any process using port 8081 (Metro bundler)

echo Killing processes on port 8081...

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Find and kill process on port 8081
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081') do (
    echo Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo Done!
echo.
echo Now you can run: npm start

pause
