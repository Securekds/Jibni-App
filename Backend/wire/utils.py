import json
import math
import time
import redis
from django.conf import settings
from functools import lru_cache
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from jibni.settings import HEARTBEAT_RATE_LIMIT, REDIS_THROTTLE_SECONDS, SERVER_TTL
from wire.redis import redis_client
from wire.models import Mission
import requests
from django.utils import timezone
from passport.models import Profile
User = get_user_model()

def haversine(lat1, lng1, lat2, lng2):
    R = 6371  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


r = redis.StrictRedis()


def can_toggle_availability(user_id):
    key = f"availability_toggle:{user_id}"
    if r.exists(key):
        return False
    r.setex(key, REDIS_THROTTLE_SECONDS, "1")  
    return True


@lru_cache
def get_redis():
    return redis.Redis(
        host=getattr(settings, "REDIS_HOST", "localhost"),
        port=getattr(settings, "REDIS_PORT", 6379),
        db=0,
        decode_responses=True,
    )


def create_mission_from_json(data):

    try:

        client = User.objects.get(pk=int(data["client_id"]))
        server = User.objects.get(pk=int(data["server_id"]))

        mission = Mission.objects.create(
            client=client,
            server=server,
            client_lat=float(data["client_lat"]),
            client_lng=float(data["client_lng"]),
            server_lat=float(data["server_lat"]),
            server_lng=float(data["server_lng"]),
            price = data["price"],
            mission_id=data["mission_id"],
            destination_lat=(
                float(data["destination_lat"]) if data.get("destination_lat") else None
            ),
            destination_lng=(
                float(data["destination_lng"]) if data.get("destination_lng") else None
            ),
            status=data["status"],
        )
        mission.save()
        return mission
    except User.DoesNotExist:
        
        raise ValueError("Client or Server user not found")
    except Exception as e:
        
        raise e


async def store_location(
    user_id: int, lat: float, lng: float
) -> bool:
    location_key = f"server:{user_id}"
    beat_key = f"server:{user_id}:last_beat"
    current_time = time.time()

    print(f"[STORE-LOCATION] Storing location for user {user_id}: lat={lat}, lng={lng}")

    pipe = redis_client.pipeline()
    pipe.get(beat_key)
    last_beat = await pipe.execute()
    last_beat = last_beat[0]

    if last_beat and current_time - float(last_beat) < HEARTBEAT_RATE_LIMIT:
        print(f"[STORE-LOCATION] Rate limit exceeded for user {user_id}. Last beat: {last_beat}, current: {current_time}, diff: {current_time - float(last_beat)}s, limit: {HEARTBEAT_RATE_LIMIT}s")
        return False

    pipe = redis_client.pipeline()
    value = json.dumps({"lat": float(lat), "lng": float(lng), "ts": current_time})
    print(f"[STORE-LOCATION] Setting Redis keys: {location_key} (TTL={SERVER_TTL}s), {beat_key} (TTL=60s)")
    pipe.set(location_key, value, ex=SERVER_TTL)
    pipe.set(beat_key, current_time, ex=60)
    result = await pipe.execute()
    print(f"[STORE-LOCATION] ✅ Location stored successfully for user {user_id}. Redis result: {result}")
    
    # Verify the key was set
    stored_value = await redis_client.get(location_key)
    print(f"[STORE-LOCATION] Verification: Key {location_key} exists: {stored_value is not None}, value: {stored_value}")
    
    return True


@database_sync_to_async
def _get_user_profile_role(user):
    """Synchronous helper to get user profile role"""
    try:
        # Refresh user from database to ensure we have latest data
        user.refresh_from_db()
        # Access profile - Django will handle the relationship
        profile = Profile.objects.get(user=user)
        return profile.role if profile else None
    except Profile.DoesNotExist:
        # Profile doesn't exist yet, return None
        return None
    except Exception as e:
        # Log the error but don't crash
        print(f"Error getting user profile role: {e}")
        return None

async def is_server(user):
    """Check if user has server role"""
    if not user or user.is_anonymous:
        return False
    try:
        role = await _get_user_profile_role(user)
        return role == "server"
    except Exception as e:
        print(f"Error in is_server: {e}")
        return False 


def valid_coordinates(lat, lng) -> bool:
    try:
        lat, lng = float(lat), float(lng)
        return -90 <= lat <= 90 and -180 <= lng <= 180
    except (ValueError, TypeError):
        return False


async def remove_server(user_id: int):
    pipe = redis_client.pipeline()
    pipe.delete(f"server:{user_id}")
    pipe.delete(f"server:{user_id}:last_beat")
    await pipe.execute()


async def is_online(server_id: str) -> bool:
    key = f"server:{server_id}"
    return await redis_client.exists(key) > 0


import requests
import ast
from datetime import datetime


def format_mission_data(mission_data_str):
    try:
        mission_data = ast.literal_eval(mission_data_str)
    except Exception:
        return f"Details: {mission_data_str}"
    mapping = {
        "mission_id": "Mission ID",
        "client_id": "Client ID",
        "server_id": "Server ID",
        "client_lat": "Client Latitude",
        "client_lng": "Client Longitude",
        "server_lat": "Server Latitude",
        "server_lng": "Server Longitude",
        "destination_lat": "Destination Latitude",
        "destination_lng": "Destination Longitude",
        "ts": "Timestamp",
        "status": "Status",
        "price": "Price",
        "comment": "Comment",
    }
    lines = []
    for key, label in mapping.items():
        if key in mission_data:
            value = mission_data[key]
            if key == "ts":
                
                try:
                    value = datetime.utcfromtimestamp(float(value)).strftime(
                        "%Y-%m-%d %H:%M:%S UTC"
                    )
                except Exception:
                    pass  
            lines.append(f"{label}: {value}")
    return "\n".join(lines)


async def notify_admin(message: str):
    try:
        if "\nDetails:" in message:
            header, details = message.split("\nDetails:", 1)
            formatted = format_mission_data(details.strip())
            human_message = f"{header.strip()}\n{formatted}"
        elif "," in message:
            header, details = message.split(",", 1)
            formatted = format_mission_data(details.strip())
            human_message = f"{header.strip()}\n{formatted}"
        else:
            human_message = message
        requests.post(
            "https://ntfy.sh/kimanxo", data=human_message.encode(encoding="utf-8")
        )
    except Exception as e:
        print("Failed to send admin notification:", e)


@sync_to_async
def update_last_active(id):
    Profile.objects.filter(user_id=id).update(last_active=timezone.now())


import requests


def get_distance_duration(origin, destination):
    import requests

    api_key = "AIzaSyBmTHYTBqjwA1GVvvBHPOuPP_41K6k-8bE"
    url = (
        "https://maps.googleapis.com/maps/api/directions/json"
        f"?origin={origin}&destination={destination}"
        "&mode=driving"
        f"&key={api_key}"
    )

    response = requests.get(url)
    data = response.json()

    if data["status"] != "OK":
        raise Exception(
            f"Google API error: {data.get('error_message', 'Unknown error')}"
        )

    leg = data["routes"][0]["legs"][0]
    distance_meters = leg["distance"]["value"] or 0  # meters
    duration_seconds = leg["duration"]["value"]  or 0 # seconds

    return distance_meters, duration_seconds


def get_action(client, server, mission):
    if not client or not server or not mission:
        raise ValueError("All of client, server, or destination must be provided")

    xy = get_distance_duration(
        f"{client['lat']},{client['lng']}", f"{server['lat']},{server['lng']}"
    )[0]

    yz = get_distance_duration(
        f"{server['lat']},{server['lng']}",
        f"{mission['destination_lat']},{mission['destination_lng']}",
    )[0]

    if xy  > 500:
        return "cancel"

    if xy < 100 and yz > 100:
        return "report"
    if xy < 100 and yz < 100:
        return "validate"
