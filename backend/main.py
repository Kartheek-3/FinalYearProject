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

from pydantic import BaseModel, Field
from fastapi import Body, Depends
from backend.auth import AuthenticatedUser, get_current_user, get_ws_current_user

class FileCreateRequest(BaseModel):
    path: str = Field(min_length=1)
    content: str = ""

class FileWriteRequest(BaseModel):
    content: str

class FolderCreateRequest(BaseModel):
    path: str = Field(min_length=1)

class RenameRequest(BaseModel):
    old_path: str = Field(min_length=1)
    new_path: str = Field(min_length=1)


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

    async def verify_project_access(project_id: str, current_user: AuthenticatedUser) -> ProjectAggregate:
        """Verifies project exists and current_user has access. Raises 404 or 403."""
        try:
            aggregate = await lifecycle.get_project(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        # If project has an assigned owner, restrict to that user
        if aggregate.owner_id and aggregate.owner_id != current_user.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not own this project.",
            )
        return aggregate

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "seam-backend"}

    @app.get("/projects", response_model=list[ProjectAggregate])
    async def list_projects_endpoint(current_user: AuthenticatedUser = Depends(get_current_user)) -> list[ProjectAggregate]:
        try:
            return await lifecycle.list_projects(owner_id=current_user.uid)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    @app.post("/projects", response_model=ProjectAggregate, status_code=status.HTTP_201_CREATED)
    async def create_project(
        project_input: ProjectInput,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> ProjectAggregate:
        try:
            return await lifecycle.create_project(project_input, owner_id=current_user.uid)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    active_project_runs: set[str] = set()
    active_runs_lock = asyncio.Lock()

    @app.post("/projects/{project_id}/run", status_code=status.HTTP_202_ACCEPTED)
    async def run_autonomous_project(
        project_id: str,
        background_tasks: BackgroundTasks,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        await verify_project_access(project_id, current_user)

        async with active_runs_lock:
            if project_id in active_project_runs:
                return {"status": "accepted", "message": "Autonomous run already in progress."}
            active_project_runs.add(project_id)

        async def run_and_cleanup(pid: str):
            try:
                await lifecycle.run_autonomous(pid)
            finally:
                async with active_runs_lock:
                    active_project_runs.discard(pid)

        background_tasks.add_task(run_and_cleanup, project_id)
        return {"status": "accepted", "message": "Autonomous run started."}

    @app.websocket("/ws/projects/{project_id}/runtime")
    async def websocket_runtime(websocket: WebSocket, project_id: str):
        # Authenticate token before accepting connection
        current_user = await get_ws_current_user(websocket)

        # Authorize project ownership
        try:
            aggregate = await lifecycle.get_project(project_id)
            if aggregate.owner_id and aggregate.owner_id != current_user.uid:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Access denied to project")
                return
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Project not found")
            return

        await websocket.accept()
        # Replay persisted history first so client immediately syncs
        for hist_event in event_gateway.get_history(project_id):
            await websocket.send_json(hist_event.model_dump())

        queue = event_gateway.subscribe(project_id)
        try:
            while True:
                event = await queue.get()
                await websocket.send_json(event.model_dump())
        except WebSocketDisconnect:
            pass
        finally:
            event_gateway.unsubscribe(project_id, queue)

    @app.websocket("/ws/projects/{project_id}/terminal")
    async def websocket_terminal(websocket: WebSocket, project_id: str):
        current_user = await get_ws_current_user(websocket)
        try:
            aggregate = await lifecycle.get_project(project_id)
            if aggregate.owner_id and aggregate.owner_id != current_user.uid:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Access denied to project")
                return
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Project not found")
            return

        await websocket.accept()

        # Resolve isolated project directory
        workspace_dir = (lifecycle._provisioner._root / project_id).resolve()
        if not workspace_dir.exists():
            workspace_dir.mkdir(parents=True, exist_ok=True)

        import sys
        import shlex

        # Welcome banner
        rel_path = f"generated_projects/{project_id}"
        await websocket.send_text(f"\x1b[1;36mSEAM Sandboxed Terminal — {rel_path}\x1b[0m\r\n")
        await websocket.send_text(f"\x1b[90mWorking directory: {workspace_dir}\x1b[0m\r\n\r\n")
        prompt = f"\x1b[1;32mseam@{project_id[:12]}\x1b[0m:\x1b[1;34m~/{project_id}\x1b[0m$ "
        await websocket.send_text(prompt)

        cmd_buffer = ""

        try:
            while True:
                data = await websocket.receive_text()

                # Handle Enter / Carriage return
                if data in ("\r", "\n"):
                    await websocket.send_text("\r\n")
                    raw_cmd = cmd_buffer.strip()
                    cmd_buffer = ""

                    if raw_cmd:
                        if raw_cmd == "clear":
                            await websocket.send_text("\x1b[2J\x1b[H")
                        elif raw_cmd.startswith("cd "):
                            # Restrict cd outside of sandbox
                            target = raw_cmd[3:].strip()
                            if ".." in target or "/" in target or "\\" in target:
                                await websocket.send_text("\x1b[31m[Sandbox Notice] Directory traversal outside project root is restricted.\x1b[0m\r\n")
                            else:
                                await websocket.send_text(f"\x1b[90mChanged directory to {target}\x1b[0m\r\n")
                        else:
                            # Execute command sandboxed strictly within workspace_dir
                            try:
                                proc = await asyncio.create_subprocess_shell(
                                    raw_cmd,
                                    cwd=str(workspace_dir),
                                    stdout=asyncio.subprocess.PIPE,
                                    stderr=asyncio.subprocess.PIPE,
                                    shell=True,
                                )
                                stdout, stderr = await proc.communicate()

                                if stdout:
                                    # Send stdout lines
                                    out_text = stdout.decode("utf-8", errors="replace").replace("\n", "\r\n")
                                    await websocket.send_text(out_text)
                                if stderr:
                                    err_text = stderr.decode("utf-8", errors="replace").replace("\n", "\r\n")
                                    await websocket.send_text(f"\x1b[31m{err_text}\x1b[0m")

                                await websocket.send_text(f"\x1b[90m[Process exited with code {proc.returncode}]\x1b[0m\r\n")
                            except Exception as run_err:
                                await websocket.send_text(f"\x1b[31mExecution error: {run_err}\x1b[0m\r\n")

                    await websocket.send_text(prompt)

                # Handle Backspace
                elif data in ("\x08", "\x7f"):
                    if len(cmd_buffer) > 0:
                        cmd_buffer = cmd_buffer[:-1]
                        await websocket.send_text("\b \b")

                # Handle Ctrl+C
                elif data == "\x03":
                    cmd_buffer = ""
                    await websocket.send_text("^C\r\n")
                    await websocket.send_text(prompt)

                # Handle normal characters
                elif len(data) == 1 and ord(data) >= 32:
                    cmd_buffer += data
                    await websocket.send_text(data)

                # Handle pasted chunks
                elif len(data) > 1 and not data.startswith("\x1b"):
                    cmd_buffer += data
                    await websocket.send_text(data)

        except WebSocketDisconnect:
            pass

    @app.get("/projects/{project_id}", response_model=ProjectAggregate)
    async def get_project(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> ProjectAggregate:
        return await verify_project_access(project_id, current_user)

    @app.post("/projects/{project_id}/execute-next-task", response_model=ProjectAggregate)
    async def execute_next_task(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> ProjectAggregate:
        await verify_project_access(project_id, current_user)
        try:
            return await lifecycle.execute_next_task(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/qa/{task_id}", response_model=ProjectAggregate)
    async def qa_task(
        project_id: str,
        task_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> ProjectAggregate:
        await verify_project_access(project_id, current_user)
        try:
            return await lifecycle.qa_task(project_id, task_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/run-next", response_model=ProjectAggregate)
    async def run_next_task(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> ProjectAggregate:
        await verify_project_access(project_id, current_user)
        try:
            return await lifecycle.run_next_task(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/run-until-blocked", response_model=ProjectAggregate)
    async def run_until_blocked(
        project_id: str,
        max_iterations: int = 20,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> ProjectAggregate:
        await verify_project_access(project_id, current_user)
        try:
            return await lifecycle.run_until_blocked(project_id, max_iterations=max_iterations)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/deploy", response_model=dict)
    async def deploy_project(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        await verify_project_access(project_id, current_user)
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
    async def rollback_project(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> ProjectAggregate:
        await verify_project_access(project_id, current_user)
        try:
            return await lifecycle.rollback_project(project_id)
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.get("/projects/{project_id}/files")
    async def get_files(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> list[str]:
        aggregate = await verify_project_access(project_id, current_user)
        workspace = lifecycle._provisioner.open(aggregate.workspace)
        return workspace.inspect_structure()

    @app.get("/projects/{project_id}/files/{path:path}")
    async def get_file_content(
        project_id: str,
        path: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        aggregate = await verify_project_access(project_id, current_user)
        try:
            workspace = lifecycle._provisioner.open(aggregate.workspace)
            content = workspace.read_file(path).content
            return {"path": path, "content": content}
        except CompositionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/files", status_code=status.HTTP_201_CREATED)
    async def create_file_endpoint(
        project_id: str,
        payload: FileCreateRequest = Body(...),
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        aggregate = await verify_project_access(project_id, current_user)
        try:
            workspace = lifecycle._provisioner.open(aggregate.workspace)
            workspace.create_file(payload.path, payload.content)
            return {"status": "created", "path": payload.path}
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    @app.put("/projects/{project_id}/files/{path:path}")
    async def save_file_content(
        project_id: str,
        path: str,
        payload: FileWriteRequest = Body(...),
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        aggregate = await verify_project_access(project_id, current_user)
        try:
            workspace = lifecycle._provisioner.open(aggregate.workspace)
            if workspace.exists(path):
                current_hash = workspace.read_file(path).content_hash
                workspace.update_file(path, payload.content, current_hash)
            else:
                workspace.create_file(path, payload.content)
            return {"status": "saved", "path": path}
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/folders", status_code=status.HTTP_201_CREATED)
    async def create_folder_endpoint(
        project_id: str,
        payload: FolderCreateRequest = Body(...),
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        aggregate = await verify_project_access(project_id, current_user)
        try:
            workspace = lifecycle._provisioner.open(aggregate.workspace)
            target = workspace._resolve_relative(payload.path)
            if target.exists():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder already exists")
            target.mkdir(parents=True, exist_ok=True)
            rel_dir = str(target.relative_to(workspace._root)).replace("\\", "/")
            from backend.agents.coding.workspace import _emit_sync
            _emit_sync(project_id, "folder.created", {"path": rel_dir})
            return {"status": "created", "path": rel_dir}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    @app.post("/projects/{project_id}/rename")
    async def rename_item_endpoint(
        project_id: str,
        payload: RenameRequest = Body(...),
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        aggregate = await verify_project_access(project_id, current_user)
        try:
            workspace = lifecycle._provisioner.open(aggregate.workspace)
            src = workspace._resolve_relative(payload.old_path)
            dest = workspace._resolve_relative(payload.new_path)
            if not src.exists():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source does not exist")
            if dest.exists():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Destination already exists")
            dest.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.move(str(src), str(dest))
            rel_old = str(src.relative_to(workspace._root)).replace("\\", "/")
            rel_new = str(dest.relative_to(workspace._root)).replace("\\", "/")
            from backend.agents.coding.workspace import _emit_sync
            _emit_sync(project_id, "file.deleted", {"path": rel_old})
            _emit_sync(project_id, "file.created", {"path": rel_new})
            return {"status": "renamed", "old_path": rel_old, "new_path": rel_new}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    @app.delete("/projects/{project_id}/files/{path:path}")
    async def delete_item_endpoint(
        project_id: str,
        path: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        aggregate = await verify_project_access(project_id, current_user)
        try:
            workspace = lifecycle._provisioner.open(aggregate.workspace)
            target = workspace._resolve_relative(path)
            if not target.exists():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
            from backend.agents.coding.workspace import _emit_sync
            if target.is_dir():
                import shutil
                shutil.rmtree(str(target))
                _emit_sync(project_id, "folder.deleted", {"path": path})
            else:
                target.unlink()
                _emit_sync(project_id, "file.deleted", {"path": path})
            return {"status": "deleted", "path": path}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    from backend.memory import get_memory_manager

    @app.get("/memory/stats")
    async def get_memory_stats(current_user: AuthenticatedUser = Depends(get_current_user)) -> dict:
        return get_memory_manager().get_stats()
        
    @app.get("/memory/recent")
    async def get_recent_memory(
        limit: int = 5,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> list[dict]:
        return get_memory_manager().get_recent(limit)

    @app.get("/projects/{project_id}/events")
    async def get_project_events(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> list[dict]:
        await verify_project_access(project_id, current_user)
        return [e.model_dump() for e in event_gateway.get_history(project_id)]

    @app.get("/projects/{project_id}/status")
    async def get_project_run_status(
        project_id: str,
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> dict:
        aggregate = await verify_project_access(project_id, current_user)
        async with active_runs_lock:
            is_running = project_id in active_project_runs
        return {
            "project_id": project_id,
            "is_running": is_running,
            "stage": aggregate.lifecycle.stage.value,
        }

    return app


app = create_app()

