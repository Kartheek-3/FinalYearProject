import unittest
from unittest.mock import AsyncMock
from pydantic import BaseModel

from backend.llm.repair import generate_with_repair, LLMRepairExhaustedError
from backend.llm.models import LLMModelConfig, SupportedModel
from backend.llm.interfaces import LLMInvocationError

class DummyModel(BaseModel):
    name: str
    age: int

class TestLLMRepair(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        from unittest.mock import Mock
        self.model_config = Mock(spec=LLMModelConfig)

    async def test_repair_success_first_attempt(self):
        client = AsyncMock()
        client.generate_structured.return_value = {"name": "Alice", "age": 30}
        
        def validator(response):
            return DummyModel.model_validate(response)
            
        result = await generate_with_repair(
            client=client,
            model_config=self.model_config,
            system_prompt="sys",
            base_user_prompt="user",
            output_schema=DummyModel.model_json_schema(),
            validator=validator,
            max_attempts=3
        )
        
        self.assertEqual(result.name, "Alice")
        self.assertEqual(client.generate_structured.call_count, 1)

    async def test_repair_success_second_attempt(self):
        client = AsyncMock()
        
        # First attempt: invalid (missing age)
        # Second attempt: valid
        client.generate_structured.side_effect = [
            {"name": "Alice"},
            {"name": "Alice", "age": 30}
        ]
        
        def validator(response):
            return DummyModel.model_validate(response)
            
        result = await generate_with_repair(
            client=client,
            model_config=self.model_config,
            system_prompt="sys",
            base_user_prompt="user",
            output_schema=DummyModel.model_json_schema(),
            validator=validator,
            max_attempts=3
        )
        
        self.assertEqual(result.name, "Alice")
        self.assertEqual(result.age, 30)
        self.assertEqual(client.generate_structured.call_count, 2)
        
        call_args = client.generate_structured.call_args_list[1][1]
        self.assertIn("VALIDATION FAILURE", call_args["user_prompt"])
        self.assertIn("Field required", call_args["user_prompt"])

    async def test_repair_exhausted(self):
        client = AsyncMock()
        
        # All attempts invalid
        client.generate_structured.side_effect = [
            {"name": "Alice"},
            {"name": "Alice", "age": "thirty"},
            {"name": "Alice", "age": "thirty"}
        ]
        
        def validator(response):
            return DummyModel.model_validate(response)
            
        with self.assertRaises(LLMRepairExhaustedError):
            await generate_with_repair(
                client=client,
                model_config=self.model_config,
                system_prompt="sys",
                base_user_prompt="user",
                output_schema=DummyModel.model_json_schema(),
                validator=validator,
                max_attempts=3
            )
        
        self.assertEqual(client.generate_structured.call_count, 3)

    async def test_repair_catches_generation_failure(self):
        client = AsyncMock()
        
        # First attempt: LLMInvocationError
        # Second attempt: valid
        client.generate_structured.side_effect = [
            LLMInvocationError("Provider error"),
            {"name": "Bob", "age": 25}
        ]
        
        def validator(response):
            return DummyModel.model_validate(response)
            
        result = await generate_with_repair(
            client=client,
            model_config=self.model_config,
            system_prompt="sys",
            base_user_prompt="user",
            output_schema=DummyModel.model_json_schema(),
            validator=validator,
            max_attempts=3
        )
        
        self.assertEqual(result.name, "Bob")
        self.assertEqual(client.generate_structured.call_count, 2)
        
        call_args = client.generate_structured.call_args_list[1][1]
        self.assertIn("GENERATION FAILURE", call_args["user_prompt"])

if __name__ == "__main__":
    unittest.main()
