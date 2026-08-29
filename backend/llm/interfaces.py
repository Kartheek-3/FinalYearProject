"""Provider-neutral async interface for schema-constrained generation."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Protocol

from backend.llm.models import LLMModelConfig


class LLMInvocationError(Exception):
    """A provider adapter could not complete an LLM invocation."""


class StructuredLLMClient(Protocol):
    """Adapter contract implemented later for any supported model provider."""

    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: LLMModelConfig,
        output_schema: Mapping[str, Any],
    ) -> Mapping[str, Any]:
        """Return a decoded JSON object or raise ``LLMInvocationError``."""
