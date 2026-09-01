"""Typed Coding Agent contracts; source changes are never arbitrary text blobs."""

from __future__ import annotations

from enum import StrEnum

from pydantic import Field, model_validator

from backend.agents.analysis.models import AcceptanceCriterion, FunctionalRequirement, Identifier, NonEmptyText
from backend.agents.supervisor.models import (
    AgentDispatchCommand,
    AgentExecutionResult,
    AgentName,
    SupervisorModel,
)


class CodeOperation(StrEnum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class ExistingFileContext(SupervisorModel):
    """A minimal, hash-addressable snapshot supplied to the code-generation prompt."""

    path: NonEmptyText
    content: str
    content_hash: NonEmptyText


class CodeChange(SupervisorModel):
    """A single full-file change proposed by the LLM and validated before application."""

    path: NonEmptyText
    operation: CodeOperation
    content: str | None = None
    expected_current_content_hash: NonEmptyText | None = None
    reason: NonEmptyText
    related_task_id: Identifier
    related_requirement_ids: list[Identifier] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_operation_content(self) -> "CodeChange":
        if self.operation in {CodeOperation.CREATE, CodeOperation.UPDATE}:
            if self.content is None or not self.content.strip():
                raise ValueError("Create and update changes require non-empty content.")
        if self.operation == CodeOperation.UPDATE and not self.expected_current_content_hash:
            raise ValueError("Update changes require expected_current_content_hash.")
        if self.operation == CodeOperation.DELETE:
            if self.content is not None:
                raise ValueError("Delete changes must not include content.")
            if not self.expected_current_content_hash:
                raise ValueError("Delete changes require expected_current_content_hash.")
        return self


class CodingProposal(SupervisorModel):
    """Schema-constrained LLM output before deterministic validation/application."""

    summary: NonEmptyText
    changes: list[CodeChange] = Field(min_length=1)
    warnings: list[NonEmptyText] = Field(default_factory=list)


class CodingRequest(SupervisorModel):
    """Structured task input; design context arrives through the Supervisor command."""

    dispatch_command: AgentDispatchCommand
    relevant_functional_requirements: list[FunctionalRequirement] = Field(min_length=1)
    relevant_acceptance_criteria: list[AcceptanceCriterion] = Field(min_length=1)
    context_paths: list[NonEmptyText] = Field(default_factory=list)
    allow_delete: bool = False

    @model_validator(mode="after")
    def validate_dispatch_context(self) -> "CodingRequest":
        command = self.dispatch_command
        if command.agent != AgentName.CODING:
            raise ValueError("CodingRequest requires an AgentDispatchCommand for the coding agent.")
        task_requirement_ids = set(command.task.requirement_ids)
        task_acceptance_ids = set(command.task.acceptance_criteria)
        supplied_requirement_ids = {item.id for item in self.relevant_functional_requirements}
        supplied_acceptance_ids = {item.id for item in self.relevant_acceptance_criteria}
        if not task_requirement_ids <= supplied_requirement_ids:
            raise ValueError("CodingRequest omits functional requirements assigned to the task.")
        if not task_acceptance_ids <= supplied_acceptance_ids:
            raise ValueError("CodingRequest omits acceptance criteria assigned to the task.")
        return self


class CodingResult(AgentExecutionResult):
    """Supervisor-compatible outcome with explicit source-change evidence."""

    changes: list[CodeChange] = Field(default_factory=list)
    summary: NonEmptyText
    warnings: list[NonEmptyText] = Field(default_factory=list)
