# wire/urls.py
from django.urls import path
from .views import RatingListCreateView, ReportListCreateView, ServerMissionsListView, get_nearby_servers, toggle_availability, get_availability

urlpatterns = [
    path("servers/nearby/", get_nearby_servers),
    path("availability/", get_availability, name="get-availability"),
    path("toggle-availability/", toggle_availability, name="toggle-availability"),
    path("reports/", ReportListCreateView.as_view(), name="report-list-create"),
    path("ratings/", RatingListCreateView.as_view(), name="ratings-list-create"),
    path("server-missions/", ServerMissionsListView.as_view(), name="server-missions"),
]
