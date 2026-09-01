# Backend foundation

This directory hosts the SEAM Python/FastAPI platform. All six agent foundations
exist; `composition/` connects their existing contracts without redefining them.

> **Status:** BUILD COMPLETE. All backend orchestration, lifecycles, provider adapters, and API endpoints are built.
>
> **RUNTIME VALIDATION PENDING:** Real project-generation execution via an LLM endpoint is intentionally postponed for a subsequent testing milestone.

- `agents/analysis/` owns structured requirement analysis and its prompt material.
- `agents/planning/` owns requirement-driven project planning and design; it never schedules or implements work.
- `agents/supervisor/` owns deterministic task-graph state, eligibility, selection, dispatch contracts, and rework routing.
- `agents/coding/` owns task-scoped, validated source changes inside isolated generated-project workspaces.
- `agents/qa/` owns read-only validation, structured findings, and rework feedback; it never edits source.
- `agents/delivery/` owns QA-gated, provider-neutral packaging preparation; Docker is the initial target.
- `composition/` owns project identity, in-memory aggregate/repository state, workspace provisioning, agent-result adapters, task-graph validation, and dispatch enrichment.
- `contracts/` will hold typed, versioned request/result schemas derived from `docs/agent-contracts.md`.
- `orchestration/` will own adaptive workflow state and scheduling, not individual agent logic.
- `llm/`, `rag/`, `database/`, `execution/`, and `deployment/` are shared infrastructure boundaries.
- `api/` will expose platform capabilities, never generated-project endpoints.

The minimal application in `main.py` exposes `GET /health`, `POST /projects`,
`GET /projects/{project_id}`, `POST /projects/{project_id}/execute-next-task`,
`POST /projects/{project_id}/qa/{task_id}`, `POST /projects/{project_id}/run-next`,
and `POST /projects/{project_id}/run-until-blocked`. It uses an in-memory repository.

The supported end-to-end execution lifecycle is:

```text
User input
    ↓
Analysis
    ↓
Planning
    ↓
Supervisor
    ↓
Coding
    ↓
QA
    ↓
Rework if required
    ↓
All tasks PASS
    ↓
READY_FOR_DELIVERY
    ↓
Delivery Agent
    ↓
Docker Provider
    ↓
Docker Build
    ↓
Container
    ↓
Health Check
    ↓
DEPLOYED
    ↓
URL
```

QA is read-only. Its current execution provider only inspects the selected
`generated_projects/<project_id>/` workspace and never invokes a shell, Docker,
or generated application code. Runtime checks therefore return `BLOCKED`, never
a fabricated pass. `run-until-blocked` has an explicit 20-iteration upper bound;
per-task attempt and rework limits also pause execution with a recorded reason.

Docker is currently the ONLY concrete deployment target.

Set `SEAM_LLM_PROVIDER=openai_compatible` and `SEAM_LLM_BASE_URL=http://localhost:11434/v1` to enable the
concrete structured LLM adapter. `SEAM_LLM_API_KEY` is optional and never stored.
Model aliases are configurable with `SEAM_LLAMA_3_1_MODEL`,
`SEAM_DEEPSEEK_CODER_MODEL`, and `SEAM_QWEN2_5_CODER_MODEL`.

For robust project generation, it is strongly recommended to configure:
- `SEAM_ANALYSIS_MODEL="qwen2.5-coder"`
- `SEAM_PLANNING_MODEL="qwen2.5-coder"`
- `SEAM_CODING_MODEL="qwen2.5-coder"`
- `SEAM_QA_MODEL="qwen2.5-coder"`
