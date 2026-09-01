"""Explicit failures for Coding Agent proposal, validation, and workspace stages."""


class CodingAgentError(Exception):
    """Base error for Coding Agent operations."""


class CodingConfigurationError(CodingAgentError):
    """Raised when Coding Agent configuration is invalid."""


class CodingRequestError(CodingAgentError):
    """Raised when a structured coding request is inconsistent or incomplete."""


class CodingProviderError(CodingAgentError):
    """Raised when the configured LLM cannot return a usable proposal."""


class CodingResponseValidationError(CodingAgentError):
    """Raised when an LLM response does not satisfy the proposal contract."""


class ChangeValidationError(CodingAgentError):
    """Raised when a proposed change violates deterministic safety rules."""


class WorkspaceUnavailableError(CodingAgentError):
    """Raised when an explicitly supplied generated-project workspace is unavailable."""


class UnsafeWorkspacePathError(CodingAgentError):
    """Raised when a path is absolute, traverses upward, or escapes the workspace."""


class WorkspaceOperationError(CodingAgentError):
    """Raised when a validated file operation cannot be completed."""
