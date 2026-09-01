"""Constructs existing agents from environment-selected model configurations."""

from __future__ import annotations

from dataclasses import dataclass

from backend.agents.analysis.agent import AnalysisAgent
from backend.agents.analysis.config import AnalysisAgentSettings
from backend.agents.coding.agent import CodingAgent
from backend.agents.coding.config import CodingAgentSettings
from backend.agents.delivery.agent import DeliveryAgent
from backend.agents.planning.agent import PlanningDesignAgent
from backend.agents.planning.config import PlanningAgentSettings
from backend.agents.qa.agent import QAAgent
from backend.agents.qa.config import QAAgentSettings
from backend.agents.qa.review import LLMCodeReviewProvider
from backend.agents.supervisor.service import SupervisorOrchestrator
from backend.llm.factory import ModelClientRegistry


@dataclass(frozen=True, slots=True)
class AgentBundle:
    analysis: AnalysisAgent
    planning: PlanningDesignAgent
    supervisor: SupervisorOrchestrator
    coding: CodingAgent
    qa: QAAgent
    delivery: DeliveryAgent


def build_agent_bundle(registry: ModelClientRegistry) -> AgentBundle:
    analysis_settings = AnalysisAgentSettings.from_environment()
    planning_settings = PlanningAgentSettings.from_environment()
    coding_settings = CodingAgentSettings.from_environment()
    qa_settings = QAAgentSettings.from_environment()
    return AgentBundle(
        analysis=AnalysisAgent(registry.create(analysis_settings.llm), analysis_settings.llm),
        planning=PlanningDesignAgent(registry.create(planning_settings.llm), planning_settings.llm),
        supervisor=SupervisorOrchestrator(),
        coding=CodingAgent(registry.create(coding_settings.llm), coding_settings.llm),
        qa=QAAgent(
            code_review_provider=LLMCodeReviewProvider(
                registry.create(qa_settings.llm), qa_settings.llm
            )
        ),
        delivery=DeliveryAgent(),
    )
