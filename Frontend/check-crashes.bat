@echo off
echo Checking for Android native crashes...
echo.
echo === FATAL ERRORS ===
adb logcat -d *:E AndroidRuntime:F *:S | findstr /C:"FATAL" /C:"AndroidRuntime" /C:"Exception"
echo.
echo === Last 50 lines with errors ===
adb logcat -d | findstr /C:"FATAL" /C:"AndroidRuntime" /C:"Exception" /C:"Error" | more +50
echo.
echo === Full crash dump (if any) ===
adb logcat -d *:E AndroidRuntime:F *:S
pause
