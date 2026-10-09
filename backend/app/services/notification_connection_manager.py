import asyncio
from collections import defaultdict
from threading import Lock
from typing import Any

from fastapi import WebSocket


class NotificationConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, dict[WebSocket, asyncio.AbstractEventLoop]] = defaultdict(dict)
        self._lock = Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        with self._lock:
            self._connections[user_id][websocket] = asyncio.get_running_loop()

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        with self._lock:
            connections = self._connections.get(user_id)
            if connections is None:
                return
            connections.pop(websocket, None)
            if not connections:
                self._connections.pop(user_id, None)

    def publish(self, user_id: int, payload: dict[str, Any]) -> None:
        with self._lock:
            targets: dict[asyncio.AbstractEventLoop, list[WebSocket]] = defaultdict(list)
            for websocket, loop in self._connections.get(user_id, {}).items():
                if loop.is_running():
                    targets[loop].append(websocket)

        for loop, connections in targets.items():
            try:
                loop.call_soon_threadsafe(
                    self._schedule_send,
                    user_id,
                    tuple(connections),
                    payload,
                )
            except RuntimeError:
                continue

    def _schedule_send(
        self,
        user_id: int,
        connections: tuple[WebSocket, ...],
        payload: dict[str, Any],
    ) -> None:
        asyncio.create_task(self._send_to_connections(user_id, connections, payload))

    async def _send_to_connections(
        self,
        user_id: int,
        connections: tuple[WebSocket, ...],
        payload: dict[str, Any],
    ) -> None:
        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                await self.disconnect(user_id, websocket)

    def connection_count(self, user_id: int) -> int:
        with self._lock:
            return len(self._connections.get(user_id, {}))


notification_connection_manager = NotificationConnectionManager()