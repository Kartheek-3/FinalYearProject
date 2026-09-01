
"""Provider-neutral client factory with environment-selected concrete adapters."""

from __future__ import annotations

from collections.abc import Mapping
import os

from backend.llm.interfaces import LLMInvocationError, StructuredLLMClient
from backend.llm.models import LLMModelConfig, SupportedModel
from backend.llm.openai_compatible import (
    OpenAICompatibleProviderSettings,
    OpenAICompatibleStructuredLLMClient,
)


class ModelClientRegistry:
    """External composition registers a client per supported configured model."""

    def __init__(self, clients: Mapping[SupportedModel, StructuredLLMClient] | None = None) -> None:
        self._clients = dict(clients or self._environment_clients())

    def create(self, model: LLMModelConfig) -> StructuredLLMClient:
        return self._clients.get(model.model, UnavailableStructuredLLMClient(model.model))

    @staticmethod
    def _environment_clients() -> Mapping[SupportedModel, StructuredLLMClient]:
        """Create one shared adapter when an explicit compatible endpoint is configured."""

        provider = os.getenv("SEAM_LLM_PROVIDER", "").strip().lower()
        base_url = os.getenv("SEAM_LLM_BASE_URL", "").strip()
        if not provider and not base_url:
            return {}
        if provider != "openai_compatible" or not base_url:
            return {}
        names = {
            SupportedModel.LLAMA_3_1: os.getenv("SEAM_LLAMA_3_1_MODEL", "llama3.1"),
            SupportedModel.DEEPSEEK_CODER: os.getenv("SEAM_DEEPSEEK_CODER_MODEL", "deepseek-coder"),
            SupportedModel.QWEN2_5_CODER: os.getenv("SEAM_QWEN2_5_CODER_MODEL", "qwen2.5-coder"),
        }
        client = OpenAICompatibleStructuredLLMClient(
            OpenAICompatibleProviderSettings(
                base_url=base_url,
                api_key=os.getenv("SEAM_LLM_API_KEY") or None,
                model_names=names,
                timeout_seconds=3600.0,
            )
        )
        return {model: client for model in SupportedModel}


class UnavailableStructuredLLMClient:
    """Explicit non-provider used until an external adapter is registered."""

    def __init__(self, model: SupportedModel) -> None:
        self._model = model

    async def generate_structured(self, **_: object) -> Mapping[str, object]:
        raise LLMInvocationError(f"No LLM client is configured for model '{self._model.value}'.")
