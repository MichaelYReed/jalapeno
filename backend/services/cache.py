"""
Redis cache service for product catalog caching.
Gracefully handles Redis connection failures - app continues working without cache.
"""
import redis
import json
import os
import hashlib
from typing import Any, Optional

_redis_client = None

def get_redis() -> Optional[redis.Redis]:
    """
    Get Redis client with lazy initialization.
    Returns None if Redis is not available.
    """
    global _redis_client
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            _redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            _redis_client.ping()
        except Exception as e:
            print(f"Redis connection failed: {e}")
            _redis_client = None
    return _redis_client


def cache_get(key: str) -> Optional[Any]:
    """
    Get value from cache.
    Returns None on cache miss or connection failure.
    """
    try:
        client = get_redis()
        if client is None:
            return None
        data = client.get(key)
        return json.loads(data) if data else None
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> bool:
    """
    Set value in cache with TTL.
    Returns True on success, False on failure.
    Cache failures are silent - app continues working.
    """
    try:
        client = get_redis()
        if client is None:
            return False
        client.setex(key, ttl_seconds, json.dumps(value, default=str))
        return True
    except Exception:
        return False


def cache_delete(pattern: str) -> int:
    """
    Delete keys matching pattern.
    Returns number of keys deleted.
    """
    try:
        client = get_redis()
        if client is None:
            return 0
        keys = client.keys(pattern)
        if keys:
            return client.delete(*keys)
        return 0
    except Exception:
        return 0


def cache_key_hash(*args) -> str:
    """
    Generate a cache key hash from arguments.
    Useful for creating unique keys from query parameters.
    """
    key_str = ":".join(str(arg) for arg in args if arg is not None)
    return hashlib.md5(key_str.encode()).hexdigest()[:12]


# Cache TTL constants (in seconds)
CACHE_TTL_CATEGORIES = 3600      # 1 hour - categories rarely change
CACHE_TTL_PRODUCTS = 300         # 5 minutes - product list
CACHE_TTL_PRODUCT_DETAIL = 3600  # 1 hour - individual product
CACHE_TTL_AI_CONTEXT = 300       # 5 minutes - AI catalog context
