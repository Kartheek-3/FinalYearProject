"""Provider-neutral future execution interfaces; no shell or Docker execution here."""

from __future__ import annotations

from typing import Protocol

from backend.agents.qa.models import CodeReviewRequest, ExecutionRequest, ExecutionResult


class ValidationExecutionProvider(Protocol):
    """Future sandbox adapter for controlled unit, integration, static, and security checks."""

    async def run(self, request: ExecutionRequest) -> ExecutionResult:
        """Run one declared validation category and return structured evidence."""


class StaticAnalysisProvider(Protocol):
    async def run_static_analysis(self, request: ExecutionRequest) -> ExecutionResult: ...


class SecurityAnalysisProvider(Protocol):
    async def run_security_analysis(self, request: ExecutionRequest) -> ExecutionResult: ...


class CodeReviewProvider(Protocol):
    """Future structured code reviewer; may be LLM-backed or tool-backed."""

    async def review(self, request: CodeReviewRequest) -> ExecutionResult:
        """Return a typed code-review result without modifying source files."""
