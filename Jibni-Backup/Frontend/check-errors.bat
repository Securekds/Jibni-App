@echo off
REM Check for JavaScript errors in real-time

echo ========================================
echo Monitoring React Native Errors
echo ========================================
echo.
echo Open the app on your phone now...
echo Press Ctrl+C to stop monitoring
echo.
echo ========================================
echo.

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Monitor logs for errors
adb logcat *:E ReactNativeJS:* *:W | findstr /i "error exception fatal crash"
