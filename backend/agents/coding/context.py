"""Builds task-scoped code-generation context without dumping the whole project."""

from __future__ import annotations

from backend.agents.coding.models import CodingRequest, ExistingFileContext
from backend.agents.coding.workspace import Workspace


class CodingContextBuilder:
    """Selects only design objects and existing files relevant to the assigned task."""

    @staticmethod
    def build(request: CodingRequest, workspace: Workspace) -> dict[str, object]:
        command = request.dispatch_command
        plan = command.planning_artifact.result
        task = command.task
        requirement_ids = set(task.requirement_ids)

        files: list[ExistingFileContext] = [
            workspace.read_file(path) for path in request.context_paths
        ]
        return {
            "project_id": command.project_id,
            "task": task.model_dump(mode="json"),
            "functional_requirements": [
                item.model_dump(mode="json")
                for item in request.relevant_functional_requirements
                if item.id in requirement_ids
            ],
            "acceptance_criteria": [
                item.model_dump(mode="json")
                for item in request.relevant_acceptance_criteria
                if item.id in set(task.acceptance_criteria)
            ],
            "architecture": {
                "components": [
                    item.model_dump(mode="json")
                    for item in plan.architecture.components
                    if requirement_ids.intersection(item.requirement_ids)
                ],
                "technology_choices": [
                    item.model_dump(mode="json") for item in plan.architecture.technology_choices
                ],
                "implementation_constraints": [
                    item.model_dump(mode="json") for item in plan.implementation_constraints
                ],
            },
            "database_entities": [
                item.model_dump(mode="json")
                for item in plan.database.entities
                if requirement_ids.intersection(item.requirement_ids)
            ],
            "api_endpoints": [
                item.model_dump(mode="json")
                for item in plan.api.endpoints
                if requirement_ids.intersection(item.requirement_ids)
            ],
            "workflows": [
                item.model_dump(mode="json")
                for item in plan.workflows
                if requirement_ids.intersection(item.requirement_ids)
            ],
            "rework_feedback": [
                item.model_dump(mode="json") for item in command.rework_feedback
            ],
            "existing_files": [item.model_dump(mode="json") for item in files],
        }
