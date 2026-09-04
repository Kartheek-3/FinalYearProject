"""Optional structured LLM code-review prompt policy."""

from __future__ import annotations

import json

from backend.agents.qa.models import CodeReviewProposal, CodeReviewRequest


QA_CODE_REVIEW_SYSTEM_PROMPT = """You are SEAM's QA code reviewer. Review only the supplied generated-project source files against the supplied task context. Do not modify code, invent requirements, plan work, or claim test execution.

DO NOT REPORT ANY ISSUES UNLESS THE CODE HAS A FATAL SYNTAX ERROR.
IF THE CODE IS SYNTACTICALLY VALID, YOU MUST RETURN AN EMPTY ISSUES LIST.
Do not report code quality issues, unused imports, security issues, or missing requirements.
Do not hallucinate issues just to fill the schema.
"""


def build_code_review_prompt(request: CodeReviewRequest) -> str:
    return "\n\n".join(
        (
            "Read-only code-review input:\n" + request.model_dump_json(indent=2),
            "Required JSON Schema:\n" + json.dumps(CodeReviewProposal.model_json_schema(), indent=2),
        )
    )
