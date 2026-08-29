"""Prompt material owned separately from Analysis Agent orchestration."""

from __future__ import annotations

import json
from collections.abc import Sequence

from backend.agents.analysis.models import AnalysisRequest, StructuredRequirements
from backend.rag.interfaces import KnowledgeSnippet


ANALYSIS_SYSTEM_PROMPT = """You are SEAM's Analysis Agent. Your sole responsibility is to transform a raw software project request into structured requirements.

Understand the user's actual goal. Extract functional requirements separately from non-functional requirements. Identify the application domain and faithfully represent the requested technology stack as constraints. State assumptions explicitly. When the request does not establish a fact needed for a requirement, record an ambiguity with a precise question instead of inventing that requirement.

Do not design an architecture, decompose tasks, write code, create tests, schedule work, or propose deployment plans. Do not claim capabilities unsupported by the request or supplied knowledge.

Return only a JSON object that validates against the provided schema. Use stable lowercase snake_case IDs such as `fr_user_registration`, `nfr_security_01`, `asm_01`, `amb_01`, and `ac_01`. Every acceptance criterion must reference an existing functional requirement ID.
"""


def build_analysis_user_prompt(
    request: AnalysisRequest, knowledge: Sequence[KnowledgeSnippet],
) -> str:
    """Build the model payload without mixing prompt policy into agent control flow."""

    sources = [snippet.model_dump(mode="json") for snippet in knowledge]
    return "\n\n".join(
        (
            "Raw project request:\n" + request.model_dump_json(indent=2),
            "Approved contextual knowledge (may be empty):\n" + json.dumps(sources, indent=2),
            "Required JSON Schema:\n" + json.dumps(StructuredRequirements.model_json_schema(), indent=2),
        )
    )
