"""ChromaDB repository for long-term organizational memory."""

import os
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import httpx
from chromadb import PersistentClient
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from backend.llm.openai_compatible import OpenAICompatibleProviderSettings
from backend.memory.models import MemoryRecord


class OllamaEmbeddingFunction(EmbeddingFunction):
    """Custom embedding function to avoid heavy PyTorch dependencies by using Ollama."""

    def __init__(self, settings: OpenAICompatibleProviderSettings, model_name: str = "nomic-embed-text") -> None:
        self.base_url = settings.base_url.rstrip("/")
        self.api_key = settings.api_key
        self.model_name = model_name
        self.timeout = settings.timeout_seconds

    def __call__(self, input: Documents) -> Embeddings:
        """Embed a list of documents via the OpenAI-compatible or Ollama native embeddings API."""
        if not input:
            return []

        embeddings = []
        headers = {}
        if self.api_key and self.api_key != "ollama":
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Determine the endpoint (Ollama native `/api/embeddings` or OpenAI compatible `/v1/embeddings`)
        # We'll use OpenAI compatible for maximum flexibility if it's not Ollama
        is_ollama = "localhost:11434" in self.base_url or self.api_key == "ollama"
        
        with httpx.Client(timeout=self.timeout) as client:
            for text in input:
                if is_ollama:
                    payload = {"model": self.model_name, "prompt": text}
                    response = client.post(f"{self.base_url}/api/embeddings", json=payload, headers=headers)
                    response.raise_for_status()
                    embeddings.append(response.json()["embedding"])
                else:
                    payload = {"model": self.model_name, "input": text}
                    response = client.post(f"{self.base_url}/embeddings", json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()["data"]
                    embeddings.append(data[0]["embedding"])

        return embeddings


class ChromaMemoryRepository:
    """Manages persistent ChromaDB storage and collections."""

    def __init__(self, storage_path: Path, embedding_function: EmbeddingFunction) -> None:
        self._client = PersistentClient(path=str(storage_path))
        self._embedding_function = embedding_function
        self._collection = self._client.get_or_create_collection(
            name="seam_organizational_memory",
            embedding_function=self._embedding_function,
        )

    def persist_record(self, record: MemoryRecord) -> None:
        """Upsert a validated memory record into ChromaDB."""
        metadata = {
            "memory_type": record.memory_type.value,
            "title": record.title,
            "domain": record.domain,
            "technology_stack": ",".join(record.technology_stack),
            "source_project_id": record.source_project_id,
            "source_task_id": record.source_task_id or "",
            "source_agent": record.source_agent or "",
            "confidence": record.confidence,
            "validation_status": record.validation_status,
            "created_at": record.created_at,
        }
        # Flatten any additional metadata
        for k, v in record.metadata.items():
            if isinstance(v, (str, int, float, bool)):
                metadata[f"meta_{k}"] = v

        self._collection.upsert(
            ids=[record.memory_id],
            documents=[record.content],
            metadatas=[metadata],
        )

    def search(
        self,
        query: str,
        limit: int,
        where_filter: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Semantic search with optional metadata filtering."""
        results = self._collection.query(
            query_texts=[query],
            n_results=limit,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        matches = []
        if not results["ids"] or not results["ids"][0]:
            return matches

        ids = results["ids"][0]
        documents = results["documents"][0] if "documents" in results and results["documents"] else []
        metadatas = results["metadatas"][0] if "metadatas" in results and results["metadatas"] else []
        distances = results["distances"][0] if "distances" in results and results["distances"] else []

        for i in range(len(ids)):
            matches.append({
                "id": ids[i],
                "document": documents[i] if i < len(documents) else "",
                "metadata": metadatas[i] if i < len(metadatas) else {},
                "distance": distances[i] if i < len(distances) else 0.0,
            })
        return matches

    def get_stats(self) -> dict[str, Any]:
        """Return collection statistics."""
        return {
            "count": self._collection.count(),
        }

    def get_recent(self, limit: int = 5) -> list[dict[str, Any]]:
        """Fetch the most recently created records."""
        # ChromaDB doesn't have native 'order by' easily exposed without fetching all or using a workaround.
        # We can just fetch a chunk and sort in memory if the DB is small, or use a workaround.
        # For this MVP, we fetch up to 1000 and sort by created_at.
        results = self._collection.get(
            include=["metadatas", "documents"],
            limit=1000
        )
        if not results["ids"]:
            return []
            
        records = []
        for i in range(len(results["ids"])):
            meta = results["metadatas"][i] if results["metadatas"] else {}
            doc = results["documents"][i] if results["documents"] else ""
            records.append({
                "id": results["ids"][i],
                "document": doc,
                "metadata": meta,
                "created_at": meta.get("created_at", 0)
            })
            
        records.sort(key=lambda x: x["created_at"], reverse=True)
        return records[:limit]
