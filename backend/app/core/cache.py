"""Module quản lý In-Memory Cache với TTL (Time-to-Live) cho Backend (SCRUM-241).

Hỗ trợ tăng tốc truy vấn, lưu tạm phản hồi cổng thông tin TTS (< 50ms).
"""

from __future__ import annotations

import threading
import time
from typing import Any


class TTLCache:
    def __init__(self, default_ttl: int = 120) -> None:
        self._default_ttl = default_ttl
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        expires_at = time.monotonic() + (ttl if ttl is not None else self._default_ttl)
        with self._lock:
            self._cache[key] = (value, expires_at)

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._cache.get(key)
            if item is None:
                return None
            val, expires_at = item
            if time.monotonic() > expires_at:
                del self._cache[key]
                return None
            return val

    def delete(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        with self._lock:
            keys_to_del = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_del:
                del self._cache[k]
            return len(keys_to_del)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


# Cache singleton toàn cục cho portal và dashboard
portal_cache = TTLCache(default_ttl=120)
ttl_cache = portal_cache
