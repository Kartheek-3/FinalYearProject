"""Adapters attach heterogeneous agent results to the aggregate without contract changes."""

from __future__ import annotations

from datetime import datetime, timezone

from backend.agents.analysis.models import AnalysisArtifact
from backend.agents.coding.models import CodingResult
from backend.agents.delivery.models import DeliveryResult
from backend.agents.planning.models import PlanningArtifact
from backend.agents.qa.models import QAReport
from backend.agents.qa.models import QAVerdict
from backend.agents.supervisor.service import SupervisorOrchestrator
from backend.composition.models import (
    LifecycleMetadata,
    ProjectAggregate,
    ProjectLifecycleStage,
    QualityGateStatus,
    TaskQualityGate,
)


def _metadata(
    aggregate: ProjectAggregate,
    stage: ProjectLifecycleStage,
    error: str | None = None,
) -> LifecycleMetadata:
    errors = aggregate.lifecycle.errors + ([error] if error else [])
    return LifecycleMetadata(
        stage=stage,
        created_at=aggregate.lifecycle.created_at,
        updated_at=datetime.now(timezone.utc),
        errors=errors,
    )


class AnalysisResultAdapter:
    @staticmethod
    def attach(aggregate: ProjectAggregate, artifact: AnalysisArtifact) -> ProjectAggregate:
        return aggregate.model_copy(
            update={"analysis_artifact": artifact, "lifecycle": _metadata(aggregate, ProjectLifecycleStage.ANALYZED)}
        )


class PlanningResultAdapter:
    @staticmethod
    def attach(
        aggregate: ProjectAggregate,
        artifact: PlanningArtifact,
        execution_state,
    ) -> ProjectAggregate:
        return aggregate.model_copy(
            update={
                "planning_artifact": artifact,
                "execution_state": execution_state,
                "lifecycle": _metadata(aggregate, ProjectLifecycleStage.READY_FOR_EXECUTION),
            }
        )


class CodingResultAdapter:
    @staticmethod
    def attach(
        aggregate: ProjectAggregate,
        result: CodingResult,
        supervisor: SupervisorOrchestrator,
    ) -> ProjectAggregate:
        if aggregate.execution_state is None:
            raise ValueError("Coding result cannot be attached before Supervisor initialization.")
        state = supervisor.apply_agent_result(aggregate.execution_state, result)
        gates = [gate for gate in aggregate.quality_gates if gate.task_id != result.task_id]
        if result.status.value == "succeeded":
            gates.append(
                TaskQualityGate(
                    task_id=result.task_id,
                    status=QualityGateStatus.PENDING,
                    reason="Coding completed; task requires QA before downstream work can proceed.",
                )
            )
        return aggregate.model_copy(
            update={
                "execution_state": state,
                "generated_artifacts": state.generated_artifacts,
                "quality_gates": gates,
                "lifecycle": _metadata(aggregate, ProjectLifecycleStage.READY_FOR_EXECUTION),
            }
        )


class QAResultAdapter:
    @staticmethod
    def attach(
        aggregate: ProjectAggregate,
        report: QAReport,
        task_id: str,
        supervisor: SupervisorOrchestrator,
    ) -> ProjectAggregate:
        if aggregate.execution_state is None:
            raise ValueError("QA report cannot be attached before Supervisor initialization.")
        feedback = report.to_supervisor_feedback(task_id)
        # Existing Supervisor rules own rework transitions.  PASS and BLOCKED
        # are represented by the composition quality gate because the task is
        # already completed by Coding and Supervisor intentionally forbids an
        # arbitrary completed -> blocked state transition.
        # Always retain the lossless Supervisor-shaped feedback.  Only rework
        # findings alter task state under the Supervisor's transition policy.
        state = supervisor.record_qa_feedback(aggregate.execution_state, feedback)
        gates = [gate for gate in aggregate.quality_gates if gate.task_id != task_id]
        status = {
            QAVerdict.PASS: QualityGateStatus.PASSED,
            QAVerdict.REWORK_REQUIRED: QualityGateStatus.REWORK_REQUIRED,
            QAVerdict.BLOCKED: QualityGateStatus.BLOCKED,
            QAVerdict.FAIL: QualityGateStatus.BLOCKED,
        }[report.verdict]
        gates.append(
            TaskQualityGate(
                task_id=task_id,
                status=status,
                reason=report.summary,
                report_index=len(aggregate.qa_reports),
            )
        )
        return aggregate.model_copy(
            update={
                "execution_state": state,
                "qa_reports": aggregate.qa_reports + [report],
                "quality_gates": gates,
                "generated_artifacts": state.generated_artifacts,
                "lifecycle": _metadata(aggregate, ProjectLifecycleStage.READY_FOR_EXECUTION),
            }
        )


class DeliveryResultAdapter:
    @staticmethod
    def attach(
        aggregate: ProjectAggregate,
        result: DeliveryResult,
        supervisor: SupervisorOrchestrator,
    ) -> ProjectAggregate:
        if aggregate.execution_state is None:
            raise ValueError("Delivery result cannot be attached before Supervisor initialization.")
        state = supervisor.apply_agent_result(aggregate.execution_state, result)
        return aggregate.model_copy(
            update={
                "execution_state": state,
                "delivery_result": result,
                "generated_artifacts": state.generated_artifacts,
                "lifecycle": _metadata(aggregate, ProjectLifecycleStage.READY_FOR_EXECUTION),
            }
        )
