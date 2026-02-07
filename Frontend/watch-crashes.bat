@echo off
echo Watching for Android native crashes in real-time...
echo Press Ctrl+C to stop
echo.
adb logcat *:E AndroidRuntime:F *:S
