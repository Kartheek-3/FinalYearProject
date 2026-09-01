"""Composition-level traceability aggregation for a task-scoped QA report."""

from __future__ import annotations

from backend.agents.qa.models import (
    AcceptanceCriteriaValidationResult,
    EvidenceItem,
    QAReport,
    QARequest,
    RequirementValidationResult,
    ValidationStatus,
)


def aggregate_task_evidence(report: QAReport, request: QARequest) -> QAReport:
    """Attach artifact/check evidence without promoting unexecuted work to PASS.

    The QA Agent owns verdict calculation.  This composition helper merely
    carries the Analysis -> Planning -> Coding trace into its result, and only
    adds a failure when a linked QA finding proves one.
    """

    artifacts_by_task = {
        task.task_id: [artifact for artifact in request.generated_artifacts if artifact.task_id == task.task_id]
        for task in request.implementation_tasks
    }

    def result_status(issue_ids: list[str], current: ValidationStatus) -> ValidationStatus:
        if issue_ids:
            return ValidationStatus.FAILED
        # Do not convert traceability or source inspection into acceptance proof.
        return current

    requirements: list[RequirementValidationResult] = []
    for result in report.requirement_results:
        artifact_evidence = [
            EvidenceItem(source="coding_artifact", location=artifact.location, detail="Artifact is linked to the implementing task.")
            for task_id in result.task_ids
            for artifact in artifacts_by_task.get(task_id, [])
        ]
        requirements.append(
            result.model_copy(
                update={
                    "status": result_status(result.issue_ids, result.status),
                    "evidence": result.evidence + artifact_evidence,
                }
            )
        )
    acceptances: list[AcceptanceCriteriaValidationResult] = []
    for result in report.acceptance_criteria_results:
        artifact_evidence = [
            EvidenceItem(source="coding_artifact", location=artifact.location, detail="Artifact is linked to the criterion's implementing task.")
            for task_id in result.task_ids
            for artifact in artifacts_by_task.get(task_id, [])
        ]
        acceptances.append(
            result.model_copy(
                update={
                    "status": result_status(result.issue_ids, result.status),
                    "evidence": result.evidence + artifact_evidence,
                }
            )
        )
    prior_signatures = {_issue_signature(issue) for issue in request.previous_issues if issue.required_rework}
    current_signatures = {_issue_signature(issue) for issue in report.issues if issue.required_rework}
    unresolved = prior_signatures & current_signatures
    regression_results = []
    for check in report.regression_results:
        if unresolved:
            regression_results.append(
                check.model_copy(
                    update={
                        "status": ValidationStatus.FAILED,
                        "executed": True,
                        "evidence": check.evidence
                        + [EvidenceItem(source="qa_history", detail="Prior rework finding remains present by task/category/traceability signature.")],
                    }
                )
            )
        else:
            regression_results.append(check)
    replacement_regression = {check.check_id: check for check in regression_results}
    return report.model_copy(
        update={
            "requirement_results": requirements,
            "acceptance_criteria_results": acceptances,
            "regression_results": regression_results,
            "checks": [replacement_regression.get(check.check_id, check) for check in report.checks],
            "metadata": {**report.metadata, "traceability_aggregation": "analysis_plan_artifact"},
        }
    )


def _issue_signature(issue) -> tuple[object, ...]:
    """Compare persisted findings without deleting their raw history."""

    return (
        issue.category,
        issue.affected_task_id,
        issue.affected_artifact_id,
        tuple(sorted(issue.affected_requirement_ids)),
        tuple(sorted(issue.affected_acceptance_criteria_ids)),
    )
