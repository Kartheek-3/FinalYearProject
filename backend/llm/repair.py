"""Generic validation-aware retry/repair mechanism for LLM generations."""

import json
from collections.abc import Callable, Mapping
from typing import Any, TypeVar

from backend.llm.interfaces import LLMInvocationError, StructuredLLMClient
from backend.llm.models import LLMModelConfig

T = TypeVar("T")


class LLMRepairExhaustedError(Exception):
    """Raised when the LLM fails to repair validation errors after max attempts."""


async def generate_with_repair(
    client: StructuredLLMClient,
    model_config: LLMModelConfig,
    system_prompt: str,
    base_user_prompt: str,
    output_schema: dict[str, Any],
    validator: Callable[[Mapping[str, Any]], T],
    max_attempts: int = 3,
) -> T:
    """Generate structured output with auto-repair loops on validation failure.
    
    If `validator` raises an Exception, the error is caught, formatted, 
    and sent back to the LLM for correction.
    """
    last_exc = None
    current_prompt = base_user_prompt
    response = None

    for attempt in range(max_attempts):
        try:
            response = await client.generate_structured(
                system_prompt=system_prompt,
                user_prompt=current_prompt,
                model=model_config,
                output_schema=output_schema,
            )
            
            result = validator(response)
            
            if attempt > 0:
                print(f"[REPAIR] Successfully repaired artifact on attempt {attempt + 1}")
            return result
            
        except Exception as exc:
            last_exc = exc
            error_details = str(exc)
            
            print(f"[REPAIR] Attempt {attempt + 1}/{max_attempts} failed: {exc.__class__.__name__}: {error_details}")
            
            if attempt < max_attempts - 1:
                if response is not None:
                    try:
                        invalid_json_str = json.dumps(response, indent=2)
                    except Exception:
                        invalid_json_str = str(response)
                        
                    current_prompt = (
                        f"{base_user_prompt}\n\n"
                        f"--- VALIDATION FAILURE ---\n"
                        f"Your previous response failed validation.\n"
                        f"You MUST return a COMPLETE, corrected JSON object preserving all valid information.\n\n"
                        f"PREVIOUS INVALID JSON:\n```json\n{invalid_json_str}\n```\n\n"
                        f"VALIDATION ERRORS:\n{error_details}\n\n"
                        f"Fix the errors. Ensure all required fields exist exactly as defined in the schema. Do NOT invent fields. Do NOT return a JSON Schema."
                    )
                else:
                    current_prompt = (
                        f"{base_user_prompt}\n\n"
                        f"--- GENERATION FAILURE ---\n"
                        f"Your previous response completely failed to parse.\n"
                        f"Error: {error_details}\n"
                        f"Please generate valid JSON."
                    )
                    
    raise LLMRepairExhaustedError(
        f"LLM failed to generate a valid artifact after {max_attempts} attempts. Last error: {last_exc}"
    ) from last_exc
