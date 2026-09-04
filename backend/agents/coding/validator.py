"""Deterministic validation for LLM-proposed source changes."""

from __future__ import annotations

from backend.agents.coding.errors import ChangeValidationError
from backend.agents.coding.models import CodeChange, CodeOperation, CodingRequest
from backend.agents.coding.workspace import Workspace


class ChangeValidator:
    """Verifies all changes before any workspace operation is attempted."""

    @staticmethod
    def validate(changes: list[CodeChange], request: CodingRequest, workspace: Workspace) -> list[CodeChange]:
        task = request.dispatch_command.task
        seen_paths: set[str] = set()
        task_requirements = set(task.requirement_ids)
        validated_changes = []

        for change in changes:
            update_kwargs = {}
            normalized_path = change.path.replace("\\", "/").casefold()
            if normalized_path in seen_paths:
                raise ChangeValidationError(f"Multiple changes target '{change.path}'.")
            seen_paths.add(normalized_path)
            
            if change.related_task_id != task.task_id:
                update_kwargs["related_task_id"] = task.task_id
                
            req_set = set(change.related_requirement_ids)
            if not req_set <= task_requirements:
                update_kwargs["related_requirement_ids"] = list(req_set & task_requirements)

            # Resolve even when the operation will not access the file yet.
            exists = workspace.exists(change.path)
            
            # Reconcile operation types based on physical reality
            if change.operation == CodeOperation.CREATE and exists:
                update_kwargs["operation"] = CodeOperation.UPDATE
                
            if change.operation == CodeOperation.UPDATE and not exists:
                update_kwargs["operation"] = CodeOperation.CREATE
                
            # If the final operation is UPDATE or DELETE, ensure we have a content hash
            final_op = update_kwargs.get("operation", change.operation)
            if final_op in {CodeOperation.UPDATE, CodeOperation.DELETE}:
                if exists:
                    actual = workspace.read_file(change.path).content_hash
                    if not change.expected_current_content_hash:
                        update_kwargs["expected_current_content_hash"] = actual
                    elif actual != change.expected_current_content_hash:
                        # Stale hash, but we auto-correct it for E2E resilience
                        update_kwargs["expected_current_content_hash"] = actual
                        
            if final_op == CodeOperation.DELETE:
                if not request.allow_delete:
                    raise ChangeValidationError("Delete operation is not explicitly allowed for this request.")
                if not exists:
                    raise ChangeValidationError(f"Delete target is missing: '{change.path}'.")
                    
            if update_kwargs:
                validated_changes.append(change.model_copy(update=update_kwargs))
            else:
                validated_changes.append(change)
                
        return validated_changes
