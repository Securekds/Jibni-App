@echo off
REM Get comprehensive React Native error logs

echo ========================================
echo React Native Full Error Logs
echo ========================================
echo.
echo This will show ALL React Native errors
echo Open the app on your phone NOW...
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Clear logcat
adb logcat -c

REM Show React Native JS errors and warnings
adb logcat ReactNativeJS:* ReactNative:* *:E *:F | findstr /i "error exception fatal crash reactnative"
