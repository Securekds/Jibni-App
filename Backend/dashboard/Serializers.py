from rest_framework import serializers
from passport.models import Profile, ServerUpgradeRequest
from wire.models import Mission, Report, Fraud
from django.db.models import Sum,Avg
from django.contrib.auth import get_user_model

User = get_user_model()

class ServerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    mission_count = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()  # Add rating field

    class Meta:
        model = Profile
        fields = [
            "id",
            "user_id",
            "name",
            "engaged",
            "city",
            "rating",  # This will be your calculated average rating
            "banned",
            "last_active",
            "mission_count",
            "phone_number",
            "revenue",
            "driving_license",
            "gray_card",
            "licence_id",
            "gray_card_id",
        ]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    def get_mission_count(self, obj):
        user_id = obj.user_id
        return Mission.objects.filter(server=user_id).count()

    def get_phone_number(self, obj):
        return getattr(obj.user, "phone_number", None)

    def get_revenue(self, obj):
        user_id = obj.user_id
        total_revenue = (
            Mission.objects.filter(server=user_id, status="COMPLETED").aggregate(
                total=Sum("price")
            )["total"]
            or 0
        )
        return total_revenue

    def get_rating(self, obj):
        user_id = obj.user_id
        avg_rating = Mission.objects.filter(
            server=user_id,
            status="COMPLETED",
            rating__isnull=False
        ).aggregate(avg=Avg('rating'))['avg']
        return round(avg_rating, 1) if avg_rating is not None else 0


class RequestSerializer(serializers.ModelSerializer):
    profile = ServerSerializer(source="user.profile", read_only=True)

    class Meta:
        model = ServerUpgradeRequest
        fields = [
            "id",
            "user_id",
            "submitted_at",
            "reviewed",
            "approved",
            "rejection_reason",
            
            "profile",
        ]
        read_only_fields = ["submitted_at", "user_id", "profile"]


class ClientSerializer(serializers.ModelSerializer):
    phone_number = serializers.SerializerMethodField()
    beneficiaire = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ["id", "user_id", "phone_number", "banned", "beneficiaire"]

    def get_phone_number(self, obj):
        return getattr(obj.user, "phone_number", None)

    def get_beneficiaire(self, obj):
        
        return Mission.objects.filter(client=obj.user).exists()


class MissionSerializer(serializers.ModelSerializer):
    server_name = serializers.SerializerMethodField()
    server_phone_number = serializers.SerializerMethodField()
    client_phone_number = serializers.SerializerMethodField()

    class Meta:
        model = Mission
        fields = [
            "id",
            "client_id",
            "server_id",
            "client_lat",
            "client_lng",
            "destination_lat",
            "destination_lng",
            "status",
            "price",
            "rating",
            "comment",
            "server_name",
            "server_phone_number",
            "client_phone_number",
            "created_at",
            "mission_id",
            
        ]

    def get_server_name(self, obj):
        user = getattr(obj, "server", None)
        if not user:
            return None
        profile = getattr(user, "profile", None)
        name = None
        if profile:
            name = getattr(profile, "name", None)
            if not name:
                first = getattr(profile, "first_name", "")
                last = getattr(profile, "last_name", "")
                name = f"{first} {last}".strip()
        if not name:
            first = getattr(user, "first_name", "")
            last = getattr(user, "last_name", "")
            name = f"{first} {last}".strip() or None
        return name

    def get_server_phone_number(self, obj):
        user = getattr(obj, "server", None)
        return getattr(user, "phone_number", None) if user else None

    def get_client_phone_number(self, obj):
        user = getattr(obj, "client", None)
        return getattr(user, "phone_number", None) if user else None


class ReportSerializer(serializers.ModelSerializer):
    reporter_phone_number = serializers.SerializerMethodField()
    reported_phone_number = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "subject",
            "content",
            "reporter_id",
            "reported_id",
            "mission_id",  # Keep this field but override its output
            "created_at",
            "reviewed",
            "reporter_phone_number",
            "reported_phone_number",
        ]

    def get_reporter_phone_number(self, obj):
        user = getattr(obj, "reporter", None)
        return getattr(user, "phone_number", None) if user else None

    def get_reported_phone_number(self, obj):
        user = getattr(obj, "reported", None)
        return getattr(user, "phone_number", None) if user else None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        mission = getattr(instance, "mission", None)
        if mission and hasattr(mission, "mission_id"):
            rep["mission_id"] = mission.mission_id
        return rep


class FraudSerializer(serializers.ModelSerializer):
    client_phone_number = serializers.SerializerMethodField()
    server_phone_number = serializers.SerializerMethodField()
    mission_id = serializers.SerializerMethodField()

    class Meta:
        model = Fraud
        fields = [
            "id",
            "mission_id",
            "viewed",
            "alerts",
            "created_at",
            "client_phone_number",
            "server_phone_number",
        ]

    def get_client_phone_number(self, obj):
        """
        Resolve client_id -> User.pk -> phone_number.
        """
        client_id = getattr(obj, "client_id", None)
        if not client_id:
            return None
        try:
            user = User.objects.get(pk=client_id)
        except User.DoesNotExist:
            return None
        return getattr(user, "phone_number", None)

    def get_server_phone_number(self, obj):
        """
        Resolve server_id -> User.pk -> phone_number.
        """
        server_id = getattr(obj, "server_id", None)
        if not server_id:
            return None
        try:
            user = User.objects.get(pk=server_id)
        except User.DoesNotExist:
            return None
        return getattr(user, "phone_number", None)

    def get_mission_id(self, obj):
        """
        Resolve mission foreign key to mission.mission_id.
        """
        mission = getattr(obj, "mission", None)
        if mission and hasattr(mission, "mission_id"):
            return mission.mission_id
        return None