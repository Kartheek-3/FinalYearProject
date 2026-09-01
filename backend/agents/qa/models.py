"""Machine-readable QA contracts and adapters to the Supervisor feedback contract."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import Field, model_validator

from backend.agents.analysis.models import AnalysisArtifact, Identifier, NonEmptyText
from backend.agents.coding.models import ExistingFileContext
from backend.agents.planning.models import ImplementationTask, PlanningArtifact
from backend.agents.supervisor.models import (
    AgentName,
    ArtifactReference,
    QAFeedback,
    QAIssue as SupervisorQAIssue,
    QASeverity,
    QAVerdict as SupervisorQAVerdict,
    SupervisorModel,
)


class QAVerdict(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    REWORK_REQUIRED = "rework_required"
    BLOCKED = "blocked"


class ValidationCategory(StrEnum):
    REQUIREMENT = "requirement"
    ACCEPTANCE_CRITERIA = "acceptance_criteria"
    UNIT = "unit"
    INTEGRATION = "integration"
    REGRESSION = "regression"
    STATIC_ANALYSIS = "static_analysis"
    SECURITY = "security"
    CODE_REVIEW = "code_review"
    WORKSPACE = "workspace"


class ValidationStatus(StrEnum):
    PASSED = "passed"
    FAILED = "failed"
    BLOCKED = "blocked"
    NOT_EXECUTED = "not_executed"
    NOT_APPLICABLE = "not_applicable"


class QAIssueSeverity(StrEnum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class QAIssueCategory(StrEnum):
    REQUIREMENT = "requirement"
    ACCEPTANCE_CRITERIA = "acceptance_criteria"
    CODE_QUALITY = "code_quality"
    UNIT_TEST = "unit_test"
    INTEGRATION_TEST = "integration_test"
    REGRESSION = "regression"
    STATIC_ANALYSIS = "static_analysis"
    SECURITY = "security"
    WORKSPACE = "workspace"
    EXECUTION = "execution"


class EvidenceItem(SupervisorModel):
    source: NonEmptyText
    location: NonEmptyText | None = None
    detail: NonEmptyText


class Reproducibility(SupervisorModel):
    reproducible: bool
    steps: list[NonEmptyText] = Field(default_factory=list)
    environment: NonEmptyText | None = None


class QAIssue(SupervisorModel):
    """Rich QA finding that maps losslessly enough to Supervisor rework feedback."""

    issue_id: Identifier
    severity: QAIssueSeverity
    category: QAIssueCategory
    title: NonEmptyText
    description: NonEmptyText
    affected_task_id: Identifier
    affected_artifact_id: Identifier | None = None
    affected_requirement_ids: list[Identifier] = Field(default_factory=list)
    affected_acceptance_criteria_ids: list[Identifier] = Field(default_factory=list)
    failure_reason: NonEmptyText
    required_rework: bool
    suggested_remediation: NonEmptyText | None = None
    evidence: list[EvidenceItem] = Field(default_factory=list)
    reproducibility: Reproducibility

    def to_supervisor_issue(self) -> SupervisorQAIssue:
        severity = QASeverity.LOW if self.severity == QAIssueSeverity.INFO else QASeverity(self.severity.value)
        return SupervisorQAIssue(
            issue_id=self.issue_id,
            severity=severity,
            affected_task_id=self.affected_task_id,
            affected_artifact_id=self.affected_artifact_id,
            failure_reason=self.failure_reason,
            rework_required=self.required_rework,
            suggested_remediation=self.suggested_remediation,
        )


class ValidationCheck(SupervisorModel):
    check_id: Identifier
    category: ValidationCategory
    applicable: bool
    executed: bool
    status: ValidationStatus
    related_task_ids: list[Identifier] = Field(default_factory=list)
    related_requirement_ids: list[Identifier] = Field(default_factory=list)
    related_acceptance_criteria_ids: list[Identifier] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    errors: list[NonEmptyText] = Field(default_factory=list)
    issue_ids: list[Identifier] = Field(default_factory=list)


class RequirementValidationResult(SupervisorModel):
    requirement_id: Identifier
    status: ValidationStatus
    task_ids: list[Identifier] = Field(min_length=1)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    issue_ids: list[Identifier] = Field(default_factory=list)


class AcceptanceCriteriaValidationResult(SupervisorModel):
    acceptance_criteria_id: Identifier
    requirement_id: Identifier
    status: ValidationStatus
    task_ids: list[Identifier] = Field(min_length=1)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    issue_ids: list[Identifier] = Field(default_factory=list)


class ExecutionRequest(SupervisorModel):
    project_id: NonEmptyText
    category: ValidationCategory
    task_ids: list[Identifier] = Field(min_length=1)
    artifact_references: list[ArtifactReference] = Field(default_factory=list)


class ExecutionResult(SupervisorModel):
    category: ValidationCategory
    applicable: bool
    executed: bool
    status: ValidationStatus
    evidence: list[EvidenceItem] = Field(default_factory=list)
    errors: list[NonEmptyText] = Field(default_factory=list)
    issues: list[QAIssue] = Field(default_factory=list)


class CodeReviewRequest(SupervisorModel):
    project_id: NonEmptyText
    task_ids: list[Identifier] = Field(min_length=1)
    source_files: list[ExistingFileContext] = Field(min_length=1)
    artifact_references: list[ArtifactReference] = Field(default_factory=list)


class CodeReviewProposal(SupervisorModel):
    summary: NonEmptyText
    issues: list[QAIssue] = Field(default_factory=list)


class QARequest(SupervisorModel):
    project_id: NonEmptyText
    analysis_artifact: AnalysisArtifact
    planning_artifact: PlanningArtifact
    implementation_tasks: list[ImplementationTask] = Field(min_length=1)
    generated_artifacts: list[ArtifactReference] = Field(default_factory=list)
    inspection_paths: list[NonEmptyText] = Field(default_factory=list)
    previous_issues: list[QAIssue] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_project_context(self) -> "QARequest":
        if self.planning_artifact.project_id and self.planning_artifact.project_id != self.project_id:
            raise ValueError("Planning artifact project ID does not match QA project ID.")
        planned = {task.task_id for task in self.planning_artifact.result.implementation_tasks}
        supplied = {task.task_id for task in self.implementation_tasks}
        if not supplied <= planned:
            raise ValueError("QA request contains a task absent from the approved plan.")
        requirement_ids = {item.id for item in self.analysis_artifact.result.functional_requirements}
        acceptance_ids = {item.id for item in self.analysis_artifact.result.acceptance_criteria}
        for task in self.implementation_tasks:
            if not set(task.requirement_ids) <= requirement_ids:
                raise ValueError("QA task references a requirement absent from AnalysisArtifact.")
            if not set(task.acceptance_criteria) <= acceptance_ids:
                raise ValueError("QA task references acceptance criteria absent from AnalysisArtifact.")
        return self


class QAReport(SupervisorModel):
    project_id: NonEmptyText
    verdict: QAVerdict
    checks: list[ValidationCheck]
    issues: list[QAIssue] = Field(default_factory=list)
    requirement_results: list[RequirementValidationResult]
    acceptance_criteria_results: list[AcceptanceCriteriaValidationResult]
    test_results: list[ValidationCheck] = Field(default_factory=list)
    static_analysis_results: list[ValidationCheck] = Field(default_factory=list)
    security_findings: list[QAIssue] = Field(default_factory=list)
    regression_results: list[ValidationCheck] = Field(default_factory=list)
    artifacts: list[ArtifactReference] = Field(default_factory=list)
    summary: NonEmptyText
    metadata: dict[str, str] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_supervisor_feedback(self, task_id: str) -> QAFeedback:
        task_issues = [issue for issue in self.issues if issue.affected_task_id == task_id]
        if self.verdict == QAVerdict.PASS:
            supervisor_verdict = QAVerdict.PASS.value
        elif self.verdict == QAVerdict.BLOCKED:
            supervisor_verdict = QAVerdict.BLOCKED.value
        else:
            supervisor_verdict = QAVerdict.FAIL.value
        return QAFeedback(
            feedback_id=f"qa_feedback_{task_id[:48]}",
            task_id=task_id,
            verdict=SupervisorQAVerdict(supervisor_verdict),
            issues=[issue.to_supervisor_issue() for issue in task_issues],
            summary=self.summary,
            artifact_references=self.artifacts,
        )
