@echo off
REM Activate virtual environment
call venv\Scripts\activate.bat

REM Navigate to Backend directory
cd /d "%~dp0"

REM Set environment variables
set SECRET_KEY=m51f!4xdlz774ym!e)hq^6(2gg(eenp)#-^j5zj%%qp))gof(=m

REM Run the script
python find_driver_phone.py %*
