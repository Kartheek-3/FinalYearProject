"""Explicit errors for deterministic orchestration operations."""


class SupervisorError(Exception):
    """Base exception for Supervisor / Orchestrator failures."""


class StateInitializationError(SupervisorError):
    """Raised when a PlanningArtifact cannot initialize execution state."""


class InvalidStateTransitionError(SupervisorError):
    """Raised when a controlled task transition is not allowed."""


class UnknownTaskError(SupervisorError):
    """Raised when a task ID does not belong to the execution state."""


class InvalidAgentResultError(SupervisorError):
    """Raised when an agent result cannot be applied to workflow state."""
