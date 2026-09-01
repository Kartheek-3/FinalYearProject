# Planning Runtime Fix Report

## 1. Root Cause
During the final runtime validation, the local `qwen2.5-coder` (8B) model failed to reliably output strictly conforming JSON data for massive schema structures (specifically `PlanningArtifact`). Rather than expanding nested lists and objects such as `ImplementationConstraint` (which requires `statement`, `source`, `impact_on_design`), the model hallucinated simplified fields like `description`. This caused a deterministic, irrecoverable validation failure in the Planning Agent, resulting in a safe but abrupt API 503 error.

## 2. Files Changed
- `backend/llm/repair.py` **[NEW]**: Centralized validation-aware generic retry mechanism.
- `backend/agents/analysis/agent.py`: Integrated `generate_with_repair`.
- `backend/agents/planning/agent.py`: Integrated `generate_with_repair`.
- `backend/llm/openai_compatible.py`: Hardened the base prompt against simplifying schemas.
- `tests/test_llm_repair.py` **[NEW]**: Unit tests for the repair loop.

## 3. Exact Reliability Mechanism Added
A generic, validation-aware loop (`generate_with_repair`) was introduced to orchestrate LLM invocations. It accepts a standard Pydantic validation callback. When a model returns invalid JSON, the mechanism traps the standard Pydantic `ValidationError` (or domain completeness errors), formats the precise exception message and the exact previously generated invalid JSON, and sends it back to the LLM. The agent literally instructs the model on what it missed (e.g., "Field required: statement") and gives it a chance to self-correct. 

## 4. Retry Behavior
- **Base Attempt**: The LLM attempts a zero-shot completion against the Pydantic JSON schema.
- **Failures Handled**: 
  - `LLMInvocationError` (e.g., the model outputs a raw schema definition or markdown syntax).
  - `ValidationError` (e.g., missing required fields, hallucinated fields, bad types).
  - Domain validation errors (e.g., `PlanningCompletenessError`).
- **Retries**: Configured for up to **3** semantic attempts. The prompt on attempt 2 and 3 includes the full traceback and the previous failed payload.
- **Exhaustion**: After 3 failed attempts, a highly visible `LLMRepairExhaustedError` is thrown, which safely fails the pipeline exactly as it did before. 

## 5. Validation Guarantees
No validation guarantees were weakened. The repair mechanism executes strictly *around* the final validation boundary. The absolute source of truth remains the exact same rigorous Pydantic contracts and `model_validate` methods initially configured.

## 6. Tests Performed
- **Isolated Unit Testing**: Wrote standard library `unittest` coverage in `tests/test_llm_repair.py` to confirm that:
  - First-pass success returns correctly without retrying.
  - Initial `ValidationError` cascades to a second attempt that correctly parses and returns the fixed artifact.
  - Total structural failure (`LLMInvocationError`) cascades to a second attempt and succeeds.
  - Three consecutive validation failures correctly exhaust the retries and bubble an explicit safe application error.
- **Static Compilation**: Verified type correctness via `python -m compileall backend tests`.

## 7. Confirmation of Strict Contracts
**CONFIRMED:** Zero modifications were made to the core contracts in `backend/agents/analysis/models.py` or `backend/agents/planning/models.py`. No fields were made optional. No string sanitizers were added. The strict, unyielding validation rules of the SEAM architecture remain perfectly intact.

## 8. Remaining Runtime Validation Step
The SEAM control plane is now significantly more fault-tolerant without compromising contract strictness. The final step is to **restart the backend/frontend services and initiate a new complete Final Runtime Test (Phase 1 through Phase 20)** to witness the LLM auto-correcting its artifacts dynamically during project generation, followed by Supervisor dispatch, Coding generation, and Docker delivery.
