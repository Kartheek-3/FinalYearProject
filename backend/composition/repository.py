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


class InMemoryProjectRepository:
    """Current-milestone repository; PostgreSQL can implement the same protocol later."""

    def __init__(self) -> None:
        self._projects: dict[str, ProjectAggregate] = {}
        self._lock = asyncio.Lock()

    async def create(self, aggregate: ProjectAggregate) -> ProjectAggregate:
        async with self._lock:
            if aggregate.project_id in self._projects:
                raise DuplicateProjectError(f"Project already exists: '{aggregate.project_id}'.")
            self._projects[aggregate.project_id] = aggregate
            return aggregate

    async def get(self, project_id: str) -> ProjectAggregate:
        async with self._lock:
            try:
                return self._projects[project_id]
            except KeyError as exc:
                raise ProjectNotFoundError(f"Project not found: '{project_id}'.") from exc

    async def update(self, aggregate: ProjectAggregate) -> ProjectAggregate:
        async with self._lock:
            if aggregate.project_id not in self._projects:
                raise ProjectNotFoundError(f"Project not found: '{aggregate.project_id}'.")
            self._projects[aggregate.project_id] = aggregate
            return aggregate

    async def delete(self, project_id: str) -> None:
        async with self._lock:
            if project_id not in self._projects:
                raise ProjectNotFoundError(f"Project not found: '{project_id}'.")
            del self._projects[project_id]
