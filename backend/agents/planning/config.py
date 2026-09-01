"""Environment-based Planning & Design Agent configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass

from backend.agents.planning.errors import PlanningConfigurationError
from backend.llm.models import LLMModelConfig, SupportedModel


@dataclass(frozen=True, slots=True)
class PlanningAgentSettings:
    """Model selection only; provider credentials stay in provider adapters.

    Set `SEAM_PLANNING_MODEL` to `llama-3.1`, `deepseek-coder`, or
    `qwen2.5-coder`; it defaults to `llama-3.1`.
    """

    llm: LLMModelConfig

    @classmethod
    def from_environment(cls) -> "PlanningAgentSettings":
        raw_model = os.getenv("SEAM_PLANNING_MODEL", SupportedModel.QWEN2_5_CODER.value)
        try:
            model = SupportedModel(raw_model)
        except ValueError as exc:
            supported = ", ".join(item.value for item in SupportedModel)
            raise PlanningConfigurationError(
                f"SEAM_PLANNING_MODEL must be one of: {supported}."
            ) from exc
        return cls(llm=LLMModelConfig(model=model))
