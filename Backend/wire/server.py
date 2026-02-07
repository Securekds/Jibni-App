import asyncio
import websockets
import json
import time

JWT_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU1MzQyOTYyLCJpYXQiOjE3NTUzMzkzNjIsImp0aSI6ImYwMGNmNzA1NDljZTQ2NmY4Njk0M2E5MmViZDg5YmY2IiwidXNlcl9pZCI6IjMifQ.y2KbGRulNl2cNKcS82d5PkWODqjogcmGMGn014z17aM"
URL = f"ws://127.0.0.1:8000/ws/server/?token={JWT_ACCESS_TOKEN}"  

# Example coordinates
LATITUDE = 35.579495
LONGITUDE = 1.827618


async def send_heartbeat():
    # headers = {"Authorization": f"Bearer {JWT_ACCESS_TOKEN}"}

    async with websockets.connect(URL) as ws:
        response = await ws.recv()
        print("Connected:", response)

        while True:
            payload = {"type": "heartbeat", "lat": LATITUDE, "lng": LONGITUDE}
            await ws.send(json.dumps(payload))
            print(f"Heartbeat sent at {time.strftime('%X')}")
            await asyncio.sleep(10)  # Wait 15 seconds


# Run it
asyncio.run(send_heartbeat())
