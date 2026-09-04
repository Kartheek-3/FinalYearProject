"""Read-only QA orchestration with deterministic evidence checks and execution boundaries."""

from __future__ import annotations

from dataclasses import dataclass

from backend.agents.qa.errors import QAExecutionError
from backend.agents.qa.execution import CodeReviewProvider, ValidationExecutionProvider
from backend.agents.qa.models import (
    AcceptanceCriteriaValidationResult,
    CodeReviewRequest,
    EvidenceItem,
    ExecutionRequest,
    ExecutionResult,
    QAIssue,
    QAIssueCategory,
    QAIssueSeverity,
    QAReport,
    QARequest,
    QAVerdict,
    Reproducibility,
    RequirementValidationResult,
    ValidationCategory,
    ValidationCheck,
    ValidationStatus,
)
from backend.agents.qa.workspace import ReadOnlyWorkspace
from backend.agents.supervisor.models import AgentName, ArtifactReference


from backend.rag.interfaces import KnowledgeRetriever, KnowledgeSnippet

@dataclass(slots=True)
class QAAgent:
    """Validates generated-project evidence without source-code mutation authority."""

    execution_provider: ValidationExecutionProvider | None = None
    code_review_provider: CodeReviewProvider | None = None
    knowledge_retriever: KnowledgeRetriever | None = None

    async def evaluate(self, request: QARequest, workspace: ReadOnlyWorkspace) -> QAReport:
        issues, workspace_check = self._inspect_artifacts(request, workspace)
        code_review_check, code_review_issues = await self._code_review_check(request, workspace)
        issues.extend(code_review_issues)
        execution_checks, execution_issues = await self._execution_checks(request)
        issues.extend(execution_issues)
        regression_check, regression_issues = self._regression_check(request, issues)
        issues.extend(regression_issues)
        checks = [workspace_check, code_review_check, *execution_checks, regression_check]
        requirement_results = self._requirement_results(request, issues)
        acceptance_results = self._acceptance_results(request, issues)
        verdict = self._verdict(checks, issues, requirement_results, acceptance_results)
        artifacts = self._report_artifacts(request)
        return QAReport(
            project_id=request.project_id,
            verdict=verdict,
            checks=checks,
            issues=issues,
            requirement_results=requirement_results,
            acceptance_criteria_results=acceptance_results,
            test_results=[
                check
                for check in execution_checks
                if check.category in {ValidationCategory.UNIT, ValidationCategory.INTEGRATION}
            ],
            static_analysis_results=[
                check for check in execution_checks if check.category == ValidationCategory.STATIC_ANALYSIS
            ],
            security_findings=[
                issue for issue in issues if issue.category == QAIssueCategory.SECURITY
            ],
            regression_results=[regression_check],
            artifacts=artifacts,
            summary=self._summary(verdict, issues, checks),
            metadata={
                "workspace_access": "read_only",
                "execution_provider": str(self.execution_provider is not None),
                "code_review_provider": str(self.code_review_provider is not None),
            },
        )

    async def _code_review_check(
        self,
        request: QARequest,
        workspace: ReadOnlyWorkspace,
    ) -> tuple[ValidationCheck, list[QAIssue]]:
        task_ids = [task.task_id for task in request.implementation_tasks]
        paths = request.inspection_paths or list(set([
            ref.location
            for ref in request.generated_artifacts
            if ref.artifact_type == "generated_source_file" and ref.task_id in task_ids
        ]))
        if not paths:
            return ValidationCheck(
                check_id="qa_code_review",
                category=ValidationCategory.CODE_REVIEW,
                applicable=True,
                executed=False,
                status=ValidationStatus.BLOCKED,
                related_task_ids=task_ids,
                errors=["No generated source paths were supplied for read-only code review."],
            ), []
        try:
            source_files = [workspace.read_file(path) for path in paths]
        except Exception as exc:
            return ValidationCheck(
                check_id="qa_code_review",
                category=ValidationCategory.CODE_REVIEW,
                applicable=True,
                executed=False,
                status=ValidationStatus.BLOCKED,
                related_task_ids=task_ids,
                errors=[f"Unable to read source for code review: {exc}"],
            ), []
        if self.code_review_provider is None:
            return ValidationCheck(
                check_id="qa_code_review",
                category=ValidationCategory.CODE_REVIEW,
                applicable=True,
                executed=False,
                status=ValidationStatus.BLOCKED,
                related_task_ids=task_ids,
                errors=["No structured code-review provider is configured."],
            ), []
        related_knowledge = []
        if self.knowledge_retriever is not None:
            try:
                snippets = await self.knowledge_retriever.retrieve(
                    query="QA lessons, security lessons, testing patterns, known failure patterns",
                    limit=3,
                    project_id=request.project_id,
                    agent="qa"
                )
                related_knowledge = [s.model_dump() for s in snippets]
            except Exception:
                pass
                
        try:
            result = await self.code_review_provider.review(
                CodeReviewRequest(
                    project_id=request.project_id,
                    task_ids=task_ids,
                    source_files=source_files,
                    artifact_references=request.generated_artifacts,
                    related_knowledge=related_knowledge,
                )
            )
            if not isinstance(result, ExecutionResult) or result.category != ValidationCategory.CODE_REVIEW:
                raise QAExecutionError("Code-review provider returned a malformed result.")
        except Exception as exc:
            return ValidationCheck(
                check_id="qa_code_review",
                category=ValidationCategory.CODE_REVIEW,
                applicable=True,
                executed=False,
                status=ValidationStatus.BLOCKED,
                related_task_ids=task_ids,
                errors=[f"Code-review provider failure: {exc}"],
            ), []
        # Enforce strict adherence to the syntax-only review policy.
        filtered_issues = [
            issue for issue in result.issues 
            if issue.category not in {
                QAIssueCategory.CODE_QUALITY, 
                QAIssueCategory.REQUIREMENT, 
                QAIssueCategory.ACCEPTANCE_CRITERIA
            }
        ]
        
        return ValidationCheck(
            check_id="qa_code_review",
            category=ValidationCategory.CODE_REVIEW,
            applicable=result.applicable,
            executed=result.executed,
            status=ValidationStatus.FAILED if filtered_issues else ValidationStatus.PASSED,
            related_task_ids=task_ids,
            evidence=result.evidence,
            errors=result.errors,
            issue_ids=[issue.issue_id for issue in filtered_issues],
        ), filtered_issues

    def _inspect_artifacts(
        self,
        request: QARequest,
        workspace: ReadOnlyWorkspace,
    ) -> tuple[list[QAIssue], ValidationCheck]:
        issues: list[QAIssue] = []
        task_ids = [task.task_id for task in request.implementation_tasks]
        tasks_by_id = {task.task_id: task for task in request.implementation_tasks}
        for index, artifact in enumerate(request.generated_artifacts, start=1):
            if artifact.task_id in task_ids and not workspace.exists(artifact.location):
                task = tasks_by_id[artifact.task_id]
                issues.append(
                    QAIssue(
                        issue_id=f"qa_missing_{index}_{artifact.task_id[:40]}",
                        severity=QAIssueSeverity.HIGH,
                        category=QAIssueCategory.WORKSPACE,
                        title="Expected generated artifact is missing",
                        description=f"The reported artifact is absent from the generated-project workspace: {artifact.location}",
                        affected_task_id=artifact.task_id,
                        affected_artifact_id=artifact.artifact_id,
                        affected_requirement_ids=task.requirement_ids,
                        affected_acceptance_criteria_ids=task.acceptance_criteria,
                        failure_reason="Coding output cannot be validated because its declared artifact is unavailable.",
                        required_rework=True,
                        suggested_remediation="Restore or regenerate the declared task artifact in the assigned workspace.",
                        evidence=[EvidenceItem(source="workspace", location=artifact.location, detail="File not found")],
                        reproducibility=Reproducibility(reproducible=True, steps=["Inspect declared artifact path"]),
                    )
                )
        status = ValidationStatus.FAILED if issues else ValidationStatus.PASSED
        return issues, ValidationCheck(
            check_id="qa_workspace_artifacts",
            category=ValidationCategory.WORKSPACE,
            applicable=True,
            executed=True,
            status=status,
            related_task_ids=task_ids,
            evidence=[EvidenceItem(source="workspace", detail="Declared generated artifacts inspected")],
            issue_ids=[issue.issue_id for issue in issues],
        )

    @staticmethod
    def _requirement_results(request: QARequest, issues: list[QAIssue]) -> list[RequirementValidationResult]:
        task_by_requirement: dict[str, list[str]] = {}
        for task in request.implementation_tasks:
            for requirement_id in task.requirement_ids:
                task_by_requirement.setdefault(requirement_id, []).append(task.task_id)
        return [
            RequirementValidationResult(
                requirement_id=requirement_id,
                status=ValidationStatus.NOT_EXECUTED,
                task_ids=task_ids,
                evidence=[EvidenceItem(source="plan", detail="Requirement traced to approved implementation task")],
                issue_ids=[
                    issue.issue_id for issue in issues if requirement_id in issue.affected_requirement_ids
                ],
            )
            for requirement_id, task_ids in task_by_requirement.items()
        ]

    @staticmethod
    def _acceptance_results(
        request: QARequest,
        issues: list[QAIssue],
    ) -> list[AcceptanceCriteriaValidationResult]:
        task_by_acceptance: dict[str, list[str]] = {}
        for task in request.implementation_tasks:
            for criterion_id in task.acceptance_criteria:
                task_by_acceptance.setdefault(criterion_id, []).append(task.task_id)
        criteria = {item.id: item for item in request.analysis_artifact.result.acceptance_criteria}
        return [
            AcceptanceCriteriaValidationResult(
                acceptance_criteria_id=criterion_id,
                requirement_id=criteria[criterion_id].requirement_id,
                status=ValidationStatus.NOT_EXECUTED,
                task_ids=task_ids,
                evidence=[EvidenceItem(source="analysis", detail="Acceptance criterion awaits executable validation")],
                issue_ids=[
                    issue.issue_id
                    for issue in issues
                    if criterion_id in issue.affected_acceptance_criteria_ids
                ],
            )
            for criterion_id, task_ids in task_by_acceptance.items()
            if criterion_id in criteria
        ]

    async def _execution_checks(
        self,
        request: QARequest,
    ) -> tuple[list[ValidationCheck], list[QAIssue]]:
        categories = (
            ValidationCategory.UNIT,
            ValidationCategory.INTEGRATION,
            ValidationCategory.STATIC_ANALYSIS,
            ValidationCategory.SECURITY,
        )
        task_ids = [task.task_id for task in request.implementation_tasks]
        checks: list[ValidationCheck] = []
        issues: list[QAIssue] = []
        for category in categories:
            if self.execution_provider is None:
                checks.append(
                    ValidationCheck(
                        check_id=f"qa_{category.value}",
                        category=category,
                        applicable=True,
                        executed=False,
                        status=ValidationStatus.BLOCKED,
                        related_task_ids=task_ids,
                        errors=["No controlled execution provider is configured."],
                    )
                )
                continue
            try:
                result = await self.execution_provider.run(
                    ExecutionRequest(
                        project_id=request.project_id,
                        category=category,
                        task_ids=task_ids,
                        artifact_references=request.generated_artifacts,
                    )
                )
                if not isinstance(result, ExecutionResult) or result.category != category:
                    raise QAExecutionError("Execution provider returned a malformed category result.")
            except Exception as exc:
                checks.append(
                    ValidationCheck(
                        check_id=f"qa_{category.value}",
                        category=category,
                        applicable=True,
                        executed=False,
                        status=ValidationStatus.BLOCKED,
                        related_task_ids=task_ids,
                        errors=[f"Execution provider failure: {exc}"],
                    )
                )
                continue
            issues.extend(result.issues)
            checks.append(
                ValidationCheck(
                    check_id=f"qa_{category.value}",
                    category=category,
                    applicable=result.applicable,
                    executed=result.executed,
                    status=result.status,
                    related_task_ids=task_ids,
                    evidence=result.evidence,
                    errors=result.errors,
                    issue_ids=[issue.issue_id for issue in result.issues],
                )
            )
        return checks, issues

    @staticmethod
    def _regression_check(
        request: QARequest,
        issues: list[QAIssue],
    ) -> tuple[ValidationCheck, list[QAIssue]]:
        previous_rework_ids = {issue.issue_id for issue in request.previous_issues if issue.required_rework}
        # If the LLM reuses an ID for a new minor issue, it shouldn't trigger a regression failure.
        unresolved = [issue for issue in issues if issue.issue_id in previous_rework_ids and issue.required_rework]
        if not request.previous_issues:
            return ValidationCheck(
                check_id="qa_regression",
                category=ValidationCategory.REGRESSION,
                applicable=False,
                executed=False,
                status=ValidationStatus.NOT_APPLICABLE,
            ), []
        status = ValidationStatus.FAILED if unresolved else ValidationStatus.NOT_EXECUTED
        return ValidationCheck(
            check_id="qa_regression",
            category=ValidationCategory.REGRESSION,
            applicable=True,
            executed=False,
            status=status,
            related_task_ids=[task.task_id for task in request.implementation_tasks],
            evidence=[EvidenceItem(source="qa_history", detail="Previous QA issues compared to current findings")],
            issue_ids=[issue.issue_id for issue in unresolved],
        ), []

    @staticmethod
    def _verdict(
        checks: list[ValidationCheck],
        issues: list[QAIssue],
        requirement_results: list[RequirementValidationResult],
        acceptance_results: list[AcceptanceCriteriaValidationResult],
    ) -> QAVerdict:
        if any(issue.required_rework for issue in issues):
            return QAVerdict.REWORK_REQUIRED
        if any(check.status == ValidationStatus.FAILED for check in checks):
            return QAVerdict.FAIL
        return QAVerdict.PASS

    @staticmethod
    def _report_artifacts(request: QARequest) -> list[ArtifactReference]:
        return [
            ArtifactReference(
                artifact_id=f"qa_report_{task.task_id[:48]}",
                artifact_type="qa_report",
                location=f"qa://{request.project_id}/{task.task_id}",
                producer=AgentName.QA,
                task_id=task.task_id,
            )
            for task in request.implementation_tasks
        ]

    @staticmethod
    def _summary(verdict: QAVerdict, issues: list[QAIssue], checks: list[ValidationCheck]) -> str:
        return (
            f"QA verdict: {verdict.value}; {len(issues)} issue(s); "
            f"{sum(check.executed for check in checks)} executed check(s) of {len(checks)}."
        )
