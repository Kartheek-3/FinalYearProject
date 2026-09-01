"""Explicit Delivery Agent failure types."""


class DeliveryError(Exception):
    """Base error for Delivery Agent preparation and provider operations."""


class QAGateError(DeliveryError):
    """Raised when delivery is requested without a passing QA report."""


class DeploymentValidationError(DeliveryError):
    """Raised when deterministic deployment validation fails."""


class DeploymentProviderError(DeliveryError):
    """Raised when a future controlled deployment provider fails."""
