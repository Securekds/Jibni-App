@echo off
REM Remove Expo SDK and restore to pure React Native CLI

echo.
echo ========================================
echo Removing Expo SDK...
echo ========================================
echo.

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Navigate to Frontend directory
cd /d "%~dp0"

echo Uninstalling Expo...
call npm uninstall expo --legacy-peer-deps

echo.
echo ========================================
echo Expo removed! Back to React Native CLI.
echo Use: npm start (Metro bundler)
echo ========================================
echo.

pause
