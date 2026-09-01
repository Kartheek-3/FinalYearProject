"""Task-graph validation performed before Supervisor state initialization."""

from __future__ import annotations

from backend.agents.analysis.models import AnalysisArtifact
from backend.agents.planning.models import PlanningArtifact
from backend.composition.errors import DependencyCycleError, InvalidPlanReferenceError


class TaskGraphValidator:
    @classmethod
    def validate(cls, planning_artifact: PlanningArtifact, analysis_artifact: AnalysisArtifact) -> None:
        """Validate all Analysis -> Planning references before execution starts."""

        cls.validate_acyclic(planning_artifact)

    @staticmethod
    def validate_acyclic(planning_artifact: PlanningArtifact) -> None:
        graph = {
            task.task_id: set(task.dependencies)
            for task in planning_artifact.result.implementation_tasks
        }
        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(task_id: str) -> None:
            if task_id in visiting:
                raise DependencyCycleError(f"Planning task graph contains a cycle at '{task_id}'.")
            if task_id in visited:
                return
            visiting.add(task_id)
            for dependency_id in graph[task_id]:
                if dependency_id not in graph:
                    raise InvalidPlanReferenceError(
                        f"Task '{task_id}' depends on undefined task '{dependency_id}'."
                    )
                visit(dependency_id)
            visiting.remove(task_id)
            visited.add(task_id)

        for task_id in graph:
            visit(task_id)
