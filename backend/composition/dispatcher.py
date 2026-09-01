"""Concrete dispatcher that enriches Supervisor commands from aggregate context."""

from __future__ import annotations

from dataclasses import dataclass

from backend.agents.coding.models import CodingRequest, CodingResult
from backend.agents.delivery.models import DeliveryResult, DeliveryStatus, DeploymentTarget
from backend.agents.qa.models import QAReport, QARequest, QAVerdict
from backend.agents.qa.agent import QAAgent
from backend.agents.supervisor.models import (
    AgentDispatchCommand,
    AgentExecutionResult,
    AgentName,
    AgentResultStatus,
)
from backend.composition.agents import AgentBundle
from backend.composition.errors import DispatcherError
from backend.composition.models import ProjectAggregate
from backend.composition.qa_evidence import aggregate_task_evidence
from backend.composition.qa_execution import WorkspaceValidationExecutionProvider
from backend.composition.repository import ProjectRepository
from backend.composition.workspace import ProjectWorkspaceProvisioner


@dataclass(frozen=True, slots=True)
class DispatchOutcome:
    execution_result: AgentExecutionResult
    qa_report: QAReport | None = None
    delivery_result: DeliveryResult | None = None


class AggregateDispatcher:
    """Implements Supervisor dispatch while resolving context held outside task state."""

    def __init__(
        self,
        repository: ProjectRepository,
        provisioner: ProjectWorkspaceProvisioner,
        agents: AgentBundle,
    ) -> None:
        self._repository = repository
        self._provisioner = provisioner
        self._agents = agents

    async def dispatch(self, command: AgentDispatchCommand) -> AgentExecutionResult:
        aggregate = await self._repository.get(command.project_id)
        return (await self.dispatch_outcome(aggregate, command)).execution_result

    async def dispatch_outcome(
        self,
        aggregate: ProjectAggregate,
        command: AgentDispatchCommand,
    ) -> DispatchOutcome:
        workspace = self._provisioner.open(aggregate.workspace)
        if command.agent == AgentName.CODING:
            return DispatchOutcome(execution_result=await self._dispatch_coding(aggregate, command, workspace))
        if command.agent == AgentName.QA:
            return await self._dispatch_qa(aggregate, command, workspace)
        if command.agent == AgentName.DELIVERY:
            return self._delivery_unavailable(command)
        raise DispatcherError(f"Dispatcher cannot route agent '{command.agent.value}' in task execution.")

    async def _dispatch_coding(self, aggregate: ProjectAggregate, command: AgentDispatchCommand, workspace) -> CodingResult:
        if aggregate.analysis_artifact is None:
            raise DispatcherError("Coding dispatch requires a stored AnalysisArtifact.")
        requirements = {item.id: item for item in aggregate.analysis_artifact.result.functional_requirements}
        criteria = {item.id: item for item in aggregate.analysis_artifact.result.acceptance_criteria}
        missing_requirements = set(command.task.requirement_ids) - set(requirements)
        missing_criteria = set(command.task.acceptance_criteria) - set(criteria)
        if missing_requirements:
            raise DispatcherError(f"Coding task references unknown requirements: {sorted(missing_requirements)}")
        if missing_criteria:
            raise DispatcherError(
                f"Coding task references unknown acceptance criteria: {sorted(missing_criteria)}"
            )
        request = CodingRequest(
            dispatch_command=command,
            relevant_functional_requirements=[requirements[item_id] for item_id in command.task.requirement_ids],
            relevant_acceptance_criteria=[criteria[item_id] for item_id in command.task.acceptance_criteria],
            context_paths=[],
        )
        return await self._agents.coding.implement(request, workspace)

    async def _dispatch_qa(self, aggregate: ProjectAggregate, command: AgentDispatchCommand, workspace) -> DispatchOutcome:
        if aggregate.analysis_artifact is None or aggregate.planning_artifact is None:
            raise DispatcherError("QA dispatch requires stored Analysis and Planning artifacts.")
        source_artifacts = [
            artifact
            for artifact in aggregate.generated_artifacts
            if artifact.artifact_type == "generated_source_file" and artifact.task_id == command.task_id
        ]
        previous_issues = [issue for report in aggregate.qa_reports for issue in report.issues]
        request = QARequest(
            project_id=aggregate.project_id,
            analysis_artifact=aggregate.analysis_artifact,
            planning_artifact=aggregate.planning_artifact,
            implementation_tasks=[command.task],
            generated_artifacts=source_artifacts,
            previous_issues=previous_issues,
        )
        # The provider is scoped to this generated-project workspace and has no
        # write or process-execution capability.
        qa_agent = QAAgent(
            execution_provider=WorkspaceValidationExecutionProvider(workspace),
            code_review_provider=self._agents.qa.code_review_provider,
        )
        report = aggregate_task_evidence(await qa_agent.evaluate(request, workspace), request)
        result_status = {
            QAVerdict.PASS: AgentResultStatus.SUCCEEDED,
            QAVerdict.REWORK_REQUIRED: AgentResultStatus.REWORK_REQUIRED,
            QAVerdict.FAIL: AgentResultStatus.FAILED,
            QAVerdict.BLOCKED: AgentResultStatus.FAILED,
        }[report.verdict]
        return DispatchOutcome(
            execution_result=AgentExecutionResult(
                agent=AgentName.QA,
                task_id=command.task_id,
                status=result_status,
                attempt_number=command.attempt_number,
                produced_artifacts=report.artifacts,
                message=report.summary,
            ),
            qa_report=report,
        )

    @staticmethod
    def _delivery_unavailable(command: AgentDispatchCommand) -> DispatchOutcome:
        result = DeliveryResult(
            agent=AgentName.DELIVERY,
            task_id=command.task_id,
            status=AgentResultStatus.FAILED,
            attempt_number=command.attempt_number,
            delivery_status=DeliveryStatus.BLOCKED,
            target=DeploymentTarget.DOCKER,
            errors=["Docker deployment configuration/provider is not integrated."],
            message="Delivery dispatch is prepared but controlled Docker execution is unavailable.",
            metadata={"provider": "unavailable"},
        )
        return DispatchOutcome(execution_result=result, delivery_result=result)
