"""Typed QA-gated delivery and deployment contracts."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import AnyHttpUrl, Field, model_validator

from backend.agents.analysis.models import AnalysisArtifact, Identifier, NonEmptyText
from backend.agents.planning.models import PlanningArtifact
from backend.agents.qa.models import QAReport, QAVerdict
from backend.agents.supervisor.models import (
    AgentDispatchCommand,
    AgentExecutionResult,
    AgentName,
    ArtifactReference,
    ProjectExecutionState,
    SupervisorModel,
)


class DeploymentTarget(StrEnum):
    DOCKER = "docker"
    AWS = "aws"
    GCP = "gcp"
    AZURE = "azure"


class DeliveryStatus(StrEnum):
    NOT_READY = "not_ready"
    READY = "ready"
    PREPARING = "preparing"
    PREPARED = "prepared"
    BUILDING = "building"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"
    FAILED = "failed"
    BLOCKED = "blocked"


class ContainerRuntime(StrEnum):
    PYTHON = "python"
    NODE = "node"
    GENERIC = "generic"


class NetworkProtocol(StrEnum):
    TCP = "tcp"
    UDP = "udp"


class EnvironmentVariableReference(SupervisorModel):
    name: str = Field(pattern=r"^[A-Z][A-Z0-9_]{0,127}$")
    required: bool = True
    secret: bool = False
    description: NonEmptyText


class PortMapping(SupervisorModel):
    service_name: Identifier
    container_port: int = Field(ge=1, le=65535)
    host_port: int | None = Field(default=None, ge=1, le=65535)
    protocol: NetworkProtocol = NetworkProtocol.TCP


class DockerfileSpecification(SupervisorModel):
    path: NonEmptyText
    runtime: ContainerRuntime
    base_image: NonEmptyText
    startup_command: list[NonEmptyText] = Field(min_length=1)
    content: str | None = None


class DockerServiceConfiguration(SupervisorModel):
    service_name: Identifier
    build_context: NonEmptyText
    dockerfile: DockerfileSpecification
    ports: list[PortMapping] = Field(default_factory=list)
    environment: list[EnvironmentVariableReference] = Field(default_factory=list)
    depends_on: list[Identifier] = Field(default_factory=list)
    image_reference: NonEmptyText | None = None

    @model_validator(mode="after")
    def validate_ports_belong_to_service(self) -> "DockerServiceConfiguration":
        if any(port.service_name != self.service_name for port in self.ports):
            raise ValueError("Each port mapping must name its enclosing Docker service.")
        return self


class ComposeSpecification(SupervisorModel):
    path: NonEmptyText
    content: str | None = None


class DockerDeploymentConfiguration(SupervisorModel):
    services: list[DockerServiceConfiguration] = Field(min_length=1)
    compose: ComposeSpecification | None = None

    @model_validator(mode="after")
    def validate_service_graph_and_ports(self) -> "DockerDeploymentConfiguration":
        service_names = {service.service_name for service in self.services}
        if len(service_names) != len(self.services):
            raise ValueError("Docker service names must be unique.")
        host_ports: set[tuple[int, NetworkProtocol]] = set()
        for service in self.services:
            if service.service_name in service.depends_on:
                raise ValueError("A Docker service cannot depend on itself.")
            if not set(service.depends_on) <= service_names:
                raise ValueError("A Docker service depends on an unknown service.")
            for port in service.ports:
                if port.host_port is not None:
                    key = (port.host_port, port.protocol)
                    if key in host_ports:
                        raise ValueError("Host port/protocol mappings must be unique.")
                    host_ports.add(key)
        if len(self.services) > 1 and self.compose is None:
            raise ValueError("Multi-service Docker delivery requires a compose specification.")
        return self


class DeliveryRequest(SupervisorModel):
    project_id: NonEmptyText
    dispatch_command: AgentDispatchCommand
    analysis_artifact: AnalysisArtifact
    planning_artifact: PlanningArtifact
    project_state: ProjectExecutionState
    qa_report: QAReport
    generated_artifacts: list[ArtifactReference] = Field(default_factory=list)
    target: DeploymentTarget
    docker: DockerDeploymentConfiguration

    @model_validator(mode="after")
    def validate_delivery_context(self) -> "DeliveryRequest":
        if self.dispatch_command.agent != AgentName.DELIVERY:
            raise ValueError("DeliveryRequest requires a Supervisor command for the delivery agent.")
        if self.dispatch_command.project_id != self.project_id:
            raise ValueError("Delivery command project ID does not match DeliveryRequest.")
        if self.project_state.project_id != self.project_id:
            raise ValueError("Project execution state does not match DeliveryRequest project ID.")
        if self.qa_report.project_id != self.project_id:
            raise ValueError("QA report project ID does not match DeliveryRequest.")
        if self.planning_artifact.project_id and self.planning_artifact.project_id != self.project_id:
            raise ValueError("Planning artifact project ID does not match DeliveryRequest.")
        return self


class DeploymentProviderResult(SupervisorModel):
    status: DeliveryStatus
    deployment_id: NonEmptyText | None = None
    image_references: list[NonEmptyText] = Field(default_factory=list)
    service_references: list[NonEmptyText] = Field(default_factory=list)
    project_url: AnyHttpUrl | None = None
    logs: list[NonEmptyText] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)
    errors: list[NonEmptyText] = Field(default_factory=list)


class DeliveryResult(AgentExecutionResult):
    """Supervisor-compatible delivery status, including a provider-supplied project URL."""

    delivery_status: DeliveryStatus
    target: DeploymentTarget
    deployment_id: NonEmptyText | None = None
    image_references: list[NonEmptyText] = Field(default_factory=list)
    service_references: list[NonEmptyText] = Field(default_factory=list)
    project_url: AnyHttpUrl | None = None
    exposed_ports: list[PortMapping] = Field(default_factory=list)
    deployment_artifacts: list[ArtifactReference] = Field(default_factory=list)
    logs: list[NonEmptyText] = Field(default_factory=list)
    warnings: list[NonEmptyText] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
