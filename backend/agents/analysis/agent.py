"""Application service for requirement analysis; provider details stay outside it."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from backend.agents.analysis.errors import (
    AnalysisKnowledgeRetrievalError,
    AnalysisProviderError,
    AnalysisResponseValidationError,
)
from backend.agents.analysis.models import AnalysisArtifact, AnalysisRequest, StructuredRequirements
from backend.agents.analysis.prompts import ANALYSIS_SYSTEM_PROMPT, build_analysis_user_prompt
from backend.llm.interfaces import StructuredLLMClient, LLMInvocationError
from backend.llm.models import LLMModelConfig
from backend.rag.interfaces import KnowledgeRetriever, KnowledgeSnippet


@dataclass(slots=True)
class AnalysisAgent:
    """Converts a project brief into validated, structured requirements."""

    llm_client: StructuredLLMClient
    model_config: LLMModelConfig
    knowledge_retriever: KnowledgeRetriever | None = None

    async def analyze(self, request: AnalysisRequest) -> AnalysisArtifact:
        """Run analysis and fail explicitly if evidence or schema validation fails."""

        knowledge = await self._retrieve_knowledge(request)
        response = await self._generate_response(request, knowledge)
        result = self._validate_response(response)
        return AnalysisArtifact(result=result)

    async def _retrieve_knowledge(self, request: AnalysisRequest) -> Sequence[KnowledgeSnippet]:
        if self.knowledge_retriever is None:
            return ()
        try:
            return await self.knowledge_retriever.retrieve(
                query=request.project_description,
                limit=5,
            )
        except Exception as exc:
            raise AnalysisKnowledgeRetrievalError(
                "Analysis knowledge retrieval failed; requirements were not generated."
            ) from exc

    async def _generate_response(
        self,
        request: AnalysisRequest,
        knowledge: Sequence[KnowledgeSnippet],
    ) -> Mapping[str, Any]:
        try:
            response = await self.llm_client.generate_structured(
                system_prompt=ANALYSIS_SYSTEM_PROMPT,
                user_prompt=build_analysis_user_prompt(request, knowledge),
                model=self.model_config,
                output_schema=StructuredRequirements.model_json_schema(),
            )
        except LLMInvocationError as exc:
            import traceback
            traceback.print_exc()
            raise AnalysisProviderError("The configured LLM failed to analyze the request.") from exc
        except Exception as exc:
            import traceback
            traceback.print_exc()
            raise AnalysisProviderError("Unexpected failure while invoking the configured LLM.") from exc

        if not isinstance(response, Mapping):
            raise AnalysisResponseValidationError("LLM response must be a JSON object.")
        return response

    @staticmethod
    def _validate_response(response: Mapping[str, Any]) -> StructuredRequirements:
        try:
            return StructuredRequirements.model_validate(response)
        except ValidationError as exc:
            import traceback
            traceback.print_exc()
            print("RAW JSON:", response)
            raise AnalysisResponseValidationError(
                "LLM response does not satisfy the Analysis Agent output contract."
            ) from exc
