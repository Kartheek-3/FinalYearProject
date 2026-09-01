"""Application service for provider-neutral Planning & Design generation."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from backend.agents.planning.errors import (
    PlanningCompletenessError,
    PlanningKnowledgeRetrievalError,
    PlanningProviderError,
    PlanningResponseValidationError,
)
from backend.agents.planning.models import PlanningArtifact, PlanningRequest, ProjectPlan
from backend.agents.planning.prompts import PLANNING_SYSTEM_PROMPT, build_planning_user_prompt
from backend.llm.interfaces import LLMInvocationError, StructuredLLMClient
from backend.llm.models import LLMModelConfig
from backend.rag.interfaces import KnowledgeRetriever, KnowledgeSnippet


@dataclass(slots=True)
class PlanningDesignAgent:
    """Produces a validated plan from Agent 1 output without controlling execution."""

    llm_client: StructuredLLMClient
    model_config: LLMModelConfig
    knowledge_retriever: KnowledgeRetriever | None = None

    async def plan(self, request: PlanningRequest) -> PlanningArtifact:
        knowledge = await self._retrieve_knowledge(request)
        response = await self._generate_response(request, knowledge)
        plan = self._validate_response(response)
        self._validate_against_analysis(plan, request)
        return PlanningArtifact(
            project_id=request.project_id,
            source_analysis_artifact_type=request.analysis_artifact.artifact_type,
            source_analysis_contract_version=request.analysis_artifact.contract_version,
            result=plan,
        )

    async def _retrieve_knowledge(self, request: PlanningRequest) -> Sequence[KnowledgeSnippet]:
        if self.knowledge_retriever is None:
            return ()
        try:
            return await self.knowledge_retriever.retrieve(
                query=(
                    f"{request.analysis_artifact.result.domain.primary_domain}: "
                    f"{request.analysis_artifact.result.project_summary}"
                ),
                limit=5,
            )
        except Exception as exc:
            raise PlanningKnowledgeRetrievalError(
                "Planning knowledge retrieval failed; no plan was generated."
            ) from exc

    async def _generate_response(
        self,
        request: PlanningRequest,
        knowledge: Sequence[KnowledgeSnippet],
    ) -> Mapping[str, Any]:
        try:
            response = await self.llm_client.generate_structured(
                system_prompt=PLANNING_SYSTEM_PROMPT,
                user_prompt=build_planning_user_prompt(request, knowledge),
                model=self.model_config,
                output_schema=ProjectPlan.model_json_schema(),
            )
        except LLMInvocationError as exc:
            raise PlanningProviderError("The configured LLM failed to create a plan.") from exc
        except Exception as exc:
            raise PlanningProviderError("Unexpected failure while invoking the configured LLM.") from exc
        if not isinstance(response, Mapping):
            raise PlanningResponseValidationError("LLM response must be a JSON object.")
        return response

    @staticmethod
    def _validate_response(response: Mapping[str, Any]) -> ProjectPlan:
        try:
            return ProjectPlan.model_validate(response)
        except ValidationError as exc:
            import traceback
            traceback.print_exc()
            print("RAW PLANNING JSON:", response)
            raise PlanningResponseValidationError(
                "LLM response does not satisfy the Planning & Design output contract."
            ) from exc

    @staticmethod
    def _validate_against_analysis(plan: ProjectPlan, request: PlanningRequest) -> None:
        requirements = request.analysis_artifact.result
        functional_ids = {item.id for item in requirements.functional_requirements}
        acceptance_ids = {item.id for item in requirements.acceptance_criteria}
        ambiguity_ids = {item.id for item in requirements.ambiguities}
        planned_technology_sources = {
            item.source_constraint_technology.casefold()
            for item in plan.architecture.technology_choices
        }
        required_technologies = {
            item.technology.casefold() for item in requirements.technology_constraints
        }

        for task in plan.implementation_tasks:
            if not set(task.requirement_ids) <= functional_ids:
                raise PlanningCompletenessError(
                    f"Task '{task.task_id}' references requirements absent from AnalysisArtifact."
                )
            if not set(task.acceptance_criteria) <= acceptance_ids:
                raise PlanningCompletenessError(
                    f"Task '{task.task_id}' references acceptance criteria absent from AnalysisArtifact."
                )
        for trace in plan.requirement_traceability:
            if trace.requirement_id not in functional_ids:
                raise PlanningCompletenessError(
                    "Requirement traceability contains a requirement absent from AnalysisArtifact."
                )
            if not set(trace.acceptance_criteria_ids) <= acceptance_ids:
                raise PlanningCompletenessError(
                    "Requirement traceability contains acceptance criteria absent from AnalysisArtifact."
                )
        missing_traces = functional_ids - {
            trace.requirement_id for trace in plan.requirement_traceability
        }
        if missing_traces:
            raise PlanningCompletenessError(
                f"Plan lacks traceability for functional requirements: {sorted(missing_traces)}"
            )
        if not set(plan.unresolved_ambiguity_ids) <= ambiguity_ids:
            raise PlanningCompletenessError(
                "Plan references unresolved ambiguities absent from AnalysisArtifact."
            )
        if not required_technologies <= planned_technology_sources:
            missing = sorted(required_technologies - planned_technology_sources)
            raise PlanningCompletenessError(
                f"Plan does not preserve required technology constraints: {missing}"
            )
