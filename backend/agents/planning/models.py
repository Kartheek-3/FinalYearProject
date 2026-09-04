"""Versioned, machine-readable contracts owned by the Planning & Design Agent."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import Field, model_validator
from typing import Any

from backend.agents.analysis.models import (
    AnalysisArtifact,
    ContractModel,
    Identifier,
    NonEmptyText,
    RequirementPriority,
)


class PlanningRequest(ContractModel):
    """Planning input; requirements must arrive through Agent 1's artifact."""

    analysis_artifact: AnalysisArtifact
    project_id: str | None = Field(default=None, min_length=1)


class TaskType(StrEnum):
    FOUNDATION = "foundation"
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASE = "database"
    API = "api"
    INTEGRATION = "integration"
    SECURITY = "security"
    DOCUMENTATION = "documentation"
    CONFIGURATION = "configuration"
    DEPLOYMENT = "deployment"


class TaskStatus(StrEnum):
    PLANNED = "planned"


class ImplementationTask(ContractModel):
    """A dependency-aware unit of work, not an execution instruction."""

    task_id: Identifier
    title: NonEmptyText = "Unknown Task"
    description: NonEmptyText = "No description provided."
    task_type: TaskType = TaskType.BACKEND
    priority: RequirementPriority = RequirementPriority.MUST
    dependencies: list[Identifier] = Field(default_factory=list)
    requirement_ids: list[Identifier] = Field(default_factory=list)
    expected_artifacts: list[NonEmptyText] = Field(default_factory=list)
    acceptance_criteria: list[Identifier] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.PLANNED


class RoadmapPhase(ContractModel):
    phase_id: Identifier
    title: NonEmptyText
    objective: NonEmptyText
    task_ids: list[Identifier] = Field(default_factory=list)
    completion_outcome: NonEmptyText


class ComponentDesign(ContractModel):
    component_id: Identifier
    name: NonEmptyText
    responsibility: NonEmptyText
    technology: NonEmptyText
    requirement_ids: list[Identifier] = Field(default_factory=list)
    provided_interfaces: list[NonEmptyText] = Field(default_factory=list)
    depends_on_components: list[Identifier] = Field(default_factory=list)


class ComponentRelationship(ContractModel):
    source_component_id: Identifier
    target_component_id: Identifier
    relationship: NonEmptyText
    interaction: NonEmptyText


class DataFlow(ContractModel):
    flow_id: Identifier
    description: NonEmptyText
    source_component_id: Identifier
    target_component_id: Identifier
    data_description: NonEmptyText


class ExternalDependency(ContractModel):
    name: NonEmptyText
    purpose: NonEmptyText
    integration_boundary: NonEmptyText
    requirement_ids: list[Identifier] = Field(default_factory=list)


class TechnologyChoice(ContractModel):
    technology: NonEmptyText
    purpose: NonEmptyText
    selection_rationale: NonEmptyText
    source_constraint_technology: NonEmptyText


class ArchitectureDesign(ContractModel):
    style: str = "Unknown Architecture"
    overview: str = "No overview provided."
    components: list[ComponentDesign] = Field(default_factory=list)
    component_relationships: list[ComponentRelationship] = Field(default_factory=list)
    data_flows: list[DataFlow] = Field(default_factory=list)
    external_dependencies: list[ExternalDependency] = Field(default_factory=list)
    technology_choices: list[TechnologyChoice] = Field(default_factory=list)


class DatabaseField(ContractModel):
    name: NonEmptyText
    data_type: NonEmptyText
    nullable: bool = True
    description: NonEmptyText
    default_value: str | None = None

    @model_validator(mode="before")
    @classmethod
    def coerce_default_value(cls, data: Any) -> Any:
        if isinstance(data, dict):
            val = data.get("default_value")
            if val is not None and not isinstance(val, str):
                if isinstance(val, bool):
                    data["default_value"] = "true" if val else "false"
                else:
                    data["default_value"] = str(val)
        return data


class DatabaseForeignKey(ContractModel):
    field_name: NonEmptyText
    references_entity: NonEmptyText
    references_field: NonEmptyText
    on_delete: str | None = None


class DatabaseEntity(ContractModel):
    entity_name: NonEmptyText
    purpose: NonEmptyText
    fields: list[DatabaseField] = Field(default_factory=list)
    primary_key: str = "id"
    foreign_keys: list[DatabaseForeignKey] = Field(default_factory=list)
    relationships: list[NonEmptyText] = Field(default_factory=list)
    constraints: list[NonEmptyText] = Field(default_factory=list)
    indexes: list[NonEmptyText] = Field(default_factory=list)
    requirement_ids: list[Identifier] = Field(default_factory=list)


class DatabaseDesign(ContractModel):
    persistence_required: bool = True
    rationale: str = "No rationale provided."
    entities: list[DatabaseEntity] = Field(default_factory=list)


class ApiField(ContractModel):
    name: NonEmptyText
    data_type: NonEmptyText
    required: bool = False
    description: NonEmptyText


class ApiErrorCondition(ContractModel):
    status_code: int = Field(ge=400, le=599)
    condition: NonEmptyText


class ApiEndpoint(ContractModel):
    endpoint_id: Identifier
    method: str = "GET"
    path: str = "/"
    purpose: NonEmptyText
    request_format: NonEmptyText | None = None
    request_fields: list[ApiField] = Field(default_factory=list)
    response_format: NonEmptyText | None = None
    response_fields: list[ApiField] = Field(default_factory=list)
    authentication_required: bool = False
    requirement_ids: list[Identifier] = Field(default_factory=list)
    possible_errors: list[ApiErrorCondition] = Field(default_factory=list)


class ApiSpecification(ContractModel):
    applicable: bool = True
    base_path: str | None = None
    endpoints: list[ApiEndpoint] = Field(default_factory=list)


class WorkflowStep(ContractModel):
    step_id: Identifier
    actor: NonEmptyText
    action: NonEmptyText
    resulting_state: NonEmptyText
    component_id: Identifier | None = None


class WorkflowDefinition(ContractModel):
    workflow_id: Identifier
    name: NonEmptyText
    purpose: NonEmptyText
    requirement_ids: list[Identifier] = Field(default_factory=list)
    steps: list[WorkflowStep] = Field(default_factory=list)
    success_outcome: NonEmptyText
    failure_outcomes: list[NonEmptyText] = Field(default_factory=list)


class ProjectStructureEntry(ContractModel):
    path: NonEmptyText
    purpose: NonEmptyText
    entry_type: NonEmptyText


class ProjectStructure(ContractModel):
    """Structure for the generated product, never the SEAM platform."""

    root_directory: NonEmptyText = "src"
    entries: list[ProjectStructureEntry] = Field(default_factory=list)


class DesignConstraint(ContractModel):
    constraint_id: Identifier
    statement: NonEmptyText
    source: NonEmptyText
    impact_on_design: NonEmptyText


class DesignAssumption(ContractModel):
    assumption_id: Identifier
    statement: NonEmptyText
    rationale: NonEmptyText
    validation_needed: NonEmptyText
    source_ambiguity_id: Identifier | None = None


class RequirementTraceability(ContractModel):
    requirement_id: Identifier
    task_ids: list[Identifier] = Field(default_factory=list)
    component_ids: list[Identifier] = Field(default_factory=list)
    api_endpoint_ids: list[Identifier] = Field(default_factory=list)
    database_entity_names: list[NonEmptyText] = Field(default_factory=list)
    acceptance_criteria_ids: list[Identifier] = Field(default_factory=list)


class ProjectPlan(ContractModel):
    """Complete implementation-ready plan generated from an AnalysisArtifact."""

    project_summary: NonEmptyText
    roadmap: list[RoadmapPhase] = Field(default_factory=list)
    implementation_tasks: list[ImplementationTask] = Field(default_factory=list)
    architecture: ArchitectureDesign
    database: DatabaseDesign
    api: ApiSpecification
    workflows: list[WorkflowDefinition] = Field(default_factory=list)
    project_structure: ProjectStructure
    implementation_constraints: list[DesignConstraint] = Field(default_factory=list)
    design_assumptions: list[DesignAssumption] = Field(default_factory=list)
    unresolved_ambiguity_ids: list[Identifier] = Field(default_factory=list)
    requirement_traceability: list[RequirementTraceability] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_internal_references(self) -> "ProjectPlan":
        task_ids = {task.task_id for task in self.implementation_tasks}
        component_ids = {component.component_id for component in self.architecture.components}
        endpoint_ids = {endpoint.endpoint_id for endpoint in self.api.endpoints}

        for task in self.implementation_tasks:
            task.dependencies = [d for d in task.dependencies if d != task.task_id and d in task_ids]
        for phase in self.roadmap:
            phase.task_ids = [t for t in phase.task_ids if t in task_ids]
        
        valid_relationships = []
        for relationship in self.architecture.component_relationships:
            if relationship.source_component_id in component_ids and relationship.target_component_id in component_ids:
                valid_relationships.append(relationship)
        self.architecture.component_relationships = valid_relationships

        valid_flows = []
        for flow in self.architecture.data_flows:
            if flow.source_component_id in component_ids and flow.target_component_id in component_ids:
                valid_flows.append(flow)
        self.architecture.data_flows = valid_flows

        for trace in self.requirement_traceability:
            trace.task_ids = [t for t in trace.task_ids if t in task_ids]
            trace.component_ids = [c for c in trace.component_ids if c in component_ids]
            trace.api_endpoint_ids = [e for e in trace.api_endpoint_ids if e in endpoint_ids]
            
        return self


class PlanningArtifact(ContractModel):
    """Planning result envelope ready for future artifact persistence."""

    artifact_type: str = "planning_design"
    contract_version: str = "0.1"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    project_id: str | None = None
    source_analysis_artifact_type: str = "requirements_analysis"
    source_analysis_contract_version: str
    result: ProjectPlan
