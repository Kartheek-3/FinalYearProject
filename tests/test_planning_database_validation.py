import pytest
from pydantic import ValidationError
from backend.agents.planning.models import DatabaseField

def test_database_field_string_default():
    field = DatabaseField.model_validate({
        "name": "status",
        "data_type": "string",
        "description": "Status field",
        "default_value": "pending"
    })
    assert field.default_value == "pending"

def test_database_field_boolean_default_coercion():
    field = DatabaseField.model_validate({
        "name": "is_active",
        "data_type": "boolean",
        "description": "Active flag",
        "default_value": False
    })
    assert field.default_value == "false"

    field_true = DatabaseField.model_validate({
        "name": "is_admin",
        "data_type": "boolean",
        "description": "Admin flag",
        "default_value": True
    })
    assert field_true.default_value == "true"

def test_database_field_null_default():
    field = DatabaseField.model_validate({
        "name": "optional_field",
        "data_type": "string",
        "description": "Optional",
        "default_value": None
    })
    assert field.default_value is None

def test_database_field_int_default_coercion():
    field = DatabaseField.model_validate({
        "name": "count",
        "data_type": "integer",
        "description": "Count field",
        "default_value": 0
    })
    assert field.default_value == "0"

from backend.llm.repair import generate_with_repair
from backend.agents.planning.sections import PlanningSectionDatabase
from backend.llm.interfaces import StructuredLLMClient
from backend.llm.models import LLMModelConfig
import asyncio

class MockFailThenSucceedClient(StructuredLLMClient):
    def __init__(self):
        self.attempts = 0
        
    async def generate_structured(self, system_prompt: str, user_prompt: str, model, output_schema):
        self.attempts += 1
        if self.attempts == 1:
            return {
                "persistence_required": True,
                "rationale": "Test",
                "entities": [
                    {
                        "entity_name": "TestEntity",
                        "purpose": "Test",
                        "fields": [
                            {
                                "name": "bad_field",
                                "data_type": "bool",
                                "nullable": True,
                                "description": "bad",
                                "default_value": False
                            }
                        ],
                        "primary_key": "id",
                        "foreign_keys": [],
                        "relationships": [],
                        "constraints": [],
                        "indexes": [],
                        "requirement_ids": ["req1"]
                    }
                ]
            }
        else:
            return {
                "persistence_required": True,
                "rationale": "Test",
                "entities": [
                    {
                        "entity_name": "TestEntity",
                        "purpose": "Test",
                        "fields": [
                            {
                                "name": "bad_field",
                                "data_type": "bool",
                                "nullable": True,
                                "description": "bad",
                                "default_value": "false"
                            }
                        ],
                        "primary_key": "id",
                        "foreign_keys": [],
                        "relationships": [],
                        "constraints": [],
                        "indexes": [],
                        "requirement_ids": ["req1"]
                    }
                ]
            }

@pytest.mark.anyio
async def test_planning_repair_loop_validation():
    # Even though our model_validator fixes it immediately, this tests the structure of the repair loop 
    # and validates that the model accepts the coerced output correctly without repair, 
    # but to explicitly test repair we will simulate a completely malformed response.
    
    class MockMalformedClient(StructuredLLMClient):
        def __init__(self):
            self.attempts = 0
            
        async def generate_structured(self, system_prompt: str, user_prompt: str, model, output_schema):
            self.attempts += 1
            if self.attempts == 1:
                # Return something completely invalid to trigger a repair
                return {"completely_invalid": True}
            else:
                return {
                    "database": {
                        "persistence_required": True,
                        "rationale": "Test",
                        "entities": [
                            {
                                "entity_name": "TestEntity",
                                "purpose": "Test",
                                "fields": [
                                    {
                                        "name": "good_field",
                                        "data_type": "bool",
                                        "nullable": True,
                                        "description": "good",
                                        "default_value": "false"
                                    }
                                ],
                                "primary_key": "id",
                                "foreign_keys": [],
                                "relationships": [],
                                "constraints": [],
                                "indexes": [],
                                "requirement_ids": ["req1"]
                            }
                        ]
                    }
                }
                
    client = MockMalformedClient()
    config = LLMModelConfig(model="qwen2.5-coder")
    
    result = await generate_with_repair(
        client=client,
        model_config=config,
        system_prompt="Test",
        base_user_prompt="Test",
        output_schema=PlanningSectionDatabase.model_json_schema(),
        validator=lambda r: PlanningSectionDatabase.model_validate(r),
        max_attempts=3
    )
    
    assert client.attempts == 2
    assert result.database.entities[0].fields[0].default_value == "false"
