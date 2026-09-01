"""Environment-based Coding Agent configuration without embedded credentials."""

from __future__ import annotations

import os
from dataclasses import dataclass

from backend.agents.coding.errors import CodingConfigurationError
from backend.llm.models import LLMModelConfig, SupportedModel


@dataclass(frozen=True, slots=True)
class CodingAgentSettings:
    """Set `SEAM_CODING_MODEL` to a supported configured model name."""

    llm: LLMModelConfig

    @classmethod
    def from_environment(cls) -> "CodingAgentSettings":
        raw_model = os.getenv("SEAM_CODING_MODEL", SupportedModel.QWEN2_5_CODER.value)
        try:
            model = SupportedModel(raw_model)
        except ValueError as exc:
            supported = ", ".join(item.value for item in SupportedModel)
            raise CodingConfigurationError(
                f"SEAM_CODING_MODEL must be one of: {supported}."
            ) from exc
        return cls(llm=LLMModelConfig(model=model))
