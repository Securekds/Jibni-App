@echo off
echo ========================================
echo Watching for API and Network Logs
echo ========================================
echo.
echo This will show:
echo - [API] logs - API calls and responses
echo - [HOME] logs - HomeScreen actions
echo - [USE_CLIENT] logs - Client hook calls
echo - Network errors
echo.
echo Press Ctrl+C to stop
echo.
adb logcat -s ReactNativeJS:* | findstr /i "API HOME USE_CLIENT network error"