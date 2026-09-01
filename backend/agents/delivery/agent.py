"""QA-gated delivery preparation; actual build/deploy is intentionally deferred."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from backend.agents.delivery.errors import DeliveryError
from backend.agents.delivery.models import (
    DeliveryRequest,
    DeliveryResult,
    DeliveryStatus,
)
from backend.agents.delivery.validator import DeliveryValidator
from backend.agents.delivery.workspace import DeliveryWorkspace
from backend.agents.supervisor.models import AgentName, AgentResultStatus, ArtifactReference


@dataclass(slots=True)
class DeliveryAgent:
    """Prepares a QA-approved generated product without invoking Docker itself."""

    def prepare(self, request: DeliveryRequest, workspace: DeliveryWorkspace) -> DeliveryResult:
        started_at = datetime.now(timezone.utc)
        command = request.dispatch_command
        try:
            DeliveryValidator.validate(request, workspace)
            artifacts = self._create_declared_deployment_files(request, workspace)
            return DeliveryResult(
                agent=AgentName.DELIVERY,
                task_id=command.task_id,
                status=AgentResultStatus.SUCCEEDED,
                attempt_number=command.attempt_number,
                started_at=started_at,
                delivery_status=DeliveryStatus.PREPARED,
                target=request.target,
                exposed_ports=[port for service in request.docker.services for port in service.ports],
                deployment_artifacts=artifacts,
                produced_artifacts=artifacts,
                message="Docker delivery configuration prepared; controlled build/deployment is deferred.",
                metadata={"provider": "docker", "execution": "not_started"},
            )
        except DeliveryError as exc:
            return DeliveryResult(
                agent=AgentName.DELIVERY,
                task_id=command.task_id,
                status=AgentResultStatus.FAILED,
                attempt_number=command.attempt_number,
                started_at=started_at,
                delivery_status=DeliveryStatus.BLOCKED,
                target=request.target,
                errors=[str(exc)],
                message="Delivery preparation was blocked; no deployment was attempted.",
                metadata={"execution": "not_started"},
            )

    @staticmethod
    def _create_declared_deployment_files(
        request: DeliveryRequest,
        workspace: DeliveryWorkspace,
    ) -> list[ArtifactReference]:
        artifacts: list[ArtifactReference] = []
        for index, service in enumerate(request.docker.services, start=1):
            dockerfile = service.dockerfile
            if dockerfile.content is not None and not workspace.exists(dockerfile.path):
                workspace.create_file(dockerfile.path, dockerfile.content)
            if workspace.exists(dockerfile.path):
                artifacts.append(
                    ArtifactReference(
                        artifact_id=f"delivery_docker_{index}_{service.service_name[:35]}",
                        artifact_type="dockerfile",
                        location=dockerfile.path,
                        producer=AgentName.DELIVERY,
                        task_id=request.dispatch_command.task_id,
                    )
                )
        compose = request.docker.compose
        if compose is not None:
            if compose.content is not None and not workspace.exists(compose.path):
                workspace.create_file(compose.path, compose.content)
            if workspace.exists(compose.path):
                artifacts.append(
                    ArtifactReference(
                        artifact_id=f"delivery_compose_{request.dispatch_command.task_id[:42]}",
                        artifact_type="docker_compose",
                        location=compose.path,
                        producer=AgentName.DELIVERY,
                        task_id=request.dispatch_command.task_id,
                    )
                )
        return artifacts
