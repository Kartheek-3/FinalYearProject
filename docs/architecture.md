# SEAM Architecture

## Purpose and boundary

SEAM is a software factory, not a generated application. It receives a project brief and target technology stack, manages engineering work, and emits a separate product workspace. Platform state, secrets, logs, and services remain in SEAM-controlled infrastructure; generated source, tests, packaging, and runtime assets remain inside a job-specific directory under `generated_projects/`.

## Executable agents

| Agent | Owns | Does not own |
| --- | --- | --- |
| Analysis | requirement understanding, functional/non-functional requirements, domain analysis | design, code, test verdicts, delivery |
| Planning & Design | roadmap, decomposition, architecture, schema, API and workflow specifications | implementation or task scheduling |
| Supervisor / Orchestrator | state, dependencies, priorities, task dispatch, result evaluation, failure/rework routing | domain design or feature implementation |
| Coding | approved source changes and implementation evidence | changing approved requirements, final QA approval, deployment release |
| QA | review, tests, static/security analysis, structured defect feedback | implementing fixes or releasing products |
| Delivery | documentation, package and deployment artifacts, final handoff | changing requirements or overriding QA gates |

Each agent exchanges versioned structured artifacts defined by the contract specification. An agent may read prerequisite artifacts but may write only artifacts assigned to its own responsibility. This keeps decisions traceable and prevents one agent from silently assuming another agent's role.

## Adaptive supervision

The Supervisor is a stateful scheduler, not a fixed linear pipeline. It persists a work graph containing artifacts, tasks, dependencies, priorities, attempts, QA verdicts, and rework links. From eligible tasks it chooses the next action according to dependencies, project risk, priority, agent availability, previous results, and QA feedback. Failures create explicit retry, escalation, or rework decisions with audit records.

An expected rework path is:

```text
QA verdict -> Supervisor records defect + affected artifact -> selects rework task
          -> Coding (or upstream Analysis/Planning when necessary) -> QA regression
```

QA never directly edits source and Coding never marks its own work accepted.

## Shared infrastructure

### LLM abstraction

`backend/llm/` will expose provider-neutral capabilities such as chat completion, structured output, embeddings, model metadata, and policy-based selection. Llama 3.1, DeepSeek-Coder, and Qwen2.5-Coder are configured providers, not assumptions embedded in agent code. Prompts, model selection, retry behavior, and cost/quality telemetry must be independently configurable.

### RAG and ChromaDB

RAG is shared infrastructure, not a seventh agent. `backend/rag/` will ingest approved project knowledge, retrieve grounded context, attach provenance, and manage ChromaDB collections. Agents may request contextual evidence through this boundary; they must not directly mutate vector storage or treat retrieval as authoritative project state.

### PostgreSQL and optional Redis

PostgreSQL is the durable system of record for projects, workflow state, tasks, artifacts, approvals, agent runs, and audit events. Redis may later provide ephemeral queues, locks, caching, and worker coordination; no durable project decision may depend solely on Redis.

### Execution and Docker

`backend/execution/` will be the constrained boundary for generated-project commands and test runs. `backend/deployment/` will build product-specific deployment artifacts. Docker/Compose files produced for a generated project stay with that product; SEAM's own compose configuration is separate. Execution must later enforce workspace isolation, resource limits, logs, and explicit allowlists.

## Communication and persistence

Agents communicate through Supervisor-managed commands and immutable, versioned artifact references—not direct calls that bypass workflow state. Every command includes a project ID, task ID, correlation ID, contract version, prerequisite references, and expected result type. Results include status, produced artifact references, evidence, and structured issues. PostgreSQL persists the authoritative event and state history.

## Cloud evolution

Deployment adapters will isolate local Docker Compose from future AWS, GCP, or Azure targets. Provider-neutral interfaces for object storage, secrets, job execution, networking, and observability allow the control plane to remain unchanged while workers and generated-product deployments move to managed services.
