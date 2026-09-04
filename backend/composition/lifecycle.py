"""Controlled lifecycle service for project creation and one-task execution."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4
import asyncio

from backend.agents.analysis.models import AnalysisRequest
from backend.agents.delivery.models import DeliveryResult
from backend.agents.planning.models import PlanningRequest
from backend.agents.qa.models import QAReport
from backend.agents.qa.models import QAVerdict
from backend.memory.models import MemoryType, MemoryRecord
from backend.memory import get_memory_manager
from backend.agents.supervisor.models import (
    AgentDispatchCommand,
    AgentName,
    AgentResultStatus,
    TaskExecutionStatus,
)
from backend.composition.adapters import (
    AnalysisResultAdapter,
    CodingResultAdapter,
    DeliveryResultAdapter,
    PlanningResultAdapter,
    QAResultAdapter,
)
from backend.composition.agents import AgentBundle
from backend.composition.dispatcher import AggregateDispatcher
from backend.composition.errors import CompositionError, InvalidProjectStateError
from backend.composition.graph import TaskGraphValidator
from backend.composition.models import (
    LifecycleMetadata,
    ProjectAggregate,
    ProjectInput,
    ProjectLifecycleStage,
    QualityGateStatus,
)
from backend.composition.repository import ProjectRepository
from backend.composition.workspace import ProjectWorkspaceProvisioner
from backend.deployment.docker_provider import DefaultDockerDeploymentProvider
from backend.deployment.errors import DeploymentError
from backend.agents.delivery.models import DeliveryRequest, DeploymentTarget, DockerDeploymentConfiguration, ComposeSpecification, DockerServiceConfiguration, DockerfileSpecification, ContainerRuntime, DeliveryStatus
from backend.agents.delivery.workspace import DeliveryWorkspace
from backend.composition.events import event_gateway, RuntimeEvent
import time

def _emit_sync(project_id: str, event_type: str, data: dict | None = None) -> None:
    asyncio.create_task(event_gateway.publish(RuntimeEvent(
        event_type=event_type,
        project_id=project_id,
        timestamp=time.time(),
        data=data or {}
    )))


class ProjectLifecycleService:
    """Composes existing agents while keeping their native result contracts intact."""

    _MAX_TASK_ATTEMPTS = 3
    _MAX_TASK_REWORKS = 2
    _DEFAULT_MAX_ORCHESTRATION_ITERATIONS = 20

    def __init__(
        self,
        repository: ProjectRepository,
        provisioner: ProjectWorkspaceProvisioner,
        agents: AgentBundle,
        dispatcher: AggregateDispatcher,
        docker_provider: DefaultDockerDeploymentProvider | None = None,
    ) -> None:
        self._repository = repository
        self._provisioner = provisioner
        self._agents = agents
        self._dispatcher = dispatcher
        self._docker_provider = docker_provider or DefaultDockerDeploymentProvider()

    async def create_project(self, project_input: ProjectInput) -> ProjectAggregate:
        project_id = f"prj_{uuid4().hex}"
        workspace = self._provisioner.provision(project_id)
        aggregate = ProjectAggregate(
            project_id=project_id,
            project_input=project_input,
            workspace=workspace,
        )
        await self._repository.create(aggregate)
        _emit_sync(project_id, "project.created", {"project_id": project_id})
        return aggregate

    async def run_autonomous(self, project_id: str) -> None:
        try:
            aggregate = await self._repository.get(project_id)
            project_input = aggregate.project_input
            
            _emit_sync(project_id, "agent.started", {"agent": "analysis"})
            analysis = await self._agents.analysis.analyze(
                AnalysisRequest(
                    project_description=project_input.project_description,
                    technology_stack=project_input.technology_stack,
                    project_id=project_id,
                )
            )
            try:
                workspace = self._provisioner.open(aggregate.workspace)
                workspace.create_file("planning/analysis.json", analysis.model_dump_json(indent=2))
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to persist analysis artifact: {e}")

            aggregate = AnalysisResultAdapter.attach(aggregate, analysis)
            await self._repository.update(aggregate)
            _emit_sync(project_id, "agent.completed", {"agent": "analysis"})

            _emit_sync(project_id, "agent.started", {"agent": "planning"})

            from pydantic import BaseModel
            async def write_planning_section(name: str, data: BaseModel):
                try:
                    workspace = self._provisioner.open(aggregate.workspace)
                    path = f"planning/{name}.json"
                    workspace.create_file(path, data.model_dump_json(indent=2))
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Failed to persist planning artifact {name}: {e}")

            planning = await self._agents.planning.plan(
                PlanningRequest(analysis_artifact=analysis, project_id=project_id),
                on_section_completed=write_planning_section
            )
            TaskGraphValidator.validate(planning, analysis)
            execution_state = self._agents.supervisor.initialize(planning, project_id=project_id)
            aggregate = PlanningResultAdapter.attach(aggregate, planning, execution_state)
            
            try:
                workspace = self._provisioner.open(aggregate.workspace)
                workspace.create_file("planning/project_plan.json", planning.model_dump_json(indent=2))
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to persist project_plan artifact: {e}")

            _emit_sync(project_id, "agent.completed", {"agent": "planning"})
            
            await self._repository.update(aggregate)
            
            aggregate = await self.run_until_blocked(project_id)
            
            if aggregate.lifecycle.stage == ProjectLifecycleStage.READY_FOR_DELIVERY:
                self._ingest_project_outcome(aggregate)
                await self.deploy_project(project_id)
                
            _emit_sync(project_id, "runtime.completed", {})
            
        except Exception as exc:
            import traceback
            traceback.print_exc()
            aggregate = await self._repository.get(project_id)
            failed = aggregate.model_copy(
                update={
                    "lifecycle": LifecycleMetadata(
                        stage=ProjectLifecycleStage.FAILED,
                        created_at=aggregate.lifecycle.created_at,
                        updated_at=datetime.now(timezone.utc),
                        errors=aggregate.lifecycle.errors + [str(exc)],
                    )
                }
            )
            await self._repository.update(failed)
            _emit_sync(project_id, "runtime.failed", {"error": str(exc)})

    async def execute_next_task(self, project_id: str) -> ProjectAggregate:
        aggregate = await self._repository.get(project_id)
        if aggregate.execution_state is None:
            raise InvalidProjectStateError("Project is not ready for task execution.")
        if aggregate.lifecycle.stage in {
            ProjectLifecycleStage.PAUSED,
            ProjectLifecycleStage.READY_FOR_DELIVERY,
            ProjectLifecycleStage.FAILED,
        }:
            raise InvalidProjectStateError(
                f"Project cannot start Coding while lifecycle stage is '{aggregate.lifecycle.stage.value}'."
            )
        blocking_gate = next(
            (
                gate
                for gate in aggregate.quality_gates
                if gate.status in {QualityGateStatus.PENDING, QualityGateStatus.BLOCKED}
            ),
            None,
        )
        if blocking_gate is not None:
            raise InvalidProjectStateError(
                f"Task '{blocking_gate.task_id}' has a {blocking_gate.status.value} QA gate: {blocking_gate.reason}"
            )
        state, decision = self._agents.supervisor.select_next_task(aggregate.execution_state)
        if decision.selected_task_id is None:
            refreshed = aggregate.model_copy(update={"execution_state": state})
            completed = self._with_completion_state(refreshed)
            if completed.lifecycle.stage == ProjectLifecycleStage.READY_FOR_DELIVERY:
                return await self._repository.update(completed)
            return await self._repository.update(
                self._pause(completed, "No dependency-eligible task exists; project is not ready for Delivery.")
            )
        selected = state.tasks[decision.selected_task_id]
        if selected.attempt_count >= self._MAX_TASK_ATTEMPTS:
            return await self._repository.update(
                self._pause(
                    aggregate.model_copy(update={"execution_state": state}),
                    f"Task '{decision.selected_task_id}' reached the attempt limit ({self._MAX_TASK_ATTEMPTS}).",
                )
            )
        if selected.rework_count >= self._MAX_TASK_REWORKS:
            return await self._repository.update(
                self._pause(
                    aggregate.model_copy(update={"execution_state": state}),
                    f"Task '{decision.selected_task_id}' reached the rework limit ({self._MAX_TASK_REWORKS}).",
                )
            )
        state, command = await self._agents.supervisor.begin_task(
            state,
            decision.selected_task_id,
            AgentName.CODING,
        )
        aggregate = aggregate.model_copy(
            update={
                "execution_state": state,
                "lifecycle": LifecycleMetadata(
                    stage=ProjectLifecycleStage.EXECUTING,
                    created_at=aggregate.lifecycle.created_at,
                    updated_at=datetime.now(timezone.utc),
                    errors=aggregate.lifecycle.errors,
                ),
            }
        )
        await self._repository.update(aggregate)
        _emit_sync(project_id, "task.started", {"task_id": decision.selected_task_id})
        try:
            outcome = await self._dispatcher.dispatch_outcome(aggregate, command)
            if outcome.execution_result.agent != AgentName.CODING:
                raise CompositionError("Coding lifecycle received a non-coding dispatch result.")
            updated = CodingResultAdapter.attach(aggregate, outcome.execution_result, self._agents.supervisor)
            _emit_sync(project_id, "task.completed", {"task_id": decision.selected_task_id})
            return await self._repository.update(updated)
        except Exception as exc:
            failed_result = command.model_copy(
                update={"agent": AgentName.CODING}
            )
            # Preserve controlled task state by returning the active task as a structured failure.
            from backend.agents.supervisor.models import AgentExecutionResult

            result = AgentExecutionResult(
                agent=AgentName.CODING,
                task_id=failed_result.task_id,
                status=AgentResultStatus.FAILED,
                attempt_number=failed_result.attempt_number,
                errors=[str(exc)],
                message="Composition dispatch failed before Coding Agent completion.",
            )
            state = self._agents.supervisor.apply_agent_result(aggregate.execution_state, result)
            failed = aggregate.model_copy(
                update={
                    "execution_state": state,
                    "generated_artifacts": state.generated_artifacts,
                    "lifecycle": LifecycleMetadata(
                        stage=ProjectLifecycleStage.READY_FOR_EXECUTION,
                        created_at=aggregate.lifecycle.created_at,
                        updated_at=datetime.now(timezone.utc),
                        errors=aggregate.lifecycle.errors + [str(exc)],
                    ),
                }
            )
            return await self._repository.update(failed)

    async def run_next_task(self, project_id: str) -> ProjectAggregate:
        """Execute exactly one Supervisor-selected Coding task and its mandatory QA gate."""

        after_coding = await self.execute_next_task(project_id)
        pending_gate = next(
            (gate for gate in after_coding.quality_gates if gate.status == QualityGateStatus.PENDING),
            None,
        )
        if pending_gate is None:
            if after_coding.execution_state and any(
                task.status == TaskExecutionStatus.FAILED
                for task in after_coding.execution_state.tasks.values()
            ):
                return await self._repository.update(
                    self._pause(after_coding, "Coding failed; bounded execution has stopped.")
                )
            return self._with_completion_state(after_coding)
        return await self.qa_task(project_id, pending_gate.task_id)

    async def run_until_blocked(
        self,
        project_id: str,
        *,
        max_iterations: int = _DEFAULT_MAX_ORCHESTRATION_ITERATIONS,
    ) -> ProjectAggregate:
        """Run bounded Coding -> QA iterations; never hides a pause, failure, or rework."""

        if not 1 <= max_iterations <= self._DEFAULT_MAX_ORCHESTRATION_ITERATIONS:
            raise InvalidProjectStateError(
                f"max_iterations must be between 1 and {self._DEFAULT_MAX_ORCHESTRATION_ITERATIONS}."
            )
        latest = await self._repository.get(project_id)
        for _ in range(max_iterations):
            latest = self._with_completion_state(latest)
            if latest.lifecycle.stage in {
                ProjectLifecycleStage.READY_FOR_DELIVERY,
                ProjectLifecycleStage.PAUSED,
                ProjectLifecycleStage.FAILED,
            }:
                return await self._repository.update(latest)
            if any(gate.status == QualityGateStatus.BLOCKED for gate in latest.quality_gates):
                return latest
            latest = await self.run_next_task(project_id)
            if any(gate.status == QualityGateStatus.BLOCKED for gate in latest.quality_gates):
                return latest
            if latest.execution_state:
                tasks = latest.execution_state.tasks.values()
                if any(t.status == TaskExecutionStatus.FAILED for t in tasks):
                    return await self._repository.update(
                        self._pause(latest, "Task execution cannot continue until the failed task is resolved.")
                    )
                
                # Check for deadlock (blocked tasks but nothing running/ready)
                has_blocked = any(t.status == TaskExecutionStatus.BLOCKED for t in tasks)
                has_active = any(t.status in {TaskExecutionStatus.READY, TaskExecutionStatus.IN_PROGRESS} for t in tasks)
                has_pending_qa = any(g.status in {QualityGateStatus.PENDING, QualityGateStatus.REWORK_REQUIRED} for g in latest.quality_gates)
                if has_blocked and not (has_active or has_pending_qa):
                    return await self._repository.update(
                        self._pause(latest, "Task execution is deadlocked: tasks are blocked and no tasks are active or ready.")
                    )

        return await self._repository.update(
            self._pause(latest, f"Orchestration reached its iteration limit ({max_iterations}).")
        )

    async def qa_task(self, project_id: str, task_id: str) -> ProjectAggregate:
        """Run the safe QA boundary for one successful Coding task and persist its policy outcome."""

        aggregate = await self._repository.get(project_id)
        if aggregate.execution_state is None:
            raise InvalidProjectStateError("Project is not ready for QA.")
        try:
            task_state = aggregate.execution_state.tasks[task_id]
        except KeyError as exc:
            raise InvalidProjectStateError(f"Unknown task ID: '{task_id}'.") from exc
        gate = next((item for item in aggregate.quality_gates if item.task_id == task_id), None)
        if task_state.status != TaskExecutionStatus.COMPLETED or gate is None or gate.status != QualityGateStatus.PENDING:
            raise InvalidProjectStateError("QA requires a completed Coding task with a pending QA gate.")
        command = AgentDispatchCommand(
            project_id=aggregate.project_id,
            task_id=task_id,
            agent=AgentName.QA,
            attempt_number=task_state.attempt_count,
            task=task_state.task,
            planning_artifact=aggregate.execution_state.planning_artifact,
            related_artifacts=task_state.generated_artifacts,
            rework_feedback=[
                feedback for feedback in aggregate.execution_state.qa_feedback if feedback.task_id == task_id
            ],
        )
        _emit_sync(project_id, "qa.started", {"task_id": task_id})
        try:
            outcome = await self._dispatcher.dispatch_outcome(aggregate, command)
            if outcome.qa_report is None:
                raise CompositionError("QA dispatch did not return a QAReport.")
            
            try:
                workspace = self._provisioner.open(aggregate.workspace)
                qa_report_path = f"qa/qa_report_{task_id}.json"
                if workspace.exists(qa_report_path):
                    current_hash = workspace.read_file(qa_report_path).content_hash
                    workspace.delete_file(qa_report_path, current_hash)
                workspace.create_file(qa_report_path, outcome.qa_report.model_dump_json(indent=2))
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to persist QA report: {e}")
                
            updated = QAResultAdapter.attach(aggregate, outcome.qa_report, task_id, self._agents.supervisor)
            if outcome.qa_report.verdict in {QAVerdict.BLOCKED, QAVerdict.FAIL}:
                _emit_sync(project_id, "qa.failed", {"task_id": task_id, "verdict": outcome.qa_report.verdict.value})
                updated = self._pause(updated, f"QA for task '{task_id}' returned {outcome.qa_report.verdict.value}.")
            else:
                _emit_sync(project_id, "qa.completed", {"task_id": task_id})
                updated = self._with_completion_state(updated)
            return await self._repository.update(updated)
        except Exception as exc:
            failed = aggregate.model_copy(
                update={
                    "lifecycle": LifecycleMetadata(
                        stage=ProjectLifecycleStage.READY_FOR_EXECUTION,
                        created_at=aggregate.lifecycle.created_at,
                        updated_at=datetime.now(timezone.utc),
                        errors=aggregate.lifecycle.errors + [f"QA task {task_id} failed: {exc}"],
                    )
                }
            )
            return await self._repository.update(failed)

    async def get_project(self, project_id: str) -> ProjectAggregate:
        """Retrieve the observable, resumable aggregate state."""

        return await self._repository.get(project_id)

    @staticmethod
    def _with_completion_state(aggregate: ProjectAggregate) -> ProjectAggregate:
        """Only expose Delivery readiness after every planned task and QA gate is complete."""

        if aggregate.execution_state is None:
            return aggregate
        task_ids = set(aggregate.execution_state.tasks)
        passed_gate_ids = {
            gate.task_id for gate in aggregate.quality_gates if gate.status == QualityGateStatus.PASSED
        }
        all_tasks_completed = bool(task_ids) and all(
            task.status == TaskExecutionStatus.COMPLETED
            for task in aggregate.execution_state.tasks.values()
        )
        if all_tasks_completed and passed_gate_ids == task_ids:
            return aggregate.model_copy(
                update={
                    "lifecycle": LifecycleMetadata(
                        stage=ProjectLifecycleStage.READY_FOR_DELIVERY,
                        created_at=aggregate.lifecycle.created_at,
                        updated_at=datetime.now(timezone.utc),
                        errors=aggregate.lifecycle.errors,
                    )
                }
            )
        return aggregate

    @staticmethod
    def _pause(aggregate: ProjectAggregate, reason: str) -> ProjectAggregate:
        return aggregate.model_copy(
            update={
                "lifecycle": LifecycleMetadata(
                    stage=ProjectLifecycleStage.PAUSED,
                    created_at=aggregate.lifecycle.created_at,
                    updated_at=datetime.now(timezone.utc),
                    errors=aggregate.lifecycle.errors + [reason],
                )
            }
        )

    async def record_qa_report(
        self,
        project_id: str,
        task_id: str,
        report: QAReport,
    ) -> ProjectAggregate:
        """Persist a QA boundary result after an externally controlled QA dispatch."""

        aggregate = await self._repository.get(project_id)
        updated = QAResultAdapter.attach(aggregate, report, task_id, self._agents.supervisor)
        if report.verdict in {QAVerdict.BLOCKED, QAVerdict.FAIL}:
            updated = self._pause(updated, f"QA for task '{task_id}' returned {report.verdict.value}.")
        else:
            updated = self._with_completion_state(updated)
        return await self._repository.update(updated)

    async def record_delivery_result(
        self,
        project_id: str,
        result: DeliveryResult,
    ) -> ProjectAggregate:
        """Persist a Delivery boundary result after a controlled provider dispatch."""

        aggregate = await self._repository.get(project_id)
        return await self._repository.update(
            DeliveryResultAdapter.attach(aggregate, result, self._agents.supervisor)
        )

    async def deploy_project(self, project_id: str) -> ProjectAggregate:
        """Deploy a project via the Delivery Agent and Docker provider."""
        aggregate = await self._repository.get(project_id)
        
        if aggregate.lifecycle.stage != ProjectLifecycleStage.READY_FOR_DELIVERY:
            raise InvalidProjectStateError(f"Project cannot deploy from stage '{aggregate.lifecycle.stage.value}'.")
            
        task_id = "deploy_main"
        
        # Build basic DockerDeliveryConfiguration. The Planning/Analysis should ideally inform this,
        # but for this milestone we deploy a generic single-container fallback if complex services aren't specified.
        # This matches the "fallback/default" behavior expected when explicit compose isn't there.
        # NOTE: A real implementation would parse the architecture from planning.
        docker_config = DockerDeploymentConfiguration(
            services=[
                DockerServiceConfiguration(
                    service_name="app",
                    build_context=".",
                    dockerfile=DockerfileSpecification(
                        path="Dockerfile",
                        runtime=ContainerRuntime.GENERIC,
                        base_image="python:3.11-slim",
                        startup_command=["python", "app.py"],
                        content="FROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nCMD [\"python\", \"app.py\"]"
                    )
                )
            ]
        )
        
        from backend.agents.planning.models import ImplementationTask
        dummy_task = ImplementationTask(
            task_id=task_id,
            title="Deploy Project",
            description="Deployment orchestration.",
            task_type="backend",
            priority="must",
            status="planned"
        )
        
        command = AgentDispatchCommand(
            project_id=project_id,
            task_id=task_id,
            agent=AgentName.DELIVERY,
            attempt_number=1,
            task=dummy_task,
            planning_artifact=aggregate.planning_artifact,
            related_artifacts=[],
            rework_feedback=[],
        )
        
        delivery_request = DeliveryRequest(
            project_id=project_id,
            dispatch_command=command,
            analysis_artifact=aggregate.analysis_artifact,
            planning_artifact=aggregate.planning_artifact,
            project_state=aggregate.execution_state,
            qa_report=aggregate.qa_reports[-1] if aggregate.qa_reports else QAReport(project_id=project_id, task_id="none", summary="", verdict=QAVerdict.PASS),
            generated_artifacts=aggregate.generated_artifacts,
            target=DeploymentTarget.DOCKER,
            docker=docker_config,
        )

        delivery_workspace = self._provisioner.open(aggregate.workspace)
        
        _emit_sync(project_id, "delivery.started", {})
        prepared_result = await self._agents.delivery.prepare(delivery_request, delivery_workspace)
        
        if prepared_result.delivery_status != "prepared":
            return await self.record_delivery_result(project_id, prepared_result)
            
        _emit_sync(project_id, "docker.started", {})
        try:
            provider_result = await self._docker_provider.deploy(delivery_request)
        except Exception as exc:
            final_result = DeliveryResult(
                agent=AgentName.DELIVERY,
                task_id=task_id,
                status=AgentResultStatus.FAILED,
                attempt_number=1,
                delivery_status=DeliveryStatus.FAILED,
                target=DeploymentTarget.DOCKER,
                errors=[str(exc)],
                message="Docker deployment failed due to an exception."
            )
            _emit_sync(project_id, "docker.failed", {"error": str(exc)})
            return await self.record_delivery_result(project_id, final_result)
        
        # Adapt DeploymentProviderResult into a DeliveryResult
        final_result = DeliveryResult(
            agent=AgentName.DELIVERY,
            task_id=task_id,
            status=AgentResultStatus.SUCCEEDED if provider_result.status == "deployed" else AgentResultStatus.FAILED,
            attempt_number=1,
            delivery_status=provider_result.status,
            target=DeploymentTarget.DOCKER,
            deployment_id=provider_result.deployment_id,
            image_references=provider_result.image_references,
            service_references=provider_result.service_references,
            project_url=provider_result.project_url,
            logs=provider_result.logs,
            errors=provider_result.errors,
            message="Docker deployment complete." if provider_result.status == "deployed" else "Docker deployment failed."
        )
        
        if provider_result.status == "deployed":
            _emit_sync(project_id, "docker.healthy", {"url": str(provider_result.project_url)})
        
        return await self.record_delivery_result(project_id, final_result)

    async def rollback_project(self, project_id: str) -> ProjectAggregate:
        aggregate = await self._repository.get(project_id)
        if not aggregate.delivery_result or aggregate.delivery_result.delivery_status != "deployed":
            raise InvalidProjectStateError("Cannot rollback a project that is not deployed.")
            
        provider_result = await self._docker_provider.rollback(aggregate.delivery_result.deployment_id or project_id)
        
        final_result = aggregate.delivery_result.model_copy(
            update={
                "delivery_status": provider_result.status,
                "project_url": None,
                "message": "Deployment rolled back."
            }
        )
        return await self.record_delivery_result(project_id, final_result)

    def _ingest_project_outcome(self, aggregate: ProjectAggregate) -> None:
        """Extract and store validated knowledge from a completed project."""
        return # Temporarily bypass to avoid ChromaDB hnswlib segfaults on Windows
        manager = get_memory_manager()
        
        if not aggregate.analysis_artifact or not aggregate.planning_artifact:
            return
            
        domain = aggregate.analysis_artifact.result.domain.primary_domain
        tech_stack = [tc.technology for tc in aggregate.analysis_artifact.result.technology_constraints]
        
        _emit_sync(aggregate.project_id, "memory.ingestion.started", {"domain": domain})
        
        # Ingest Architecture Pattern
        arch = aggregate.planning_artifact.result.architecture
        arch_record = MemoryRecord(
            memory_id=f"arch_{aggregate.project_id}",
            memory_type=MemoryType.ARCHITECTURE_PATTERN,
            title=f"Architecture pattern for {domain}",
            content=f"Design style: {arch.style}. Component details: {arch.components}",
            domain=domain,
            technology_stack=tech_stack,
            source_project_id=aggregate.project_id,
            source_agent="planning",
            created_at=time.time(),
        )
        manager.store(arch_record)
        
        # Ingest Project Outcome
        outcome_record = MemoryRecord(
            memory_id=f"outcome_{aggregate.project_id}",
            memory_type=MemoryType.PROJECT_OUTCOME,
            title=f"Successful delivery of {domain}",
            content=aggregate.analysis_artifact.result.project_summary,
            domain=domain,
            technology_stack=tech_stack,
            source_project_id=aggregate.project_id,
            source_agent="supervisor",
            created_at=time.time(),
        )
        manager.store(outcome_record)
        
        _emit_sync(aggregate.project_id, "memory.ingestion.completed", {"count": 2})
