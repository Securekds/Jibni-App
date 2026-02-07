from django.urls import path

from .views import ClientViewSet, FraudViewSet, MissionListView, MissionsView, ReportViewSet, RequestViewSet, ServerStatusView, ServerUpgradeRequestDetailView, ServerViewSet, stats

from .views import (
    AdminLoginView,
)
from .views import BanUserView


report_list = ReportViewSet.as_view(
    {
        "get": "list",
    }
)

report_mark_reviewed = ReportViewSet.as_view(
    {
        "post": "mark_reviewed",
    }
)

fraud_list = FraudViewSet.as_view(
    {
        "get": "list",
    }
)

fraud_mark_viewed = FraudViewSet.as_view(
    {
        "post": "mark_viewed",
    }
)


urlpatterns = [
    path("login/", AdminLoginView.as_view(), name="admin_login"),
    path("servers/", ServerViewSet.as_view({"get": "list"}), name="servers"),
    path("clients/", ClientViewSet.as_view({"get": "list"}), name="clients"),
    path("requests/", RequestViewSet.as_view({"get": "list"}), name="requests"),
    path(
        "requests/<int:id>/",
        ServerUpgradeRequestDetailView.as_view(),
        name="upgrade-request-detail",
    ),
    path("ban-user/", BanUserView.as_view(), name="ban-user"),
    path("stats/", stats, name="stats"),
    path("missions/", MissionsView.as_view({"get": "list"}), name="missions"),
    path("server_missions/", MissionListView.as_view(), name="server-missions"),
    path("server-status/", ServerStatusView.as_view(), name="server-status"),
    path("reports/", report_list, name="reports-list"),
    path(
        "reports/<int:pk>/mark_reviewed/",
        report_mark_reviewed,
        name="reports-mark-reviewed",
    ),
    path("frauds/", fraud_list, name="frauds-list"),
    path(
        "frauds/<int:pk>/mark_viewed/",
        fraud_mark_viewed,
        name="frauds-mark-viewed",
    ),
]
