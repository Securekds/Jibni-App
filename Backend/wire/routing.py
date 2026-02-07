# wire/routing.py

from django.urls import path, re_path
from . import consumers

websocket_urlpatterns = [
    path("ws/server/", consumers.ServerConsumer.as_asgi()),
    re_path(r"^ws/missions(?:/(?P<server_id>\d+))?/$", consumers.MissionConsumer.as_asgi()),
]
