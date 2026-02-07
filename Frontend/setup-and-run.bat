@echo off
REM Complete setup: Kill old Metro, start fresh, setup ADB reverse, and run app

echo ========================================
echo Complete React Native Setup
echo ========================================
echo.

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Step 1: Kill old Metro process
echo [1/4] Cleaning up old Metro processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM Step 2: Setup ADB reverse
echo [2/4] Setting up ADB reverse port forwarding...
adb reverse tcp:8081 tcp:8081
if %ERRORLEVEL% EQU 0 (
    echo ✓ ADB reverse configured successfully
) else (
    echo ✗ ADB reverse failed - make sure your phone is connected
)

echo.
echo [3/4] Starting Metro bundler in background...
echo      (Keep this window open!)
echo.
start "Metro Bundler" cmd /k "cd /d %~dp0 && npm start"

REM Wait a bit for Metro to start
timeout /t 5 /nobreak >nul

REM Step 4: Run Android app
echo [4/4] Building and running Android app...
echo.
npm run android

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Metro bundler is running in a separate window.
echo If the app crashes, check that window for errors.
echo.
pause
