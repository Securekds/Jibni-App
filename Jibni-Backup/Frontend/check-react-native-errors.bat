@echo off
REM Check specifically for React Native JavaScript errors

echo ========================================
echo Monitoring React Native JS Errors
echo ========================================
echo.
echo Open the app on your phone now...
echo Press Ctrl+C to stop monitoring
echo.
echo ========================================
echo.

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Clear logcat first
adb logcat -c

REM Monitor ONLY React Native errors
adb logcat ReactNativeJS:* *:S
