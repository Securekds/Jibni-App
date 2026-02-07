@echo off
REM Clear React Native and Rspack caches

echo Clearing caches...

REM Clear Metro/Rspack cache
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist .rspack rmdir /s /q .rspack

REM Clear npm cache (optional)
REM npm cache clean --force

echo Cache cleared!
echo.
echo Now run: npm start -- --reset-cache

pause
