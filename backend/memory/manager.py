"""Memory Manager for the SEAM Long-Term Organizational Memory."""

import logging
import re
import time
from typing import Any

from backend.memory.models import MemoryRecord, MemoryType
from backend.memory.repository import ChromaMemoryRepository

logger = logging.getLogger(__name__)

# Basic PII and Secrets regex patterns for filtering
SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key[\s:=]+[\w\-]{16,})"),
    re.compile(r"(?i)(password[\s:=]+[^\s]+)"),
    re.compile(r"(?i)(secret[\s:=]+[^\s]+)"),
    re.compile(r"(?i)(token[\s:=]+(ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*))"),
]

class MemoryManager:
    """High-level service for storing and retrieving validated organizational knowledge."""

    def __init__(self, repository: ChromaMemoryRepository, min_score: float = 0.5) -> None:
        self._repo = repository
        self._min_score = min_score

    def _contains_secrets(self, text: str) -> bool:
        """Check if the text contains obvious secrets."""
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                return True
        return False

    def store(self, record: MemoryRecord) -> bool:
        """Validate, filter, and store a memory record."""
        if record.confidence < 0.5:
            logger.warning(f"Rejecting memory {record.memory_id} due to low confidence.")
            return False

        if record.validation_status != "VALIDATED":
            logger.warning(f"Rejecting memory {record.memory_id} due to unvalidated status.")
            return False

        if self._contains_secrets(record.content) or self._contains_secrets(record.title):
            logger.warning(f"Rejecting memory {record.memory_id} due to potential secrets.")
            return False

        try:
            self._repo.persist_record(record)
            return True
        except Exception as exc:
            logger.error(f"Failed to store memory: {exc}")
            return False

    def retrieve(
        self,
        query: str,
        domain: str | None = None,
        technology_stack: list[str] | None = None,
        limit: int = 5
    ) -> list[dict[str, Any]]:
        """Retrieve relevant memory records based on query and filters."""
        try:
            where_filter = None
            if domain:
                where_filter = {"domain": domain}
                
            results = self._repo.search(query=query, limit=limit, where_filter=where_filter)
            
            filtered_results = []
            for r in results:
                # ChromaDB distance is typically cosine distance (0 means identical, 2 means opposite)
                # Let's convert distance to a similarity score [0, 1]
                # similarity = 1 - (distance / 2) roughly. Or just use distance if it's L2.
                # Assuming L2 distance (Chroma default): similarity = 1 / (1 + distance)
                similarity = 1.0 / (1.0 + r["distance"])
                
                if similarity >= self._min_score:
                    # Optional tech stack boosting could happen here
                    filtered_results.append({
                        "content": r["document"],
                        "metadata": r["metadata"],
                        "relevance_score": similarity
                    })
                    
            # Sort by similarity
            filtered_results.sort(key=lambda x: x["relevance_score"], reverse=True)
            return filtered_results
            
        except Exception as exc:
            logger.error(f"Failed to retrieve memory: {exc}")
            return []

    def get_stats(self) -> dict[str, Any]:
        try:
            return self._repo.get_stats()
        except Exception as exc:
            logger.error(f"Failed to get memory stats: {exc}")
            return {"count": 0}

    def get_recent(self, limit: int = 5) -> list[dict[str, Any]]:
        try:
            return self._repo.get_recent(limit=limit)
        except Exception as exc:
            logger.error(f"Failed to get recent memory: {exc}")
            return []
