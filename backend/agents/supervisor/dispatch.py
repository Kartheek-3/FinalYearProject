"""Dispatch and persistence boundaries, intentionally without agent implementations."""

from __future__ import annotations

from typing import Protocol

from backend.agents.supervisor.models import (
    AgentDispatchCommand,
    AgentExecutionResult,
    ContextualTaskAdvice,
    NextTaskDecision,
    ProjectExecutionState,
)


class AgentDispatcher(Protocol):
    """Future adapter that routes a Supervisor command to an executable agent."""

    async def dispatch(self, command: AgentDispatchCommand) -> AgentExecutionResult:
        """Dispatch a task and return the receiving agent's structured result."""


class ExecutionStateRepository(Protocol):
    """Future persistence boundary; PostgreSQL integration remains deferred."""

    async def save(self, state: ProjectExecutionState) -> None:
        """Persist the latest authoritative state snapshot."""

    async def get(self, project_id: str) -> ProjectExecutionState | None:
        """Retrieve a project execution state by project ID."""


class DecisionAdvisor(Protocol):
    """Future optional LLM/context advisor; deterministic selection remains authoritative."""

    async def advise(
        self,
        state: ProjectExecutionState,
        deterministic_decision: NextTaskDecision,
    ) -> ContextualTaskAdvice:
        """Provide non-binding context for a task already known to be eligible."""
