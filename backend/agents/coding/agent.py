"""Coding Agent orchestration: propose, validate, then apply controlled changes."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from backend.agents.coding.context import CodingContextBuilder
from backend.agents.coding.errors import (
    CodingAgentError,
    CodingProviderError,
    CodingResponseValidationError,
    WorkspaceOperationError,
)
from backend.agents.coding.models import (
    CodeChange,
    CodeOperation,
    CodingProposal,
    CodingRequest,
    CodingResult,
    ExistingFileContext,
)
from backend.agents.coding.prompts import CODING_SYSTEM_PROMPT, build_coding_user_prompt
from backend.agents.coding.validator import ChangeValidator
from backend.agents.coding.workspace import Workspace
from backend.agents.supervisor.models import (
    AgentDispatchCommand,
    AgentName,
    AgentResultStatus,
    ArtifactReference,
)
from backend.llm.interfaces import LLMInvocationError, StructuredLLMClient
from backend.llm.models import LLMModelConfig
from backend.rag.interfaces import KnowledgeRetriever, KnowledgeSnippet


@dataclass(slots=True)
class CodingAgent:
    """Implements one dispatched task in a workspace it cannot escape."""

    llm_client: StructuredLLMClient
    model_config: LLMModelConfig
    knowledge_retriever: KnowledgeRetriever | None = None

    async def implement(self, request: CodingRequest, workspace: Workspace) -> CodingResult:
        started_at = datetime.now(timezone.utc)
        command = request.dispatch_command
        try:
            context = CodingContextBuilder.build(request, workspace)
            knowledge = await self._retrieve_knowledge(command.task.description, command.project_id)
            proposal = await self._propose(context, knowledge)
            ChangeValidator.validate(proposal.changes, request, workspace)
            artifacts = self._apply_changes(proposal.changes, command.task_id, workspace)
            return CodingResult(
                agent=AgentName.CODING,
                task_id=command.task_id,
                status=AgentResultStatus.SUCCEEDED,
                attempt_number=command.attempt_number,
                started_at=started_at,
                produced_artifacts=artifacts,
                changes=proposal.changes,
                summary=proposal.summary,
                warnings=proposal.warnings,
                metadata={"workspace": "generated_project", "change_count": str(len(proposal.changes))},
            )
        except CodingAgentError as exc:
            return self._failure_result(command, started_at, str(exc))
        except Exception as exc:
            return self._failure_result(command, started_at, f"Unexpected coding failure: {exc}")

    async def _retrieve_knowledge(self, query: str, project_id: str) -> Sequence[KnowledgeSnippet]:
        if self.knowledge_retriever is None:
            return ()
        try:
            return await self.knowledge_retriever.retrieve(
                query=query, limit=5, project_id=project_id, agent="coding"
            )
        except Exception as exc:
            raise CodingProviderError("Coding knowledge retrieval failed; no changes were applied.") from exc

    async def _propose(
        self,
        context: dict[str, object],
        knowledge: Sequence[KnowledgeSnippet],
    ) -> CodingProposal:
        try:
            response = await self.llm_client.generate_structured(
                system_prompt=CODING_SYSTEM_PROMPT,
                user_prompt=build_coding_user_prompt(context, knowledge),
                model=self.model_config,
                output_schema=CodingProposal.model_json_schema(),
            )
        except LLMInvocationError as exc:
            raise CodingProviderError("The configured LLM failed to propose code changes.") from exc
        except Exception as exc:
            raise CodingProviderError("Unexpected failure while invoking the configured LLM.") from exc
        if not isinstance(response, Mapping):
            raise CodingResponseValidationError("LLM response must be a JSON object.")
        try:
            return CodingProposal.model_validate(response)
        except ValidationError as exc:
            raise CodingResponseValidationError(
                "LLM response does not satisfy the Coding Agent proposal contract."
            ) from exc

    @staticmethod
    def _apply_changes(
        changes: list[CodeChange],
        task_id: str,
        workspace: Workspace,
    ) -> list[ArtifactReference]:
        originals: dict[str, ExistingFileContext | None] = {
            change.path: workspace.read_file(change.path)
            if workspace.exists(change.path)
            else None
            for change in changes
        }
        applied: list[CodeChange] = []
        try:
            for change in changes:
                if change.operation == CodeOperation.CREATE:
                    workspace.create_file(change.path, change.content or "")
                elif change.operation == CodeOperation.UPDATE:
                    workspace.update_file(
                        change.path,
                        change.content or "",
                        change.expected_current_content_hash or "",
                    )
                else:
                    workspace.delete_file(change.path, change.expected_current_content_hash or "")
                applied.append(change)
        except Exception as exc:
            try:
                CodingAgent._rollback(applied, originals, workspace)
            except Exception as rollback_error:
                raise WorkspaceOperationError(
                    "A workspace operation failed and rollback could not be completed safely."
                ) from rollback_error
            raise WorkspaceOperationError("A workspace operation failed; applied changes were rolled back.") from exc

        return [
            ArtifactReference(
                artifact_id=f"source_{index}_{task_id[:40]}",
                artifact_type="generated_source_file",
                location=change.path,
                producer=AgentName.CODING,
                task_id=task_id,
            )
            for index, change in enumerate(changes, start=1)
        ]

    @staticmethod
    def _rollback(
        applied: list[CodeChange],
        originals: dict[str, ExistingFileContext | None],
        workspace: Workspace,
    ) -> None:
        for change in reversed(applied):
            original = originals[change.path]
            if original is None:
                current = workspace.read_file(change.path)
                workspace.delete_file(change.path, current.content_hash)
            elif workspace.exists(change.path):
                current = workspace.read_file(change.path)
                workspace.update_file(change.path, original.content, current.content_hash)
            else:
                workspace.create_file(change.path, original.content)

    @staticmethod
    def _failure_result(
        command: AgentDispatchCommand,
        started_at: datetime,
        error: str,
    ) -> CodingResult:
        return CodingResult(
            agent=AgentName.CODING,
            task_id=command.task_id,
            status=AgentResultStatus.FAILED,
            attempt_number=command.attempt_number,
            started_at=started_at,
            changes=[],
            summary="No source changes were applied.",
            errors=[error],
            metadata={"workspace": "generated_project"},
        )
