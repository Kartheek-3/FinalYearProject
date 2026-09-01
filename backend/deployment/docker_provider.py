import asyncio
import os
import re
import time
from pathlib import Path

import docker
import requests
from docker.errors import APIError, BuildError

from backend.agents.delivery.models import (
    DeliveryRequest,
    DeliveryStatus,
    DeploymentProviderResult,
    DeploymentTarget,
)
from backend.agents.delivery.provider import DockerDeploymentProvider
from backend.deployment.errors import DeploymentError, DockerSecurityError
from backend.deployment.port_allocator import PortAllocator


class DefaultDockerDeploymentProvider(DockerDeploymentProvider):
    """Provides secure, isolated Docker build and run boundaries."""

    target: DeploymentTarget = DeploymentTarget.DOCKER

    def __init__(self, port_allocator: PortAllocator | None = None) -> None:
        self._client_cache = None
        self._client_error = None
        try:
            self._client_cache = docker.from_env()
        except Exception as e:
            self._client_error = f"Failed to connect to Docker daemon: {e}"
            
        self._port_allocator = port_allocator or PortAllocator(
            port_min=int(os.getenv("SEAM_DOCKER_PORT_MIN", "10000")),
            port_max=int(os.getenv("SEAM_DOCKER_PORT_MAX", "20000")),
        )
        self._build_timeout = int(os.getenv("SEAM_DOCKER_BUILD_TIMEOUT", "300"))
        self._health_timeout = int(os.getenv("SEAM_DOCKER_HEALTH_TIMEOUT", "30"))
        self._health_interval = int(os.getenv("SEAM_DOCKER_HEALTH_INTERVAL", "1"))
        self._memory_limit = os.getenv("SEAM_DOCKER_MEMORY_LIMIT", "512m")
        self._nano_cpus = int(os.getenv("SEAM_DOCKER_NANO_CPUS", "1000000000"))

    @property
    def _client(self):
        if not self._client_cache:
            raise DeploymentError(self._client_error)
        return self._client_cache

    async def deploy(self, request: DeliveryRequest) -> DeploymentProviderResult:
        return await asyncio.to_thread(self._deploy_sync, request)

    async def rollback(self, deployment_id: str) -> DeploymentProviderResult:
        return await asyncio.to_thread(self._rollback_sync, deployment_id)

    def _sanitize_project_id(self, project_id: str) -> str:
        return re.sub(r'[^a-zA-Z0-9_.-]', '', project_id).lower()

    def _validate_context(self, project_id: str) -> str:
        workspace_dir = Path("generated_projects") / project_id
        absolute_context = workspace_dir.resolve()
        
        # Verify it doesn't escape generated_projects
        expected_base = Path("generated_projects").resolve()
        if expected_base not in absolute_context.parents and absolute_context != expected_base:
            raise DockerSecurityError("Docker build context escapes generated_projects boundary.")
            
        return str(absolute_context)

    def _deploy_sync(self, request: DeliveryRequest) -> DeploymentProviderResult:
        project_id = request.project_id
        safe_name = self._sanitize_project_id(project_id)
        container_name = f"seam_{safe_name}"
        image_name = f"seam/{safe_name}:latest"
        
        try:
            absolute_context = self._validate_context(project_id)
        except DockerSecurityError as e:
            return DeploymentProviderResult(
                status=DeliveryStatus.FAILED,
                errors=[str(e)],
            )

        # Idempotency: cleanup existing container
        self._cleanup_container(container_name)

        allocated_port = None
        try:
            allocated_port = self._port_allocator.allocate()

            # Build Image
            try:
                self._client.images.build(
                    path=absolute_context,
                    tag=image_name,
                    rm=True,
                    timeout=self._build_timeout,
                )
            except BuildError as e:
                self._port_allocator.release(allocated_port)
                logs = [line.get("stream", "").strip() for line in e.build_log if "stream" in line]
                return DeploymentProviderResult(
                    status=DeliveryStatus.FAILED,
                    errors=[f"Docker build failed: {e.msg}"],
                    logs=logs[-50:],  # Bound logs
                )

            # Extract exposed port requirement from config (default to 8000 if not specified, or just map what they provide)
            container_port = 8000
            for service in request.docker.services:
                if service.ports:
                    container_port = service.ports[0].container_port
                    break

            # Run Container
            container = self._client.containers.run(
                image=image_name,
                name=container_name,
                detach=True,
                ports={f"{container_port}/tcp": allocated_port},
                mem_limit=self._memory_limit,
                nano_cpus=self._nano_cpus,
                cap_drop=["ALL"],
                security_opt=["no-new-privileges:true"],
                network_mode="bridge",
                privileged=False,
            )

            # Health Check
            url = f"http://localhost:{allocated_port}"
            if not self._verify_health(url):
                logs = container.logs().decode("utf-8").splitlines()
                self._cleanup_container(container_name)
                self._port_allocator.release(allocated_port)
                return DeploymentProviderResult(
                    status=DeliveryStatus.FAILED,
                    errors=["Container health check failed or timed out."],
                    logs=logs[-50:],
                )

            return DeploymentProviderResult(
                status=DeliveryStatus.DEPLOYED,
                deployment_id=project_id,
                image_references=[image_name],
                service_references=[container_name],
                project_url=url,
                metadata={"host_port": str(allocated_port)}
            )

        except Exception as e:
            if allocated_port:
                self._port_allocator.release(allocated_port)
            self._cleanup_container(container_name)
            return DeploymentProviderResult(
                status=DeliveryStatus.FAILED,
                errors=[f"Deployment unexpected error: {str(e)}"],
            )

    def _rollback_sync(self, deployment_id: str) -> DeploymentProviderResult:
        safe_name = self._sanitize_project_id(deployment_id)
        container_name = f"seam_{safe_name}"
        
        self._cleanup_container(container_name)
        
        # Need to release the port. Since the allocator is currently in-memory and stateful,
        # we'd ideally read the port from metadata. We'll skip port releasing in this minimal rollback
        # or require metadata. For now, stopping the container frees the OS port, but the allocator 
        # keeps it reserved until restarted. 

        return DeploymentProviderResult(
            status=DeliveryStatus.PREPARED,
            deployment_id=deployment_id,
        )

    def _cleanup_container(self, container_name: str) -> None:
        try:
            container = self._client.containers.get(container_name)
            container.stop(timeout=5)
            container.remove(force=True)
        except docker.errors.NotFound:
            pass
        except APIError:
            pass

    def _verify_health(self, url: str) -> bool:
        start = time.time()
        while time.time() - start < self._health_timeout:
            try:
                response = requests.get(url, timeout=2)
                if response.status_code < 500:
                    return True
            except requests.RequestException:
                pass
            time.sleep(self._health_interval)
        return False
