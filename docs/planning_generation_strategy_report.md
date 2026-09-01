# Planning Generation Strategy Report

## 1. Current Root Cause
The `qwen2.5-coder` (8B) model consistently failed Phase 5 (Planning) because it was asked to generate the entire deeply nested `ProjectPlan` artifact in a single generation. The sheer volume and complexity of the object caused the model to hallucinate generic `description` fields instead of following strict, nested semantic schemas (like `statement`, `rationale`, and `validation_needed`).

## 2. Existing Monolithic Generation Limitations
The monolithic generation approach presented too much cognitive load for local 8B models. While the validation-aware repair loop correctly prevented invalid data from proceeding, the model could not recover because it simply lacked the zero-shot capacity to emit 100+ nested properties without cutting corners in a single shot.

## 3. New Section-Based Generation Architecture
We implemented a **Structured Planning Generation** strategy. Instead of generating `ProjectPlan` monolithically, we decomposed the schema into 8 logical sections. Each section is independently generated, strictly validated, and repaired (if necessary) before proceeding to the next. The final valid sections are assembled and passed through the final strict `ProjectPlan` validation (which performs full internal cross-referencing).

## 4. Exact PlanningArtifact Sections Discovered
Based on `backend/agents/planning/models.py`, we identified the following 8 independent sections:
1. **Foundation**: `project_summary`, `implementation_constraints`, `design_assumptions`, `unresolved_ambiguity_ids`
2. **Architecture**: `architecture`
3. **Database**: `database`
4. **API**: `api`
5. **Workflows**: `workflows`
6. **Project Structure**: `project_structure`
7. **Execution**: `implementation_tasks`, `roadmap`
8. **Traceability**: `requirement_traceability`

## 5. Validation Boundaries
- **Section Level**: Each section is validated against a strict partial Pydantic contract (defined in `sections.py`).
- **Assembly Level**: The assembled artifact is validated against the monolithic `ProjectPlan` contract, ensuring cross-artifact integrity (e.g., verifying that traces match exact task and endpoint identifiers).

## 6. Retry/Repair Behavior
The existing generic retry/repair utility (`generate_with_repair`) was preserved and reused. Each of the 8 sections gets its own focused prompt and up to 3 repair attempts. 

## 7. Tests Performed
Created `tests/test_planning_decomposition.py` (using mocked LLM responses) to verify:
- Successful decomposition and final assembly.
- Correct propagation of `PlanningProviderError` if a section exhausts retries.
- Tests pass cleanly (`Ran 6 tests in 0.042s OK`).

## 8. Contract Integrity Confirmation
- NO Pydantic models were weakened.
- NO required fields were made optional.
- NO fake defaults were added.
- The `PlanningArtifact` and `ProjectPlan` authoritative contracts remain strictly unmodified.

## 9. Expected Runtime Improvement
By decomposing the task into smaller, highly focused chunks, the 8B model only needs to comprehend one specialized structure at a time (e.g., generating only database models, rather than database models *and* API *and* UI architecture at once). This drastically reduces hallucinations and structurally invalid simplifications.

## 10. Remaining Runtime Validation
We must run the full Docker/Ollama end-to-end SEAM pipeline to confirm that `qwen2.5-coder` can successfully navigate this new 8-stage sequence without exhausting retries.
