# SEAM Agent Contract Specification (v0.1)

> **Status:** BUILD COMPLETE. All agent boundaries, Supervisor lifecycle, orchestration limits, and composition layers are implemented as specified below. Runtime LLM execution is pending a separate testing milestone.
## Common contract rules

Every agent command and result is versioned and contains `project_id`, `task_id`, `correlation_id`, `contract_version`, timestamp, actor identity, artifact references, status, and evidence. Artifacts are immutable and addressed by ID/version; state transitions are written by the Supervisor to PostgreSQL. Agents must return structured validation errors rather than silently making cross-boundary decisions.

| Agent | Purpose and allowed responsibility | Expected input | Expected output / artifacts | Must not perform | Dependencies and state |
| --- | --- | --- | --- | --- | --- |
| Analysis | Turn the approved project brief into a grounded requirement analysis: functional and non-functional requirements, domain, assumptions, risks, ambiguities, and acceptance criteria. | Project brief, required stack, stakeholder constraints, approved knowledge references. | Requirement analysis, domain model, assumption/ambiguity register, requirement-to-acceptance mapping. | Architecture decisions, coding, test execution, release approval. | Requires a created project and input brief. Reads approved knowledge. Stores artifact references and analysis status. |
| Planning & Design | Transform approved requirements into an implementable plan and technical design. | Approved analysis and constraints. | Roadmap, task graph, architecture, project structure, database schema, API specifications, workflow design. | Modifying requirements, source generation, scheduling, QA approval. | Requires approved analysis. Stores plan/design versions, dependencies, and approval status. |
| Supervisor / Orchestrator | Maintain workflow state and adaptively choose, assign, evaluate, retry, or rework tasks. | Project state, task graph, artifact statuses, agent capability/availability, QA feedback. | Task commands, assignments, decisions, state transitions, audit events, rework links. | Creating requirements/design/code/test evidence in place of specialist agents. | Requires PostgreSQL persistence. Owns task lifecycle, dependency state, attempts, and routing decisions. |
| Coding | Implement approved work in the assigned generated-project workspace and report change evidence. | Approved task, applicable design/API/schema artifacts, workspace reference, prior rework instructions. | Source diff/commit reference, implementation manifest, local check evidence, changed-artifact references. | Altering approved scope, accepting its own changes, direct production deployment. | Requires an assigned eligible task and isolated workspace. Reports execution status and change provenance. |
| QA | Independently evaluate deliverables through review, tests, regression, static analysis, and security analysis; describe rework precisely. | Implementation artifact, approved requirements/design, test context, prior QA history. | QA report, test evidence, static/security findings, verdict (`pass`, `fail`, `blocked`), structured rework requests. | Implementing fixes, rewriting requirements, release decision outside its verdict. | Requires an implementation artifact and testable workspace. Persists findings, coverage/evidence, verdict, and affected artifacts. |
| Delivery | Produce technical/API/user documentation, package the approved product, and create deployment artifacts for handoff. | QA-passed product artifacts, release constraints, product configuration. | Documentation set, package manifest, Docker/deployment artifacts, delivery report. | Reworking source, bypassing QA, changing requirements/design. | Requires QA pass and release-eligible state. Persists artifact manifests, versions, checksums, and delivery status. |

## Communication requirements

1. Agents receive work only through Supervisor-issued task commands once orchestration is implemented.
2. Each result declares its consumed and produced artifact IDs, plus any blockers, risks, and confidence/evidence.
3. An agent may request clarification or rework but cannot mutate another agent's artifact or workflow status.
4. The Supervisor validates contract version, dependencies, and artifact compatibility before accepting a result.
5. QA failures return to the Supervisor; it decides whether Coding or an upstream agent must rework the affected artifact.

## Future typed interfaces

The Analysis Agent's typed schemas live in `backend/agents/analysis/models.py`. The Planning & Design Agent's schemas live in `backend/agents/planning/models.py`; its `PlanningRequest` consumes the existing `AnalysisArtifact` and its `PlanningArtifact` preserves source artifact version metadata for later persistence. The Supervisor foundation consumes `PlanningArtifact` in `backend/agents/supervisor/`, creating an in-memory `ProjectExecutionState` with dependency-derived task eligibility. It exposes typed dispatch, agent-result, QA-feedback, artifact, execution-history, and future persistence contracts without implementing the Coding, QA, or Delivery agents.

## Supervisor / Orchestrator contract

The Supervisor initializes from a `PlanningArtifact` and retains its `ImplementationTask` graph. Task status is controlled by the state machine: `pending -> ready|blocked`, `ready -> in_progress`, `in_progress -> completed|failed|rework_required`, `completed -> rework_required`, and `rework_required|failed -> ready|blocked`; cancellation is allowed only before terminal completion. Invalid transitions are rejected and recorded transitions are immutable audit entries.

Eligibility is deterministic: a task is eligible only when it is `ready` and every planned dependency is `completed`. Multiple tasks can be eligible. The deterministic selector ranks eligible tasks by rework need, requirement priority, unresolved QA severity, prior attempts, then task ID, returning an auditable `NextTaskDecision` rather than a fixed pipeline step. A future LLM advisory layer may augment this ranking but can never replace dependency/state checks.

`AgentDispatcher` is a protocol only. It will later receive `AgentDispatchCommand` and route it to the appropriate agent. `AgentExecutionResult` brings status, artifacts, timing, errors, and metadata back to the Supervisor. Each accepted result creates an `ExecutionRecord`, while every status change creates a `TaskTransitionRecord`; both remain in `ProjectExecutionState` along with typed `ArtifactReference` entries. Failed tasks require an explicit Supervisor retry decision, which increments retry state before they can run again.

QA will submit typed `QAFeedback` and `QAIssue` records; rework feedback transitions the affected completed or active task to `rework_required`, increments its rework count and project iteration, and preserves the feedback/artifact history for later Coding-to-QA cycles. `DecisionAdvisor` is a future non-binding contextual/LLM boundary; it cannot override deterministic eligibility or state transition rules.

## Coding Agent contract

The Coding Agent consumes a Supervisor `AgentDispatchCommand` addressed to `coding`, retaining the Planning Agent's exact `ImplementationTask`, plan/design context, task requirement IDs, acceptance criteria IDs, and any targeted QA feedback. It also requires the corresponding typed functional requirements and acceptance criteria; it never accepts raw user requirements as its primary instruction.

The LLM produces a `CodingProposal` containing typed `CodeChange` records only. Each change has a relative product-workspace path, constrained operation (`create`, `update`, or explicitly approved `delete`), task/requirement links, reason, and a current-content hash for updates/deletes. `ChangeValidator` deterministically rejects conflicting paths, stale updates, operations outside task requirements, missing/existing file mismatches, and non-approved deletes before any write is attempted.

`GeneratedProjectWorkspace` is the only local workspace implementation exposed to the Coding Agent. It requires an existing project directory strictly below the SEAM `generated_projects/` container, rejects absolute or traversal paths and resolved symlink escapes, and supports only list/read/create/update/delete operations. It does not expose shell execution. Updates/deletes require the current content hash supplied in task-scoped context. All changes are validated before the first write; a later file-operation failure triggers rollback of already applied changes or returns an explicit rollback failure. Source files remain in the generated product; the Coding Agent returns Supervisor-compatible `CodingResult`/`AgentExecutionResult` plus `ArtifactReference` entries instead of modifying SEAM source or workflow state.

For rework, the Supervisor includes `QAFeedback` in its dispatch command. The Coding prompt and task-scoped context include that feedback, so changes remain targeted to the affected task rather than regenerating the product. Any validation, provider, or workspace failure yields a structured failed `CodingResult`; no later changes are attempted.

## QA Agent contract

The QA Agent consumes typed `AnalysisArtifact`, `PlanningArtifact`, approved implementation tasks, Coding-generated artifact references, and prior QA issues. It accepts only a `ReadOnlyWorkspace` protocol exposing list, structure, existence, and read operations; QA has no mutation method and never modifies generated source, SEAM source, deployment configuration, or workflow state.

`QAReport` contains a machine-readable verdict (`pass`, `fail`, `rework_required`, or `blocked`), checks, rich QA issues, requirement and acceptance-criteria results, test/static/security/regression results, evidence artifacts, summary, and metadata. Every `QAIssue` has an enum category/severity, affected task/artifact/requirement/acceptance links, failure reason, rework flag, remediation, evidence, and reproducibility data. Security remains a QA category, not a separate agent.

Requirement and acceptance checks are traced deterministically through approved tasks. The QA Agent never reports unexecuted required behavior as passing. Read-only source review uses the optional `CodeReviewProvider` protocol; `LLMCodeReviewProvider` is a provider-neutral implementation using `StructuredLLMClient` and a configurable QA model, while conventional review tools can implement the same protocol. Unit, integration, static-analysis, and security checks are submitted only through the future `ValidationExecutionProvider` protocol (with dedicated static/security provider protocols); absent or failed execution yields a blocked check. Regression compares prior rework issues with current findings and is explicitly not applicable or not executed when no controlled regression execution exists.

`QAReport.to_supervisor_feedback(task_id)` adapts rich QA findings to the existing Supervisor `QAFeedback`/`QAIssue` contract. A `rework_required` report maps to Supervisor failure feedback with per-task issues, allowing the existing Supervisor state machine to route the task back to Coding. No Supervisor redesign is required.

## Delivery Agent contract

The Delivery Agent consumes a Supervisor `AgentDispatchCommand` addressed to `delivery`, project state, Analysis/Planning artifacts, Coding artifact references, a `QAReport`, and provider-neutral deployment configuration. Its deterministic QA gate permits preparation only when `QAReport.verdict` is `pass`; `fail`, `rework_required`, and `blocked` return a structured blocked `DeliveryResult` and do not invoke a provider.

`DeliveryRequest` currently supports Docker configuration through typed services, Dockerfiles, relative build contexts, startup commands, environment-variable references (names/descriptions only; never values), port mappings, service dependencies, and optional Compose configuration. Multi-service requests require Compose. Docker validation rejects workspace escapes through the existing generated-project boundary, missing source/deployment artifacts, unsafe parent-directory Dockerfile copy/add operations, apparent embedded secrets, unsafe Compose volume/path references, invalid/duplicate host ports, and runtime choices inconsistent with approved technology choices.

`DeliveryAgent.prepare()` performs no Docker build, container launch, shell execution, or deployment. It may create only explicitly supplied Dockerfile/Compose content inside the generated-project workspace and returns a `prepared` result plus `ArtifactReference` records. `DeliveryResult` is compatible with the Supervisor `AgentExecutionResult` and carries target/status, image/service/deployment references, provider-supplied project URL, exposed ports, artifacts, logs, warnings, and errors. URLs are provider metadata, never hard-coded to localhost.

`DeploymentProvider` and `ControlledDeploymentEnvironment` define future controlled build/deploy and rollback interfaces. Docker is the sole concrete configuration target in this phase. The same provider interface can later be implemented by AWS, GCP, or Azure adapters without changing Delivery Agent business logic; no cloud provider or Docker CLI integration is implemented now.

## Backend composition contract

`ProjectAggregate` in `backend/composition/` owns a project ID and associates the otherwise project-ID-free `AnalysisArtifact` with its `PlanningArtifact`, Supervisor `ProjectExecutionState`, generated workspace reference, artifacts, QA reports, and Delivery result. `InMemoryProjectRepository` persists that aggregate at lifecycle boundaries and is intentionally replaceable by a future PostgreSQL repository.

The lifecycle service creates a safe `generated_projects/<project-id>/` workspace, runs Analysis, runs Planning with the aggregate project ID, validates that the planned task graph is acyclic, and initializes the existing Supervisor. `execute_next_task()` uses the stored Analysis Artifact to resolve the exact functional requirements and acceptance criteria needed by the selected Coding task; unknown IDs are rejected before Coding is invoked.

`AggregateDispatcher` implements the existing Supervisor dispatcher protocol for Coding, QA, and Delivery. It enriches commands from aggregate state instead of changing task models. Coding returns its native `CodingResult` and is applied through the existing Supervisor result path. QA and Delivery boundaries are prepared through adapters; controlled QA execution and Docker provider execution remain external. `ModelClientRegistry` is the provider-neutral composition boundary for configured LLM clients. The FastAPI composition exposes only `GET /health` and `POST /projects` in this milestone.
