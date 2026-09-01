"""Provider-neutral controlled deployment and rollback contracts."""

from __future__ import annotations

from typing import Protocol

from backend.agents.delivery.models import (
    DeliveryRequest,
    DeploymentProviderResult,
    DeploymentTarget,
)


class ControlledDeploymentEnvironment(Protocol):
    """Future safe runtime boundary for builds and deployments."""

    async def execute_deployment(self, request: DeliveryRequest) -> DeploymentProviderResult:
        """Execute a prevalidated deployment in a controlled environment."""


class DeploymentProvider(Protocol):
    """A target adapter; future cloud targets implement this protocol unchanged."""

    target: DeploymentTarget

    async def deploy(self, request: DeliveryRequest) -> DeploymentProviderResult:
        """Build/deploy a prepared project and return provider metadata."""

    async def rollback(self, deployment_id: str) -> DeploymentProviderResult:
        """Attempt a controlled rollback for a known deployment reference."""


class DockerDeploymentProvider(DeploymentProvider, Protocol):
    """Docker-target contract only; no Docker CLI implementation is included yet."""

    target: DeploymentTarget
