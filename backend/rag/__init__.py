"""Shared retrieval contracts; RAG is infrastructure, not an agent."""

from backend.rag.interfaces import KnowledgeRetriever, KnowledgeSnippet

__all__ = ["KnowledgeRetriever", "KnowledgeSnippet"]
