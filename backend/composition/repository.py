"""Replaceable asynchronous project repository with an in-memory implementation."""

from __future__ import annotations

import asyncio
from typing import Protocol

from backend.composition.errors import DuplicateProjectError, ProjectNotFoundError
from backend.composition.models import ProjectAggregate


class ProjectRepository(Protocol):
    async def create(self, aggregate: ProjectAggregate) -> ProjectAggregate: ...
    async def get(self, project_id: str) -> ProjectAggregate: ...
    async def update(self, aggregate: ProjectAggregate) -> ProjectAggregate: ...
    async def delete(self, project_id: str) -> None: ...
    async def list_all(self) -> list[ProjectAggregate]: ...


import json
from pathlib import Path

class InMemoryProjectRepository:
    """Current-milestone repository; PostgreSQL can implement the same protocol later.
    Persists to a local JSON file to survive uvicorn hot-reloads and multiple workers.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._db_path = Path(__file__).resolve().parents[1] / ".seam_db.json"
        self._projects: dict[str, ProjectAggregate] = {}
        self._load()

    def _load(self) -> None:
        if not self._db_path.exists():
            return
        try:
            with open(self._db_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self._projects = {k: ProjectAggregate.model_validate(v) for k, v in data.items()}
        except Exception as e:
            print(f"Failed to load repository: {e}")

    def _save(self) -> None:
        try:
            with open(self._db_path, "w", encoding="utf-8") as f:
                data = {k: v.model_dump(mode="json") for k, v in self._projects.items()}
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Failed to save repository: {e}")

    async def create(self, aggregate: ProjectAggregate) -> ProjectAggregate:
        async with self._lock:
            self._load()
            
            # Use lowercase for consistency in keys, but keep the original ID on the object
            key = aggregate.project_id.lower()
            if key in self._projects:
                raise DuplicateProjectError(f"Project already exists: '{aggregate.project_id}'.")
            
            self._projects[key] = aggregate
            self._save()
            return aggregate

    async def get(self, project_id: str) -> ProjectAggregate:
        async with self._lock:
            self._load()
            key = project_id.lower()
            try:
                return self._projects[key]
            except KeyError as exc:
                raise ProjectNotFoundError(f"Project not found: '{project_id}'.") from exc

    async def update(self, aggregate: ProjectAggregate) -> ProjectAggregate:
        async with self._lock:
            self._load()
            key = aggregate.project_id.lower()
            if key not in self._projects:
                raise ProjectNotFoundError(f"Project not found: '{aggregate.project_id}'.")
            self._projects[key] = aggregate
            self._save()
            return aggregate

    async def delete(self, project_id: str) -> None:
        async with self._lock:
            self._load()
            key = project_id.lower()
            if key not in self._projects:
                raise ProjectNotFoundError(f"Project not found: '{project_id}'.")
            del self._projects[key]
            self._save()

    async def list_all(self) -> list[ProjectAggregate]:
        async with self._lock:
            self._load()
            return list(self._projects.values())
