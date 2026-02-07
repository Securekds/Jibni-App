from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from BASE_DIR (explicit path)
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Fallback: try loading from current directory
    load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

DEBUG = True

ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "channels",
    "debug_toolbar",
    "silk",
    "passport",
    "wire",
    "dashboard",
    "django_filters",
    # "django_ratelimit",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "silk.middleware.SilkyMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "debug_toolbar.middleware.DebugToolbarMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "jibni.urls"

DEBUG_TOOLBAR_CONFIG = {
    "SHOW_TOOLBAR_CALLBACK": lambda request: True,
}


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "jibni.wsgi.application"
ASGI_APPLICATION = "jibni.asgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True


STATIC_URL = "/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "passport.User"
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
    ],
    # "DEFAULT_THROTTLE_RATES": {
    #     "anon": "10/hour",  
    # },
}


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(seconds=300),
    "REFRESH_TOKEN_LIFETIME": timedelta(weeks=25),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_BLACKLIST_ENABLED": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "UPDATE_LAST_LOGIN": False,
}

RATELIMIT_ENABLE = True
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT", 6379)


REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")
SERVER_TTL = 60  # Increased from 15 to 60 seconds to ensure location persists between heartbeats
HEARTBEAT_RATE_LIMIT = 10
MISSION_TIMEOUT = 60
REDIS_THROTTLE_SECONDS = 10


# Channel Layers Configuration
# Use in-memory channel layer to avoid BZPOPMIN requirement (Redis 5.0+)
# This works for single server instance development
# For production with multiple servers, upgrade to Redis 5.0+ and use RedisChannelLayer
USE_IN_MEMORY_CHANNELS = os.getenv("USE_IN_MEMORY_CHANNELS", "true").lower() == "true"

if USE_IN_MEMORY_CHANNELS:
    # In-memory channel layer (no Redis needed, but only works with single server instance)
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
else:
    # Redis channel layer (requires Redis 5.0+ for BZPOPMIN support)
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [(os.getenv("REDIS_HOST", "127.0.0.1"), int(os.getenv("REDIS_PORT", 6379)))],
            },
        },
    }

SPECTACULAR_SETTINGS = {
    "TITLE": "Jibni API",
    "DESCRIPTION": "Tow service mobile API for clients and servers (mechanics)",
    "VERSION": "1.0.0",
    "SERVERS": [
        {"url": "http://localhost:8000", "description": "HTTP API"},
        {"url": "ws://localhost:8000", "description": "WebSocket API"},
    ],
    "APPEND_PATHS": {
        "/ws/server/": {
            "get": {
                "operationId": "wsServerConnect",
                "summary": "Server WebSocket (ServerConsumer)",
                "description": "Connect via WebSocket: `ws://localhost:8000/ws/server/`",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/HeartbeatMessage"}
                        }
                    }
                },
                "responses": {
                    "101": {
                        "description": "WebSocket handshake successful",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "oneOf": [
                                        {
                                            "$ref": "#/components/schemas/HeartbeatResponse"
                                        },
                                        {
                                            "$ref": "#/components/schemas/RateLimitWarning"
                                        },
                                    ]
                                }
                            }
                        },
                    },
                    "400": {
                        "description": "Invalid request (bad format or validation error)",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "401": {
                        "description": "Unauthorized (authentication failed or missing)",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "429": {
                        "description": "Too many requests (rate limit exceeded)",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/RateLimitWarning"
                                }
                            }
                        },
                    },
                    "500": {
                        "description": "Internal server error",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                },
            }
        },
        "/ws/missions/{server_id}/": {
            "get": {
                "operationId": "wsMissionConnect",
                "summary": "Mission WebSocket (MissionConsumer)",
                "description": "Connect via WebSocket: `ws://localhost:8000/ws/missions/{server_id}/`",
                "parameters": [
                    {
                        "name": "server_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Target server ID",
                    }
                ],
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "oneOf": [
                                    {"$ref": "#/components/schemas/MissionRequest"},
                                    {"$ref": "#/components/schemas/MissionResponse"},
                                ]
                            }
                        }
                    }
                },
                "responses": {
                    "101": {
                        "description": "WebSocket handshake successful",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "oneOf": [
                                        {"$ref": "#/components/schemas/NewMission"},
                                        {"$ref": "#/components/schemas/MissionResult"},
                                    ]
                                }
                            }
                        },
                    },
                    "400": {
                        "description": "Invalid request (bad format or validation error)",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "401": {
                        "description": "Unauthorized (authentication failed or missing)",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "403": {
                        "description": "Forbidden (server not allowed for this mission)",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "404": {
                        "description": "Mission or server not found",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "429": {
                        "description": "Too many requests (rate limit exceeded)",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/RateLimitWarning"
                                }
                            }
                        },
                    },
                    "500": {
                        "description": "Internal server error",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                },
            }
        },
        "/ws/missions/{server_id}/--this-is-for-location-sharing": {
            "post": {
                "operationId": "wsMissionLocationShare",
                "summary": "Share Mission Location (WebSocket Event)",
                "description": (
                    "Send live latitude/longitude for an active mission. "
                    "Validates mission, enforces role (client/server), stores latest location, "
                    "and notifies the counterpart in real time."
                ),
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ShareLocationMessage"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Location stored, event sent to counterpart",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/LocationSharedResponse"
                                }
                            }
                        },
                    },
                    "400": {
                        "description": "Invalid location data",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "401": {
                        "description": "Unauthorized sender for mission",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "404": {
                        "description": "Mission not found",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                },
            }
        },
        "/ws/missions/{server_id}/--this-is-for-request-cancellation": {
            "post": {
                "operationId": "wsRequestCancel",
                "summary": "Cancel Request (WebSocket Event)",
                "description": (
                    "Allows a client  to cancel an active request. "
                    "Validates mission, enforces role, updates mission status, "
                    "and notifies the counterpart in real time."
                ),
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "fixed": "request_cancellation",
                                        "example": "request_cancellation",
                                    },
                                    "mission_id": {
                                        "type": "string",
                                        "example": "mission:5:8:1754492437",
                                    },
                                    "reason": {
                                        "type": "string",
                                        "example": "client changed his mind",
                                    },
                                },
                                "required": ["type", "mission_id"],
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Mission canceled, event sent to counterpart",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "example": "mission_cancellation",
                                        },
                                        "mission_id": {
                                            "type": "string",
                                            "example": "mission:5:8:1754492437",
                                        },
                                        "reason": {
                                            "type": "string",
                                            "example": "client changed his mind",
                                        },
                                        "response": {
                                            "type": "string",
                                            "example": "canceled",
                                        },
                                    },
                                    "required": [
                                        "type",
                                        "mission_id",
                                        "reason",
                                        "response",
                                    ],
                                }
                            }
                        },
                    },
                    "400": {
                        "description": "Invalid cancellation request",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "401": {
                        "description": "Unauthorized sender for mission",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "404": {
                        "description": "Mission not found",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                },
            }
        },
        "/ws/missions/{server_id}/--this-is-for-mission-completion": {
            "post": {
                "operationId": "wsRequestComplete",
                "summary": "Complete Request (WebSocket Event)",
                "description": (
                    "Allows a client  to complete an active mission. "
                    "Validates mission, enforces role, updates mission status, "
                ),
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "fixed": "mission_completion",
                                        "example": "mission_completion",
                                    },
                                    "mission_id": {
                                        "type": "string",
                                        "example": "mission:5:8:1754492437",
                                    },
                                    "comment": {
                                        "type": "string",
                                        "example": "service satisfied",
                                    },
                                    "rating": {
                                        "type": "integer",
                                        "example": 5,
                                    },
                                },
                                "required": ["type", "mission_id"],
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Mission completed",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "example": "mission_completion",
                                        },
                                        "mission_id": {
                                            "type": "string",
                                            "example": "mission:5:8:1754492437",
                                        },
                                        "response": {
                                            "type": "string",
                                            "example": "completed",
                                        },
                                    },
                                    "required": [
                                        "type",
                                        "mission_id",
                                        "reason",
                                        "response",
                                    ],
                                }
                            }
                        },
                    },
                    "400": {
                        "description": "Invalid cancellation request",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "401": {
                        "description": "Unauthorized sender for mission",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                    "404": {
                        "description": "Mission not found",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        },
                    },
                },
            }
        },
    },
    "APPEND_COMPONENTS": {
        "schemas": {
            # ---- ServerConsumer messages ----
            "HeartbeatMessage": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "example": "heartbeat"},
                    "lat": {"type": "number", "format": "float", "example": 36.7},
                    "lng": {"type": "number", "format": "float", "example": 3.1},
                },
                "required": ["type", "lat", "lng"],
            },
            "HeartbeatResponse": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "heartbeat_received"}
                },
            },
            "RateLimitWarning": {
                "type": "object",
                "properties": {
                    "warning": {
                        "type": "string",
                        "example": "Rate limit exceeded. Wait 10s.",
                    }
                },
            },
            # ---- MissionConsumer messages ----
            "MissionRequest": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "fixed": "mission_request"},
                    "server_id": {"type": "integer", "example": 5},
                    "client_lat": {
                        "type": "number",
                        "format": "float",
                        "example": 36.7,
                    },
                    "client_lng": {"type": "number", "format": "float", "example": 3.1},
                    "destination_lat": {
                        "type": "number",
                        "format": "float",
                        "example": 3.1,
                    },
                    "destination_lng": {
                        "type": "number",
                        "format": "float",
                        "example": 3.1,
                    },
                },
                "required": ["type", "server_id", "client_lat", "client_lng"],
            },
            "MissionResponse": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "fixed": "mission_response"},
                    "mission_id": {
                        "type": "string",
                        "example": "mission:5:3:1754492437",
                    },
                    "response": {"type": "boolean", "example": True},
                },
                "required": ["type", "mission_id", "response"],
            },
            "NewMission": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "fixed": "new_mission"
                },
                "mission_id": {
                    "type": "string",
                    "example": "mission:10:3:1763387513"
                },
                "client_id": {
                    "type": "string",
                    "example": "10"
                },
                "client_lat": {
                    "type": "number",
                    "format": "float",
                    "example": 35.371111
                },
                "client_lng": {
                    "type": "number",
                    "format": "float",
                    "example": 1.320605
                },
                "destination_lat": {
                    "type": "number",
                    "format": "float",
                    "example": 35.606094
                },
                "destination_lng": {
                    "type": "number",
                    "format": "float",
                    "example": 1.81316
                },
                "phone_number": {
                    "type": "string",
                    "example": "0794047421"
                },
                "price": {
                    "type": "integer",
                    "example": 1165330
                },
                "full_distance": {
                    "type": "integer",
                    "description": "Total route distance in meters",
                    "example": 116533
                },
                "full_duration": {
                    "type": "integer",
                    "description": "Total route duration in seconds",
                    "example": 6361
                },
                "distance_server_client": {
                    "type": "integer",
                    "description": "Distance from server to client in meters",
                    "example": 61018
                },
                "duration_server_client": {
                    "type": "integer",
                    "description": "Duration from server to client in seconds",
                    "example": 3182
                },
                "distance_client_dest": {
                    "type": "integer",
                    "description": "Distance from client to destination in meters",
                    "example": 55515
                },
                "duration_client_dest": {
                    "type": "integer",
                    "description": "Duration from client to destination in seconds",
                    "example": 3179
                }
            }
        },

            "MissionResult": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "fixed": "mission_result"},
                    "mission_id": {
                        "type": "string",
                        "example": "mission:5:3:1754492437",
                    },
                    "response": {
                        "oneOf": [
                            {"type": "string", "example": "accepted"},
                            {"type": "string", "example": "rejected"},
                            {
                                "type": "string",
                                "example": "pending",
                            },
                            {
                                "type": "string",
                                "example": "canceled note: client canceled",
                            },
                            {
                                "type": "string",
                                "example": "timeout note: server did not respond in time",
                            },
                            {
                                "type": "string",
                                "example": "expired note: mission expired",
                            },
                            {"type": "string", "example": "completed"},
                        ]
                    },
                },
            },
            # ---- Common error schema ----
            "ErrorResponse": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "example": "E001"},
                    "detail": {"type": "string", "example": "Unauthorized"},
                },
                "required": ["code", "detail"],
            },
            "ShareLocationMessage": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "fixed": "share_location",
                        "example": "share_location",
                    },
                    "mission_id": {
                        "type": "string",
                        "example": "mission:5:8:1754492437",
                    },
                    "lat": {"type": "number", "format": "float", "example": 36.8},
                    "lng": {"type": "number", "format": "float", "example": 3.2},
                },
                "required": ["mission_id", "lat", "lng", "type"],
            },
            "RequestCancellation": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "example": "request_cancellation"},
                    "mission_id": {
                        "type": "string",
                        "example": "mission:5:8:1754492437",
                    },
                    "reason": {"type": "string", "example": "client changed his mind"},
                },
                "required": ["type", "mission_id"],
            },
            "MissionCompletion": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "example": "mission_completion"},
                    "mission_id": {
                        "type": "string",
                        "example": "mission:5:8:1754492437",
                    },
                    "comment": {"type": "string", "example": "satisfied service "},
                    "rating": {"type": "integer", "example": 5},
                },
                "required": ["type", "mission_id"],
            },
            "LocationSharedResponse": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "example": "location_update"},
                    "mission_id": {
                        "type": "string",
                        "example": "mission:5:8:1754492437",
                    },
                    "from": {"type": "string", "example": "client_7"},
                    "lat": {"type": "number", "format": "float", "example": 36.8},
                    "lng": {"type": "number", "format": "float", "example": 3.2},
                    "action": {
                        "type": "string",
                        "example": ["cancel || report || validate"],
                    },
                    "ts": {
                        "type": "number",
                        "format": "float",
                        "example": 1758492437.192,
                    },
                },
                "required": ["type", "mission_id", "from", "lat", "lng", "ts"],
            },
        },
    },
}
