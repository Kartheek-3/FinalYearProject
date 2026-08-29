# SEAM Agent Contract Specification (v0.1)

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

The Analysis Agent's initial typed schemas now live in `backend/agents/analysis/models.py`. They enforce the Analysis input and output boundary and return an `AnalysisArtifact` envelope ready for later persistence. Cross-agent command/result schemas remain deferred until the Supervisor and the other agent contracts are implemented.
