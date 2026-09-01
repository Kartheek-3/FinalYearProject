"""Deterministic Docker configuration and workspace validation."""

from __future__ import annotations

import re

from backend.agents.delivery.errors import DeploymentValidationError, QAGateError
from backend.agents.delivery.models import (
    ContainerRuntime,
    DeliveryRequest,
    DeploymentTarget,
)
from backend.agents.delivery.workspace import DeliveryWorkspace
from backend.agents.qa.models import QAVerdict


class DeliveryValidator:
    """Validates the QA gate and safe Docker preparation prerequisites without Docker."""

    _PARENT_COPY = re.compile(r"^\s*(?:COPY|ADD)\s+\.\.", re.IGNORECASE | re.MULTILINE)
    _EMBEDDED_SECRET = re.compile(
        r"^\s*(?:ENV|ARG)\s+[^\n]*(?:SECRET|TOKEN|PASSWORD|API_KEY)\s*=\s*[^$\s][^\s]*",
        re.IGNORECASE | re.MULTILINE,
    )

    @classmethod
    def validate(cls, request: DeliveryRequest, workspace: DeliveryWorkspace) -> None:
        if request.qa_report.verdict != QAVerdict.PASS:
            raise QAGateError(
                f"Delivery requires QA pass; received '{request.qa_report.verdict.value}'."
            )
        if request.target != DeploymentTarget.DOCKER:
            raise DeploymentValidationError(
                f"Deployment target '{request.target.value}' is not implemented in this phase."
            )
        cls._validate_generated_artifacts(request, workspace)
        cls._validate_services(request, workspace)
        cls._validate_compose(request, workspace)

    @staticmethod
    def _validate_generated_artifacts(request: DeliveryRequest, workspace: DeliveryWorkspace) -> None:
        for artifact in request.generated_artifacts:
            if artifact.artifact_type == "generated_source_file" and not workspace.exists(artifact.location):
                raise DeploymentValidationError(
                    f"Declared generated source artifact is missing: '{artifact.location}'."
                )

    @classmethod
    def _validate_services(cls, request: DeliveryRequest, workspace: DeliveryWorkspace) -> None:
        technology = " ".join(
            choice.technology.casefold()
            for choice in request.planning_artifact.result.architecture.technology_choices
        )
        for service in request.docker.services:
            if not workspace.directory_exists(service.build_context):
                raise DeploymentValidationError(
                    f"Docker build context does not exist: '{service.build_context}'."
                )
            cls._validate_runtime_alignment(service.dockerfile.runtime, technology)
            cls._validate_dockerfile(service.dockerfile.path, service.dockerfile.content, workspace)
            names = [reference.name for reference in service.environment]
            if len(names) != len(set(names)):
                raise DeploymentValidationError(
                    f"Service '{service.service_name}' declares duplicate environment references."
                )

    @staticmethod
    def _validate_runtime_alignment(runtime: ContainerRuntime, technology: str) -> None:
        matches = {
            ContainerRuntime.PYTHON: ("python", "fastapi", "django"),
            ContainerRuntime.NODE: ("node", "react", "typescript", "javascript", "vite"),
            ContainerRuntime.GENERIC: (),
        }
        if matches[runtime] and not any(value in technology for value in matches[runtime]):
            raise DeploymentValidationError(
                f"Docker runtime '{runtime.value}' is not supported by the approved technology choices."
            )

    @classmethod
    def _validate_dockerfile(
        cls,
        path: str,
        supplied_content: str | None,
        workspace: DeliveryWorkspace,
    ) -> None:
        if not workspace.exists(path) and supplied_content is None:
            raise DeploymentValidationError(f"Dockerfile is missing and no content was supplied: '{path}'.")
        content = supplied_content if supplied_content is not None else workspace.read_file(path).content
        if cls._PARENT_COPY.search(content):
            raise DeploymentValidationError("Dockerfile contains a parent-directory COPY or ADD instruction.")
        if cls._EMBEDDED_SECRET.search(content):
            raise DeploymentValidationError("Dockerfile appears to embed a secret value.")

    @staticmethod
    def _validate_compose(request: DeliveryRequest, workspace: DeliveryWorkspace) -> None:
        compose = request.docker.compose
        if compose is None:
            return
        if not workspace.exists(compose.path) and compose.content is None:
            raise DeploymentValidationError(
                f"Compose configuration is missing and no content was supplied: '{compose.path}'."
            )
        content = compose.content if compose.content is not None else workspace.read_file(compose.path).content
        if ".." in content or re.search(r"(?:^|\s)-\s*/[^\s:]+:", content):
            raise DeploymentValidationError("Compose configuration has an unsafe volume/path reference.")
