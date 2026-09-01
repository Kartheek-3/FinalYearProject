"""Explicit integration-layer failures; agent contracts remain unchanged."""


class CompositionError(Exception):
    """Base integration-layer exception."""


class ProjectNotFoundError(CompositionError):
    """Raised when a project aggregate is unavailable."""


class DuplicateProjectError(CompositionError):
    """Raised when an in-memory project ID already exists."""


class InvalidProjectStateError(CompositionError):
    """Raised when a lifecycle action is attempted at the wrong stage."""


class DependencyCycleError(CompositionError):
    """Raised when Planning produces a cyclic implementation-task graph."""


class InvalidPlanReferenceError(CompositionError):
    """Raised when Planning references requirements or criteria outside Analysis."""


class ExecutionSafetyLimitError(CompositionError):
    """Raised internally when bounded orchestration reaches a declared safety limit."""


class DispatcherError(CompositionError):
    """Raised when a dispatched agent cannot be composed from aggregate context."""


class LLMProviderUnavailableError(CompositionError):
    """Raised when no provider-neutral client has been configured for a model."""
