"""Deterministic validation for LLM-proposed source changes."""

from __future__ import annotations

from backend.agents.coding.errors import ChangeValidationError
from backend.agents.coding.models import CodeChange, CodeOperation, CodingRequest
from backend.agents.coding.workspace import Workspace


class ChangeValidator:
    """Verifies all changes before any workspace operation is attempted."""

    @staticmethod
    def validate(changes: list[CodeChange], request: CodingRequest, workspace: Workspace) -> None:
        task = request.dispatch_command.task
        seen_paths: set[str] = set()
        task_requirements = set(task.requirement_ids)

        for change in changes:
            normalized_path = change.path.replace("\\", "/").casefold()
            if normalized_path in seen_paths:
                raise ChangeValidationError(f"Multiple changes target '{change.path}'.")
            seen_paths.add(normalized_path)
            if change.related_task_id != task.task_id:
                raise ChangeValidationError("A proposed change belongs to a different task.")
            if not set(change.related_requirement_ids) <= task_requirements:
                raise ChangeValidationError("A proposed change references requirements outside the assigned task.")

            # Resolve even when the operation will not access the file yet.
            exists = workspace.exists(change.path)
            if change.operation == CodeOperation.CREATE and exists:
                raise ChangeValidationError(f"Create target already exists: '{change.path}'.")
            if change.operation == CodeOperation.UPDATE and not exists:
                raise ChangeValidationError(f"Update target is missing: '{change.path}'.")
            if change.operation == CodeOperation.DELETE:
                if not request.allow_delete:
                    raise ChangeValidationError("Delete operation is not explicitly allowed for this request.")
                if not exists:
                    raise ChangeValidationError(f"Delete target is missing: '{change.path}'.")
            if change.operation in {CodeOperation.UPDATE, CodeOperation.DELETE}:
                actual = workspace.read_file(change.path).content_hash
                if actual != change.expected_current_content_hash:
                    raise ChangeValidationError(
                        f"Proposed content hash is stale for '{change.path}'."
                    )
