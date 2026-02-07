import jwt
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from django.conf import settings
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        from django.contrib.auth.models import AnonymousUser

        @database_sync_to_async
        def get_user(validated_token):
            return JWTAuthentication().get_user(validated_token)

        # Only process WebSocket connections
        if scope["type"] == "websocket":
            query_string = parse_qs(scope["query_string"].decode())
            token = query_string.get("token")

            if token:
                try:
                    validated_token = JWTAuthentication().get_validated_token(token[0])
                    user = await get_user(validated_token)
                    if user:
                        scope["user"] = user
                        print(f"[WS-AUTH] User authenticated: {user.id} ({user.phone_number})")
                    else:
                        scope["user"] = AnonymousUser()
                        print(f"[WS-AUTH] Token valid but user not found")
                except InvalidToken as e:
                    scope["user"] = AnonymousUser()
                    print(f"[WS-AUTH] Invalid token: {e}")
                except TokenError as e:
                    scope["user"] = AnonymousUser()
                    print(f"[WS-AUTH] Token error: {e}")
                except Exception as e:
                    scope["user"] = AnonymousUser()
                    print(f"[WS-AUTH] Unexpected error: {e}")
            else:
                scope["user"] = AnonymousUser()
                print(f"[WS-AUTH] No token provided")

        return await super().__call__(scope, receive, send)
