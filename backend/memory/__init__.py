"""Memory subsystem initialization and factory."""

import os
from pathlib import Path

from backend.llm.openai_compatible import OpenAICompatibleProviderSettings
from backend.memory.manager import MemoryManager
from backend.memory.repository import ChromaMemoryRepository, OllamaEmbeddingFunction

_memory_manager_instance: MemoryManager | None = None

def get_memory_manager() -> MemoryManager:
    """Return the singleton MemoryManager instance."""
    global _memory_manager_instance
    if _memory_manager_instance is None:
        # Resolve path
        storage_path = Path(__file__).resolve().parents[2] / ".aevum" / "chroma"
        storage_path.mkdir(parents=True, exist_ok=True)
        
        # Pull embedding configuration from environment
        base_url = os.getenv("SEAM_OLLAMA_BASE_URL", "http://localhost:11434")
        api_key = os.getenv("SEAM_API_KEY", "ollama")
        
        settings = OpenAICompatibleProviderSettings(
            base_url=base_url,
            api_key=api_key,
            model_names={}
        )
        
        embedding_fn = OllamaEmbeddingFunction(settings=settings)
        repo = ChromaMemoryRepository(storage_path=storage_path, embedding_function=embedding_fn)
        
        min_score = float(os.getenv("SEAM_MEMORY_MIN_SCORE", "0.5"))
        _memory_manager_instance = MemoryManager(repository=repo, min_score=min_score)
        
    return _memory_manager_instance
