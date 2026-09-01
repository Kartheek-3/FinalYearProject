import asyncio
import pydantic
from backend.llm.factory import ModelClientRegistry
from backend.llm.models import LLMModelConfig, SupportedModel
from dotenv import load_dotenv

load_dotenv()

class TestSchema(pydantic.BaseModel):
    status: str
    message: str

async def test():
    registry = ModelClientRegistry()
    config = LLMModelConfig(model=SupportedModel.LLAMA_3_1)
    client = registry.create(config)
    
    print("Testing structured generation with llama-3.1 via Ollama...")
    result = await client.generate_structured(
        system_prompt="You are a helpful assistant.",
        user_prompt="Reply with a JSON object containing status='OK' and message='Hello from Ollama'.",
        model=config,
        output_schema=TestSchema.model_json_schema()
    )
    print(f"Validation successful: {result}")

if __name__ == "__main__":
    asyncio.run(test())
