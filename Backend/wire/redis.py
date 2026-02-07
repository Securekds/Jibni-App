import redis.asyncio as redis
from jibni.settings import REDIS_URL

redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)

