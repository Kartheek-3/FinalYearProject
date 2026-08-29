# Backend foundation

This directory hosts the SEAM Python/FastAPI platform. The Analysis Agent is the
only implemented executable agent; remaining package boundaries must not contain
mock agent behavior.

- `agents/analysis/` owns structured requirement analysis and its prompt material.
- `contracts/` will hold typed, versioned request/result schemas derived from `docs/agent-contracts.md`.
- `orchestration/` will own adaptive workflow state and scheduling, not individual agent logic.
- `llm/`, `rag/`, `database/`, `execution/`, and `deployment/` are shared infrastructure boundaries.
- `api/` will expose platform capabilities, never generated-project endpoints.
