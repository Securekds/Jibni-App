import asyncio

import json
import time
from wire.utils import (
    create_mission_from_json,
    get_action,
    get_distance_duration,
    haversine,
    is_online,
    update_last_active,
    valid_coordinates,
)
from jibni.settings import MISSION_TIMEOUT
from wire.redis import redis_client
from wire.processors import MissionStatusProcessor
from wire.processors import PriceProcessor, FraudProcessor


async def mission_request_handler(self, content: dict):
    server_id = str(content.get("server_id"))
    
    # Safely extract and convert coordinates with validation
    try:
        client_lat_str = content.get("client_lat")
        client_lng_str = content.get("client_lng")
        dest_lat_str = content.get("destination_lat")
        dest_lng_str = content.get("destination_lng")
        
        # Check for None or invalid values
        if not all([client_lat_str, client_lng_str, dest_lat_str, dest_lng_str]):
            await self.send_json({
                "code": "E007", 
                "detail": "Missing required coordinates. Please provide client_lat, client_lng, destination_lat, and destination_lng"
            })
            return
        
        # Check for string 'undefined' or 'null'
        if any(str(val).lower() in ['undefined', 'null', 'nan', ''] for val in [client_lat_str, client_lng_str, dest_lat_str, dest_lng_str]):
            await self.send_json({
                "code": "E007", 
                "detail": "Invalid coordinate values. Please ensure all coordinates are valid numbers."
            })
            return
        
        client_lat = float(client_lat_str)
        client_lng = float(client_lng_str)
        dest_lat = float(dest_lat_str)
        dest_lng = float(dest_lng_str)
    except (ValueError, TypeError) as e:
        await self.send_json({
            "code": "E007", 
            "detail": f"Invalid coordinate format: {str(e)}. All coordinates must be valid numbers."
        })
        return

    if not server_id or not (
        valid_coordinates(client_lat, client_lng)
        and valid_coordinates(dest_lat, dest_lng)
    ):
        await self.send_json({
            "code": "E007", 
            "detail": "Invalid mission request: coordinates are out of valid range"
        })
        return

    if not await is_online(server_id):
        await self.send_json({"code": "E006", "detail": "Server not available"})
        return

    mission_id = f"mission:{self.user_id}:{server_id}:{int(time.time())}"
    server_key = f"server:{server_id}"
    server_json = await redis_client.get(server_key)
    if not server_json:
        await self.send_json({"code": "E014", "detail": "Server location not found"})
        return

    server_data = json.loads(server_json)
    server_lat = server_data.get("lat")
    server_lng = server_data.get("lng")
    if not (valid_coordinates(server_lat, server_lng)):
        await self.send_json({"code": "E015", "detail": "Server coordinates invalid"})
        return
    distance_server_client, duration_server_client = get_distance_duration(
        f"{client_lat},{client_lng}", f"{server_lat},{server_lng}"
    )
    distance_client_dest, duration_client_dest = get_distance_duration(
        f"{client_lat},{client_lng}", f"{dest_lat},{dest_lng}"
    )
    full_distance = distance_server_client + distance_client_dest
    full_duration = duration_server_client + duration_client_dest
    price = PriceProcessor(distance_server_client, distance_client_dest).compute_total()
    mission_data = {
        "mission_id": mission_id,
        "client_id": self.user_id,
        "server_id": server_id,
        "client_lat": client_lat,
        "client_lng": client_lng,
        "server_lat": server_lat,
        "server_lng": server_lng,
        "destination_lat": dest_lat,
        "destination_lng": dest_lng,
        "full_duration": full_duration,
        "ts": time.time(),
        "status": "PENDING",
        "price": price,
    }

    pipe = redis_client.pipeline()
    pipe.set(mission_id, json.dumps(mission_data))
    pipe.expire(mission_id, MISSION_TIMEOUT + 5)
    await pipe.execute()
    await asyncio.get_event_loop().run_in_executor(
        None, create_mission_from_json, mission_data
    )
    await update_last_active(self.user_id)

    if self.channel_layer is not None:
        await self.channel_layer.group_send(
            f"user_{server_id}",
            {
                "type": "send_mission",
                "mission_id": mission_id,
                "client_id": self.user_id,
                "client_lat": client_lat,
                "client_lng": client_lng,
                "destination_lat": dest_lat,
                "destination_lng": dest_lng,
                "phone_number": self.user.phone_number,
                "price": price,
                "full_distance": full_distance,
                "full_duration": full_duration,
                "distance_server_client": distance_server_client,
                "duration_server_client": duration_server_client,
                "distance_client_dest": distance_client_dest,
                "duration_client_dest": duration_client_dest,
            },
        )

    processor = MissionStatusProcessor(self, mission_id)
    asyncio.create_task(processor.start_timeout(timeout=MISSION_TIMEOUT))

    await self.send_json({"status": "mission_sent", "mission_id": mission_id})


async def share_location_handler(self, content: dict):
    mission_id = content.get("mission_id")
    lat = content.get("lat")
    lng = content.get("lng")
    key = f"{mission_id}:locations"

    if not mission_id or not valid_coordinates(lat, lng):
        await self.send_json({"code": "E012", "detail": "Invalid location data"})
        return

    mission_json = await redis_client.get(mission_id)
    if not mission_json:
        await self.send_json({"code": "E009", "detail": "Mission not found"})
        return

    mission = json.loads(mission_json)
    if mission.get("status") != "ACTIVE":
        pipe = redis_client.pipeline()
        pipe.expire(key, 3)
        await pipe.execute()
        await self.send_json(
            {
                "code": "E013",
                "status": mission["status"],
                "detail": f"Mission not active (status={mission['status']})",
            }
        )
        return

    if str(self.user_id) == str(mission["client_id"]):
        role = "client"
    elif str(self.user_id) == str(mission["server_id"]):
        role = "server"
    else:
        await self.send_json(
            {"code": "E011", "detail": "Unauthorized sender for this mission"}
        )
        return

    locations_json = await redis_client.get(key)
    locations = json.loads(locations_json) if locations_json else {}
    locations[role] = {
        "lat": float(lat or 0.0),
        "lng": float(lng or 0.0),
        "ts": time.time(),
    }

    client = locations.get("client") or {}
    server = locations.get("server") or {}
    client_id = mission.get("client_id")
    server_id = mission.get("server_id")
    if not client or not server:
        action = "cancel"
    else:
        action = get_action(client, server, mission)
    if action == "validate":
        processor = MissionStatusProcessor(self, mission_id)
        return await processor.complete(comment="Auto-completed via location validation")
        
    pipe = redis_client.pipeline()
    pipe.set(key, json.dumps(locations))
    await pipe.execute()
    server_lat = float(server.get("lat") or mission.get("server_lat"))
    server_lng = float(server.get("lng") or mission.get("server_lng"))
    client_lat = float(client.get("lat") or mission.get("client_lat"))
    client_lng = float(client.get("lng") or mission.get("client_lng"))

    processor = FraudProcessor(
        mission_id=mission_id,
        client_id=client_id,
        server_id=server_id,
        client_coords=(client_lat, client_lng),
        server_coords=(server_lat, server_lng),
        redis_client=redis_client,
    )

    await processor.initialize_and_run()

        

    recipient_id = mission["server_id"] if role == "client" else mission["client_id"]
    if self.channel_layer is not None:
        # Send location update to recipient
        await self.channel_layer.group_send(
            f"user_{recipient_id}",
            {
                "type": "location_update",
                "mission_id": mission_id,
                "from": self.user_id,
                "lat": lat,
                "lng": lng,
                "ts": time.time(),
                "action": action,
            },
        )
        
        # If server is sharing location and mission is ACTIVE, also send driver location update to client
        if role == "server" and mission.get("status") == "ACTIVE":
            client_id = mission["client_id"]
            await self.channel_layer.group_send(
                f"user_{client_id}",
                {
                    "type": "driver_location_update",
                    "mission_id": mission_id,
                    "lat": lat,
                    "lng": lng,
                    "timestamp": time.time(),
                },
            )


async def mission_response_handler(self, content: dict):
    mission_id = content.get("mission_id")
    response = content.get("response")
    if not mission_id or not isinstance(response, bool):
        await self.send_json({"code": "E008", "detail": "Invalid mission response"})
        return

    mission_json = await redis_client.get(mission_id)
    if not mission_json:
        await self.send_json({"code": "E009", "detail": "Mission expired or not found"})
        return

    mission = json.loads(mission_json)
    if mission.get("status") != "PENDING":
        await self.send_json({"code": "E010", "detail": "Mission already resolved"})
        return

    if str(self.user_id) != str(mission["server_id"]):
        await self.send_json(
            {"code": "E011", "detail": "Not authorized for this mission"}
        )
        return
    await update_last_active(mission["server_id"])
    processor = MissionStatusProcessor(self, mission_id)
    if response:
        await processor.accept(duration=mission.get("full_duration"))
    else:
        await processor.reject(note="Mission rejected", timeout=5)

    await self.send_json(
        {"status": f"mission_{'accepted' if response else 'rejected'}"}
    )


async def request_cancellation_handler(self, content: dict):
    mission_id = content.get("mission_id")
    reason = content.get("reason", "Cancelled by user")
    if not mission_id:
        await self.send_json({"code": "E008", "detail": "Invalid mission cancellation"})
        return

    mission_json = await redis_client.get(mission_id)
    if not mission_json:
        await self.send_json({"code": "E009", "detail": "Mission expired or not found"})
        return

    mission = json.loads(mission_json)
    if mission.get("status") != "PENDING" and mission.get("status") != "ACTIVE":
        await self.send_json({"code": "E010", "detail": "Mission already resolved"})
        return

    processor = MissionStatusProcessor(self, mission_id)
    await processor.cancel(note=reason, timeout=5)

    await self.send_json({"status": "request_cancelled", "mission_id": mission_id})


async def mission_completion_handler(self, content: dict):
    mission_id = content.get("mission_id")
    rating = int(content.get("rating") or 5)
    comment = content.get("comment", "auto completed")
    if not mission_id:
        await self.send_json(
            {"code": "E008", "detail": "Invalid mission completion request"}
        )
        return

    mission_json = await redis_client.get(mission_id)
    if not mission_json:
        await self.send_json({"code": "E009", "detail": "Mission expired or not found"})
        return

    mission = json.loads(mission_json)
    if mission.get("status") != "ACTIVE":
        await self.send_json({"code": "E010", "detail": "Mission already resolved"})
        return

    processor = MissionStatusProcessor(self, mission_id)
    await processor.complete(rating=rating, comment=comment)

    await self.send_json({"status": "request_completed", "mission_id": mission_id})
