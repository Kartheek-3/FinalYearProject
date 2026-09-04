"""Project aggregate and lifecycle records composed from existing agent contracts."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from backend.agents.analysis.models import AnalysisArtifact, NonEmptyText
from backend.agents.delivery.models import DeliveryResult
from backend.agents.planning.models import PlanningArtifact
from backend.agents.qa.models import QAReport
from backend.agents.supervisor.models import ArtifactReference, ProjectExecutionState


class CompositionModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ProjectLifecycleStage(StrEnum):
    CREATED = "created"
    ANALYZED = "analyzed"
    PLANNED = "planned"
    READY_FOR_EXECUTION = "ready_for_execution"
    EXECUTING = "executing"
    PAUSED = "paused"
    READY_FOR_DELIVERY = "ready_for_delivery"
    FAILED = "failed"


class QualityGateStatus(StrEnum):
    """Composition policy state after Coding and before downstream work may proceed."""

    PENDING = "pending"
    PASSED = "passed"
    REWORK_REQUIRED = "rework_required"
    BLOCKED = "blocked"


class ProjectInput(CompositionModel):
    project_description: NonEmptyText
    technology_stack: list[NonEmptyText] = Field(min_length=1)


class ProjectWorkspaceReference(CompositionModel):
    project_id: NonEmptyText
    relative_path: NonEmptyText


class LifecycleMetadata(CompositionModel):
    stage: ProjectLifecycleStage = ProjectLifecycleStage.CREATED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    errors: list[NonEmptyText] = Field(default_factory=list)


class TaskQualityGate(CompositionModel):
    """References immutable QA history without duplicating QAReport contracts."""

    task_id: NonEmptyText
    status: QualityGateStatus
    reason: NonEmptyText
    report_index: int | None = Field(default=None, ge=0)


class ProjectAggregate(CompositionModel):
    """The composition-layer owner of a single project lifecycle and identity."""

    project_id: NonEmptyText
    owner_id: str | None = None
    project_input: ProjectInput
    workspace: ProjectWorkspaceReference
    analysis_artifact: AnalysisArtifact | None = None
    planning_artifact: PlanningArtifact | None = None
    execution_state: ProjectExecutionState | None = None
    generated_artifacts: list[ArtifactReference] = Field(default_factory=list)
    qa_reports: list[QAReport] = Field(default_factory=list)
    quality_gates: list[TaskQualityGate] = Field(default_factory=list)
    delivery_result: DeliveryResult | None = None
    lifecycle: LifecycleMetadata = Field(default_factory=LifecycleMetadata)

