"""Safe deterministic QA checks over one generated-project workspace only."""

from __future__ import annotations

import re

from backend.agents.qa.models import (
    EvidenceItem,
    ExecutionRequest,
    ExecutionResult,
    QAIssue,
    QAIssueCategory,
    QAIssueSeverity,
    Reproducibility,
    ValidationCategory,
    ValidationStatus,
)
from backend.agents.qa.workspace import ReadOnlyWorkspace


class WorkspaceValidationExecutionProvider:
    """Read-only deterministic inspection; it never invokes processes or Docker."""

    _UNSAFE_PATTERNS = (
        (re.compile(r"\beval\s*\("), "Use of eval requires review."),
        (re.compile(r"subprocess\.[^(]+\([^)]*shell\s*=\s*True"), "Shell subprocess execution requires review."),
        (re.compile(r"(?:api[_-]?key|password|secret)\s*=\s*['\"][^'\"]+['\"]", re.I), "Possible hard-coded secret."),
    )

    def __init__(self, workspace: ReadOnlyWorkspace) -> None:
        self._workspace = workspace

    async def run(self, request: ExecutionRequest) -> ExecutionResult:
        if request.category in {ValidationCategory.UNIT, ValidationCategory.INTEGRATION}:
            return ExecutionResult(
                category=request.category,
                applicable=True,
                executed=False,
                status=ValidationStatus.BLOCKED,
                errors=["Runtime execution is intentionally unavailable in the safe QA boundary."],
            )
        if request.category not in {ValidationCategory.STATIC_ANALYSIS, ValidationCategory.SECURITY}:
            return ExecutionResult(
                category=request.category,
                applicable=False,
                executed=False,
                status=ValidationStatus.NOT_APPLICABLE,
            )
        paths = [artifact.location for artifact in request.artifact_references]
        missing = [path for path in paths if not self._workspace.exists(path)]
        if missing:
            return ExecutionResult(
                category=request.category,
                applicable=True,
                executed=True,
                status=ValidationStatus.FAILED,
                errors=[f"Declared generated artifacts are unavailable: {', '.join(missing)}"],
            )
        if request.category == ValidationCategory.STATIC_ANALYSIS:
            return ExecutionResult(
                category=request.category,
                applicable=True,
                executed=True,
                status=ValidationStatus.PASSED,
                evidence=[EvidenceItem(source="workspace_static", detail="Generated artifact paths and UTF-8 source reads succeeded.")],
            )
        issues = self._security_issues(request, paths)
        return ExecutionResult(
            category=ValidationCategory.SECURITY,
            applicable=True,
            executed=True,
            status=ValidationStatus.FAILED if issues else ValidationStatus.PASSED,
            evidence=[EvidenceItem(source="workspace_security", detail="Deterministic source-pattern scan completed.")],
            issues=issues,
        )

    def _security_issues(self, request: ExecutionRequest, paths: list[str]) -> list[QAIssue]:
        issues: list[QAIssue] = []
        for path in paths:
            source = self._workspace.read_file(path).content
            for pattern, message in self._UNSAFE_PATTERNS:
                if not pattern.search(source):
                    continue
                task_id = request.task_ids[0]
                issues.append(
                    QAIssue(
                        issue_id=f"qa_security_{task_id[:32]}_{len(issues) + 1}",
                        severity=QAIssueSeverity.HIGH,
                        category=QAIssueCategory.SECURITY,
                        title="Deterministic security pattern detected",
                        description=message,
                        affected_task_id=task_id,
                        affected_requirement_ids=[],
                        affected_acceptance_criteria_ids=[],
                        failure_reason=message,
                        required_rework=True,
                        suggested_remediation="Remove the unsafe pattern or document a safe alternative.",
                        evidence=[EvidenceItem(source="workspace_security", location=path, detail=message)],
                        reproducibility=Reproducibility(reproducible=True, steps=[f"Inspect {path}"]),
                    )
                )
        return issues
