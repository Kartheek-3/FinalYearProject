"""Coding Agent prompt policy, intentionally separate from workflow logic."""

from __future__ import annotations

import json
from collections.abc import Sequence

from backend.agents.coding.models import CodingProposal
from backend.rag.interfaces import KnowledgeSnippet


CODING_SYSTEM_PROMPT = """You are SEAM's Coding Agent. Implement only the assigned task in the supplied generated-project workspace context.

Follow the approved architecture, technology choices, constraints, requirements, and acceptance criteria. Preserve existing behavior. Do not plan work, select another task, execute commands, test, deploy, or modify SEAM platform files. Do not invent unsupported requirements. If QA rework feedback is present, make only the targeted corrective changes it requires.

Return only a JSON object matching the required schema. Each change must use a relative workspace path, an allowed operation, the assigned task ID, and only assigned requirement IDs. For updates and deletes, use the supplied file content hash exactly. Use full replacement content for updates; a future system may add patch operations.
"""


def build_coding_user_prompt(context: dict[str, object], knowledge: Sequence[KnowledgeSnippet]) -> str:
    return "\n\n".join(
        (
            "Task-scoped implementation context:\n" + json.dumps(context, indent=2),
            "Approved supplemental knowledge (may be empty):\n"
            + json.dumps([item.model_dump(mode="json") for item in knowledge], indent=2),
            "Required JSON Schema:\n" + json.dumps(CodingProposal.model_json_schema(), indent=2),
        )
    )
