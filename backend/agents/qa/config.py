"""Optional, provider-neutral QA LLM configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass

from backend.agents.qa.errors import QAConfigurationError
from backend.llm.models import LLMModelConfig, SupportedModel


@dataclass(frozen=True, slots=True)
class QAAgentSettings:
    llm: LLMModelConfig

    @classmethod
    def from_environment(cls) -> "QAAgentSettings":
        raw_model = os.getenv("SEAM_QA_MODEL", SupportedModel.QWEN2_5_CODER.value)
        try:
            model = SupportedModel(raw_model)
        except ValueError as exc:
            supported = ", ".join(item.value for item in SupportedModel)
            raise QAConfigurationError(f"SEAM_QA_MODEL must be one of: {supported}.") from exc
        return cls(llm=LLMModelConfig(model=model))
