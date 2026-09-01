"""Errors for the deployment module."""

class DeploymentError(Exception):
    """Base exception for all deployment-related errors."""


class PortAllocationError(DeploymentError):
    """Raised when an unused port cannot be allocated."""


class DockerSecurityError(DeploymentError):
    """Raised when a deployment request violates strict security constraints."""
