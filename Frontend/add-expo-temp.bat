@echo off
REM Temporarily add Expo for quick testing with Expo Go
REM WARNING: Some native modules won't work in Expo Go!

echo.
echo ========================================
echo Adding Expo SDK temporarily...
echo ========================================
echo.
echo WARNING: The following modules WON'T work in Expo Go:
echo   - react-native-maps
echo   - react-native-image-crop-picker
echo   - react-native-geolocation-service (limited)
echo   - react-native-permissions
echo   - @react-native-community/blur
echo.
echo This is for QUICK TESTING ONLY!
echo.
pause

REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Navigate to Frontend directory
cd /d "%~dp0"

echo Installing Expo SDK...
call npm install expo@~52.0.0 --save --legacy-peer-deps

echo.
echo ========================================
echo Expo added! You can now use:
echo   npx expo start
echo.
echo To remove Expo later, run: remove-expo.bat
echo ========================================
echo.

pause
