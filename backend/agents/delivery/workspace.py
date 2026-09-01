"""Narrow generated-project workspace boundary for deployment preparation files."""

from __future__ import annotations

from typing import Protocol

from backend.agents.coding.models import ExistingFileContext


class DeliveryWorkspace(Protocol):
    """Delivery can inspect/create files only inside a prevalidated generated project."""

    def exists(self, relative_path: str) -> bool: ...
    def directory_exists(self, relative_path: str) -> bool: ...
    def read_file(self, relative_path: str) -> ExistingFileContext: ...
    def create_file(self, relative_path: str, content: str) -> None: ...
