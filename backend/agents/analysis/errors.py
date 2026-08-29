"""Explicit failure modes for the Analysis Agent."""


class AnalysisAgentError(Exception):
    """Base exception for Analysis Agent execution failures."""


class AnalysisConfigurationError(AnalysisAgentError):
    """Raised when Analysis Agent configuration is invalid."""


class AnalysisProviderError(AnalysisAgentError):
    """Raised when the configured LLM cannot produce a response."""


class AnalysisResponseValidationError(AnalysisAgentError):
    """Raised when an LLM response cannot satisfy the output contract."""


class AnalysisKnowledgeRetrievalError(AnalysisAgentError):
    """Raised when an explicitly configured knowledge lookup fails."""
