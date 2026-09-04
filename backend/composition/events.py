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
                
        # Persist event to the project's runtime directory
        try:
            import os
            from pathlib import Path
            workspace_dir = Path("generated_projects") / event.project_id
            if workspace_dir.exists():
                runtime_dir = workspace_dir / "runtime"
                runtime_dir.mkdir(parents=True, exist_ok=True)
                events_file = runtime_dir / "events.jsonl"
                with events_file.open("a", encoding="utf-8") as f:
                    f.write(event.model_dump_json() + "\n")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to persist event {event.event_type}: {e}")

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

    def get_history(self, project_id: str) -> list[RuntimeEvent]:
        """Retrieve persisted historical events for this project."""
        events: list[RuntimeEvent] = []
        try:
            from pathlib import Path
            import json
            events_file = Path("generated_projects") / project_id / "runtime" / "events.jsonl"
            if events_file.exists():
                with events_file.open("r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            events.append(RuntimeEvent.model_validate_json(line))
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to read events history for {project_id}: {e}")
        return events


# Global singleton instance for the FastAPI app
event_gateway = RuntimeEventGateway()
