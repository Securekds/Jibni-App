@echo off
REM Disable Rspack/Repack and force Metro bundler

echo Disabling Rspack configuration...

REM Rename rspack config to disable it
if exist rspack.config.mjs (
    ren rspack.config.mjs rspack.config.mjs.disabled
    echo Renamed rspack.config.mjs to rspack.config.mjs.disabled
)

REM react-native.config.js already updated to not use Repack commands

echo.
echo Rspack disabled! Metro bundler will be used instead.
echo.
echo Now run: npm start -- --reset-cache

pause
