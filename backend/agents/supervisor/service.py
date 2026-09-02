"""Controlled, in-memory workflow state service for the Supervisor foundation."""

from __future__ import annotations

from datetime import datetime, timezone

from backend.agents.planning.models import PlanningArtifact
from backend.agents.supervisor.dependency import DependencyEvaluator
from backend.agents.supervisor.errors import (
    InvalidAgentResultError,
    InvalidStateTransitionError,
    StateInitializationError,
    UnknownTaskError,
)
from backend.agents.supervisor.models import (
    AgentDispatchCommand,
    AgentExecutionResult,
    AgentName,
    AgentResultStatus,
    ArtifactReference,
    NextTaskDecision,
    ProjectExecutionState,
    ProjectStatus,
    QAFeedback,
    TaskExecutionState,
    TaskExecutionStatus,
    TaskTransitionRecord,
)
from backend.agents.supervisor.selector import DeterministicTaskSelector


class SupervisorOrchestrator:
    """Owns deterministic task-graph state, not implementation or QA work itself."""

    _ALLOWED_TRANSITIONS = {
        TaskExecutionStatus.PENDING: {
            TaskExecutionStatus.READY,
            TaskExecutionStatus.BLOCKED,
            TaskExecutionStatus.CANCELLED,
        },
        TaskExecutionStatus.BLOCKED: {TaskExecutionStatus.READY, TaskExecutionStatus.CANCELLED},
        TaskExecutionStatus.READY: {
            TaskExecutionStatus.IN_PROGRESS,
            TaskExecutionStatus.BLOCKED,
            TaskExecutionStatus.CANCELLED,
        },
        TaskExecutionStatus.IN_PROGRESS: {
            TaskExecutionStatus.COMPLETED,
            TaskExecutionStatus.FAILED,
            TaskExecutionStatus.REWORK_REQUIRED,
        },
        TaskExecutionStatus.COMPLETED: {TaskExecutionStatus.REWORK_REQUIRED},
        TaskExecutionStatus.FAILED: {
            TaskExecutionStatus.READY,
            TaskExecutionStatus.BLOCKED,
            TaskExecutionStatus.CANCELLED,
        },
        TaskExecutionStatus.REWORK_REQUIRED: {
            TaskExecutionStatus.READY,
            TaskExecutionStatus.BLOCKED,
            TaskExecutionStatus.CANCELLED,
        },
        TaskExecutionStatus.CANCELLED: set(),
    }

    def __init__(self, selector: DeterministicTaskSelector | None = None, knowledge_retriever=None) -> None:
        self._selector = selector or DeterministicTaskSelector()
        self._knowledge_retriever = knowledge_retriever

    def initialize(
        self,
        planning_artifact: PlanningArtifact,
        *,
        project_id: str | None = None,
    ) -> ProjectExecutionState:
        resolved_project_id = project_id or planning_artifact.project_id
        if not resolved_project_id:
            raise StateInitializationError("A project ID is required to initialize execution state.")
        planned_tasks = planning_artifact.result.implementation_tasks
        task_ids = [task.task_id for task in planned_tasks]
        if len(task_ids) != len(set(task_ids)):
            raise StateInitializationError("PlanningArtifact contains duplicate implementation task IDs.")
        state = ProjectExecutionState(
            project_id=resolved_project_id,
            planning_artifact=planning_artifact,
            tasks={task.task_id: TaskExecutionState(task=task) for task in planned_tasks},
        )
        return self.refresh_eligibility(state)

    def refresh_eligibility(self, state: ProjectExecutionState) -> ProjectExecutionState:
        """Derive READY/BLOCKED status from dependency completion, deterministically."""

        updated = state
        for task_id, task_state in state.tasks.items():
            if task_state.status not in {
                TaskExecutionStatus.PENDING,
                TaskExecutionStatus.BLOCKED,
                TaskExecutionStatus.REWORK_REQUIRED,
            }:
                continue
            target = (
                TaskExecutionStatus.READY
                if DependencyEvaluator.dependencies_satisfied(updated, task_id)
                else TaskExecutionStatus.BLOCKED
            )
            if task_state.status != target:
                updated = self._transition(updated, task_id, target, "Dependency eligibility recalculated.")
        return self._with_project_status(updated)

    def select_next_task(self, state: ProjectExecutionState) -> tuple[ProjectExecutionState, NextTaskDecision]:
        """Refresh readiness and return an auditable deterministic selection decision."""

        refreshed = self.refresh_eligibility(state)
        return refreshed, self._selector.select(refreshed)

    async def begin_task(
        self,
        state: ProjectExecutionState,
        task_id: str,
        agent: AgentName,
    ) -> tuple[ProjectExecutionState, AgentDispatchCommand]:
        state = self.refresh_eligibility(state)
        self._require_task(state, task_id)
        if task_id not in DependencyEvaluator.eligible_task_ids(state):
            raise InvalidStateTransitionError(f"Task '{task_id}' is not dependency-eligible.")
        updated = self._transition(
            state,
            task_id,
            TaskExecutionStatus.IN_PROGRESS,
            "Task selected for agent execution.",
            actor=agent,
            increment_attempt=True,
        )
        task_state = updated.tasks[task_id]
        
        related_knowledge = []
        if self._knowledge_retriever is not None:
            try:
                query = f"Task failure patterns and workflow lessons for {task_state.task.description}"
                snippets = await self._knowledge_retriever.retrieve(
                    query=query, 
                    limit=3, 
                    project_id=updated.project_id, 
                    agent="supervisor"
                )
                related_knowledge = [s.model_dump() for s in snippets]
            except Exception as exc:
                pass
                
        return updated, AgentDispatchCommand(
            project_id=updated.project_id,
            task_id=task_id,
            agent=agent,
            attempt_number=task_state.attempt_count,
            task=task_state.task,
            planning_artifact=updated.planning_artifact,
            related_artifacts=task_state.generated_artifacts,
            rework_feedback=[
                feedback for feedback in updated.qa_feedback if feedback.task_id == task_id
            ],
            related_knowledge=related_knowledge,
        )

    def retry_failed_task(self, state: ProjectExecutionState, task_id: str) -> ProjectExecutionState:
        """Explicitly return a failed task to eligibility evaluation for another attempt."""

        self._require_task(state, task_id)
        task_state = state.tasks[task_id]
        if task_state.status != TaskExecutionStatus.FAILED:
            raise InvalidStateTransitionError(f"Task '{task_id}' is not failed and cannot be retried.")
        target = (
            TaskExecutionStatus.READY
            if DependencyEvaluator.dependencies_satisfied(state, task_id)
            else TaskExecutionStatus.BLOCKED
        )
        return self._with_project_status(
            self._transition(
                state,
                task_id,
                target,
                "Supervisor approved an explicit retry after task failure.",
                increment_retry=True,
            )
        )

    def apply_agent_result(
        self,
        state: ProjectExecutionState,
        result: AgentExecutionResult,
    ) -> ProjectExecutionState:
        self._require_task(state, result.task_id)
        task_state = state.tasks[result.task_id]
        if task_state.status != TaskExecutionStatus.IN_PROGRESS:
            raise InvalidAgentResultError("Agent results may only be applied to in-progress tasks.")
        if result.attempt_number != task_state.attempt_count:
            raise InvalidAgentResultError("Agent result attempt does not match the active task attempt.")

        target = {
            AgentResultStatus.SUCCEEDED: TaskExecutionStatus.COMPLETED,
            AgentResultStatus.FAILED: TaskExecutionStatus.FAILED,
            AgentResultStatus.REWORK_REQUIRED: TaskExecutionStatus.REWORK_REQUIRED,
        }[result.status]
        reason = result.message or f"{result.agent.value} reported {result.status.value}."
        updated = self._transition(
            state,
            result.task_id,
            target,
            reason,
            actor=result.agent,
            artifacts=result.produced_artifacts,
            last_error="; ".join(result.errors) if result.errors else None,
            increment_rework=result.status == AgentResultStatus.REWORK_REQUIRED,
        )
        transition = updated.transition_history[-1]
        record = updated.execution_records + [
            self._execution_record(result, transition)
        ]
        updated = updated.model_copy(update={"execution_records": record, "updated_at": self._now()})
        return self._with_project_status(updated)

    def record_qa_feedback(
        self,
        state: ProjectExecutionState,
        feedback: QAFeedback,
    ) -> ProjectExecutionState:
        """Preserve QA evidence and mark affected completed work for explicit rework."""

        self._require_task(state, feedback.task_id)
        updated = state.model_copy(
            update={
                "qa_feedback": state.qa_feedback + [feedback],
                "generated_artifacts": state.generated_artifacts + feedback.artifact_references,
                "updated_at": self._now(),
            }
        )
        affected_task_ids = {issue.affected_task_id for issue in feedback.issues if issue.rework_required}
        for task_id in affected_task_ids:
            self._require_task(updated, task_id)
            task_state = updated.tasks[task_id]
            if task_state.status not in {TaskExecutionStatus.COMPLETED, TaskExecutionStatus.IN_PROGRESS}:
                raise InvalidStateTransitionError(
                    f"QA rework can only target completed or active task '{task_id}'."
                )
            updated = self._transition(
                updated,
                task_id,
                TaskExecutionStatus.REWORK_REQUIRED,
                f"QA feedback '{feedback.feedback_id}' requires rework.",
                actor=AgentName.QA,
                increment_rework=True,
                qa_feedback_id=feedback.feedback_id,
            )
        if affected_task_ids:
            updated = updated.model_copy(
                update={"iteration": updated.iteration + 1, "updated_at": self._now()}
            )
        return self._with_project_status(updated)

    def _transition(
        self,
        state: ProjectExecutionState,
        task_id: str,
        target: TaskExecutionStatus,
        reason: str,
        *,
        actor: AgentName | None = None,
        increment_attempt: bool = False,
        increment_retry: bool = False,
        increment_rework: bool = False,
        artifacts: list[ArtifactReference] | None = None,
        last_error: str | None = None,
        qa_feedback_id: str | None = None,
    ) -> ProjectExecutionState:
        task_state = state.tasks[task_id]
        produced_artifacts = artifacts or []
        if target not in self._ALLOWED_TRANSITIONS[task_state.status]:
            raise InvalidStateTransitionError(
                f"Invalid transition for '{task_id}': {task_state.status.value} -> {target.value}."
            )
        transition = TaskTransitionRecord(
            task_id=task_id,
            from_status=task_state.status,
            to_status=target,
            reason=reason,
            actor=actor,
        )
        updated_task = task_state.model_copy(
            update={
                "status": target,
                "attempt_count": task_state.attempt_count + int(increment_attempt),
                "retry_count": task_state.retry_count + int(increment_retry),
                "rework_count": task_state.rework_count + int(increment_rework),
                "assigned_agent": actor or task_state.assigned_agent,
                "generated_artifacts": task_state.generated_artifacts + produced_artifacts,
                "qa_feedback_ids": task_state.qa_feedback_ids
                + ([qa_feedback_id] if qa_feedback_id else []),
                "last_error": last_error if last_error is not None else task_state.last_error,
            }
        )
        tasks = dict(state.tasks)
        tasks[task_id] = updated_task
        return state.model_copy(
            update={
                "tasks": tasks,
                "generated_artifacts": state.generated_artifacts + produced_artifacts,
                "transition_history": state.transition_history + [transition],
                "updated_at": self._now(),
            }
        )

    @staticmethod
    def _execution_record(
        result: AgentExecutionResult,
        transition: TaskTransitionRecord,
    ):
        from backend.agents.supervisor.models import ExecutionRecord

        return ExecutionRecord(
            record_id=f"exec_{result.task_id}_{result.attempt_number}",
            task_id=result.task_id,
            agent=result.agent,
            attempt_number=result.attempt_number,
            result_status=result.status,
            started_at=result.started_at,
            finished_at=result.finished_at,
            artifact_ids=[artifact.artifact_id for artifact in result.produced_artifacts],
            errors=result.errors,
            transition=transition,
        )

    @staticmethod
    def _require_task(state: ProjectExecutionState, task_id: str) -> None:
        if task_id not in state.tasks:
            raise UnknownTaskError(f"Unknown task ID: '{task_id}'.")

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _with_project_status(state: ProjectExecutionState) -> ProjectExecutionState:
        statuses = {task.status for task in state.tasks.values()}
        if statuses == {TaskExecutionStatus.COMPLETED}:
            project_status = ProjectStatus.COMPLETED
        elif (
            TaskExecutionStatus.IN_PROGRESS in statuses
            or TaskExecutionStatus.READY in statuses
            or TaskExecutionStatus.REWORK_REQUIRED in statuses
        ):
            project_status = ProjectStatus.ACTIVE
        elif TaskExecutionStatus.FAILED in statuses:
            project_status = ProjectStatus.FAILED
        elif statuses and statuses <= {TaskExecutionStatus.BLOCKED, TaskExecutionStatus.CANCELLED}:
            project_status = ProjectStatus.BLOCKED
        else:
            project_status = state.status
        return state.model_copy(update={"status": project_status, "updated_at": SupervisorOrchestrator._now()})
