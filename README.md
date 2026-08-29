# SEAM — Self-Evolving Autonomous Multi-Agent Software Engineering

SEAM is a software-factory platform. It accepts a natural-language project request and technology constraints, coordinates six software-engineering agents, and ultimately produces an isolated, tested, packaged, Docker-deployable application.

> **Status:** Analysis Agent implemented as a provider-neutral, typed service. The other five agents, platform API, RAG implementation, persistence, frontend, and deployment remain unimplemented.

## Architectural principle

```text
SEAM platform -> generates -> generated project -> Docker -> running application
```

SEAM source code and generated-product source code must never share a working directory or deployment artifact. Generated products belong under `generated_projects/` and are treated as isolated workspaces.

## Repository layout

- `backend/` — future Python/FastAPI platform and agent packages.
- `frontend/` — future React + TypeScript + Vite interface.
- `knowledge/` — source documents and local RAG data boundaries; vector data is ignored.
- `generated_projects/` — isolated generated products; contents are ignored by Git.
- `docs/` — architecture and agent contract specifications.
- `tests/` — future platform, integration, and end-to-end tests.
- `docker/` and `docker-compose.yml` — deployment composition boundary, deliberately inactive until delivery infrastructure is implemented.

## Next implementation order

1. Define contracts/interfaces for all six agents (complete in `docs/`).
2. Implement the Analysis Agent.
3. Implement Planning & Design, Supervisor, Coding, QA, and Delivery agents in that order.
4. Integrate all agents, then RAG, LLM providers, and Docker execution.
5. Run formal end-to-end testing only after the six-agent system is assembled.

Read [the architecture](docs/architecture.md) and [the agent contracts](docs/agent-contracts.md) before adding implementation code.
