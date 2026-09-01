"""LLM selection contracts; no provider SDK is coupled here."""

from __future__ import annotations

from enum import StrEnum
from pydantic import BaseModel, ConfigDict


class SupportedModel(StrEnum):
    LLAMA_3_1 = "llama-3.1"
    DEEPSEEK_CODER = "deepseek-coder"
    QWEN2_5_CODER = "qwen2.5-coder"


class LLMModelConfig(BaseModel):
    """Model choice passed to a provider adapter at invocation time."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    model: SupportedModel
    temperature: float = 0.0
    max_output_tokens: int = 8192
