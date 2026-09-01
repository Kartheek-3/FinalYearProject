import os
from backend.agents.analysis.config import AnalysisAgentSettings
from backend.agents.planning.config import PlanningAgentSettings
from backend.agents.coding.config import CodingAgentSettings
from backend.agents.qa.config import QAAgentSettings

print(f"SEAM_LLM_PROVIDER: {os.getenv('SEAM_LLM_PROVIDER', 'openai_compatible')}")
print(f"SEAM_LLM_BASE_URL: {os.getenv('SEAM_LLM_BASE_URL', 'http://localhost:11434/v1')}")
print(f"SEAM_LLM_ANALYSIS_MODEL: {AnalysisAgentSettings.from_environment().llm.model.value}")
print(f"SEAM_LLM_PLANNING_MODEL: {PlanningAgentSettings.from_environment().llm.model.value}")
print(f"SEAM_LLM_CODING_MODEL: {CodingAgentSettings.from_environment().llm.model.value}")
print(f"SEAM_LLM_QA_MODEL: {QAAgentSettings.from_environment().llm.model.value}")
