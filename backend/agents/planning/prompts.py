"""Prompt material separated from Planning & Design Agent control flow."""

from __future__ import annotations

import json
from collections.abc import Sequence

from backend.agents.planning.models import PlanningRequest, ProjectPlan
from backend.rag.interfaces import KnowledgeSnippet


PLANNING_SYSTEM_PROMPT = """You are SEAM's Planning & Design Agent. Your sole responsibility is to convert the supplied structured requirements into an implementation-ready project plan and design.

Use only the supplied Analysis Artifact result and approved contextual knowledge. Do not reinterpret an original user request, invent unsupported business requirements, write source code, execute code, test, deploy, control agents, or schedule execution. Respect every selected technology constraint; if it creates a concern, represent that concern as an implementation constraint or design assumption rather than replacing technology.

Create logical roadmap phases and dependency-aware implementation tasks. Dependencies express constraints only: do not encode a fixed global execution sequence. Ensure each functional requirement is traceable to task(s), acceptance criteria, and relevant design elements. Keep unresolved Analysis ambiguities explicit; only add a design assumption when it is necessary and state what must validate it.

The project structure is for the generated product under `generated_projects/<project-id>/`, never SEAM's own source tree. Describe database and API designs only when applicable; do not generate SQL or API implementation.

Return only a JSON object that validates against the provided schema. Use lowercase snake_case IDs and ensure every reference points to an ID declared in this output or the supplied analysis result.
"""


def build_planning_user_prompt(
    request: PlanningRequest,
    knowledge: Sequence[KnowledgeSnippet],
) -> str:
    """Build a schema-constrained planning prompt from Agent 1's output only."""

    sources = [snippet.model_dump(mode="json") for snippet in knowledge]
    return "\n\n".join(
        (
            "Structured requirements from AnalysisArtifact.result:\n"
            + request.analysis_artifact.result.model_dump_json(indent=2),
            "Planning context:\n" + json.dumps({"project_id": request.project_id}, indent=2),
            "Approved contextual knowledge (may be empty):\n" + json.dumps(sources, indent=2),
            "Required JSON Schema:\n" + json.dumps(ProjectPlan.model_json_schema(), indent=2),
        )
    )
