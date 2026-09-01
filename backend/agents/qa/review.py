"""Provider-neutral structured LLM adapter for optional QA code review."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from backend.agents.qa.errors import QAReviewError
from backend.agents.qa.models import (
    CodeReviewProposal,
    CodeReviewRequest,
    ExecutionResult,
    QAIssueSeverity,
    ValidationCategory,
    ValidationStatus,
)
from backend.agents.qa.prompts import QA_CODE_REVIEW_SYSTEM_PROMPT, build_code_review_prompt
from backend.llm.interfaces import LLMInvocationError, StructuredLLMClient
from backend.llm.models import LLMModelConfig


@dataclass(slots=True)
class LLMCodeReviewProvider:
    """Optional reviewer implementation using SEAM's existing structured LLM boundary."""

    llm_client: StructuredLLMClient
    model_config: LLMModelConfig

    async def review(self, request: CodeReviewRequest) -> ExecutionResult:
        try:
            response = await self.llm_client.generate_structured(
                system_prompt=QA_CODE_REVIEW_SYSTEM_PROMPT,
                user_prompt=build_code_review_prompt(request),
                model=self.model_config,
                output_schema=CodeReviewProposal.model_json_schema(),
            )
        except LLMInvocationError as exc:
            raise QAReviewError("The configured LLM could not complete code review.") from exc
        except Exception as exc:
            raise QAReviewError("Unexpected failure during structured code review.") from exc
        if not isinstance(response, Mapping):
            raise QAReviewError("Code-review response must be a JSON object.")
        try:
            proposal = CodeReviewProposal.model_validate(response)
        except ValidationError as exc:
            raise QAReviewError("Code-review response violates the QA issue schema.") from exc
        valid_task_ids = set(request.task_ids)
        if not {issue.affected_task_id for issue in proposal.issues} <= valid_task_ids:
            raise QAReviewError("Code-review response references a task outside the request.")
        status = (
            ValidationStatus.FAILED
            if any(
                issue.required_rework
                or issue.severity in {QAIssueSeverity.HIGH, QAIssueSeverity.CRITICAL}
                for issue in proposal.issues
            )
            else ValidationStatus.PASSED
        )
        return ExecutionResult(
            category=ValidationCategory.CODE_REVIEW,
            applicable=True,
            executed=True,
            status=status,
            evidence=[],
            issues=proposal.issues,
        )
