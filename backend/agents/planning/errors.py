"""Explicit failure modes for the Planning & Design Agent."""


class PlanningAgentError(Exception):
    """Base exception for Planning & Design Agent execution failures."""


class PlanningConfigurationError(PlanningAgentError):
    """Raised when Planning & Design configuration is invalid."""


class PlanningProviderError(PlanningAgentError):
    """Raised when the configured LLM cannot produce a planning response."""


class PlanningResponseValidationError(PlanningAgentError):
    """Raised when an LLM response violates the planning output schema."""


class PlanningCompletenessError(PlanningAgentError):
    """Raised when a valid plan is incomplete against its source analysis."""


class PlanningKnowledgeRetrievalError(PlanningAgentError):
    """Raised when explicitly configured planning knowledge retrieval fails."""
