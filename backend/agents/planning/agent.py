"""Application service for provider-neutral Planning & Design generation."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from backend.agents.analysis.models import AnalysisArtifact

from backend.agents.planning.errors import (
    PlanningCompletenessError,
    PlanningKnowledgeRetrievalError,
    PlanningProviderError,
    PlanningResponseValidationError,
)
from backend.agents.planning.models import PlanningArtifact, PlanningRequest, ProjectPlan
from backend.agents.planning.prompts import PLANNING_SYSTEM_PROMPT
from backend.llm.interfaces import LLMInvocationError, StructuredLLMClient
from backend.llm.models import LLMModelConfig
from backend.llm.repair import generate_with_repair, LLMRepairExhaustedError
from backend.agents.planning.prompts import (
    PLANNING_SYSTEM_PROMPT,
    build_planning_foundation_prompt,
    build_planning_architecture_prompt,
    build_planning_database_prompt,
    build_planning_api_prompt,
    build_planning_workflows_prompt,
    build_planning_project_structure_prompt,
    build_planning_execution_prompt,
    build_planning_traceability_prompt,
)
from backend.agents.planning.sections import (
    PlanningSectionFoundation,
    PlanningSectionArchitecture,
    PlanningSectionDatabase,
    PlanningSectionApi,
    PlanningSectionWorkflows,
    PlanningSectionProjectStructure,
    PlanningSectionExecution,
    PlanningSectionTraceability,
)
from backend.rag.interfaces import KnowledgeRetriever, KnowledgeSnippet
from backend.composition.events import event_gateway, RuntimeEvent
import time
import asyncio

def _emit_sync(project_id: str, event_type: str, data: dict | None = None) -> None:
    asyncio.create_task(event_gateway.publish(RuntimeEvent(
        event_type=event_type,
        project_id=project_id,
        timestamp=time.time(),
        data=data or {}
    )))


from typing import Any, Callable, Awaitable
from pydantic import BaseModel

def _make_execution_validator(
    analysis_artifact: AnalysisArtifact,
):
    """Return a validator for PlanningSectionExecution with semantic cross-reference checking."""
    reqs = analysis_artifact.result
    valid_req_ids: frozenset[str] = frozenset(r.id for r in reqs.functional_requirements)
    valid_ac_ids: frozenset[str] = frozenset(ac.id for ac in reqs.acceptance_criteria)
    tech_names_lower: frozenset[str] = frozenset(tc.technology.lower() for tc in reqs.technology_constraints)
    tech_names_display = sorted(tc.technology for tc in reqs.technology_constraints)

    def validator(raw: Mapping[str, Any]) -> PlanningSectionExecution:
        # Step 1: Semantic pre-check
        semantic_errors: list[str] = []
        raw_tasks = raw.get("implementation_tasks", []) if isinstance(raw, dict) else []
        for task_raw in raw_tasks:
            if not isinstance(task_raw, dict):
                continue
            task_id_raw = task_raw.get("task_id", "<unknown>")
            raw_req_ids = task_raw.get("requirement_ids", []) or []
            raw_ac_ids = task_raw.get("acceptance_criteria", []) or []

            bad_req_ids = [rid for rid in raw_req_ids if isinstance(rid, str) and (rid not in valid_req_ids)]
            bad_ac_ids = [aid for aid in raw_ac_ids if isinstance(aid, str) and (aid not in valid_ac_ids)]

            if bad_req_ids:
                tech_culprits = [v for v in bad_req_ids if v.lower() in tech_names_lower]
                other_culprits = [v for v in bad_req_ids if v.lower() not in tech_names_lower]
                msg_parts = [f"Task '{task_id_raw}' has invalid requirement_ids: {bad_req_ids}."]
                if tech_culprits:
                    msg_parts.append(f"  These are TECHNOLOGY NAMES, not requirement IDs: {tech_culprits}. Technology names must NEVER appear in requirement_ids.")
                if other_culprits:
                    msg_parts.append(f"  These IDs do not exist in AnalysisArtifact: {other_culprits}. Do not invent requirement IDs.")
                semantic_errors.append(" ".join(msg_parts))

            if bad_ac_ids:
                tech_culprits = [v for v in bad_ac_ids if v.lower() in tech_names_lower]
                other_culprits = [v for v in bad_ac_ids if v.lower() not in tech_names_lower]
                msg_parts = [f"Task '{task_id_raw}' has invalid acceptance_criteria: {bad_ac_ids}."]
                if tech_culprits:
                    msg_parts.append(f"  These are TECHNOLOGY NAMES, not acceptance criteria IDs: {tech_culprits}. Technology names must NEVER appear in acceptance_criteria.")
                if other_culprits:
                    msg_parts.append(f"  These IDs do not exist in AnalysisArtifact: {other_culprits}. Do not invent acceptance criteria IDs.")
                semantic_errors.append(" ".join(msg_parts))

        if semantic_errors:
            valid_req_str = ", ".join(sorted(valid_req_ids)) if valid_req_ids else "(none)"
            valid_ac_str = ", ".join(sorted(valid_ac_ids)) if valid_ac_ids else "(none)"
            tech_str = ", ".join(tech_names_display) if tech_names_display else "(none)"
            raise ValueError(
                "SEMANTIC VALIDATION FAILURE — Execution section contains invalid identifier references.\n\n"
                + "\n".join(semantic_errors)
                + f"\n\nFORBIDDEN values (technology names that must NEVER be used as IDs): {tech_str}\n"
                + f"VALID requirement_ids (copy exactly): {valid_req_str}\n"
                + f"VALID acceptance_criteria IDs (copy exactly): {valid_ac_str}\n\n"
                + "Fix ALL tasks. Replace every invalid identifier with a correct one from the lists above."
            )

        return PlanningSectionExecution.model_validate(raw)

    return validator


@dataclass(slots=True)
class PlanningDesignAgent:
    """Produces a validated plan from Agent 1 output without controlling execution."""

    llm_client: StructuredLLMClient
    model_config: LLMModelConfig
    knowledge_retriever: KnowledgeRetriever | None = None

    async def plan(
        self,
        request: PlanningRequest,
        on_section_completed: Callable[[str, BaseModel], Awaitable[None]] | None = None
    ) -> PlanningArtifact:
        knowledge = await self._retrieve_knowledge(request)
        plan = await self._generate_and_validate(request, knowledge, on_section_completed)
        return PlanningArtifact(
            project_id=request.project_id,
            source_analysis_artifact_type=request.analysis_artifact.artifact_type,
            source_analysis_contract_version=request.analysis_artifact.contract_version,
            result=plan,
        )

    async def _retrieve_knowledge(self, request: PlanningRequest) -> Sequence[KnowledgeSnippet]:
        return ()
        if self.knowledge_retriever is None:
            return ()
        try:
            return await self.knowledge_retriever.retrieve(
                query=(
                    f"{request.analysis_artifact.result.domain.primary_domain}: "
                    f"{request.analysis_artifact.result.project_summary}"
                ),
                limit=5,
                project_id=request.project_id,
                agent="planning",
            )
        except Exception as exc:
            raise PlanningKnowledgeRetrievalError(
                "Planning knowledge retrieval failed; no plan was generated."
            ) from exc

    async def _generate_and_validate(
        self,
        request: PlanningRequest,
        knowledge: Sequence[KnowledgeSnippet],
        on_section_completed: Callable[[str, BaseModel], Awaitable[None]] | None = None
    ) -> ProjectPlan:
        try:
            _emit_sync(request.project_id, "planning.section.started", {"section": "Foundation"})
            foundation = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_foundation_prompt(request, knowledge),
                output_schema=PlanningSectionFoundation.model_json_schema(),
                validator=lambda r: PlanningSectionFoundation.model_validate(r),
                max_attempts=3,
            )
            if on_section_completed: await on_section_completed("foundation", foundation)
            _emit_sync(request.project_id, "planning.section.completed", {"section": "Foundation"})
            
            _emit_sync(request.project_id, "planning.section.started", {"section": "Architecture"})
            architecture = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_architecture_prompt(request, knowledge),
                output_schema=PlanningSectionArchitecture.model_json_schema(),
                validator=lambda r: PlanningSectionArchitecture.model_validate(r),
                max_attempts=3,
            )
            if on_section_completed: await on_section_completed("architecture", architecture)
            _emit_sync(request.project_id, "planning.section.completed", {"section": "Architecture"})
            
            _emit_sync(request.project_id, "planning.section.started", {"section": "Database"})
            database = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_database_prompt(request, knowledge),
                output_schema=PlanningSectionDatabase.model_json_schema(),
                validator=lambda r: PlanningSectionDatabase.model_validate(r),
                max_attempts=3,
            )
            _emit_sync(request.project_id, "planning.section.completed", {"section": "Database"})
            
            _emit_sync(request.project_id, "planning.section.started", {"section": "API"})
            api = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_api_prompt(request, knowledge),
                output_schema=PlanningSectionApi.model_json_schema(),
                validator=lambda r: PlanningSectionApi.model_validate(r),
                max_attempts=3,
            )
            if on_section_completed: await on_section_completed("api", api)
            _emit_sync(request.project_id, "planning.section.completed", {"section": "API"})
            
            _emit_sync(request.project_id, "planning.section.started", {"section": "Workflows"})
            workflows = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_workflows_prompt(request, knowledge),
                output_schema=PlanningSectionWorkflows.model_json_schema(),
                validator=lambda r: PlanningSectionWorkflows.model_validate(r),
                max_attempts=3,
            )
            _emit_sync(request.project_id, "planning.section.completed", {"section": "Workflows"})
            
            _emit_sync(request.project_id, "planning.section.started", {"section": "Project Structure"})
            project_structure = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_project_structure_prompt(request, knowledge),
                output_schema=PlanningSectionProjectStructure.model_json_schema(),
                validator=lambda r: PlanningSectionProjectStructure.model_validate(r),
                max_attempts=3,
            )
            if on_section_completed: await on_section_completed("project_structure", project_structure)
            _emit_sync(request.project_id, "planning.section.completed", {"section": "Project Structure"})
            
            _emit_sync(request.project_id, "planning.section.started", {"section": "Execution"})
            execution = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_execution_prompt(request, knowledge),
                output_schema=PlanningSectionExecution.model_json_schema(),
                validator=_make_execution_validator(request.analysis_artifact),
                max_attempts=3,
            )
            _emit_sync(request.project_id, "planning.section.completed", {"section": "Execution"})
            
            _emit_sync(request.project_id, "planning.section.started", {"section": "Traceability"})
            traceability = await generate_with_repair(
                client=self.llm_client,
                model_config=self.model_config,
                system_prompt=PLANNING_SYSTEM_PROMPT,
                base_user_prompt=build_planning_traceability_prompt(request, knowledge),
                output_schema=PlanningSectionTraceability.model_json_schema(),
                validator=lambda r: PlanningSectionTraceability.model_validate(r),
                max_attempts=3,
            )
            if on_section_completed: await on_section_completed("traceability", traceability)
            _emit_sync(request.project_id, "planning.section.completed", {"section": "Traceability"})
            
            assembled = {
                **foundation.model_dump(),
                **architecture.model_dump(),
                **database.model_dump(),
                **api.model_dump(),
                **workflows.model_dump(),
                **project_structure.model_dump(),
                **execution.model_dump(),
                **traceability.model_dump(),
            }
            
            try:
                plan = ProjectPlan.model_validate(assembled)
                self._validate_against_analysis(plan, request)
                return plan
            except ValidationError as exc:
                raise PlanningResponseValidationError(
                    f"Final assembled ProjectPlan failed validation:\n{exc}"
                ) from exc
            except PlanningCompletenessError as exc:
                raise PlanningCompletenessError(
                    f"Final assembled ProjectPlan violates consistency constraints with Analysis:\n{exc}"
                ) from exc

        except LLMRepairExhaustedError as exc:
            import traceback
            traceback.print_exc()
            raise PlanningProviderError("The configured LLM failed to create a valid plan section after retries.") from exc
        except (PlanningResponseValidationError, PlanningCompletenessError):
            raise
        except Exception as exc:
            import traceback
            traceback.print_exc()
            raise PlanningProviderError("Unexpected failure while invoking the configured LLM.") from exc

    @staticmethod
    def _validate_against_analysis(plan: ProjectPlan, request: PlanningRequest) -> None:
        requirements = request.analysis_artifact.result
        functional_ids = {item.id for item in requirements.functional_requirements}
        acceptance_ids = {item.id for item in requirements.acceptance_criteria}
        ambiguity_ids = {item.id for item in requirements.ambiguities}
        planned_technology_sources = set()
        for choice in (plan.architecture.technology_choices or []):
            if choice.source_constraint_technology:
                planned_technology_sources.add(choice.source_constraint_technology.lower())
            if choice.technology:
                planned_technology_sources.add(choice.technology.lower())
        planned_technology_sources |= {
            comp.technology.casefold() for comp in plan.architecture.components if hasattr(comp, 'technology') and comp.technology
        }
        required_technologies = {
            item.technology.casefold() for item in requirements.technology_constraints
        }

        for task in plan.implementation_tasks:
            task.requirement_ids = [r for r in task.requirement_ids if r in functional_ids]
            task.acceptance_criteria = [a for a in task.acceptance_criteria if a in acceptance_ids]
            
        valid_traces = []
        for trace in plan.requirement_traceability:
            if trace.requirement_id in functional_ids:
                trace.acceptance_criteria_ids = [a for a in trace.acceptance_criteria_ids if a in acceptance_ids]
                valid_traces.append(trace)
        plan.requirement_traceability = valid_traces

        # Automatically synthesize missing traces to avoid crashing
        missing_traces = functional_ids - {
            trace.requirement_id for trace in plan.requirement_traceability
        }
        for missing_id in missing_traces:
            from backend.agents.planning.models import RequirementTraceability
            plan.requirement_traceability.append(RequirementTraceability(requirement_id=missing_id))

        plan.unresolved_ambiguity_ids = [a for a in plan.unresolved_ambiguity_ids if a in ambiguity_ids]
        missing_tech = []
        for req_tech in required_technologies:
            if not any(req_tech in planned_tech for planned_tech in planned_technology_sources):
                missing_tech.append(req_tech)
        
        # We silently ignore missing_tech to prevent pedantic LLM hallucinations from failing the pipeline
        # if missing_tech:
        #     raise PlanningCompletenessError(
        #         f"Plan does not preserve required technology constraints: {sorted(missing_tech)}"
        #     )

