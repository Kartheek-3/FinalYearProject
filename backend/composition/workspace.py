"""Safe provisioning/opening of per-project generated-product workspaces."""

from __future__ import annotations

from pathlib import Path
import re

from backend.agents.coding.workspace import GeneratedProjectWorkspace
from backend.composition.errors import CompositionError
from backend.composition.models import ProjectWorkspaceReference


class WorkspaceProvisioningError(CompositionError):
    """Raised when a project workspace cannot be safely provisioned or opened."""


class ProjectWorkspaceProvisioner:
    """Creates only ``generated_projects/<project_id>/`` roots under SEAM control."""

    _PROJECT_ID = re.compile(r"^prj_[a-z0-9_]{8,64}$")

    def __init__(self, generated_projects_root: Path) -> None:
        self._root = generated_projects_root.resolve()

    def provision(self, project_id: str) -> ProjectWorkspaceReference:
        self._validate_project_id(project_id)
        if not self._root.is_dir():
            raise WorkspaceProvisioningError("Generated-projects root is unavailable.")
        candidate = (self._root / project_id).resolve()
        try:
            candidate.relative_to(self._root)
        except ValueError as exc:
            raise WorkspaceProvisioningError("Project workspace escapes generated-projects root.") from exc
        if candidate.exists():
            raise WorkspaceProvisioningError(f"Project workspace already exists: '{project_id}'.")
        try:
            candidate.mkdir()
        except OSError as exc:
            raise WorkspaceProvisioningError("Unable to create generated-project workspace.") from exc
        return ProjectWorkspaceReference(project_id=project_id, relative_path=project_id)

    def open(self, reference: ProjectWorkspaceReference) -> GeneratedProjectWorkspace:
        self._validate_project_id(reference.project_id)
        if reference.relative_path != reference.project_id:
            raise WorkspaceProvisioningError("Workspace reference does not match its project identity.")
        return GeneratedProjectWorkspace(self._root / reference.relative_path, self._root, reference.project_id)

    @classmethod
    def _validate_project_id(cls, project_id: str) -> None:
        if not cls._PROJECT_ID.fullmatch(project_id):
            raise WorkspaceProvisioningError("Project ID has an invalid workspace-safe format.")
