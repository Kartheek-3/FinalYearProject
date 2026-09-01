# SEAM — Self-Evolving Autonomous Multi-Agent Software Engineering

SEAM is a software-factory platform. It accepts a natural-language project request and technology constraints, coordinates six software-engineering agents, and ultimately produces an isolated, tested, packaged, Docker-deployable application.

> **Status:** BUILD COMPLETE. All six agent foundations, bounded deterministic multi-task execution, and Docker deployment provider boundaries are fully implemented.
>
> **RUNTIME VALIDATION PENDING:** Real product generation using actual LLM models (e.g., Ollama) has not yet been executed in this environment.
## Architectural principle

```text
SEAM platform -> generates -> generated project -> Docker -> running application
```

SEAM source code and generated-product source code must never share a working directory or deployment artifact. Generated products belong under `generated_projects/` and are treated as isolated workspaces.

## Prerequisites

1. **Ollama**: Must be installed and running locally (`http://localhost:11434/v1`).
2. **Models**: You must pull the required models manually before generating a project:
   - `ollama pull qwen2.5-coder` (for Coding and QA)
   - `ollama pull llama3.1` (for Analysis and Planning)

> **Note**: Larger reasoning models require significant RAM/VRAM. Generation testing is a separate step that should only be performed after configuring these models.

## Repository layout

- `backend/` — future Python/FastAPI platform and agent packages.
- `frontend/` — future React + TypeScript + Vite interface.
- `knowledge/` — source documents and local RAG data boundaries; vector data is ignored.
- `generated_projects/` — isolated generated products; contents are ignored by Git.
- `docs/` — architecture and agent contract specifications.
- `tests/` — future platform, integration, and end-to-end tests.
- `docker/` and `docker-compose.yml` — deployment composition boundary, deliberately inactive until delivery infrastructure is implemented.

## Current controlled lifecycle

```text
Analysis -> Planning -> Supervisor -> Select task -> Coding -> QA
                                          ^                    |-- PASS -> next selected task
                                          |                    |-- REWORK_REQUIRED -> Coding
                                          |                    `-- BLOCKED / FAIL -> pause
                                          `---- deterministic dependency/priority selection

All tasks completed with passed QA gates -> ready for Delivery
```

`POST /projects` creates a project aggregate, provisions an isolated workspace,
runs Analysis and Planning through configured structured LLM clients, validates
the task graph, and initializes Supervisor state. Use
`POST /projects/{project_id}/execute-next-task` for exactly one Coding task, then
`POST /projects/{project_id}/qa/{task_id}` to run read-only QA. A pending or
blocked QA gate prevents the next task from starting. `POST /projects/{project_id}/run-next`
executes one complete Coding-to-QA iteration; `POST /projects/{project_id}/run-until-blocked`
repeats bounded iterations and stops for rework, a block, a failure, completion,
or its explicit iteration limit. Docker Delivery remains a future controlled
deployment step.

Read [the architecture](docs/architecture.md) and [the agent contracts](docs/agent-contracts.md) before adding implementation code.
