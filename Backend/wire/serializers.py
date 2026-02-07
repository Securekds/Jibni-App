# wire/serializers.py
from rest_framework import serializers
from .models import Report, Mission, Ratings
from passport.models import User


class NearbyServerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    phone_number = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    distance_km = serializers.FloatField()
    price = serializers.IntegerField()


class NearbyServersRequestSerializer(serializers.Serializer):
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    dist_lat = serializers.FloatField()
    dist_lng = serializers.FloatField()
   

class MissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = "__all__"


class ReportSerializer(serializers.ModelSerializer):
    mission_id = serializers.CharField(write_only=True)  # input mission_id as string
    reporter = serializers.PrimaryKeyRelatedField(read_only=True)
    reported = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "subject",
            "content",
            "reporter",
            "reported",
            "mission_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "reporter", "reported"]

    def create(self, validated_data):
        mission_str = validated_data.pop("mission_id")
        mission = Mission.objects.get(mission_id=mission_str)
        validated_data["mission"] = mission

        # Deduce reporter/reported from mission_id format: mission:client_id:server_id:timestamp
        try:
            _, client_id_str, server_id_str, _ = mission_str.split(":")
            client_id = int(client_id_str)
            server_id = int(server_id_str)
        except ValueError:
            raise serializers.ValidationError("Invalid mission_id format")

        request_user = self.context["request"].user
        if request_user.id == client_id:
            validated_data["reporter"] = request_user
            validated_data["reported"] = User.objects.get(id=server_id)
        elif request_user.id == server_id:
            validated_data["reporter"] = request_user
            validated_data["reported"] = User.objects.get(id=client_id)
        else:
            raise serializers.ValidationError("User is not part of this mission")

        return Report.objects.create(**validated_data)


class RatingSerializer(serializers.ModelSerializer):
    mission_id = serializers.CharField(write_only=True)
    rater = serializers.PrimaryKeyRelatedField(read_only=True)
    rated = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Ratings
        fields = ["id", "score", "rater", "rated", "mission_id", "created_at"]
        read_only_fields = ["id", "created_at", "rater", "rated"]

    def validate_score(self, value):
        if not (0 <= value <= 5):
            raise serializers.ValidationError("Score must be between 0 and 5")
        return value

    def create(self, validated_data):
        mission_str = validated_data.pop("mission_id")
        mission = Mission.objects.get(mission_id=mission_str)
        validated_data["mission"] = mission

        try:
            _, client_id_str, server_id_str, _ = mission_str.split(":")
            client_id = int(client_id_str)
            server_id = int(server_id_str)
        except ValueError:
            raise serializers.ValidationError("Invalid mission_id format")

        request_user = self.context["request"].user
        if request_user.id == client_id:
            validated_data["rater"] = request_user
            validated_data["rated"] = User.objects.get(id=server_id)
        elif request_user.id == server_id:
            validated_data["rater"] = request_user
            validated_data["rated"] = User.objects.get(id=client_id)
        else:
            raise serializers.ValidationError("User is not part of this mission")

        # Optional: Update mission ratings (average or override, here override demo)
        mission.rating = validated_data["score"]
        mission.save()

        return Ratings.objects.create(**validated_data)
