"""Strongly typed state, decisions, and integration contracts for supervision."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import ConfigDict, Field

from backend.agents.analysis.models import ContractModel, Identifier, NonEmptyText
from backend.agents.planning.models import ImplementationTask, PlanningArtifact


class SupervisorModel(ContractModel):
    """Immutable-shaped orchestration records; updates occur through the service."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, frozen=True)


class ProjectStatus(StrEnum):
    INITIALIZED = "initialized"
    ACTIVE = "active"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskExecutionStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    REWORK_REQUIRED = "rework_required"
    CANCELLED = "cancelled"


class AgentName(StrEnum):
    ANALYSIS = "analysis"
    PLANNING = "planning"
    CODING = "coding"
    QA = "qa"
    DELIVERY = "delivery"


class AgentResultStatus(StrEnum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REWORK_REQUIRED = "rework_required"


class QAVerdict(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    BLOCKED = "blocked"


class QASeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ExecutionMode(StrEnum):
    DETERMINISTIC = "deterministic"
    FUTURE_CONTEXTUAL_ADVISORY = "future_contextual_advisory"


class ArtifactReference(SupervisorModel):
    artifact_id: Identifier
    artifact_type: NonEmptyText
    location: NonEmptyText
    producer: AgentName
    task_id: Identifier | None = None
    version: NonEmptyText = "0.1"


class QAIssue(SupervisorModel):
    issue_id: Identifier
    severity: QASeverity
    affected_task_id: Identifier
    affected_artifact_id: Identifier | None = None
    failure_reason: NonEmptyText
    rework_required: bool
    suggested_remediation: NonEmptyText | None = None


class QAFeedback(SupervisorModel):
    feedback_id: Identifier
    task_id: Identifier
    verdict: QAVerdict
    issues: list[QAIssue] = Field(default_factory=list)
    summary: NonEmptyText
    artifact_references: list[ArtifactReference] = Field(default_factory=list)


class AgentExecutionResult(SupervisorModel):
    """Result contract submitted by any future dispatched agent."""

    agent: AgentName
    task_id: Identifier
    status: AgentResultStatus
    attempt_number: int = Field(ge=1)
    started_at: datetime | None = None
    finished_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    produced_artifacts: list[ArtifactReference] = Field(default_factory=list)
    message: NonEmptyText | None = None
    errors: list[NonEmptyText] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)


class TaskTransitionRecord(SupervisorModel):
    task_id: Identifier
    from_status: TaskExecutionStatus
    to_status: TaskExecutionStatus
    reason: NonEmptyText
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    actor: AgentName | None = None


class ExecutionRecord(SupervisorModel):
    record_id: NonEmptyText
    task_id: Identifier
    agent: AgentName
    attempt_number: int = Field(ge=1)
    result_status: AgentResultStatus
    started_at: datetime | None = None
    finished_at: datetime
    artifact_ids: list[Identifier] = Field(default_factory=list)
    errors: list[NonEmptyText] = Field(default_factory=list)
    transition: TaskTransitionRecord


class TaskExecutionState(SupervisorModel):
    task: ImplementationTask
    status: TaskExecutionStatus = TaskExecutionStatus.PENDING
    attempt_count: int = Field(default=0, ge=0)
    retry_count: int = Field(default=0, ge=0)
    rework_count: int = Field(default=0, ge=0)
    assigned_agent: AgentName | None = None
    generated_artifacts: list[ArtifactReference] = Field(default_factory=list)
    qa_feedback_ids: list[Identifier] = Field(default_factory=list)
    last_error: NonEmptyText | None = None


class ProjectExecutionState(SupervisorModel):
    """In-memory project work graph; a repository can persist it later."""

    project_id: NonEmptyText
    status: ProjectStatus = ProjectStatus.INITIALIZED
    planning_artifact: PlanningArtifact
    tasks: dict[Identifier, TaskExecutionState]
    generated_artifacts: list[ArtifactReference] = Field(default_factory=list)
    qa_feedback: list[QAFeedback] = Field(default_factory=list)
    execution_records: list[ExecutionRecord] = Field(default_factory=list)
    transition_history: list[TaskTransitionRecord] = Field(default_factory=list)
    iteration: int = Field(default=1, ge=1)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DecisionFactor(SupervisorModel):
    name: NonEmptyText
    value: NonEmptyText
    effect: NonEmptyText


class NextTaskDecision(SupervisorModel):
    selected_task_id: Identifier | None = None
    eligible_task_ids: list[Identifier] = Field(default_factory=list)
    reason: NonEmptyText
    decision_factors: list[DecisionFactor] = Field(default_factory=list)
    execution_mode: ExecutionMode = ExecutionMode.DETERMINISTIC


class ContextualTaskAdvice(SupervisorModel):
    """Optional future advisory input; it never bypasses deterministic eligibility."""

    recommended_task_id: Identifier | None = None
    rationale: NonEmptyText
    factors: list[DecisionFactor] = Field(default_factory=list)


class AgentDispatchCommand(SupervisorModel):
    """Future dispatcher input; no agent implementation is implied by this contract."""

    project_id: NonEmptyText
    task_id: Identifier
    agent: AgentName
    attempt_number: int = Field(ge=1)
    task: ImplementationTask
    planning_artifact: PlanningArtifact
    related_artifacts: list[ArtifactReference] = Field(default_factory=list)
    rework_feedback: list[QAFeedback] = Field(default_factory=list)
    related_knowledge: list[dict] = Field(default_factory=list)
