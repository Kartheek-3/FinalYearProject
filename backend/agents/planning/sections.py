"""Partial contracts for Structured Planning Generation."""

from __future__ import annotations

from pydantic import Field

from backend.agents.analysis.models import ContractModel, Identifier, NonEmptyText
from backend.agents.planning.models import (
    ApiSpecification,
    ArchitectureDesign,
    DatabaseDesign,
    DesignAssumption,
    DesignConstraint,
    ImplementationTask,
    ProjectStructure,
    RequirementTraceability,
    RoadmapPhase,
    WorkflowDefinition,
)


class PlanningSectionFoundation(ContractModel):
    project_summary: NonEmptyText
    implementation_constraints: list[DesignConstraint] = Field(default_factory=list)
    design_assumptions: list[DesignAssumption] = Field(default_factory=list)
    unresolved_ambiguity_ids: list[Identifier] = Field(default_factory=list)


class PlanningSectionArchitecture(ContractModel):
    architecture: ArchitectureDesign


class PlanningSectionDatabase(ContractModel):
    database: DatabaseDesign


class PlanningSectionApi(ContractModel):
    api: ApiSpecification


class PlanningSectionWorkflows(ContractModel):
    workflows: list[WorkflowDefinition] = Field(default_factory=list)


class PlanningSectionProjectStructure(ContractModel):
    project_structure: ProjectStructure


class PlanningSectionExecution(ContractModel):
    roadmap: list[RoadmapPhase] = Field(default_factory=list)
    implementation_tasks: list[ImplementationTask] = Field(default_factory=list)


class PlanningSectionTraceability(ContractModel):
    requirement_traceability: list[RequirementTraceability] = Field(default_factory=list)
