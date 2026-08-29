"""Future RAG/ChromaDB boundary consumed by agents."""

from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeSnippet(BaseModel):
    """Provenance-preserving context returned by a future RAG implementation."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    content: str = Field(min_length=1)
    source_id: str = Field(min_length=1)
    relevance_score: float = Field(ge=0.0, le=1.0)


class KnowledgeRetriever(Protocol):
    """Read-only retrieval contract; implementations may use ChromaDB later."""

    async def retrieve(self, *, query: str, limit: int) -> list[KnowledgeSnippet]:
        """Return grounded contextual snippets for an agent query."""
