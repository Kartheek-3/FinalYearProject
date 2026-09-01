"""Optional structured LLM code-review prompt policy."""

from __future__ import annotations

import json

from backend.agents.qa.models import CodeReviewProposal, CodeReviewRequest


QA_CODE_REVIEW_SYSTEM_PROMPT = """You are SEAM's QA code reviewer. Review only the supplied generated-project source files against the supplied task context. Do not modify code, invent requirements, plan work, or claim test execution. Report only concrete, evidence-backed defects. Security findings are normal QA issues with the security category.

Return only a JSON object matching the required schema. Every issue must target one supplied task ID. If no concrete defect is found, return an empty issues list. This review is not a security certification.
"""


def build_code_review_prompt(request: CodeReviewRequest) -> str:
    return "\n\n".join(
        (
            "Read-only code-review input:\n" + request.model_dump_json(indent=2),
            "Required JSON Schema:\n" + json.dumps(CodeReviewProposal.model_json_schema(), indent=2),
        )
    )
