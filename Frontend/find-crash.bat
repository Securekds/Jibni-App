@echo off
echo ========================================
echo Checking for app crashes...
echo ========================================
echo.
echo Step 1: Clearing logcat buffer...
adb logcat -c
echo.
echo Step 2: Please CRASH the app now (reload it)...
echo Waiting 5 seconds for you to reload the app...
timeout /t 5 /nobreak >nul
echo.
echo Step 3: Checking for crashes...
echo.
echo === NATIVE CRASHES (AndroidRuntime) ===
adb logcat -d AndroidRuntime:E *:S
echo.
echo === JAVASCRIPT ERRORS ===
adb logcat -d ReactNativeJS:E *:S
echo.
echo === ALL ERRORS ===
adb logcat -d *:E | findstr /C:"FATAL" /C:"Exception" /C:"Error" /C:"crash"
echo.
echo ========================================
echo Done! Check the output above for crash details.
echo ========================================
pause
