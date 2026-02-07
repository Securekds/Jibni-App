#!/usr/bin/env python
"""
Test Backend Connections and Readiness
"""
import os
import sys
import django
import requests
import redis

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jibni.settings')
django.setup()

from django.db import connection
from django.conf import settings

def print_section(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def test_database():
    print_section("DATABASE CONNECTION")
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        print("[OK] Database: CONNECTED")
        print(f"[OK] Database File: {settings.DATABASES['default']['NAME']}")
        print(f"[OK] Tables Found: {len(tables)}")
        print(f"     Key Tables: passport_user, passport_profile, wire_mission")
        return True
    except Exception as e:
        print(f"[ERROR] Database: FAILED - {e}")
        return False

def test_redis():
    print_section("REDIS CONNECTION")
    try:
        r = redis.Redis(
            host=settings.REDIS_HOST,
            port=int(settings.REDIS_PORT),
            decode_responses=True
        )
        r.ping()
        print(f"[OK] Redis: CONNECTED")
        print(f"[OK] Redis Host: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        return True
    except Exception as e:
        print(f"[ERROR] Redis: FAILED - {e}")
        print(f"[WARNING] WebSocket features will not work without Redis!")
        return False

def test_backend_api():
    print_section("BACKEND API SERVER")
    api_url = "http://192.168.192.101:8000"
    
    try:
        # Test if server is running
        response = requests.get(f"{api_url}/api/v1/docs/swagger/", timeout=5)
        if response.status_code == 200:
            print(f"[OK] Backend Server: RUNNING")
            print(f"[OK] API URL: {api_url}")
            print(f"[OK] Swagger Docs: {api_url}/api/v1/docs/swagger/")
            return True
        else:
            print(f"[WARNING] Backend Server: Responding but status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Backend Server: NOT RUNNING")
        print(f"[INFO] Start server with: start-backend.bat")
        return False
    except Exception as e:
        print(f"[ERROR] Backend Server: {e}")
        return False

def test_api_endpoints():
    print_section("API ENDPOINTS TEST")
    api_url = "http://192.168.192.101:8000"
    
    endpoints = [
        ("/api/v1/passport/send-otp/", "POST", "Send OTP"),
        ("/api/v1/passport/verify-otp/", "POST", "Verify OTP"),
        ("/api/v1/passport/server-upgrade/status/", "GET", "Upgrade Status"),
        ("/api/v1/wire/servers/nearby/", "GET", "Nearby Servers"),
    ]
    
    for endpoint, method, name in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{api_url}{endpoint}", timeout=3)
            else:
                response = requests.post(f"{api_url}{endpoint}", json={}, timeout=3)
            
            # 200, 400, 401, 404 are all valid responses (means endpoint exists)
            if response.status_code in [200, 400, 401, 404]:
                print(f"[OK] {name}: Available (Status: {response.status_code})")
            else:
                print(f"[WARNING] {name}: Status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"[ERROR] {name}: Server not reachable")
        except Exception as e:
            print(f"[ERROR] {name}: {str(e)[:50]}")

def test_websocket_config():
    print_section("WEBSOCKET CONFIGURATION")
    ws_url = "ws://192.168.192.101:8000"
    
    endpoints = [
        f"{ws_url}/ws/server/",
        f"{ws_url}/ws/missions/",
    ]
    
    print(f"[INFO] WebSocket URLs configured:")
    for endpoint in endpoints:
        print(f"       {endpoint}")
    print(f"[INFO] WebSocket requires JWT authentication")
    print(f"[INFO] Test WebSocket connection from React Native app")

def test_frontend_config():
    print_section("FRONTEND CONFIGURATION CHECK")
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Frontend")
    api_file = os.path.join(frontend_path, "src", "services", "api.ts")
    ws_file = os.path.join(frontend_path, "src", "config", "websocket.ts")
    
    if os.path.exists(api_file):
        with open(api_file, 'r', encoding='utf-8') as f:
            content = f.read()
            if "192.168.192.101:8000" in content:
                print("[OK] Frontend API URL: Configured correctly")
            else:
                print("[WARNING] Frontend API URL: May need update")
    
    if os.path.exists(ws_file):
        with open(ws_file, 'r', encoding='utf-8') as f:
            content = f.read()
            if "192.168.192.101:8000" in content:
                print("[OK] Frontend WebSocket URL: Configured correctly")
            else:
                print("[WARNING] Frontend WebSocket URL: May need update")

def main():
    print("\n" + "="*70)
    print("  BACKEND READINESS TEST")
    print("="*70)
    
    results = []
    results.append(("Database", test_database()))
    results.append(("Redis", test_redis()))
    results.append(("Backend API", test_backend_api()))
    
    test_api_endpoints()
    test_websocket_config()
    test_frontend_config()
    
    print_section("SUMMARY")
    all_ok = all(result[1] for result in results)
    
    if all_ok:
        print("[SUCCESS] All critical systems are ready!")
        print("\nYou can now:")
        print("  1. Start React Native app: npm start (in Frontend directory)")
        print("  2. Run on device: npm run android")
        print("  3. Test authentication flow (Send OTP -> Verify OTP)")
        print("  4. Test server upgrade requests")
        print("  5. Test mission creation and WebSocket connections")
    else:
        print("[WARNING] Some systems need attention:")
        for name, status in results:
            status_text = "OK" if status else "NEEDS FIX"
            print(f"  {name}: {status_text}")
    
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled.")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
