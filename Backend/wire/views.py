from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from dashboard.views import Paginator
from wire.permission import IsServer
from wire.processors import PriceProcessor
from django.contrib.auth import get_user_model
from wire.utils import get_distance_duration, haversine, can_toggle_availability
import redis
import json
from rest_framework import generics
from wire.models import Ratings, Report, Mission
from wire.serializers import ReportSerializer, RatingSerializer, MissionSerializer, NearbyServerSerializer, NearbyServersRequestSerializer


r = redis.StrictRedis()


@extend_schema(
    parameters=[
        OpenApiParameter(
            name="lat",
            description="Latitude of the user",
            required=True,
            type=OpenApiTypes.DOUBLE,
        ),
        OpenApiParameter(
            name="lng",
            description="Longitude of the user",
            required=True,
            type=OpenApiTypes.DOUBLE,
        ),
        OpenApiParameter(
            name="duration",
            description="duration from client to distination in seconds",
            required=True,
            type=OpenApiTypes.INT,
        ),
        OpenApiParameter(
            name="distance",
            description="distance from client to distination in meters",
            required=True,
            type=OpenApiTypes.INT,
        ),
        OpenApiParameter(
            name="dist_lat",
            description="distination latitude",
            required=True,
            type=OpenApiTypes.DOUBLE,
        ),
        OpenApiParameter(
            name="dist_lng",
            description="distination longitude",
            required=True,
            type=OpenApiTypes.DOUBLE,
        ),
    ],
    responses={200: NearbyServerSerializer(many=True)},
    tags=["Nearby Servers"],
    description="Get up to 10 nearby available servers (mechanics) within 100km radius.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_nearby_servers(request):

    request_serializer = NearbyServersRequestSerializer(data=request.query_params)
    if not request_serializer.is_valid():
        return Response(request_serializer.errors, status=400)
    lat = request_serializer.validated_data["lat"]
    lng = request_serializer.validated_data["lng"]
    dist_lng = request_serializer.validated_data["dist_lng"]
    dist_lat = request_serializer.validated_data["dist_lat"]

    

    keys = r.keys("server:*")
    print(f"[NEARBY-SERVERS] Searching for nearby servers. Found {len(keys)} Redis keys matching 'server:*'")
    print(f"[NEARBY-SERVERS] All keys found: {[k.decode() if isinstance(k, bytes) else k for k in keys]}")
    servers = []
    User = get_user_model()

    for key in keys:
        if b"last_beat" in key:
            print(f"[NEARBY-SERVERS] Skipping last_beat key: {key}")
            continue
        try:
            key_str = key.decode() if isinstance(key, bytes) else key
            user_id = int(key_str.split(":")[1])
            data_str = r.get(key)
            data = json.loads(data_str) if isinstance(data_str, (str, bytes)) else json.loads(data_str.decode())
            
            print(f"[NEARBY-SERVERS] Processing server key: {key_str}, user_id: {user_id}, location: lat={data.get('lat')}, lng={data.get('lng')}")
            
            distance_server_client, _ = get_distance_duration(
                f"{lat},{lng}", f'{float(data["lat"])},{float(data["lng"])}'
            )
            distance_client_dest, _ = get_distance_duration(
                f"{lat},{lng}", f"{dist_lat},{dist_lng}"
            )
            price = PriceProcessor(distance_server_client, distance_client_dest).compute_total()
            
            distance_km = distance_server_client / 1000
            print(f"[NEARBY-SERVERS] User {user_id} - distance to client: {round(distance_km, 2)}km")
            
            if distance_km > 100:
                print(f"[NEARBY-SERVERS] Skipping user {user_id}: Too far ({round(distance_km, 2)}km > 100km)")
                continue
                
            user = User.objects.get(id=user_id)
            profile = user.profile
            
            print(f"[NEARBY-SERVERS] User {user_id} profile check: open_to_work={profile.open_to_work}, role={profile.role}, engaged={profile.engaged}")
            
            if not profile.open_to_work:
                print(f"[NEARBY-SERVERS] Skipping user {user_id}: open_to_work is False")
                continue
            if profile.role != "server":
                print(f"[NEARBY-SERVERS] Skipping user {user_id}: role is '{profile.role}' (expected 'server')")
                continue
            if profile.engaged:
                print(f"[NEARBY-SERVERS] Skipping user {user_id}: engaged is True")
                continue

            print(f"[NEARBY-SERVERS] ✅ Adding server {user_id} ({profile.first_name} {profile.last_name}) - distance: {round(distance_km, 2)}km, price: {price}")
            servers.append(
                {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "first_name": profile.first_name,
                    "last_name": profile.last_name,
                    "lat": float(data["lat"]),
                    "lng": float(data["lng"]),
                    "distance_km": round(distance_server_client, 2),
                    "price": price,
                }
            )

        except Exception:
            continue

    if not servers:
        print(f"[NEARBY-SERVERS] No servers found after filtering. Total Redis keys checked: {len(keys)}")
        return Response(
            {"error": "No nearby servers found, please call 0778669194"}, status=404
        )
    servers.sort(key=lambda s: s["distance_km"])
    paginator = PageNumberPagination()
    paginator.page_size = 10
    paginated = paginator.paginate_queryset(servers, request)
    serializer = NearbyServerSerializer(paginated, many=True)

    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    request=None,
    responses={
        200: {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "open_to_work": {"type": "boolean"},
            },
        },
        429: {
            "type": "object",
            "properties": {"error": {"type": "string"}},
        },
    },
    examples=[
        OpenApiExample(
            "Success - now available",
            value={"status": "Success.", "open_to_work": True},
            response_only=True,
            status_codes=["200"],
        ),
        OpenApiExample(
            "Success - now unavailable",
            value={"status": "Success.", "open_to_work": False},
            response_only=True,
            status_codes=["200"],
        ),
        OpenApiExample(
            "Too many toggles",
            value={
                "status": "Error.",
                "message": "Please wait before changing availability again.",
            },
            response_only=True,
            status_codes=["429"],
        ),
    ],
    tags=["Settings"],
    description="Toggle the authenticated user's availability status. Returns 429 if toggled too frequently.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_availability(request):
    user = request.user
    profile = user.profile

    if not can_toggle_availability(user.id):
        return Response(
            {
                "status": "Error.",
                "message": "Please wait before changing availability again.",
            },
            status=429,
        )

    profile.open_to_work = not profile.open_to_work
    profile.save()
    return Response({"status": "Success.", "open_to_work": profile.open_to_work})


@extend_schema(
    request=None,
    responses={
        200: {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "open_to_work": {"type": "boolean"},
                "role": {"type": "string"},
            },
        },
    },
    tags=["Driver Availability"],
    description="Get current availability status without toggling",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_availability(request):
    """Get current availability status without toggling"""
    user = request.user
    profile = user.profile
    return Response({
        "status": "success",
        "open_to_work": profile.open_to_work,
        "role": profile.role,
    })


@extend_schema(
    request=ReportSerializer,
    responses={
        200: {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "subject": {"type": "string"},
                    "content": {"type": "string"},
                    "reporter": {"type": "integer"},
                    "reported": {"type": "integer"},
                    "mission_id": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
        },
        201: {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "subject": {"type": "string"},
                "content": {"type": "string"},
                "reporter": {"type": "integer"},
                "reported": {"type": "integer"},
                "mission_id": {"type": "string"},
                "created_at": {"type": "string", "format": "date-time"},
            },
        },
        400: {
            "type": "object",
            "properties": {"detail": {"type": "string"}},
        },
        401: {
            "type": "object",
            "properties": {"detail": {"type": "string"}},
        },
        403: {
            "type": "object",
            "properties": {"detail": {"type": "string"}},
        },
    },
    examples=[
        OpenApiExample(
            "List Reports - Success",
            value=[
                {
                    "id": 15,
                    "subject": "Initial Recon Report",
                    "content": "Found suspicious activity near server 6.",
                    "reporter": 3,
                    "reported": 6,
                    "mission_id": "mission:3:6:1876843557",
                    "created_at": "2025-11-07T19:15:30Z",
                },
                {
                    "id": 16,
                    "subject": "Follow-up Investigation",
                    "content": "Clarified details on incident with client 3.",
                    "reporter": 6,
                    "reported": 3,
                    "mission_id": "mission:3:6:1876843557",
                    "created_at": "2025-11-07T20:05:45Z",
                },
            ],
            response_only=True,
            status_codes=["200"],
        ),
        OpenApiExample(
            "Create Report - Success",
            value={
                "id": 17,
                "subject": "Incident Summary",
                "content": "Detailed report finalized.",
                "reporter": 3,
                "reported": 6,
                "mission_id": "mission:3:6:1876843557",
                "created_at": "2025-11-07T21:00:00Z",
            },
            response_only=True,
            status_codes=["201"],
        ),
        OpenApiExample(
            "Invalid mission_id format",
            value={"detail": "Invalid mission_id format"},
            response_only=True,
            status_codes=["400"],
        ),
        OpenApiExample(
            "Unauthorized - Authentication required",
            value={"detail": "Authentication credentials were not provided."},
            response_only=True,
            status_codes=["401"],
        ),
        OpenApiExample(
            "Forbidden - User not in mission",
            value={"detail": "User is not part of this mission"},
            response_only=True,
            status_codes=["403"],
        ),
    ],
    tags=["Reports"],
    description=(
        "Endpoint to list all reports (GET) and create a new report (POST). "
        "The mission_id identifies the mission and is used to determine the reporter and reported roles "
        "based on the logged-in user. Authentication required."
    ),
)
class ReportListCreateView(generics.ListCreateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


@extend_schema(
    request=RatingSerializer,
    responses={
        200: {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "score": {"type": "integer"},
                    "rater": {"type": "integer"},
                    "rated": {"type": "integer"},
                    "mission_id": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                },
            },
        },
        201: {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "score": {"type": "integer"},
                "rater": {"type": "integer"},
                "rated": {"type": "integer"},
                "mission_id": {"type": "string"},
                "created_at": {"type": "string", "format": "date-time"},
            },
        },
        400: {
            "type": "object",
            "properties": {"detail": {"type": "string"}},
        },
        401: {
            "type": "object",
            "properties": {"detail": {"type": "string"}},
        },
        403: {
            "type": "object",
            "properties": {"detail": {"type": "string"}},
        },
    },
    examples=[
        OpenApiExample(
            "List Ratings - Success",
            value=[
                {
                    "id": 5,
                    "score": 4,
                    "rater": 3,
                    "rated": 6,
                    "mission_id": "mission:3:6:1876843557",
                    "created_at": "2025-11-07T19:55:00Z",
                }
            ],
            response_only=True,
            status_codes=["200"],
        ),
        OpenApiExample(
            "Create Rating - Success",
            value={
                "id": 6,
                "score": 5,
                "rater": 6,
                "rated": 3,
                "mission_id": "mission:3:6:1876843557",
                "created_at": "2025-11-07T20:10:00Z",
            },
            response_only=True,
            status_codes=["201"],
        ),
        OpenApiExample(
            "Invalid score",
            value={"detail": "Score must be between 0 and 5"},
            response_only=True,
            status_codes=["400"],
        ),
        OpenApiExample(
            "Unauthorized",
            value={"detail": "Authentication credentials were not provided."},
            response_only=True,
            status_codes=["401"],
        ),
        OpenApiExample(
            "Forbidden",
            value={"detail": "User is not part of this mission"},
            response_only=True,
            status_codes=["403"],
        ),
    ],
    tags=["Ratings"],
    description=(
        "Endpoint to list all ratings (GET) and create a new rating (POST). "
        "The mission_id is used to determine the rater and rated users based on the logged-in user."
        "Rating score must be an integer between 0 and 5. "
        "Authentication is required."
    ),
)
class RatingListCreateView(generics.ListCreateAPIView):
    queryset = Ratings.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context


@extend_schema(
    summary="List missions for the authenticated server user",
    description="Returns a paginated list of missions where the requesting user acts as a server (role deduced from request no need to send any params) -  Requires authentication and a server role.",
    responses={
        200: OpenApiResponse(
            description="Paginated list of missions where user is a server.",
            response=MissionSerializer(many=True),
        ),
        403: OpenApiResponse(description="Forbidden. Only server users can access."),
        401: OpenApiResponse(description="Not authenticated."),
    },
    tags=["Server History"],
)
class ServerMissionsListView(generics.ListAPIView):
    serializer_class = MissionSerializer
    permission_classes = [IsAuthenticated, IsServer]
    pagination_class = Paginator

    def get_queryset(self):
        return Mission.objects.filter(server=self.request.user).order_by("-id")
