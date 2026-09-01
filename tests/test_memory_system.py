import unittest
import time
from backend.memory.models import MemoryRecord, MemoryType
from backend.memory.manager import MemoryManager

class MockRepository:
    def __init__(self):
        self.records = {}
        
    def persist_record(self, record: MemoryRecord):
        self.records[record.memory_id] = record
        
    def search(self, query: str, limit: int, where_filter: dict | None = None):
        results = []
        for r in self.records.values():
            if where_filter and where_filter.get("domain") != r.domain:
                continue
            distance = 0.1 if "fastapi" in query.lower() and "fastapi" in r.content.lower() else 0.8
            results.append({
                "document": r.content,
                "metadata": {"title": r.title, "domain": r.domain, "source_project_id": r.source_project_id},
                "distance": distance
            })
        return results[:limit]

class TestMemorySystem(unittest.TestCase):
    def setUp(self):
        self.manager = MemoryManager(repository=MockRepository(), min_score=0.5)
        
    def test_sensitive_data_rejection(self):
        record = MemoryRecord(
            memory_id="1",
            memory_type=MemoryType.CODE_PATTERN,
            title="Secret pattern",
            content="Here is the API_KEY: sk-1234567890abcdef1234567890abcdef",
            domain="auth",
            source_project_id="prj_1",
            created_at=time.time()
        )
        self.assertFalse(self.manager.store(record))

    def test_low_confidence_rejection(self):
        record = MemoryRecord(
            memory_id="2",
            memory_type=MemoryType.CODE_PATTERN,
            title="Bad pattern",
            content="Do something",
            domain="auth",
            source_project_id="prj_1",
            confidence=0.2,
            created_at=time.time()
        )
        self.assertFalse(self.manager.store(record))

    def test_valid_storage_and_retrieval(self):
        record = MemoryRecord(
            memory_id="3",
            memory_type=MemoryType.ARCHITECTURE_PATTERN,
            title="FastAPI Structure",
            content="Use FastAPI with routers",
            domain="web",
            source_project_id="prj_1",
            created_at=time.time()
        )
        self.assertTrue(self.manager.store(record))
        
        results = self.manager.retrieve("How to build FastAPI", limit=5)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["content"], "Use FastAPI with routers")
        self.assertGreater(results[0]["relevance_score"], 0.5)

    def test_domain_filtering(self):
        record1 = MemoryRecord(
            memory_id="4",
            memory_type=MemoryType.ARCHITECTURE_PATTERN,
            title="FastAPI Structure",
            content="Use FastAPI with routers",
            domain="web",
            source_project_id="prj_1",
            created_at=time.time()
        )
        self.manager.store(record1)
        
        results = self.manager.retrieve("How to build FastAPI", domain="data_science", limit=5)
        self.assertEqual(len(results), 0)

if __name__ == '__main__':
    unittest.main()
