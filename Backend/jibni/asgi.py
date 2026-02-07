import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "jibni.settings")
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

# Import websocket routes and middleware only after setup:
from wire.routing import websocket_urlpatterns
from passport.middleware import JWTAuthMiddleware

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
