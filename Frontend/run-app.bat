@echo off
REM Build and run the Android app

echo ========================================
echo Building and Running Android App
echo ========================================
echo.
echo Make sure:
echo   1. Metro bundler is running (Terminal 1)
echo   2. watch-metro-errors.bat is running (Terminal 2)
echo   3. Your phone is connected via USB
echo.
pause

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Setup ADB reverse
echo Setting up ADB reverse...
adb reverse tcp:8081 tcp:8081

REM Build and run
echo.
echo Building and running app...
npm run android

echo.
echo ========================================
echo App should be starting on your phone
echo Check both terminals for errors!
echo ========================================
echo.

pause
