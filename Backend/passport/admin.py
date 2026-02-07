from django.contrib import admin

from wire.models import Fraud
from .models import Profile, ServerUpgradeRequest,User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """
    Admin interface for the Profile model.
    Displays essential user profile data and allows filtering by role.
    """

    list_display = ("phone_number",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """
    Admin interface for the Profile model.
    Displays essential user profile data and allows filtering by role.
    """

    list_display = ("user", "role", "first_name", "last_name", "rating")
    list_filter = ("role",)


@admin.register(ServerUpgradeRequest)
class ServerUpgradeRequestAdmin(admin.ModelAdmin):
    """
    Admin interface for managing server upgrade requests.
    Admins can quickly approve or reject requests using list_editable.
    """

    list_display = ("user", "submitted_at", "reviewed", "approved")
    list_editable = ("reviewed", "approved")
    search_fields = ("user__phone_number",)

admin.site.register(Fraud)
