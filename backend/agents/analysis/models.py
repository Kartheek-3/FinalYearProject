"""Versioned Pydantic contracts owned by the Analysis Agent."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


NonEmptyText = Annotated[str, Field(min_length=1)]
Identifier = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{1,63}$")]


class ContractModel(BaseModel):
    """Reject undeclared fields so every exchanged artifact stays predictable."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class AnalysisRequest(ContractModel):
    """Raw requirements submitted for analysis."""

    project_description: NonEmptyText
    technology_stack: list[NonEmptyText] = Field(min_length=1)
    project_id: str = "unknown"


class RequirementPriority(StrEnum):
    MUST = "must"
    SHOULD = "should"
    COULD = "could"


class FunctionalRequirement(ContractModel):
    id: Identifier
    description: NonEmptyText
    priority: RequirementPriority
    rationale: NonEmptyText


class NonFunctionalCategory(StrEnum):
    PERFORMANCE = "performance"
    SECURITY = "security"
    RELIABILITY = "reliability"
    SCALABILITY = "scalability"
    USABILITY = "usability"
    MAINTAINABILITY = "maintainability"
    OBSERVABILITY = "observability"
    COMPATIBILITY = "compatibility"
    COMPLIANCE = "compliance"


class NonFunctionalRequirement(ContractModel):
    id: Identifier
    category: NonFunctionalCategory
    description: NonEmptyText
    measurable_target: str | None = None


class DomainIdentification(ContractModel):
    primary_domain: NonEmptyText
    subdomains: list[NonEmptyText] = Field(default_factory=list)
    domain_rationale: NonEmptyText


class TechnologyConstraint(ContractModel):
    technology: NonEmptyText
    constraint: NonEmptyText
    rationale: NonEmptyText
    is_user_mandated: bool = True


class Assumption(ContractModel):
    id: Identifier
    statement: NonEmptyText
    impact_if_incorrect: NonEmptyText


class Ambiguity(ContractModel):
    id: Identifier
    question: NonEmptyText
    affected_area: NonEmptyText
    impact: NonEmptyText
    is_blocking: bool


class AcceptanceCriterion(ContractModel):
    id: Identifier
    requirement_id: Identifier = "unknown"
    criterion: NonEmptyText = "Unknown criterion"


class StructuredRequirements(ContractModel):
    """Machine-readable analysis output consumed by later planning work."""

    project_summary: NonEmptyText
    functional_requirements: list[FunctionalRequirement]
    non_functional_requirements: list[NonFunctionalRequirement]
    domain: DomainIdentification
    technology_constraints: list[TechnologyConstraint] = Field(min_length=1)
    assumptions: list[Assumption]
    ambiguities: list[Ambiguity]
    acceptance_criteria: list[AcceptanceCriterion]


class AnalysisArtifact(ContractModel):
    """An immutable-shaped result envelope ready for later artifact persistence."""

    artifact_type: str = "requirements_analysis"
    contract_version: str = "0.1"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    result: StructuredRequirements
