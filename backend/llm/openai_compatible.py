"""Concrete OpenAI-compatible structured-output provider adapter.

The adapter is deliberately provider-neutral at the SEAM boundary: deployments
select an OpenAI-compatible endpoint and model names through environment
configuration.  It does not contain credentials or bind any agent to a model.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

import httpx

from backend.llm.interfaces import LLMInvocationError
from backend.llm.models import LLMModelConfig, SupportedModel


@dataclass(frozen=True, slots=True)
class OpenAICompatibleProviderSettings:
    """Connection settings supplied by environment-aware composition."""

    base_url: str
    api_key: str | None
    model_names: Mapping[SupportedModel, str]
    timeout_seconds: float = 600.0


class OpenAICompatibleStructuredLLMClient:
    """Async client for a `/chat/completions` compatible JSON-schema endpoint."""

    def __init__(self, settings: OpenAICompatibleProviderSettings) -> None:
        self._settings = settings

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        model: LLMModelConfig,
        output_schema: dict[str, Any],
    ) -> Mapping[str, Any]:
        schema_str = json.dumps(output_schema, indent=2)
        headers = {}
        if self._settings.api_key != "ollama":
            headers["Authorization"] = f"Bearer {self._settings.api_key}"

        last_exc = None
        for attempt in range(3):
            temp = model.temperature if attempt == 0 else 0.7
            
            enriched_system_prompt = (
                f"{system_prompt}\n\n"
                f"You are a strict JSON data generator.\n"
                f"Your task is to output a single JSON object containing real project data that conforms to the following JSON Schema.\n"
                f"```json\n{schema_str}\n```\n\n"
                f"CRITICAL RULES:\n"
                f"1. You MUST output fully expanded JSON data.\n"
                f"2. You MUST NOT output a JSON schema definition.\n"
                f"3. Do NOT output a dict with 'properties' and 'type'.\n"
                f"4. Use the exact field names from the schema.\n"
                f"EXAMPLE OF EXPECTED DATA OUTPUT:\n"
                f'{{\n  "project_summary": "example",\n  "roadmap": [],\n  "implementation_tasks": [],\n  "architecture": {{}},\n  "database": {{}},\n  "api": {{}},\n  "project_structure": {{}}\n}}\n'
            )

            mod_user_prompt = user_prompt
            if attempt > 0:
                mod_user_prompt += "\n\nWARNING: Your previous response failed because you returned a JSON schema definition instead of actual data. Please return the actual populated JSON data object this time."

            payload = {
                "model": self._settings.model_names[model.model],
                "messages": [
                    {"role": "system", "content": enriched_system_prompt},
                    {"role": "user", "content": mod_user_prompt},
                ],
                "temperature": temp,
                "max_tokens": model.max_output_tokens,
                "response_format": {"type": "json_object"},
            }
            endpoint = f"{self._settings.base_url.rstrip('/')}/chat/completions"
            
            try:
                async with httpx.AsyncClient(timeout=self._settings.timeout_seconds) as client:
                    response = await client.post(endpoint, headers=headers, json=payload)
                    response.raise_for_status()
                    body = response.json()
                content = body["choices"][0]["message"]["content"]
                decoded = json.loads(content) if isinstance(content, str) else content
                
                if isinstance(decoded, dict) and "properties" in decoded and "type" in decoded and decoded.get("type") == "object":
                    raise LLMInvocationError("LLM returned a JSON Schema instead of JSON data.")
                    
                if not isinstance(decoded, Mapping):
                    raise LLMInvocationError("OpenAI-compatible provider returned a non-object structured response.")
                    
                return decoded
            except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError, LLMInvocationError) as exc:
                import traceback
                traceback.print_exc()
                print(f"Attempt {attempt + 1} failed: {exc}")
                last_exc = exc
                
        raise LLMInvocationError("OpenAI-compatible provider did not return valid structured JSON after 3 attempts.") from last_exc
