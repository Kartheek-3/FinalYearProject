"""Read-only workspace protocol for QA inspection of generated products."""

from __future__ import annotations

from typing import Protocol

from backend.agents.coding.models import ExistingFileContext


class ReadOnlyWorkspace(Protocol):
    """The QA Agent is intentionally unable to call file mutation operations."""

    def list_files(self) -> list[str]: ...
    def inspect_structure(self) -> list[str]: ...
    def exists(self, relative_path: str) -> bool: ...
    def read_file(self, relative_path: str) -> ExistingFileContext: ...
