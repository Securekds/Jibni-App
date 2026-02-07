from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, pagination,status
from dashboard.Serializers import ClientSerializer, MissionSerializer, ServerSerializer,RequestSerializer
from rest_framework.generics import RetrieveUpdateAPIView, ListAPIView
from passport.models import User, Profile, ServerUpgradeRequest
from wire.models import Fraud, Mission
import platform
import psutil
from drf_spectacular.utils import extend_schema
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from django.db.models import Exists, OuterRef
from django.utils.timezone import make_aware
from datetime import datetime, time
from wire.models import Report
from .Serializers import FraudSerializer, ReportSerializer, MissionSerializer
from rest_framework.decorators import action
from rest_framework.decorators import api_view
import redis
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Avg, Count, Max, Min
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone


class AdminLoginView(APIView):
    """
    Login view for superusers only.
    """

    def post(self, request):
        phone_number = request.data.get("phone_number")
        password = request.data.get("password")

        if not phone_number or not password:
            return Response(
                {"detail": "Phone number and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, phone_number=phone_number, password=password)

        if user is None:
            return Response(
                {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_superuser:
            return Response(
                {"detail": "Not authorized. Admins only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "is_superuser": user.is_superuser,
                },
            },
            status=status.HTTP_200_OK,
        )


class Paginator(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ServerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ServerSerializer
    pagination_class = Paginator
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    search_fields = ["user__phone_number", "first_name", "last_name", "city","id"]
    ordering_fields = ["created_at", "rating", "revenue", "mission_count"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Profile.objects.select_related("user").filter(role="server")

        # Annotate mission_count for ordering
        queryset = queryset.annotate(mission_count=Count("user__server_mission"))

        # Filter by banned status
        banned = self.request.query_params.get("banned", None)
        if banned is not None:
            queryset = queryset.filter(banned=(banned.lower() == "true"))

        # Filter by open_to_work availability
        open_to_work = self.request.query_params.get("open_to_work", None)
        if open_to_work is not None:
            queryset = queryset.filter(open_to_work=(open_to_work.lower() == "true"))

        return queryset


class RequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RequestSerializer
    pagination_class = Paginator

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["reviewed", "approved"]
    search_fields = [
        "user__profile__first_name",
        "user__profile__last_name",
        "user__phone_number",
    ]
    ordering_fields = ["submitted_at", "reviewed", "approved"]
    ordering = ["-submitted_at"]

    def get_queryset(self):
        queryset = ServerUpgradeRequest.objects.select_related("user__profile").all()

        date_from_str = self.request.query_params.get("date_from")
        date_to_str = self.request.query_params.get("date_to")

        def parse_date(date_str, end_of_day=False):
            if not date_str:
                return None
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                if end_of_day:
                    dt = datetime.combine(dt.date(), time.max)
                return make_aware(dt)
            except Exception:
                return None

        date_from = parse_date(date_from_str)
        date_to = parse_date(date_to_str, end_of_day=True)

        if date_from and date_to and date_from > date_to:
            # Swap to ensure proper date range
            date_from, date_to = date_to, date_from

        if date_from:
            queryset = queryset.filter(submitted_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(submitted_at__lte=date_to)

        return queryset


class ClientViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = Paginator
    serializer_class = ClientSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    search_fields = ["user__phone_number", "first_name", "last_name"]
    ordering_fields = ["user__phone_number", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Annotate with beneficiaire status
        queryset = (
            Profile.objects.select_related("user")
            .filter(role="client")
            .annotate(
                has_mission=Exists(Mission.objects.filter(client=OuterRef("user")))
            )
        )

        # Filter by banned status
        banned = self.request.query_params.get("banned", None)
        if banned is not None:
            queryset = queryset.filter(banned=(banned.lower() == "true"))

        # Filter by beneficiaire (now available via annotation)
        beneficiaire = self.request.query_params.get("beneficiaire", None)
        if beneficiaire is not None:
            queryset = queryset.filter(has_mission=(beneficiaire.lower() == "true"))

        return queryset


class ServerUpgradeRequestDetailView(RetrieveUpdateAPIView):
    queryset = ServerUpgradeRequest.objects.all()
    serializer_class = RequestSerializer
    lookup_field = "id"

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.reviewed:
            instance.reviewed = True
            instance.save(update_fields=["reviewed"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()

        # Extract fields from request data
        approved = request.data.get("approved", instance.approved)
        reviewed = request.data.get("reviewed", instance.reviewed)
        rejection_reason = request.data.get(
            "rejection_reason", instance.rejection_reason
        )
        licence_id = request.data.get("licence_id", None)
        gray_card_id = request.data.get("gray_card_id", None)

        # Update ServerUpgradeRequest fields
        instance.approved = approved
        instance.reviewed = reviewed
        instance.rejection_reason = rejection_reason
        instance.save(update_fields=["approved", "reviewed", "rejection_reason"])

        # Update related Profile fields if provided
        profile = instance.user.profile
        updated = False
        if licence_id is not None:
            profile.licence_id = licence_id
            updated = True
        if gray_card_id is not None:
            profile.gray_card_id = gray_card_id
            updated = True
        if updated:
            profile.save(update_fields=["licence_id", "gray_card_id"])

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BanUserView(APIView):
    def post(self, request):
        user_id = request.data.get("user_id")
        action = request.data.get("action", "ban")  # default to "ban" if not specified

        if not user_id:
            return Response(
                {"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
            profile = user.profile
        except (User.DoesNotExist, Profile.DoesNotExist):
            return Response(
                {"error": "User or profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action == "ban":
            profile.banned = True
        elif action == "unban":
            profile.banned = False
        else:
            return Response(
                {"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST
            )
        profile.save(update_fields=["banned"])

        return Response(
            {
                "user_id": user_id,
                "banned": profile.banned,
                "message": "Ban status updated successfully.",
            },
            status=status.HTTP_200_OK,
        )


r = redis.StrictRedis()  # Configure if needed, e.g. host, port


class Paginator(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"


class MissionsView(ReadOnlyModelViewSet):
    serializer_class = MissionSerializer
    pagination_class = Paginator
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    search_fields = [
        "mission_id",
        "client__phone_number",
        "server__phone_number",
        "client__profile__first_name",
        "client__profile__last_name",
        "server__profile__first_name",
        "server__profile__last_name",
    ]
    ordering_fields = ["created_at", "price", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Mission.objects.select_related(
            "client__profile", "server__profile"
        ).all()

        # Filter by status
        status = self.request.query_params.get("status", None)
        if status:
            queryset = queryset.filter(status=status.upper())

        # Filter by date range
        date_from = self.request.query_params.get("date_from", None)
        date_to = self.request.query_params.get("date_to", None)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lt=f"{date_to}T23:59:59")

        return queryset


class MissionListView(ListAPIView):
    serializer_class = MissionSerializer
    pagination_class = Paginator

    def get_queryset(self):
        server_id = self.request.query_params.get("server_id")
        queryset = Mission.objects.select_related(
            "client__profile", "server__profile"
        ).all()

        if server_id:
            # Filter by the User ID who is the server
            queryset = queryset.filter(server__id=server_id)

        return queryset.order_by("-created_at")  # newest first


@extend_schema(
    summary="Get comprehensive server status",
    description="Returns disk, memory, CPU, network, and OS info of the Linux server",
    responses={
        200: {
            "type": "object",
            "properties": {
                "disk": {"type": "object"},
                "memory": {"type": "object"},
                "cpu": {"type": "object"},
                "network": {"type": "object"},
                "os": {"type": "object"},
            },
        },
    },
    tags=["Server Status"],
)
class ServerStatusView(APIView):
    # permission_classes = [IsAuthenticated]

    def get(self, request):
        # Disk Usage
        disk_usage = {}
        for p in psutil.disk_partitions(all=False):
            usage = psutil.disk_usage(p.mountpoint)
            disk_usage[p.device] = {
                'mountpoint': p.mountpoint,
                'fstype': p.fstype,
                'total': usage.total,
                'used': usage.used,
                'free': usage.free,
                'percent': usage.percent,
            }
        # Memory
        vm = psutil.virtual_memory()
        memory = {
            "total": vm.total,
            "available": vm.available,
            "used": vm.used,
            "percent": vm.percent,
            "free": vm.free,
        }

        # CPU
        cpu = {
            "cores_physical": psutil.cpu_count(logical=False),
            "cores_logical": psutil.cpu_count(logical=True),
            "usage_percent": psutil.cpu_percent(interval=1),
            "load_average": psutil.getloadavg(),  # 1, 5, 15 min
        }

        # Network stats (bytes sent/recv per interface)
        net_io = psutil.net_io_counters(pernic=True)
        network = {
            iface: {
                "bytes_sent": stats.bytes_sent,
                "bytes_recv": stats.bytes_recv,
                "packets_sent": stats.packets_sent,
                "packets_recv": stats.packets_recv,
                "errin": stats.errin,
                "errout": stats.errout,
                "dropin": stats.dropin,
                "dropout": stats.dropout,
            }
            for iface, stats in net_io.items()
        }

        # OS Info
        os_info = {
            "system": platform.system(),
            "node": platform.node(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
        }

        return Response(
            {
                "disk": disk_usage,
                "memory": memory,
                "cpu": cpu,
                "network": network,
                "os": os_info,
            }
        )


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related("reporter", "reported", "mission").all()
    serializer_class = ReportSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = [
        "subject",
        "reporter__id",
        "reported__id",
        "mission__mission_id",
        "reporter__phone_number",
        "reported__phone_number",
    ]
    filterset_fields = ["reviewed"]
    ordering_fields = ["created_at", "reviewed"]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"])
    def mark_reviewed(self, request, pk=None):
        report = self.get_object()
        if not report.reviewed:
            report.reviewed = True
            report.save()
        return Response({"status": "reviewed"}, status=status.HTTP_200_OK)


@api_view(["GET"])
def stats(request):
    today = timezone.localdate()
    now = timezone.now()

    # Calculate period starts
    week_start = today - timezone.timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    three_months_start = today - timezone.timedelta(days=90)

    periods = {
        "week": (week_start, today),
        "month": (month_start, today),
        "three_months": (three_months_start, today),
    }

    def stats_for_period(date_from, date_to):
        qs = Mission.objects.filter(
            created_at__date__gte=date_from, created_at__date__lte=date_to
        )
        completed = qs.filter(status="COMPLETED")

        # Totals & KPI
        totals = completed.aggregate(
            missions_count=Count("id"),
            sum_price=Sum("price"),
            avg_price=Avg("price"),
            distinct_servers=Count("server", distinct=True),
            avg_rating=Avg("rating"),
            max_price=Max("price"),
            min_price=Min("price"),
            max_rating=Max("rating"),
            min_rating=Min("rating"),
        )
        # Calendar breakdown
        calendar = list(
            completed.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                missions_count=Count("id"),
                sum_price=Sum("price"),
                avg_price=Avg("price"),
                avg_rating=Avg("rating"),
            )
            .order_by("day")
        )

        # Hourly breakdown for recent periods
        hours = (
            list(
                completed.annotate(hour=TruncHour("created_at"))
                .values("hour")
                .annotate(
                    missions_count=Count("id"),
                    sum_price=Sum("price"),
                    avg_price=Avg("price"),
                )
                .order_by("hour")
            )
            if (date_to - date_from).days < 10
            else []
        )

        # Per-server stats
        per_server = list(
            completed.values("server")
            .annotate(
                missions_count=Count("id"),
                sum_price=Sum("price"),
                avg_price=Avg("price"),
                avg_rating=Avg("rating"),
                max_rating=Max("rating"),
                min_rating=Min("rating"),
            )
            .order_by("-sum_price", "-missions_count")
        )
        top_3 = per_server[:3]
        bottom_3 = list(per_server[-3:]) if len(per_server) > 2 else per_server

        def serialize_server(s):
            return {
                "server_id": s["server"],
                "missions_count": s["missions_count"],
                "sum_price": s["sum_price"] or 0,
                "avg_price": s["avg_price"] or 0,
                "avg_rating": round(s["avg_rating"] or 0, 2),
                "max_rating": s["max_rating"] or 0,
                "min_rating": s["min_rating"] or 0,
            }

        # Rating histogram (for frontend charting)
        rating_histogram = dict(
            completed.values_list("rating").annotate(count=Count("id"))
        )
        # Status distribution
        status_breakdown = list(
            qs.values("status")
            .annotate(
                missions_count=Count("id"),
                sum_price=Sum("price"),
                avg_rating=Avg("rating"),
            )
            .order_by("status")
        )

        # Completion rate
        total_in_period = qs.count()
        completed_in_period = totals["missions_count"] or 0
        completion_rate = (
            (completed_in_period / total_in_period) * 100 if total_in_period else 0
        )

        # Best day by revenue/missions
        busiest_day = max(calendar, key=lambda x: x["missions_count"], default=None)
        best_revenue_day = max(calendar, key=lambda x: x["sum_price"], default=None)

        # Revenue growth (compare latest vs earliest day)
        growth = 0
        if calendar and calendar[0]["sum_price"]:
            try:
                growth = (
                    (calendar[-1]["sum_price"] - calendar[0]["sum_price"])
                    / calendar[0]["sum_price"]
                ) * 100
            except ZeroDivisionError:
                growth = 0

        return {
            "date_range": {
                "from": date_from.isoformat(),
                "to": date_to.isoformat(),
            },
            "totals": {
                "missions_count": totals["missions_count"] or 0,
                "sum_price": totals["sum_price"] or 0,
                "avg_price": totals["avg_price"] or 0,
                "distinct_servers": totals["distinct_servers"] or 0,
                "completion_rate_percent": round(completion_rate, 2),
                "avg_rating": round(totals["avg_rating"] or 0, 2),
                "max_price": totals["max_price"] or 0,
                "min_price": totals["min_price"] or 0,
                "max_rating": totals["max_rating"] or 0,
                "min_rating": totals["min_rating"] or 0,
                "revenue_growth_percent": round(growth, 2),
            },
            "calendar": calendar,
            "hours": hours,
            "servers": {
                "top_3_by_revenue": [serialize_server(s) for s in top_3],
                "bottom_3_by_revenue": [serialize_server(s) for s in bottom_3],
                "top_by_rating": max(
                    per_server, key=lambda x: x["avg_rating"], default=None
                ),
                "lowest_by_rating": min(
                    per_server, key=lambda x: x["avg_rating"], default=None
                ),
            },
            "status_breakdown": status_breakdown,
            "rating_histogram": rating_histogram,
            "specials": {
                "busiest_day": busiest_day,
                "best_revenue_day": best_revenue_day,
                "latest_update": now.isoformat(),
            },
        }

    result = {
        period_name: stats_for_period(*timeframe)
        for period_name, timeframe in periods.items()
    }
    result["latest_update"] = now.isoformat()
    return Response(result)


class FraudViewSet(viewsets.ModelViewSet):
    queryset = Fraud.objects.select_related("mission", "client", "server").order_by(
        "-created_at"
    )
    serializer_class = FraudSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    search_fields = [
        "mission__mission_id",
        "client__phone_number",
        "server__phone_number",
    ]

    filterset_fields = ["viewed"]
    ordering_fields = ["created_at", "viewed"]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"])
    def mark_viewed(self, request, pk=None):
        fraud = self.get_object()
        fraud.viewed = True
        fraud.save(update_fields=["viewed"])
        return Response({"status": "marked_viewed"}, status=status.HTTP_200_OK)
