"""Explicit QA Agent failures."""


class QAAgentError(Exception):
    """Base error for QA operations."""


class QAConfigurationError(QAAgentError):
    """Raised when optional QA review configuration is invalid."""


class QARequestError(QAAgentError):
    """Raised when QA input does not match the approved project artifacts."""


class QAExecutionError(QAAgentError):
    """Raised when a future controlled execution provider fails."""


class QAReviewError(QAAgentError):
    """Raised when optional structured LLM review cannot be completed."""
