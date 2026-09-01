"""Prompt material separated from Planning & Design Agent control flow."""

from __future__ import annotations

import json
from collections.abc import Sequence

from backend.agents.planning.models import PlanningRequest
from backend.rag.interfaces import KnowledgeSnippet


PLANNING_SYSTEM_PROMPT = """You are SEAM's Planning & Design Agent. Your responsibility is to convert structured requirements into focused JSON artifacts representing a specific part of the implementation-ready project plan.

Return JSON DATA, not JSON Schema.
Use the exact field names defined by the provided contract.
Do not replace structured objects with generic description fields.
Do not omit required fields.
Do not invent alternative structures.
Do not return Markdown.
Do not return explanatory prose.
Return exactly one JSON object.
"""


def _build_context(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    sources = [snippet.model_dump(mode="json") for snippet in knowledge]
    return "\n\n".join(
        (
            "Structured requirements from AnalysisArtifact.result:\n"
            + request.analysis_artifact.result.model_dump_json(indent=2),
            "Planning context:\n" + json.dumps({"project_id": request.project_id}, indent=2),
            "Approved contextual knowledge (may be empty):\n" + json.dumps(sources, indent=2),
        )
    )


def build_planning_foundation_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    return _build_context(request, knowledge) + """

SECTION: Foundation
Generate the project_summary, implementation_constraints, design_assumptions, and unresolved_ambiguity_ids.

For DesignAssumption, ensure you output:
{
  "assumption_id": "...",
  "statement": "the concrete requirement or rule",
  "rationale": "why the item exists / why it is required",
  "validation_needed": "what must be checked to verify the item"
}
For DesignConstraint, ensure you output:
{
  "constraint_id": "...",
  "statement": "...",
  "source": "...",
  "impact_on_design": "..."
}
Do NOT use 'description' for these objects.
"""


def build_planning_architecture_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    return _build_context(request, knowledge) + """

SECTION: Architecture
Generate the architecture design.

For ComponentDesign, ensure you output:
{
  "component_id": "...",
  "name": "...",
  "responsibility": "...",
  "technology": "...",
  "requirement_ids": []
}
Do NOT use 'description' for components.
"""


def build_planning_database_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    return _build_context(request, knowledge) + """

SECTION: Database
Generate the database design.
"""


def build_planning_api_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    return _build_context(request, knowledge) + """

SECTION: API
Generate the API specification.
"""


def build_planning_workflows_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    return _build_context(request, knowledge) + """

SECTION: Workflows
Generate the application workflows.
"""


def build_planning_project_structure_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    return _build_context(request, knowledge) + """

SECTION: Project Structure
Generate the target project file structure.
"""


def build_planning_execution_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    reqs = request.analysis_artifact.result
    functional_ids = sorted(req.id for req in reqs.functional_requirements)
    acceptance_ids = sorted(ac.id for ac in reqs.acceptance_criteria)
    tech_names = sorted(tc.technology for tc in reqs.technology_constraints)

    functional_ids_str = "\n".join(f"  - {rid}" for rid in functional_ids) if functional_ids else "  (none)"
    acceptance_ids_str = "\n".join(f"  - {aid}" for aid in acceptance_ids) if acceptance_ids else "  (none)"
    tech_names_str = "\n".join(f"  - {t}" for t in tech_names) if tech_names else "  (none)"

    context = _build_context(request, knowledge)
    return context + f"""

SECTION: Execution (Roadmap and Tasks)
Generate the implementation_tasks and roadmap.

=== CRITICAL SEMANTIC GROUNDING RULES ===

TECHNOLOGY STACK (these are technology names — NOT requirement identifiers):
{tech_names_str}

FORBIDDEN: Do NOT place any of the technology names above into:
  - implementation_tasks[*].requirement_ids
  - implementation_tasks[*].acceptance_criteria
  - roadmap[*].task_ids
  - any Identifier field

These technology names are NOT requirement IDs. They do NOT match the required identifier pattern.

=== VALID REQUIREMENT IDs (from AnalysisArtifact.result.functional_requirements) ===
Only these identifiers may appear in implementation_tasks[*].requirement_ids:
{functional_ids_str}

Copy them EXACTLY as shown above. Do NOT invent new requirement IDs.
Do NOT use technology names. Do NOT use CamelCase or PascalCase.

CRITICAL: If a task handles infrastructure, architecture, or cross-cutting concerns (e.g., "setup database", "responsive UI framework", "REST API base") and does not directly implement one of the specific functional requirements listed above, you MUST leave requirement_ids as an empty list []. Do NOT invent synthetic IDs like "responsive_ui" or "rest_api".

=== VALID ACCEPTANCE CRITERIA IDs (from AnalysisArtifact.result.acceptance_criteria) ===
Only these identifiers may appear in implementation_tasks[*].acceptance_criteria:
{acceptance_ids_str}

Copy them EXACTLY as shown above. Do NOT invent new acceptance criteria IDs.

=== IDENTIFIER FORMAT RULE ===
All Identifier fields MUST match the regex: ^[a-z][a-z0-9_]{{1,63}}$
This means: lowercase letters, digits, underscores only. No CamelCase. No spaces. No hyphens.

For task_id values in implementation_tasks, invent lowercase snake_case IDs:
  Example: "task_create_todo_backend", "task_list_todos_api", "task_frontend_ui"

For phase_id values in roadmap, invent lowercase snake_case IDs:
  Example: "phase_1_foundation", "phase_2_api", "phase_3_frontend"

For task_ids inside roadmap phases, reference the task_id values you defined in implementation_tasks.
"""


def build_planning_traceability_prompt(request: PlanningRequest, knowledge: Sequence[KnowledgeSnippet]) -> str:
    return _build_context(request, knowledge) + """

SECTION: Traceability
Generate the requirement_traceability mappings.
"""
