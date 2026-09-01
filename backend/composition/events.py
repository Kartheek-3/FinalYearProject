"""Event gateway for broadcasting runtime status changes to WebSocket subscribers."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from pydantic import BaseModel, ConfigDict


class RuntimeEvent(BaseModel):
    """A generic event emitted during the autonomous lifecycle."""

    model_config = ConfigDict(extra="ignore")
    
    event_type: str
    project_id: str
    timestamp: float
    data: dict[str, Any]


class RuntimeEventGateway:
    """A simple in-memory PubSub broker for routing events to connected WebSockets."""

    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue[RuntimeEvent]]] = {}

    async def publish(self, event: RuntimeEvent) -> None:
        """Publish an event to all subscribers for a given project."""
        if event.project_id in self._queues:
            for q in self._queues[event.project_id]:
                await q.put(event)

    def subscribe(self, project_id: str) -> asyncio.Queue[RuntimeEvent]:
        """Subscribe to events for a specific project."""
        q = asyncio.Queue[RuntimeEvent]()
        if project_id not in self._queues:
            self._queues[project_id] = []
        self._queues[project_id].append(q)
        return q

    def unsubscribe(self, project_id: str, q: asyncio.Queue[RuntimeEvent]) -> None:
        """Remove a subscriber queue."""
        if project_id in self._queues and q in self._queues[project_id]:
            self._queues[project_id].remove(q)
            if not self._queues[project_id]:
                del self._queues[project_id]


# Global singleton instance for the FastAPI app
event_gateway = RuntimeEventGateway()
