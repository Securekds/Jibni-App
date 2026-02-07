@echo off
REM Watch Metro bundler for errors in real-time

echo ========================================
echo Metro Bundler Error Monitor
echo ========================================
echo.
echo Watch the Metro terminal window for errors
echo This script will also show React Native JS errors
echo.
echo Open the app on your phone NOW...
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Show React Native JS logs
adb logcat ReactNativeJS:* *:S
