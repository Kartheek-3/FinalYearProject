"""Minimal FastAPI composition for the first project-lifecycle milestone."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, status, BackgroundTasks, WebSocket, WebSocketDisconnect
import asyncio

from backend.composition.agents import build_agent_bundle
from backend.composition.dispatcher import AggregateDispatcher
from backend.composition.errors import CompositionError
from backend.composition.lifecycle import ProjectLifecycleService
from backend.composition.models import ProjectAggregate, ProjectInput
from backend.composition.repository import InMemoryProjectRepository
from backend.composition.workspace import ProjectWorkspaceProvisioner
from backend.composition.events import event_gateway
from backend.llm.factory import ModelClientRegistry


def build_lifecycle_service(registry: ModelClientRegistry | None = None) -> ProjectLifecycleService:
    """Compose a local in-memory lifecycle; callers may register real LLM clients."""

    client_registry = registry or ModelClientRegistry()
    repository = InMemoryProjectRepository()
    provisioner = ProjectWorkspaceProvisioner(Path(__file__).resolve().parents[1] / "generated_projects")
    agents = build_agent_bundle(client_registry)
    dispatcher = AggregateDispatcher(repository, provisioner, agents)
    return ProjectLifecycleService(repository, provisioner, agents, dispatcher)


from fastapi.middleware.cors import CORSMiddleware

def create_app(registry: ModelClientRegistry | None = None) -> FastAPI:
    app = FastAPI(title="SEAM", version="0.1.0")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    lifecycle = build_lifecycle_service(registry)
    app.state.lifecycle = lifecycle

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "seam-backend"}

    @app.post("/projects", response_model=ProjectAggregate, status_code=status.HTTP_201_CREATED)
    async def create_project(project_input: ProjectInput) -> ProjectAggregate:
        try:
            return await lifecycle.create_project(project_input)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/run", status_code=status.HTTP_202_ACCEPTED)
    async def run_autonomous_project(project_id: str, background_tasks: BackgroundTasks) -> dict:
        try:
            aggregate = await lifecycle.get_project(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
            
        background_tasks.add_task(lifecycle.run_autonomous, project_id)
        return {"status": "accepted", "message": "Autonomous run started."}

    @app.websocket("/ws/projects/{project_id}/runtime")
    async def websocket_runtime(websocket: WebSocket, project_id: str):
        await websocket.accept()
        queue = event_gateway.subscribe(project_id)
        try:
            while True:
                event = await queue.get()
                await websocket.send_json(event.model_dump())
        except WebSocketDisconnect:
            pass
        finally:
            event_gateway.unsubscribe(project_id, queue)

    @app.get("/projects/{project_id}", response_model=ProjectAggregate)
    async def get_project(project_id: str) -> ProjectAggregate:
        try:
            return await lifecycle.get_project(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/execute-next-task", response_model=ProjectAggregate)
    async def execute_next_task(project_id: str) -> ProjectAggregate:
        try:
            return await lifecycle.execute_next_task(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/qa/{task_id}", response_model=ProjectAggregate)
    async def qa_task(project_id: str, task_id: str) -> ProjectAggregate:
        try:
            return await lifecycle.qa_task(project_id, task_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/run-next", response_model=ProjectAggregate)
    async def run_next_task(project_id: str) -> ProjectAggregate:
        try:
            return await lifecycle.run_next_task(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/run-until-blocked", response_model=ProjectAggregate)
    async def run_until_blocked(project_id: str, max_iterations: int = 20) -> ProjectAggregate:
        try:
            return await lifecycle.run_until_blocked(project_id, max_iterations=max_iterations)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/deploy", response_model=dict)
    async def deploy_project(project_id: str) -> dict:
        try:
            aggregate = await lifecycle.deploy_project(project_id)
            result = aggregate.delivery_result
            return {
                "project_id": project_id,
                "status": result.delivery_status.value if result else "unknown",
                "url": str(result.project_url) if result and result.project_url else None,
                "container_name": result.service_references[0] if result and result.service_references else None,
                "image": result.image_references[0] if result and result.image_references else None,
                "host_port": int(result.metadata.get("host_port", 0)) if result and "host_port" in result.metadata else None
            }
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/rollback", response_model=ProjectAggregate)
    async def rollback_project(project_id: str) -> ProjectAggregate:
        try:
            return await lifecycle.rollback_project(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    from backend.memory import get_memory_manager

    @app.get("/memory/stats")
    async def get_memory_stats() -> dict:
        return get_memory_manager().get_stats()
        
    @app.get("/memory/recent")
    async def get_recent_memory(limit: int = 5) -> list[dict]:
        return get_memory_manager().get_recent(limit)

    return app


app = create_app()
