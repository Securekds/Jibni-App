@echo off
REM Activate virtual environment
call venv\Scripts\activate.bat

REM Navigate to Backend directory
cd /d "%~dp0"

REM Set environment variables from .env file
set SECRET_KEY=m51f!4xdlz774ym!e)hq^6(2gg(eenp)#-^j5zj%%qp))gof(=m
set REDIS_HOST=127.0.0.1
set REDIS_PORT=6379
set REDIS_URL=redis://127.0.0.1:6379
REM Use in-memory channels if Redis doesn't support BZPOPMIN (Redis 5.0+)
set USE_IN_MEMORY_CHANNELS=true

REM Start Django with Uvicorn (ASGI server for WebSockets)
echo Starting Django with Uvicorn (ASGI server for WebSockets)...
echo This enables both HTTP and WebSocket support.
echo.
uvicorn jibni.asgi:application --host 0.0.0.0 --port 8000
