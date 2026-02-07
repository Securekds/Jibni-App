@echo off
REM Activate virtual environment
call venv\Scripts\activate.bat

REM Navigate to Backend directory
cd /d "%~dp0"

REM Set environment variables
set SECRET_KEY=m51f!4xdlz774ym!e)hq^6(2gg(eenp)#-^j5zj%%qp))gof(=m
set REDIS_HOST=127.0.0.1
set REDIS_PORT=6379
set REDIS_URL=redis://127.0.0.1:6379

REM Run connection tests
python test_connections.py

pause
