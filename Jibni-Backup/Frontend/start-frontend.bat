@echo off
REM Add Node.js to PATH
set PATH=%TEMP%;C:\Program Files\nodejs;%PATH%

REM Navigate to Frontend directory
cd /d "%~dp0"

REM Clear cache if needed (optional)
REM if exist node_modules\.cache rmdir /s /q node_modules\.cache

REM Start Metro bundler
npm start
