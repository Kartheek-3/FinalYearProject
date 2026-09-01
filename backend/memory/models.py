"""Memory records and type definitions for the SEAM organizational memory."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MemoryType(str, Enum):
    """Classification of reusable organizational memory."""
    DOMAIN_KNOWLEDGE = "DOMAIN_KNOWLEDGE"
    ARCHITECTURE_PATTERN = "ARCHITECTURE_PATTERN"
    CODE_PATTERN = "CODE_PATTERN"
    BEST_PRACTICE = "BEST_PRACTICE"
    LESSON_LEARNED = "LESSON_LEARNED"
    QA_LESSON = "QA_LESSON"
    DEPLOYMENT_LESSON = "DEPLOYMENT_LESSON"
    PROJECT_OUTCOME = "PROJECT_OUTCOME"
    USER_FEEDBACK = "USER_FEEDBACK"


class MemoryRecord(BaseModel):
    """A validated unit of organizational knowledge to be stored in ChromaDB."""
    model_config = ConfigDict(extra="forbid")

    memory_id: str
    memory_type: MemoryType
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    domain: str = Field(..., description="The application domain (e.g., 'task_management')")
    technology_stack: list[str] = Field(default_factory=list)
    source_project_id: str
    source_task_id: str | None = None
    source_agent: str | None = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    validation_status: str = Field(default="VALIDATED")
    created_at: float
    metadata: dict[str, Any] = Field(default_factory=dict)
