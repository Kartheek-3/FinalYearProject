# SEAM — Self-Evolving Autonomous Multi-Agent Software Engineering Framework

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**SEAM** is a production-grade autonomous AI software-engineering platform and cloud-native IDE. Given a natural-language software brief and architectural constraints, SEAM autonomously analyzes requirements, generates system designs and task dependency graphs, orchestrates specialized software agents, generates source code, executes automated test suites, conducts static cybersecurity scans, autonomously remediates defects through QA-driven rework loops, packages containers, and deploys applications to live sandboxed Docker environments.

---

## 1. Project Overview & Research Motivation

### Problem Statement
Modern generative AI coding tools (e.g., chat assistants and inline copilot suggestions) operate primarily as passive, single-file autocomplete or isolated snippet generators. They lack:
1. **Holistic Lifecycle Autonomy**: End-to-end management spanning requirement analysis, multi-tier architectural planning, coding, QA, and containerized deployment.
2. **Deterministic Orchestration**: State-machine supervisors that enforce strict acyclic dependency graphs, prevent hallucinated task completion, and guard quality gates.
3. **Closed-Loop Autonomous Remediation**: Automatic detection of unit test regressions or security flaws with deterministic rework routing back to coding agents without human intervention.
4. **Shared Organizational Memory**: Systematic cross-project learning and institutional knowledge retention using grounded RAG and vector databases.

### Objectives & Key Contributions
- **Six-Agent Autonomous Architecture**: Clean role specialization dividing concerns across Analysis, Planning & Design, Supervisor Orchestrator, Coding, QA, and Delivery.
- **RAG + ChromaDB as Shared Infrastructure**: Shared organizational memory storing validated patterns, past project defect solutions, and architecture decisions—treated as shared infrastructure rather than an agent.
- **VS Code-Style Professional IDE**: Interactive web IDE featuring hierarchical file explorer, Monaco editor with breadcrumbs and split view, Command Palette (`Ctrl+Shift+P`), Quick Open (`Ctrl+P`), sandboxed multi-terminal PTY shell over WebSocket, and real-time agent timeline streaming.
- **Cryptographic Security & Multi-Tenancy**: Firebase Authentication integrated with server-side Firebase Admin ID token cryptographic verification and workspace filesystem isolation preventing path traversal.

---

## 2. System Architecture

```text
                                  +-------------------------------------------------------------+
                                  |              USER BRIEF & TECHNOLOGY STACK                  |
                                  +-------------------------------------------------------------+
                                                                 |
                                                                 v
                                  +-------------------------------------------------------------+
                                  |                     ANALYSIS AGENT                          |
                                  |   (Requirements, Domain Discovery, Non-Functional Criteria) |
                                  +-------------------------------------------------------------+
                                                                 |
                                                                 v
                                  +-------------------------------------------------------------+
                                  |                 PLANNING & DESIGN AGENT                     |
                                  | (Architecture, Schemas, APIs, Task Graph, Quality Criteria) |
                                  +-------------------------------------------------------------+
                                                                 |
                                                                 v
                                  +-------------------------------------------------------------+
          +---------------------> |                   SUPERVISOR AGENT                          | <---------------------+
          |                       | (Dynamic Orchestrator, Dependency Scheduler, Gate Verifier) |                       |
          |                       +-------------------------------------------------------------+                       |
          |                                                      |                                                      |
          |                                                      v                                                      |
          |                               +---------------------------------------------+                               |
          |                               |                 CODING AGENT                |                               |
          |                               |  (AST Generation, File Ops, Code Creation)  |                               |
          |                               +---------------------------------------------+                               |
          |                                                      |                                                      |
          |                                                      v                                                      |
          |                               +---------------------------------------------+                               |
          |                               |                   QA AGENT                  |                               |
          |                               | (Automated Tests, Cyber Security Analysis)  |                               |
          |                               +---------------------------------------------+                               |
          |                                                      |                                                      |
[REWORK_REQUIRED: Test/Security Defect]                          |                                                      |
          +------------------------------------------------------+                                                      |
                                                                 |                                                      |
                                                           [VERDICT: PASS]                                              |
                                                                 |                                                      |
                                                                 v                                                      |
                                  +-------------------------------------------------------------+                       |
                                  |                     DELIVERY AGENT                          |                       |
                                  |  (Dockerfile Packaging, Compose Config, Port Allocation)    |                       |
                                  +-------------------------------------------------------------+                       |
                                                                 |                                                      |
                                                                 v                                                      |
                                  +-------------------------------------------------------------+                       |
                                  |               DOCKER DEPLOYMENT PROVIDER                    |                       |
                                  |     (Container Build, Health Check HTTP 200, Live URL)      |                       |
                                  +-------------------------------------------------------------+                       |
                                                                 |                                                      |
                                                                 v                                                      |
                                  +-------------------------------------------------------------+                       |
                                  |              SHARED ORGANIZATIONAL MEMORY                   | ----------------------+
                                  |          (RAG + ChromaDB Cross-Project Ingestion)           |   (Context for future
                                  +-------------------------------------------------------------+     project cycles)
```

---

## 3. The Six Autonomous Agents

| Agent | Responsibility | Invariant / Boundary |
| :--- | :--- | :--- |
| **1. Analysis Agent** | Deconstructs user brief into domain entities, functional requirements, non-functional constraints, and tech stack boundaries. | Read-only with respect to code; does not write architecture or implementation code. |
| **2. Planning & Design Agent** | Emits multi-section blueprint: Foundation, Architecture, Database, APIs, Workflows, Project Structure, Execution Graph, Traceability. | Generates acyclic implementation task graph with prerequisite mappings. |
| **3. Supervisor** | Stateful orchestration brain. Evaluates task readiness, enforces attempt/rework thresholds, dispatches agents, and acts on QA verdicts. | Never writes code directly; maintains audit record of all agent transitions. |
| **4. Coding Agent** | Performs atomic file operations (`CREATE`, `UPDATE`, `DELETE`) inside physical sandboxed project directory. | Changes restricted exclusively to authorized project root under `generated_projects/<id>`. |
| **5. QA Agent** | Executes automated test runner, static code analysis, secret detection, and cybersecurity vulnerability checks. | Read-only on source files; cannot mark its own tests accepted or modify code directly. |
| **6. Delivery Agent** | Generates production Dockerfiles and Compose configurations, coordinates image build, and verifies container HTTP health. | Triggers only after all tasks pass QA gate verification. |

> **Shared Infrastructure:** **RAG + ChromaDB** is the shared organizational knowledge repository. It stores past project solutions, architectural patterns, and verified defect fixes. It is infrastructure, **not** an agent.

---

## 4. IDE Feature Set

- **VS Code Interaction Model**:
  - **Activity Bar**: Fast switching between Explorer, Global Search, Source Control, Agents, MCP Connectors, and Settings.
  - **Project Explorer**: Full hierarchical directory tree, file icons, context menus (New File, New Folder, Rename, Delete, Copy Path), pinned files, and real-time generation indicators.
  - **Monaco Code Editor**: Syntax highlighting, breadcrumb path navigation (`workspace › src › api.py`), split editor groups (side-by-side or stacked), dirty indicators, and automatic code formatting.
  - **Command Palette (`Ctrl+Shift+P` / `⌘+Shift+P`)**: Instant fuzzy search across IDE commands and autonomous workflow actions.
  - **Quick Open (`Ctrl+P`)**: Fast path-based file opening directly into Monaco tabs.
  - **Interactive Sandboxed Terminal**: Real bidirectional XTerm.js terminal connected via FastAPI WebSocket to local subprocess PTYs restricted strictly inside `generated_projects/<project_id>`.
  - **Agent Orchestrator Panel**: Granular 8-stage progress tracker with real WebSocket event stream, active task monitor, test breakdown, and cybersecurity scan results.

---

## 5. Technology Stack

- **Frontend**: React 19, TypeScript 5.9, Vite, TailwindCSS, Monaco Editor (`@monaco-editor/react`), XTerm.js, Framer Motion, Lucide Icons, Zustand state management.
- **Backend**: Python 3.12, FastAPI, Uvicorn, Pydantic v2, Docker SDK for Python, Firebase Admin SDK.
- **Storage & Memory**: Local filesystem sandbox, ChromaDB vector store, SQLite/JSON state storage.
- **LLM Abstraction**: Provider-neutral layer supporting local Ollama (`qwen2.5-coder`, `llama3.1`) or remote OpenAI-compatible endpoints with automated JSON repair strategies.

---

## 6. Installation & Quick Start

### Prerequisites
- **Python 3.12+**
- **Node.js 20+** & npm
- **Docker Desktop** (running locally)
- **Ollama** (optional for local LLM inference)

### 1. Clone Repository
```bash
git clone https://github.com/Kartheek-3/FinalYearProject.git
cd FinalYearProject
```

### 2. Configure Environment Files
Create root `.env` from template:
```bash
cp .env.example .env
```
*(Optionally set `FIREBASE_PROJECT_ID=seam-88c97` and your LLM parameters).*

Create frontend `.env` from template:
```bash
cp frontend/.env.example frontend/.env
```
*(Populate your Firebase web client credentials).*

### 3. Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux / macOS

# Install backend dependencies
pip install -r requirements.txt
```

### 4. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

---

## 7. Running the Platform

### Start Backend API Server
```bash
python -m uvicorn backend.main:app --port 8000 --host 127.0.0.1
```
- API Health Check: `http://127.0.0.1:8000/health`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Start Frontend Dev Server
```bash
cd frontend
npm run dev
```
- Open browser at `http://localhost:5173`

---

## 8. Verified Academic Test Results

All verification suites were executed against the release candidate:

| Verification Suite | Target Component | Command | Result |
| :--- | :--- | :--- | :--- |
| **Backend Unit & Flow Tests** | Agents, Lifecycle, Repair, RAG, Docker | `python -m unittest discover -s tests -p "test_*.py"` | **33 / 33 PASSED (100%)** |
| **Backend Security & Auth** | Token verification, ownership, WebSocket WS 1008 | `python -m unittest tests/test_firebase_backend_auth.py` | **7 / 7 PASSED (100%)** |
| **Frontend TypeScript** | Full IDE TypeScript build check | `npx tsc -b` (in `frontend/`) | **0 Errors (PASS)** |
| **Frontend Production Bundle** | Vite production code optimization | `npm run build` (in `frontend/`) | **PASS (`dist/` generated)** |
| **Docker Deployment E2E** | Container build, port allocation, health check | Automated Lifecycle Execution | **HTTP 200 OK (LIVE)** |

---

## 9. Security & Sandboxing Guarantees

1. **Cryptographic Authentication**: Firebase ID tokens are cryptographically verified using Firebase Admin; client-provided UIDs are never trusted.
2. **Project Ownership Isolation**: Requests for projects owned by other users return `HTTP 403 Forbidden` on REST routes and `WS 1008 Policy Violation` on WebSocket streams.
3. **Filesystem Sandbox Boundary**: The `GeneratedProjectWorkspace` class strictly validates all target paths against `generated_projects/<project_id>`, rejecting directory traversal (`..`).
4. **Terminal Sandbox**: Interactive shell processes are launched with `cwd` bound to `generated_projects/<project_id>`. Traversal commands outside root are blocked.
5. **Docker Security Limits**: Dynamic host port allocation (range 10000–20000), 512MB RAM memory limit, and 1.0 CPU quota per running project container.

---

## 10. Demonstration & Project Request Flow

To experience the complete autonomous pipeline:
1. Navigate to `http://localhost:5173` and click **Get Started** or **Start Building**.
2. Sign up or log in via Firebase Authentication.
3. On the Dashboard, click **+ New Project** and enter a prompt:
   > *"Build a Smart Service Booking Platform web application with user authentication, service catalog, provider scheduling, booking management, responsive dashboard, FastAPI backend, SQLite database, and Docker deployment."*
4. Click **Create Project** to transition to the SEAM IDE.
5. Watch the **Analysis Agent**, **Planning Agent**, **Supervisor**, **Coding Agent**, **QA Agent**, and **Delivery Agent** execute in real time.
6. Observe source files appearing in the **Project Explorer**, auto-opening in **Monaco**, test logs in **Testing**, vulnerabilities in **Security**, and click **Application Preview** to interact with the running container.

---

## 11. Limitations & Future Work

- **Multi-Node Cluster Orchestration**: Current deployment uses local Docker daemon; future versions will target Kubernetes (EKS/GKE) via provider plugins.
- **Expanded Language Runtimes**: Out-of-the-box support focuses on Python (FastAPI), TypeScript/JavaScript (React/Node), and SQLite/PostgreSQL; C++ and Rust pipelines are planned.
- **Collaborative Multi-User Editing**: Current IDE supports single-owner multi-tenancy; real-time CRDT collaborative editing is a future research objective.

---

## 12. Academic Citation & License

This project was developed as a Final Year Capstone Project in Autonomous Multi-Agent Software Engineering Systems.

Distributed under the **MIT License**.
