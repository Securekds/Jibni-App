#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test server connectivity
"""
import requests
import socket

def test_http():
    """Test HTTP connection"""
    try:
        response = requests.get('http://172.20.10.3:8000/admin/', timeout=5)
        print(f"✓ HTTP Connection: OK (Status {response.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print("✗ HTTP Connection: FAILED - Cannot connect to server")
        return False
    except Exception as e:
        print(f"✗ HTTP Connection: ERROR - {e}")
        return False

def test_websocket_port():
    """Test if WebSocket port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('172.20.10.3', 8000))
        sock.close()
        if result == 0:
            print("✓ WebSocket Port: OPEN")
            return True
        else:
            print("✗ WebSocket Port: CLOSED")
            return False
    except Exception as e:
        print(f"✗ WebSocket Port: ERROR - {e}")
        return False

def test_api_endpoint():
    """Test API endpoint"""
    try:
        response = requests.post(
            'http://172.20.10.3:8000/api/v1/passport/send-otp/',
            json={'phone_number': '1234567890'},
            timeout=5
        )
        print(f"✓ API Endpoint: OK (Status {response.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print("✗ API Endpoint: FAILED - Cannot connect")
        return False
    except Exception as e:
        print(f"✗ API Endpoint: ERROR - {e}")
        return False

if __name__ == "__main__":
    print("\n" + "="*70)
    print("  SERVER CONNECTION TEST")
    print("="*70 + "\n")
    
    http_ok = test_http()
    ws_ok = test_websocket_port()
    api_ok = test_api_endpoint()
    
    print("\n" + "="*70)
    if http_ok and ws_ok and api_ok:
        print("  ✓ All tests passed! Server is accessible.")
    else:
        print("  ✗ Some tests failed. Check firewall and network settings.")
    print("="*70 + "\n")
    
    print("\nTroubleshooting:")
    print("1. Make sure both phones are on the same WiFi network")
    print("2. Check Windows Firewall allows Python/uvicorn on port 8000")
    print("3. Test from phone browser: http://172.20.10.3:8000/admin/")
    print("4. If using mobile data, phones won't reach your computer's IP")
