from channels.generic.websocket import AsyncJsonWebsocketConsumer
from wire.handlers import (
    request_cancellation_handler,
    mission_request_handler,
    mission_response_handler,
    mission_completion_handler,
    share_location_handler,
)
from wire.utils import (
    is_online,
    is_server,
    remove_server,
    store_location,
    valid_coordinates,
)


class ServerConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        print(f"[SERVER-WS] Connection attempt - user: {user}, anonymous: {user.is_anonymous if user else 'N/A'}")
        
        if not user or user.is_anonymous:
            print(f"[SERVER-WS] Connection rejected: No user or anonymous user")
            await self.close(code=4401, reason="Unauthorized")
            return
            
        is_server_user = await is_server(user)
        print(f"[SERVER-WS] User {user.id} ({user.phone_number if hasattr(user, 'phone_number') else 'N/A'}) is_server: {is_server_user}")
        
        if not is_server_user:
            print(f"[SERVER-WS] Connection rejected: User is not a server")
            await self.close(code=4401, reason="Unauthorized")
            return

        self.user = user
        await self.accept()
        print(f"[SERVER-WS] Connection accepted for server user {user.id}")
        await self.send_json(
            {"status": "connected", "message": "WebSocket connection established!"}
        )

    async def receive_json(self, content, **kwargs):
        print(f"[SERVER-WS] Received message from user {self.user.id}: {content}")
        
        if content.get("type") != "heartbeat":
            print(f"[SERVER-WS] Unsupported message type: {content.get('type')}")
            await self.send_json({"code": "E002", "detail": "Unsupported message type"})
            await self.close(code=4400, reason="Unsupported message type")
            return

        lat, lng = content.get("lat"), content.get("lng")
        print(f"[SERVER-WS] Processing heartbeat for user {self.user.id}: lat={lat}, lng={lng}")

        if not valid_coordinates(lat, lng):
            print(f"[SERVER-WS] Invalid coordinates: lat={lat}, lng={lng}")
            await self.send_json({"code": "E003", "detail": "Invalid coordinates"})
            await self.close(code=4400, reason="Invalid coordinates")
            return

        allowed = await store_location(
            self.user.id, lat, lng
        )
        if allowed:
            print(f"[SERVER-WS] Location stored successfully for user {self.user.id}")
            await self.send_json({"status": "heartbeat_received"})
            
        else:
            print(f"[SERVER-WS] Rate limit exceeded for user {self.user.id}")
            await self.send_json(
                {"code": "E004", "detail": "Rate limit exceeded. Wait 10s"}
            )

    async def disconnect(self, code):
        if hasattr(self, "user"):
            await remove_server(self.user.id)


class MissionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
            user = self.scope.get("user")
            if not user or user.is_anonymous:
                print(f"[MISSION-WS] Connection rejected: No user or anonymous user")
                await self.close(code=4401)
                return

            print(f"[MISSION-WS] User authenticated: {user.id} ({user.phone_number if hasattr(user, 'phone_number') else 'N/A'})")
            
            self.user = user
            self.user_id = str(user.id)
            self.room_group_name = f"user_{self.user_id}"

            server_id = self.scope["url_route"]["kwargs"].get("server_id", None)

            # Check if user is a server with error handling
            try:
                user_is_server = await is_server(user)
                print(f"[MISSION-WS] User is_server check: {user_is_server}")
            except Exception as e:
                print(f"[MISSION-WS] Error checking if user is server: {e}")
                import traceback
                traceback.print_exc()
                await self.close(code=4401)
                return

            if user_is_server:
                self.server_id = user.id
                print(f"[MISSION-WS] User is a server, server_id: {self.server_id}")
            else:
                print(f"[MISSION-WS] User is not a server, checking server_id parameter...")
                if not server_id:
                    print(f"[MISSION-WS] Connection rejected: Server ID required (user is not a server)")
                    await self.close(code=4405)
                    return
                try:
                    if not await is_online(server_id):
                        print(f"[MISSION-WS] Connection rejected: Server {server_id} is offline")
                        await self.close(code=4406)
                        return
                except Exception as e:
                    print(f"[MISSION-WS] Error checking if server is online: {e}")
                    await self.close(code=4406)
                    return
                self.server_id = str(server_id)
                print(f"[MISSION-WS] Using provided server_id: {self.server_id}")

            if self.channel_layer is not None:
                await self.channel_layer.group_add(self.room_group_name, self.channel_name)

            await self.accept()
            print(f"[MISSION-WS] ✅ Connection accepted for user {user.id}")
            await self.send_json({"message": "Mission WebSocket connected!"})
        except Exception as e:
            print(f"[MISSION-WS] ❌ Error in MissionConsumer.connect: {e}")
            import traceback
            traceback.print_exc()
            try:
                await self.close(code=4400)
            except:
                pass

    async def disconnect(self, code: int):
        try:
            # Only try to discard from group if room_group_name was set (connection was successful)
            if hasattr(self, 'room_group_name') and self.channel_layer is not None:
                await self.channel_layer.group_discard(
                    self.room_group_name, self.channel_name
                )
        except Exception as e:
            # Log error but don't crash - disconnect should be safe
            print(f"[MISSION-WS] Error in disconnect: {e}")
            import traceback
            traceback.print_exc()

    async def receive_json(self, content: dict, **kwargs):
        msg_type = content.get("type")
        if msg_type == "mission_request":
            await mission_request_handler(self, content)
        elif msg_type == "mission_response":
            await mission_response_handler(self, content)
        elif msg_type == "share_location":
            await share_location_handler(self, content)
        elif msg_type == "request_cancellation":
            await request_cancellation_handler(self, content)
        elif msg_type == "mission_completion":
            await mission_completion_handler(self, content)
        else:
            await self.send_json({"code": "E002", "detail": "Unknown message type"})

    async def send_mission(self, event: dict):
        await self.send_json(
            {
                "type": "new_mission",
                "mission_id": event["mission_id"],
                "client_id": event["client_id"],
                "client_lat": event["client_lat"],
                "client_lng": event["client_lng"],
                "destination_lat": event["destination_lat"],
                "destination_lng": event["destination_lng"],
                "phone_number": event["phone_number"],
                "price": event["price"],
                "full_distance": event["full_distance"],
                "full_duration": event["full_duration"],
                "distance_server_client": event["distance_server_client"],
                "duration_server_client": event["duration_server_client"],
                "distance_client_dest": event["distance_client_dest"],
                "duration_client_dest": event["duration_client_dest"],
            }
        )

    async def mission_result(self, event: dict):
        await self.send_json(
            {
                "type": "mission_result",
                "mission_id": event["mission_id"],
                "response": event["response"],
            }
        )

    async def location_update(self, event: dict):
        await self.send_json(
            {
                "type": "location_update",
                "mission_id": event["mission_id"],
                "from": event["from"],
                "lat": event["lat"],
                "lng": event["lng"],
                "ts": event["ts"],
                "action": event["action"],
            }
        )

    async def request_cancellation(self, event: dict):
        await self.send_json(
            {
                "type": event["type"],
                "mission_id": event["mission_id"],
                "response": event["response"],
                "reason": event["reason"],
            }
        )

    async def mission_completion(self, event: dict):
        await self.send_json(
            {
                "type": event["type"],
                "mission_id": event["mission_id"],
                "response": event["response"],
                
            }
        )
    
    async def driver_accepted(self, event: dict):
        """Handle driver acceptance notification with driver info and location"""
        await self.send_json(
            {
                "type": "driver_accepted",
                "mission_id": event["mission_id"],
                "status": event["status"],
                "driver": event.get("driver", {}),
                "driver_location": event.get("driver_location"),
                "mission_data": event.get("mission_data", {}),
            }
        )
    
    async def driver_location_update(self, event: dict):
        """Handle real-time driver location updates"""
        await self.send_json(
            {
                "type": "driver_location_update",
                "mission_id": event["mission_id"],
                "lat": event["lat"],
                "lng": event["lng"],
                "timestamp": event.get("timestamp"),
                "heading": event.get("heading"),  # Optional: driver heading/bearing
            }
        )