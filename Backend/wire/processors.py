import math
import json
import asyncio
import json
from django.core.exceptions import ObjectDoesNotExist
from asgiref.sync import sync_to_async
from wire.redis import redis_client
from wire.models import Fraud, Mission
from passport.models import Profile  
from jibni.settings import MISSION_TIMEOUT
from wire.utils import notify_admin
from datetime import datetime
from typing import Optional, Tuple, Any


Coord = Tuple[float, float]


# class FraudProcessor:
#     """
#     Processes location updates for a mission involving a client and server,
#     detecting movement constraints and generating alerts based on position changes.

#     Uses Redis to persist state between location updates, keyed by mission and party IDs.
#     When 5+ alerts accumulate, marks mission as fraud, saves to DB, and clears all Redis state.
#     """

#     def __init__(
#         self,
#         mission_id: Any,
#         client_id: Any,
#         server_id: Any,
#         client_coords: Coord,
#         server_coords: Coord,
#         redis_client,
#     ) -> None:
#         """
#         Initialize the processor with current coordinates.
#         Call await initialize_and_run() to load state and process.
#         """
#         self.mission_id = mission_id
#         self.client_id = client_id
#         self.server_id = server_id

#         # Normalize to floats once
#         self.client_coords: Coord = (
#             float(client_coords[0]),
#             float(client_coords[1]),
#         )
#         self.server_coords: Coord = (
#             float(server_coords[0]),
#             float(server_coords[1]),
#         )

#         self.redis = redis_client

#         # These get set during async init
#         self.prev_client_coords: Optional[Coord] = None
#         self.prev_server_coords: Optional[Coord] = None
#         self.prev_client_server_distance: Optional[float] = None
#         self.client_move_distance: float = 0.0
#         self.server_move_distance: float = 0.0
#         self.client_server_distance: float = 0.0

#     async def initialize_and_run(self):
#         """
#         Load previous state from Redis, compute distances, run checks, save state,
#         and update fraud alerts.
#         """
#         await self._load_previous_state()
#         self._compute_distances()
#         all_alerts = []
#         all_alerts.extend(self.process_client_movement())
#         all_alerts.extend(self.client_server_met())
#         all_alerts.extend(self.process_stalled_distance())
#         all_alerts.extend(self.process_increasing_distance())

#         await self.save_state()
#         await self._handle_fraud_alerts(all_alerts)
#         return all_alerts

#     @property
#     def fraud_alerts_key(self) -> str:
#         return f"{self.mission_id}:fraud_alerts"

#     @property
#     def fraud_alert_count_key(self) -> str:
#         return f"{self.mission_id}:fraud_alert_count"

#     @property
#     def fraud_marked_key(self) -> str:
#         return f"{self.mission_id}:fraud_marked"

#     @property
#     def client_coords_key(self) -> str:
#         return f"{self.mission_id}:client:{self.client_id}:last_coords"

#     @property
#     def server_coords_key(self) -> str:
#         return f"{self.mission_id}:server:{self.server_id}:last_coords"

#     @property
#     def last_distance_key(self) -> str:
#         return f"{self.mission_id}:distance:{self.client_id}:{self.server_id}:last_distance"

#     @sync_to_async
#     def _create_fraud_record(self, mission_id, client_id, server_id, alerts):
#         print("[FraudProcessor] Creating Fraud record in DB")
#         """Synchronous Django model creation wrapped for async use."""
#         return Fraud.objects.create(
#             mission_id=mission_id,
#             client_id=client_id,
#             server_id=server_id,
#             alerts=alerts,
#         )

#     async def _handle_fraud_alerts(self, alerts):
#         """
#         Store alerts in Redis, increment count, and when reaching 5 total executions
#         with alerts, persist to DB and stop monitoring. Keeps a fraud flag in Redis
#         so subsequent runs short-circuit, and clears other mission keys.
#         """
#         # If mission already marked as fraud, do nothing
#         fraud_marked_raw = await self.redis.get(self.fraud_marked_key)
#         if fraud_marked_raw:
#             # bytes or str, any truthy value means fraud already processed
#             return

#         # No alerts this run -> nothing to record for fraud counting
#         if not alerts:
#             return

#         # Append alerts JSON-serialized to a list key
#         pipe = self.redis.pipeline()
#         for alert in alerts:
#             pipe.rpush(self.fraud_alerts_key, json.dumps(alert))
#         # Increment counter of executions that produced alerts
#         pipe.incr(self.fraud_alert_count_key)
#         results = await pipe.execute()

#         # incr result is the last result in the pipeline
#         alerts_count = results[-1]

#         if alerts_count >= 5:
#             # Mark mission as fraud *first*, so any concurrent run sees it
#             await self.redis.set(self.fraud_marked_key, "1")

#             # Fetch all stored alerts
#             stored_alerts_raw = await self.redis.lrange(self.fraud_alerts_key, 0, -1)
#             stored_alerts = []
#             for raw in stored_alerts_raw:
#                 if isinstance(raw, bytes):
#                     raw = raw.decode("utf-8")
#                 try:
#                     stored_alerts.append(json.loads(raw))
#                 except Exception:
#                     continue

#             # Persist to DB using sync_to_async wrapper
#             await self._create_fraud_record(
#                 self.mission_id,
#                 self.client_id,
#                 self.server_id,
#                 stored_alerts,
#             )

#             # Clear all mission-related keys except fraud_marked_key
#             pipe2 = self.redis.pipeline()
#             pipe2.delete(
#                 self.fraud_alerts_key,
#                 self.fraud_alert_count_key,
#                 self.client_coords_key,
#                 self.server_coords_key,
#                 self.last_distance_key,
#             )
#             await pipe2.execute()

#     async def _load_previous_state(self) -> None:
#         raw_prev_client = await self.load_from_redis(self.client_coords_key)
#         if raw_prev_client:
#             try:
#                 loaded = json.loads(raw_prev_client)
#                 self.prev_client_coords = (float(loaded[0]), float(loaded[1]))
#             except Exception:
#                 self.prev_client_coords = self.client_coords
#         else:
#             self.prev_client_coords = self.client_coords

#         raw_prev_server = await self.load_from_redis(self.server_coords_key)
#         if raw_prev_server:
#             try:
#                 loaded = json.loads(raw_prev_server)
#                 self.prev_server_coords = (float(loaded[0]), float(loaded[1]))
#             except Exception:
#                 self.prev_server_coords = self.server_coords
#         else:
#             self.prev_server_coords = self.server_coords

#         raw_prev_distance = await self.load_from_redis(self.last_distance_key)
#         if raw_prev_distance is not None:
#             try:
#                 self.prev_client_server_distance = float(raw_prev_distance)
#             except (TypeError, ValueError):
#                 self.prev_client_server_distance = None
#         else:
#             self.prev_client_server_distance = self.calculate_haversine_distance(
#                 self.client_coords, self.server_coords
#             )

#     def _compute_distances(self) -> None:
#         self.client_move_distance = self.calculate_haversine_distance(
#             self.prev_client_coords, self.client_coords
#         )
#         self.server_move_distance = self.calculate_haversine_distance(
#             self.prev_server_coords, self.server_coords
#         )
#         self.client_server_distance = self.calculate_haversine_distance(
#             self.client_coords, self.server_coords
#         )

#     def calculate_haversine_distance(self, coord1: Coord, coord2: Coord) -> float:
#         """
#         Calculate the great-circle distance between two points on the Earth's surface (in meters).
#         """
#         lat1, lon1 = coord1
#         lat2, lon2 = coord2

#         R = 6371000  # Earth radius in meters
#         phi1, phi2 = math.radians(lat1), math.radians(lat2)
#         d_phi = math.radians(lat2 - lat1)
#         d_lambda = math.radians(lon2 - lon1)
#         a = (
#             math.sin(d_phi / 2) ** 2
#             + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
#         )
#         c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
#         return R * c

#     async def load_from_redis(self, key: str) -> Optional[str]:
#         """
#         Retrieve a value from Redis by key, decoding bytes to string if needed.
#         """
#         raw = await self.redis.get(key)
#         if raw:
#             if isinstance(raw, bytes):
#                 return raw.decode("utf-8")
#             return str(raw)
#         return None

#     def process_client_movement(self):
#         """
#         Detect if client moved beyond the movement threshold (200m) since last update.
#         """
#         alerts = []
#         if self.client_move_distance > 200:
#             alerts.append(
#                 {
#                     "type": "client_moved",
#                     "message": f"Client moved about {int(self.client_move_distance)} meters",
#                 }
#             )
#         return alerts

#     def process_stalled_distance(self):
#         """
#         Detect if client-server distance has been stable (difference <= 500m).
#         """
#         alerts = []
#         prev_distance = self.prev_client_server_distance

#         if prev_distance is None:
#             return alerts

#         diff = abs(self.client_server_distance - prev_distance)

#         if diff <= 500:
#             alerts.append(
#                 {
#                     "type": "stalled_distance",
#                     "message": f"Distance stable at {int(self.client_server_distance)} meters",
#                 }
#             )
#         return alerts

#     def process_increasing_distance(self):
#         """
#         Detect if the client-server distance grows beyond 10 kilometers.
#         """
#         alerts = []
#         if self.client_server_distance > 10_000:
#             alerts.append(
#                 {
#                     "type": "increasing_distance",
#                     "message": f"Distance increased to {int(self.client_server_distance)} meters",
#                 }
#             )
#         return alerts

#     def client_server_met(self):
#         """
#         Detect if client and server are within 100m of each other.
#         """
#         alerts = []
#         if self.client_server_distance <= 100:
#             alerts.append(
#                 {
#                     "type": "client_server_met",
#                     "message": "Client and server have met",
#                 }
#             )
#         return alerts

#     async def save_state(self) -> None:
#         """
#         Persist the latest coordinates and computed distances in Redis.
#         """
#         pipe = self.redis.pipeline()
#         pipe.set(
#             self.client_coords_key,
#             json.dumps(self.client_coords),
#         )
#         pipe.set(
#             self.server_coords_key,
#             json.dumps(self.server_coords),
#         )
#         pipe.set(
#             self.last_distance_key,
#             self.client_server_distance,
#         )
#         await pipe.execute()


class FraudProcessor:
    """
    Processes location updates for a mission involving a client and server,
    detecting movement constraints and generating alerts based on position changes.

    Uses Redis to persist state between location updates, keyed by mission and party IDs.
    When 5+ alerts accumulate, marks mission as fraud, saves to DB, and clears all Redis state.
    """

    def __init__(
        self,
        mission_id: Any,
        client_id: Any,
        server_id: Any,
        client_coords: Coord,
        server_coords: Coord,
        redis_client,
    ) -> None:
        """
        Initialize the processor with current coordinates.
        Call await initialize_and_run() to load state and process.
        """
        self.mission_id = mission_id
        self.client_id = client_id
        self.server_id = server_id

        # Normalize to floats once
        self.client_coords: Coord = (
            float(client_coords[0]),
            float(client_coords[1]),
        )
        self.server_coords: Coord = (
            float(server_coords[0]),
            float(server_coords[1]),
        )

        self.redis = redis_client

        # These get set during async init
        self.prev_client_coords: Optional[Coord] = None
        self.prev_server_coords: Optional[Coord] = None
        self.prev_client_server_distance: Optional[float] = None
        self.client_move_distance: float = 0.0
        self.server_move_distance: float = 0.0
        self.client_server_distance: float = 0.0

        # Have client and server ever met (distance <= 100m)?
        self.met: bool = False

    async def initialize_and_run(self):
        """
        Load previous state from Redis, compute distances, run checks, save state,
        and update fraud alerts.
        """
        await self._load_previous_state()
        self._compute_distances()
        all_alerts = []
        all_alerts.extend(self.process_client_movement())
        all_alerts.extend(self.client_server_met())
        all_alerts.extend(self.process_stalled_distance())
        all_alerts.extend(self.process_increasing_distance())

        await self.save_state()
        await self._handle_fraud_alerts(all_alerts)
        return all_alerts

    @property
    def fraud_alerts_key(self) -> str:
        return f"{self.mission_id}:fraud_alerts"

    @property
    def fraud_alert_count_key(self) -> str:
        return f"{self.mission_id}:fraud_alert_count"

    @property
    def fraud_marked_key(self) -> str:
        return f"{self.mission_id}:fraud_marked"

    @property
    def client_coords_key(self) -> str:
        return f"{self.mission_id}:client:{self.client_id}:last_coords"

    @property
    def server_coords_key(self) -> str:
        return f"{self.mission_id}:server:{self.server_id}:last_coords"

    @property
    def last_distance_key(self) -> str:
        return f"{self.mission_id}:distance:{self.client_id}:{self.server_id}:last_distance"

    @property
    def met_key(self) -> str:
        return f"{self.mission_id}:met"

    @sync_to_async
    def _create_fraud_record(self, mission_id, client_id, server_id, alerts):
        """Synchronous Django model creation wrapped for async use."""
        return Fraud.objects.create(
            mission_id=mission_id,
            client_id=client_id,
            server_id=server_id,
            alerts=alerts,
        )

    async def _handle_fraud_alerts(self, alerts):
        """
        Store alerts in Redis, increment count, and when reaching 5 total executions
        with alerts, persist to DB and stop monitoring. Keeps a fraud flag in Redis
        so subsequent runs short-circuit, and clears other mission keys.
        """
        # If mission already marked as fraud, do nothing
        fraud_marked_raw = await self.redis.get(self.fraud_marked_key)
        if fraud_marked_raw:
            return

        # No alerts this run -> nothing to record for fraud counting
        if not alerts:
            return

        # Append alerts JSON-serialized to a list key
        pipe = self.redis.pipeline()
        for alert in alerts:
            pipe.rpush(self.fraud_alerts_key, json.dumps(alert))
        # Increment counter of executions that produced alerts
        pipe.incr(self.fraud_alert_count_key)
        results = await pipe.execute()

        # incr result is the last result in the pipeline
        alerts_count = results[-1]

        if alerts_count >= 5:
            # Mark mission as fraud *first*, so any concurrent run sees it
            await self.redis.set(self.fraud_marked_key, "1")

            # Fetch all stored alerts
            stored_alerts_raw = await self.redis.lrange(self.fraud_alerts_key, 0, -1)
            stored_alerts = []
            for raw in stored_alerts_raw:
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                try:
                    stored_alerts.append(json.loads(raw))
                except Exception:
                    continue

            # Persist to DB using sync_to_async wrapper
            await self._create_fraud_record(
                self.mission_id,
                self.client_id,
                self.server_id,
                stored_alerts,
            )

            # Clear all mission-related keys except fraud_marked_key
            pipe2 = self.redis.pipeline()
            pipe2.delete(
                self.fraud_alerts_key,
                self.fraud_alert_count_key,
                self.client_coords_key,
                self.server_coords_key,
                self.last_distance_key,
                self.met_key,
            )
            await pipe2.execute()

    async def _load_previous_state(self) -> None:
        raw_prev_client = await self.load_from_redis(self.client_coords_key)
        if raw_prev_client:
            try:
                loaded = json.loads(raw_prev_client)
                self.prev_client_coords = (float(loaded[0]), float(loaded[1]))
            except Exception:
                self.prev_client_coords = self.client_coords
        else:
            self.prev_client_coords = self.client_coords

        raw_prev_server = await self.load_from_redis(self.server_coords_key)
        if raw_prev_server:
            try:
                loaded = json.loads(raw_prev_server)
                self.prev_server_coords = (float(loaded[0]), float(loaded[1]))
            except Exception:
                self.prev_server_coords = self.server_coords
        else:
            self.prev_server_coords = self.server_coords

        raw_prev_distance = await self.load_from_redis(self.last_distance_key)
        if raw_prev_distance is not None:
            try:
                self.prev_client_server_distance = float(raw_prev_distance)
            except (TypeError, ValueError):
                self.prev_client_server_distance = None
        else:
            self.prev_client_server_distance = self.calculate_haversine_distance(
                self.client_coords, self.server_coords
            )

        # Load met flag
        raw_met = await self.redis.get(self.met_key)
        if raw_met is None:
            self.met = False
        else:
            if isinstance(raw_met, bytes):
                raw_met = raw_met.decode("utf-8")
            self.met = str(raw_met).lower() in ("1", "true", "yes")

    def _compute_distances(self) -> None:
        self.client_move_distance = self.calculate_haversine_distance(
            self.prev_client_coords, self.client_coords
        )
        self.server_move_distance = self.calculate_haversine_distance(
            self.prev_server_coords, self.server_coords
        )
        self.client_server_distance = self.calculate_haversine_distance(
            self.client_coords, self.server_coords
        )

    def calculate_haversine_distance(self, coord1: Coord, coord2: Coord) -> float:
        """
        Calculate the great-circle distance between two points on the Earth's surface (in meters).
        """
        lat1, lon1 = coord1
        lat2, lon2 = coord2

        R = 6371000  # Earth radius in meters
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lon2 - lon1)
        a = (
            math.sin(d_phi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    async def load_from_redis(self, key: str) -> Optional[str]:
        """
        Retrieve a value from Redis by key, decoding bytes to string if needed.
        """
        raw = await self.redis.get(key)
        if raw:
            if isinstance(raw, bytes):
                return raw.decode("utf-8")
            return str(raw)
        return None

    def process_client_movement(self):
        """
        Detect if client moved beyond the movement threshold (200m) since last update.
        """
        alerts = []
        if self.client_move_distance > 200:
            alerts.append(
                {
                    "type": "client_moved",
                    "message": f"Client moved about {int(self.client_move_distance)} meters",
                }
            )
        return alerts

    def process_stalled_distance(self):
        """
        Detect if client-server distance has been stable (difference <= 500m)
        BEFORE they have met.
        """
        alerts = []

        # Once they have met at least once, stalled-distance alerts are no longer relevant
        if self.met:
            return alerts

        prev_distance = self.prev_client_server_distance
        if prev_distance is None:
            return alerts

        diff = abs(self.client_server_distance - prev_distance)

        if diff <= 500:
            alerts.append(
                {
                    "type": "stalled_distance",
                    "message": f"Distance stable at {int(self.client_server_distance)} meters",
                }
            )
        return alerts

    def process_increasing_distance(self):
        """
        Detect if the client-server distance grows beyond 10 kilometers.
        """
        alerts = []
        if self.client_server_distance > 10_000:
            alerts.append(
                {
                    "type": "increasing_distance",
                    "message": f"Distance increased to {int(self.client_server_distance)} meters",
                }
            )
        return alerts

    def client_server_met(self):
        """
        Detect first time client and server are within 100m of each other.
        Does NOT produce an alert; only flips the 'met' state.
        """
        alerts = []
        if not self.met and self.client_server_distance <= 100:
            self.met = True
        return alerts

    async def save_state(self) -> None:
        """
        Persist the latest coordinates, computed distances, and met flag in Redis.
        """
        pipe = self.redis.pipeline()
        pipe.set(
            self.client_coords_key,
            json.dumps(self.client_coords),
        )
        pipe.set(
            self.server_coords_key,
            json.dumps(self.server_coords),
        )
        pipe.set(
            self.last_distance_key,
            self.client_server_distance,
        )
        pipe.set(
            self.met_key,
            "true" if self.met else "false",
        )
        await pipe.execute()


class MissionStatusProcessor:
    def __init__(self, consumer, mission_id: str):
        self.consumer = consumer
        self.mission_id = mission_id

    async def _fetch_mission_data(self):
        mission_json = await redis_client.get(self.mission_id)
        if not mission_json:
            return None
        mission = json.loads(mission_json)
        return mission

    async def _save_to_db(self, mission_data: dict):
        try:
            mission_obj = await sync_to_async(Mission.objects.get)(
                mission_id=mission_data["mission_id"]
            )

            mission_obj.status = mission_data.get("status", mission_obj.status).upper()
            mission_obj.comment = mission_data.get("comment", mission_obj.comment)
            if "rating" in mission_data:
                mission_obj.rating = mission_data.get("rating", mission_obj.rating)
            await sync_to_async(mission_obj.save)()
        except ObjectDoesNotExist:
            print(
                f"[MissionProcessor] Mission {mission_data['mission_id']} not found in DB"
            )

    async def _update_redis(self, mission_data: dict, expiry_seconds: int):
        pipe = redis_client.pipeline()
        pipe.set(self.mission_id, json.dumps(mission_data))
        pipe.expire(self.mission_id, expiry_seconds)
        await pipe.execute()

    async def clear_mission_redis(self, mission_id: int | str):
        pattern = f"{mission_id}:*"
        print("clearing redis for mission", pattern)
        cursor = 0
        total_deleted = 0
        while True:
            cursor, keys = await redis_client.scan(cursor=cursor, match=pattern, count=100)
            print("scan result:", keys, "cursor:", cursor)
            if keys:
                deleted = await redis_client.delete(*keys)
                total_deleted += deleted
                print("deleted", deleted, "keys")
            if cursor == 0:
                break
        print("total deleted:", total_deleted)


    async def _set_server_busy(self, server_id: str, busy: bool):
        try:
            profile = await sync_to_async(Profile.objects.get)(user__id=server_id)
            profile.engaged = busy
            profile.open_to_work = not busy
            await sync_to_async(profile.save)()
        except ObjectDoesNotExist:
            print(f"[MissionProcessor] Profile not found for server_id={server_id}")

    async def _notify_clients(self, mission_data: dict):
        if self.consumer.channel_layer is None or mission_data is None:
            return
        for uid in [mission_data["client_id"], mission_data["server_id"]]:
            await self.consumer.channel_layer.group_send(
                f"user_{uid}",
                {
                    "type": "mission_result",
                    "mission_id": self.mission_id,
                    "response": mission_data["status"].lower(),
                },
            )

    async def start_timeout(self, timeout: int = MISSION_TIMEOUT):
        await asyncio.sleep(timeout)
        mission_data = await self._fetch_mission_data()
        if mission_data is None:
            return
        if mission_data["status"].lower() == "pending":
            mission_data["status"] = "TIMEOUT"
            mission_data["price"] = 0
            expiry = timeout + 5
            await self._update_redis(mission_data, expiry)
            await self._save_to_db(mission_data)
            await self._set_server_busy(mission_data["server_id"], busy=False)
            await self._notify_clients(mission_data)
            await notify_admin(f"Mission  timed out,{mission_data}")
            await self.clear_mission_redis( self.mission_id)

    async def accept(self, duration):
        mission_data = await self._fetch_mission_data()
        if mission_data is None:
            return
        mission_data["status"] = "ACTIVE"
        await self._update_redis(mission_data, duration)
        await self._save_to_db(mission_data)
        await self._set_server_busy(mission_data["server_id"], busy=True)
        
        # Get driver/server location and info for client notification
        server_location_key = f"server:{mission_data['server_id']}"
        server_location_json = await redis_client.get(server_location_key)
        server_location = None
        if server_location_json:
            try:
                server_location = json.loads(server_location_json)
            except:
                pass
        
        # Get server profile info
        server_info = await self._get_server_info(mission_data["server_id"])
        
        # Notify client with detailed acceptance info
        await self._notify_client_accepted(mission_data, server_location, server_info)
        
        # Also notify via the general method for backward compatibility
        await self._notify_clients(mission_data)
        await notify_admin(f"Mission  accepted ,{mission_data}")
        asyncio.create_task(self.expire(duration=duration))
    
    @sync_to_async
    def _get_server_info(self, server_id):
        """Get server profile information"""
        try:
            profile = Profile.objects.select_related('user').get(user_id=server_id)
            return {
                "id": profile.user.id,
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "phone_number": profile.user.phone_number,
            }
        except Profile.DoesNotExist:
            return None
    
    async def _notify_client_accepted(self, mission_data: dict, server_location: dict, server_info: dict):
        """Send detailed acceptance notification to client"""
        if self.consumer.channel_layer is None or mission_data is None:
            return
        
        client_id = mission_data["client_id"]
        
        # Send detailed acceptance event to client
        await self.consumer.channel_layer.group_send(
            f"user_{client_id}",
            {
                "type": "driver_accepted",
                "mission_id": self.mission_id,
                "status": "accepted",
                "driver": server_info or {},
                "driver_location": {
                    "lat": server_location.get("lat") if server_location else mission_data.get("server_lat"),
                    "lng": server_location.get("lng") if server_location else mission_data.get("server_lng"),
                } if server_location or mission_data.get("server_lat") else None,
                "mission_data": {
                    "price": mission_data.get("price"),
                    "full_duration": mission_data.get("full_duration"),
                    "full_distance": mission_data.get("full_distance", 0) / 1000,  # Convert to km
                },
            },
        )

    async def reject(self, note: str = "", timeout: int = 5):
        mission_data = await self._fetch_mission_data()
        if mission_data is None:
            return
        mission_data["status"] = "REJECTED"
        mission_data["price"] = 0
        if note:
            mission_data["comment"] = note
        expiry = timeout + 5

        await self._update_redis(mission_data, expiry)
        await self._save_to_db(mission_data)
        await self._set_server_busy(mission_data["server_id"], busy=False)
        await self._notify_clients(mission_data)
        await notify_admin(f"Mission  rejected ,{mission_data}")
        await self.clear_mission_redis( self.mission_id)

    async def cancel(self, note: str = "", timeout: int = 5):
        mission_data = await self._fetch_mission_data()
        if mission_data is None:
            return
        mission_data["status"] = "CANCELLED"
        mission_data["price"] = 0

        if note:
            mission_data["comment"] = note
        expiry = timeout + 5
        await self._update_redis(mission_data, expiry)
        await self._save_to_db(mission_data)
        await self._set_server_busy(mission_data["server_id"], busy=False)
        await self._notify_clients(mission_data)
        await notify_admin(f"Mission  cancelled ,{mission_data}")
        await self.clear_mission_redis( self.mission_id)

    async def expire(self, duration: int = 0):
        if duration > 0:
            await asyncio.sleep(duration)
        mission_data = await self._fetch_mission_data()
        if mission_data is None:
            return
        if mission_data["status"].lower()  in  ["expired","completed"]:
            return
        mission_data["status"] = "EXPIRED"

        await self._update_redis(mission_data, 60)
        await self._save_to_db(mission_data)
        await self._set_server_busy(mission_data["server_id"], busy=False)
        await self._notify_clients(mission_data)
        await notify_admin(f"Mission  expired,{mission_data}")
        await self.clear_mission_redis( self.mission_id)

    async def complete(self, rating: float = None, comment: str = None):
        mission_data = await self._fetch_mission_data()
        if mission_data is None:
            return
        mission_data["status"] = "COMPLETED"
        if rating is not None:
            mission_data["rating"] = rating
        if comment is not None:
            mission_data["comment"] = comment

        await self._update_redis(mission_data, expiry_seconds=60)
        await self._save_to_db(mission_data)
        await self._set_server_busy(mission_data["server_id"], busy=False)
        await self._notify_clients(mission_data)
        await notify_admin(f"Mission  completed ,{mission_data}")
        await self.clear_mission_redis( self.mission_id)


paid_holidays = ["01-01", "05-01", "11-01", "07-05"]


class PriceProcessor:
    """
    Processes mission pricing using distance, duration, weekend, and day/night rules.
    """

    def __init__(self, distance_server_client: float, distance_client_dest: float):

        self.distance_server_client = distance_server_client / 1000
        self.distance_client_dest = distance_client_dest / 1000
        self.distance = self.distance_server_client + self.distance_client_dest
        self.today = datetime.today().date().strftime("%m-%d")
        self.now = datetime.now()
        self.price = 2500

    def distance_price(self):

        if self.distance_server_client > self.distance_client_dest:
            self.price += self.distance_server_client * 40
            self.distance -= self.distance_server_client
        if self.distance_server_client < self.distance_client_dest:
            self.distance -= self.distance_server_client

        if self.distance > 200:
            self.price += (
                (20 * 110)
                + (30 * 90)
                + (60 * 75)
                + (90 * 50)
                + ((self.distance - 200) * 35)
            )
        elif self.distance > 110:
            self.price += (
                (20 * 110) + (30 * 90) + (60 * 75) + ((self.distance - 110) * 50)
            )
        elif self.distance > 50:
            self.price += (20 * 110) + (30 * 90) + ((self.distance - 50) * 75)
        elif self.distance > 20:
            self.price += (20 * 110) + ((self.distance - 20) * 90)
        else:
            self.price += self.distance * 110

    def weekend_price(self):
        """Add 30% if the current day is Saturday or Friday or a paid holiday."""
        if (
            self.now.weekday() == 4
            or self.now.weekday() == 5
            or self.today in paid_holidays
        ) and (self.distance < 80):
            self.price = self.price + (self.price * 30 / 100)

        return self.price

    def day_night_price(self):
        """
        Adds 20% if it's night:
        - night from 21:00–06:00 during summer (June to November)
        - night from 19:00–07:00 during winter (December to May)
        """
        hour = self.now.hour
        month = self.now.month

        if (month >= 6 and month <= 11 and (hour >= 21 or hour < 6)) or \
           (month < 6 or month == 12 and (hour >= 19 or hour < 7)):
            self.price = self.price + (self.price * 20 / 100)
            return self.price

    def compute_total(self):
        """Executes rules in order: distance  → weekend → day/night."""
        self.distance_price()
        self.weekend_price()
        self.day_night_price()
        return round(self.price, 2)
