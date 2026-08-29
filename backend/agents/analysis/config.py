"""Configuration read from the environment without embedding credentials."""

from __future__ import annotations

import os
from dataclasses import dataclass

from backend.agents.analysis.errors import AnalysisConfigurationError
from backend.llm.models import LLMModelConfig, SupportedModel


@dataclass(frozen=True, slots=True)
class AnalysisAgentSettings:
    """Runtime selection for Analysis Agent model use.

    The LLM provider and its credentials are intentionally outside this agent.
    Set `SEAM_ANALYSIS_MODEL` to `llama-3.1`, `deepseek-coder`, or
    `qwen2.5-coder`; it defaults to `llama-3.1`.
    """

    llm: LLMModelConfig

    @classmethod
    def from_environment(cls) -> "AnalysisAgentSettings":
        raw_model = os.getenv("SEAM_ANALYSIS_MODEL", SupportedModel.LLAMA_3_1.value)
        try:
            model = SupportedModel(raw_model)
        except ValueError as exc:
            supported = ", ".join(item.value for item in SupportedModel)
            raise AnalysisConfigurationError(
                f"SEAM_ANALYSIS_MODEL must be one of: {supported}."
            ) from exc
        return cls(llm=LLMModelConfig(model=model))
