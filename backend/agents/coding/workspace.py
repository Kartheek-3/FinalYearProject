"""Controlled filesystem boundary for an explicitly supplied generated-project root."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Protocol
import time
import asyncio
from backend.composition.events import event_gateway, RuntimeEvent

def _emit_sync(project_id: str | None, event_type: str, data: dict | None = None) -> None:
    if not project_id:
        return
    asyncio.create_task(event_gateway.publish(RuntimeEvent(
        event_type=event_type,
        project_id=project_id,
        timestamp=time.time(),
        data=data or {}
    )))

from backend.agents.coding.errors import (
    UnsafeWorkspacePathError,
    WorkspaceOperationError,
    WorkspaceUnavailableError,
)
from backend.agents.coding.models import ExistingFileContext


class Workspace(Protocol):
    """Narrow file operations available to the Coding Agent."""

    def list_files(self) -> list[str]: ...
    def inspect_structure(self) -> list[str]: ...
    def exists(self, relative_path: str) -> bool: ...
    def directory_exists(self, relative_path: str) -> bool: ...
    def read_file(self, relative_path: str) -> ExistingFileContext: ...
    def create_file(self, relative_path: str, content: str) -> None: ...
    def update_file(self, relative_path: str, content: str, expected_hash: str) -> None: ...
    def delete_file(self, relative_path: str, expected_hash: str) -> None: ...


class GeneratedProjectWorkspace:
    """A local workspace restricted to one existing product directory."""

    def __init__(self, root: Path, generated_projects_root: Path, project_id: str | None = None) -> None:
        self._generated_projects_root = generated_projects_root.resolve()
        self._root = root.resolve()
        self._project_id = project_id
        if not self._generated_projects_root.is_dir():
            raise WorkspaceUnavailableError("The generated-projects root does not exist.")
        if not self._root.is_dir():
            raise WorkspaceUnavailableError("The supplied generated-project workspace does not exist.")
        if self._root == self._generated_projects_root:
            raise UnsafeWorkspacePathError("The generated-projects container is not a project workspace.")
        try:
            self._root.relative_to(self._generated_projects_root)
        except ValueError as exc:
            raise UnsafeWorkspacePathError(
                "Workspace must be located under the generated-projects root."
            ) from exc

    @property
    def root(self) -> Path:
        return self._root

    def list_files(self) -> list[str]:
        return sorted(
            str(path.relative_to(self._root)).replace("\\", "/")
            for path in self._root.rglob("*")
            if path.is_file() and self._is_within_root(path)
        )

    def inspect_structure(self) -> list[str]:
        return sorted(
            str(path.relative_to(self._root)).replace("\\", "/")
            for path in self._root.rglob("*")
            if self._is_within_root(path)
        )

    def exists(self, relative_path: str) -> bool:
        return self._resolve_relative(relative_path).is_file()

    def directory_exists(self, relative_path: str) -> bool:
        if relative_path == ".":
            return True
        return self._resolve_relative(relative_path).is_dir()

    def read_file(self, relative_path: str) -> ExistingFileContext:
        path = self._resolve_relative(relative_path)
        if not path.is_file():
            raise WorkspaceOperationError(f"File does not exist: '{relative_path}'.")
        try:
            content = path.read_text(encoding="utf-8")
        except OSError as exc:
            raise WorkspaceOperationError(f"Unable to read '{relative_path}'.") from exc
        return ExistingFileContext(
            path=relative_path,
            content=content,
            content_hash=self.content_hash(content),
        )

    def create_file(self, relative_path: str, content: str) -> None:
        path = self._resolve_relative(relative_path)
        if path.exists():
            raise WorkspaceOperationError(f"Cannot create existing file: '{relative_path}'.")
        try:
            # Emit folder.created for any parent directories that don't exist yet
            current_parent = path.parent
            dirs_to_create = []
            while current_parent != self._root and not current_parent.exists():
                dirs_to_create.append(current_parent)
                current_parent = current_parent.parent
            
            for d in reversed(dirs_to_create):
                d.mkdir(parents=True, exist_ok=True)
                rel_dir = str(d.relative_to(self._root)).replace("\\", "/")
                _emit_sync(self._project_id, "folder.created", {"path": rel_dir})
                
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
            _emit_sync(self._project_id, "file.created", {"path": relative_path})
        except OSError as exc:
            raise WorkspaceOperationError(f"Unable to create '{relative_path}'.") from exc

    def update_file(self, relative_path: str, content: str, expected_hash: str) -> None:
        current = self.read_file(relative_path)
        if current.content_hash != expected_hash:
            raise WorkspaceOperationError(
                f"File changed since it was supplied to the agent: '{relative_path}'."
            )
        previous_content = current.content
        try:
            self._resolve_relative(relative_path).write_text(content, encoding="utf-8", newline="\n")
            _emit_sync(self._project_id, "file.updated", {
                "path": relative_path,
                "previous_content": previous_content,
                "new_content": content,
            })
        except OSError as exc:
            raise WorkspaceOperationError(f"Unable to update '{relative_path}'.") from exc

    def delete_file(self, relative_path: str, expected_hash: str) -> None:
        current = self.read_file(relative_path)
        if current.content_hash != expected_hash:
            raise WorkspaceOperationError(
                f"File changed since it was supplied to the agent: '{relative_path}'."
            )
        try:
            self._resolve_relative(relative_path).unlink()
            _emit_sync(self._project_id, "file.deleted", {"path": relative_path})
        except OSError as exc:
            raise WorkspaceOperationError(f"Unable to delete '{relative_path}'.") from exc

    @staticmethod
    def content_hash(content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def _resolve_relative(self, relative_path: str) -> Path:
        candidate = Path(relative_path)
        if (
            not relative_path.strip()
            or not candidate.parts
            or candidate.is_absolute()
            or candidate.drive
            or ".." in candidate.parts
        ):
            raise UnsafeWorkspacePathError("Workspace paths must be non-empty, relative, and traversal-free.")
        resolved = (self._root / candidate).resolve()
        if not self._is_within_root(resolved):
            raise UnsafeWorkspacePathError("Workspace path escapes the generated-project root.")
        return resolved

    def _is_within_root(self, path: Path) -> bool:
        try:
            path.resolve().relative_to(self._root)
            return True
        except ValueError:
            return False
