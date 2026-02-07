from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Mission(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "pending"),
        ("ACTIVE", "active"),
        ("REJECTED", "rejected"),
        ("CANCELLED", "cancelled"),
        ("Timeout", "timeout"),
        ("EXPIRED", "expired"),
        ("COMPLETED", "completed"),
    ]

    client = models.ForeignKey(
        User, related_name="client_mission", on_delete=models.CASCADE
    )
    server = models.ForeignKey(
        User, related_name="server_mission", on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")
    client_lat = models.FloatField()
    client_lng = models.FloatField()
    server_lat = models.FloatField()
    server_lng = models.FloatField()
    destination_lat = models.FloatField(null=True, blank=True)
    mission_id = models.CharField(max_length=100, unique=True)
    price = models.IntegerField(null=False, blank=False, default=1000)
    rating = models.FloatField(null=True, blank=True, default=0)  # Max rating = 5
    comment = models.TextField(null=True, blank=True)
    destination_lng = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.client} -> {self.server} [{self.status}]"

class Report(models.Model):
    subject = models.CharField(max_length=255, null=False, blank=False)
    content = models.TextField(null=False, blank=False)
    reporter = models.ForeignKey(
        User, related_name="reports_made", on_delete=models.CASCADE
    )
    reported = models.ForeignKey(
        User, related_name="reports_received", on_delete=models.CASCADE
    )
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.subject} (Mission: {self.mission})"


class Ratings(models.Model):
    score = models.IntegerField()  # 0 to 5 inclusive
    rater = models.ForeignKey(
        User, related_name="ratings_given", on_delete=models.CASCADE
    )
    rated = models.ForeignKey(
        User, related_name="ratings_received", on_delete=models.CASCADE
    )
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Rating {self.score} from {self.rater_id} to {self.rated_id} on {self.mission}"

    class Meta:
        verbose_name_plural = "Ratings"


class Fraud(models.Model):
    """
    Records missions flagged as fraudulent after accumulating 5+ fraud alerts
    from location processing.
    """

    mission = models.ForeignKey(Mission, on_delete=models.CASCADE)
    client = models.ForeignKey(User, related_name="fraud_client", on_delete=models.CASCADE)
    server = models.ForeignKey(User, related_name="fraud_server", on_delete=models.CASCADE)
    viewed = models.BooleanField(default=False)
    alerts = (
        models.JSONField()
    )  # List of alert dicts: [{"type": "...", "message": "..."}]
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ["mission", "client", "server"]
        indexes = [
            models.Index(fields=["mission"]),
            models.Index(fields=["client"]),
            models.Index(fields=["created_at"]),
        ]

   