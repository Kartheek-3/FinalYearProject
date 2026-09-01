import asyncio
import os
os.environ["SEAM_LLM_PROVIDER"] = "openai_compatible"
os.environ["SEAM_LLM_BASE_URL"] = "http://localhost:11434/v1"

from backend.llm.factory import ModelClientRegistry
from backend.agents.analysis.config import AnalysisAgentSettings

async def main():
    settings = AnalysisAgentSettings.from_environment()
    registry = ModelClientRegistry()
    client = registry.create(settings.llm)
    schema = {
        "type": "object",
        "properties": {
            "status": {"type": "string"},
            "message": {"type": "string"}
        },
        "required": ["status", "message"],
        "additionalProperties": False
    }
    
    print("Sending request...")
    res = await client.generate_structured(
        system_prompt="Output strict JSON.",
        user_prompt="Say hello with status ok.",
        model=settings.llm,
        output_schema=schema
    )
    print("Result:", res)

asyncio.run(main())
