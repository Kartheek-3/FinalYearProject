"""Deterministic next-task selection; no LLM is required for safe scheduling."""

from __future__ import annotations

from backend.agents.analysis.models import RequirementPriority
from backend.agents.supervisor.dependency import DependencyEvaluator
from backend.agents.supervisor.models import DecisionFactor, NextTaskDecision, ProjectExecutionState, QASeverity


class DeterministicTaskSelector:
    """Ranks all dependency-eligible tasks with stable, explainable criteria."""

    _PRIORITY_RANK = {
        RequirementPriority.MUST: 0,
        RequirementPriority.SHOULD: 1,
        RequirementPriority.COULD: 2,
    }
    _SEVERITY_RANK = {
        QASeverity.LOW: 1,
        QASeverity.MEDIUM: 2,
        QASeverity.HIGH: 3,
        QASeverity.CRITICAL: 4,
    }

    def select(self, state: ProjectExecutionState) -> NextTaskDecision:
        eligible_ids = DependencyEvaluator.eligible_task_ids(state)
        if not eligible_ids:
            return NextTaskDecision(
                eligible_task_ids=[],
                reason="No task is currently eligible; dependencies, active work, or rework state prevent selection.",
                decision_factors=[
                    DecisionFactor(
                        name="dependency_readiness",
                        value="none",
                        effect="no dispatch decision is issued",
                    )
                ],
            )

        selected_id = min(eligible_ids, key=lambda task_id: self._rank(state, task_id))
        selected = state.tasks[selected_id]
        return NextTaskDecision(
            selected_task_id=selected_id,
            eligible_task_ids=eligible_ids,
            reason="Selected deterministically from all dependency-eligible tasks.",
            decision_factors=[
                DecisionFactor(
                    name="dependency_readiness",
                    value="satisfied",
                    effect="task is eligible",
                ),
                DecisionFactor(
                    name="rework_count",
                    value=str(selected.rework_count),
                    effect="rework tasks receive precedence",
                ),
                DecisionFactor(
                    name="requirement_priority",
                    value=selected.task.priority.value,
                    effect="must before should before could",
                ),
                DecisionFactor(
                    name="qa_feedback_severity",
                    value=str(self._qa_severity(state, selected_id)),
                    effect="higher unresolved QA severity receives precedence",
                ),
                DecisionFactor(
                    name="attempt_count",
                    value=str(selected.attempt_count),
                    effect="stable tie-breaker using prior execution history",
                ),
                DecisionFactor(
                    name="requirement_context",
                    value=", ".join(selected.task.requirement_ids),
                    effect="decision remains traceable to planned requirements",
                ),
            ],
        )

    def _rank(self, state: ProjectExecutionState, task_id: str) -> tuple[int, int, int, int, str]:
        task_state = state.tasks[task_id]
        return (
            -int(task_state.rework_count > 0),
            self._PRIORITY_RANK[task_state.task.priority],
            -self._qa_severity(state, task_id),
            task_state.attempt_count,
            task_id,
        )

    def _qa_severity(self, state: ProjectExecutionState, task_id: str) -> int:
        return max(
            (
                self._SEVERITY_RANK[issue.severity]
                for feedback in state.qa_feedback
                for issue in feedback.issues
                if issue.affected_task_id == task_id and issue.rework_required
            ),
            default=0,
        )
