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

    async def retrieve(self, *, query: str, limit: int, project_id: str, agent: str, domain: str | None = None) -> list[KnowledgeSnippet]:
        """Return grounded contextual snippets for an agent query."""


from backend.composition.events import event_gateway, RuntimeEvent
import time

class MemoryKnowledgeRetriever:
    """Concrete implementation of KnowledgeRetriever using MemoryManager."""
    
    def __init__(self, memory_manager) -> None:
        self._manager = memory_manager
        
    async def retrieve(self, *, query: str, limit: int, project_id: str, agent: str, domain: str | None = None) -> list[KnowledgeSnippet]:
        return []
        
    async def _retrieve_impl(self, *, query: str, limit: int, project_id: str, agent: str, domain: str | None = None) -> list[KnowledgeSnippet]:
        await event_gateway.publish(RuntimeEvent(
            event_type="memory.retrieval.started",
            project_id=project_id,
            timestamp=time.time(),
            data={"agent": agent, "query_length": len(query), "domain": domain}
        ))
        
        try:
            results = self._manager.retrieve(query=query, domain=domain, limit=limit)
            snippets = []
            for r in results:
                snippets.append(
                    KnowledgeSnippet(
                        content=r["content"],
                        source_id=r["metadata"].get("source_project_id", "unknown"),
                        relevance_score=r["relevance_score"]
                    )
                )
                
            if not snippets:
                await event_gateway.publish(RuntimeEvent(
                    event_type="memory.retrieval.empty",
                    project_id=project_id,
                    timestamp=time.time(),
                    data={"agent": agent}
                ))
            else:
                await event_gateway.publish(RuntimeEvent(
                    event_type="memory.retrieval.completed",
                    project_id=project_id,
                    timestamp=time.time(),
                    data={"agent": agent, "result_count": len(snippets)}
                ))
                
            return snippets
        except Exception as exc:
            await event_gateway.publish(RuntimeEvent(
                event_type="memory.retrieval.failed",
                project_id=project_id,
                timestamp=time.time(),
                data={"agent": agent, "error": str(exc)}
            ))
            return []

