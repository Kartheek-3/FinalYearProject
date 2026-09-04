"""Pure deterministic dependency evaluation for the Supervisor."""

from __future__ import annotations

from backend.agents.supervisor.models import ProjectExecutionState, TaskExecutionStatus


class DependencyEvaluator:
    """Determines eligibility solely from Planning Agent dependency data and state."""

    @staticmethod
    def dependencies_satisfied(state: ProjectExecutionState, task_id: str) -> bool:
        task_state = state.tasks[task_id]
        return all(
            state.tasks[dependency_id].status == TaskExecutionStatus.COMPLETED
            for dependency_id in task_state.task.dependencies
        )

    @classmethod
    def eligible_task_ids(cls, state: ProjectExecutionState) -> list[str]:
        """Return all ready tasks whose dependencies are currently completed."""

        return sorted(
            task_id
            for task_id, task_state in state.tasks.items()
            if task_state.status in (TaskExecutionStatus.READY, TaskExecutionStatus.REWORK_REQUIRED)
            and cls.dependencies_satisfied(state, task_id)
        )
