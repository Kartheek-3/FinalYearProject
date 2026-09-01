import unittest
from unittest.mock import AsyncMock, patch, Mock
from datetime import datetime, timezone

from backend.agents.planning.agent import PlanningDesignAgent
from backend.agents.planning.models import PlanningRequest, ProjectPlan
from backend.llm.models import LLMModelConfig
from backend.llm.repair import LLMRepairExhaustedError

from backend.agents.analysis.models import (
    AnalysisArtifact,
    StructuredRequirements,
    DomainIdentification,
    FunctionalRequirement,
    AcceptanceCriterion,
    TechnologyConstraint,
)

def make_dummy_request():
    return PlanningRequest(
        project_id="test_project",
        analysis_artifact=AnalysisArtifact(
            contract_version="0.1",
            generated_at=datetime.now(timezone.utc),
            result=StructuredRequirements(
                project_summary="Test project",
                domain=DomainIdentification(primary_domain="Test", domain_rationale="Test rationale"),
                functional_requirements=[
                    FunctionalRequirement(id="req_1", description="Do something", priority="must", rationale="r")
                ],
                non_functional_requirements=[],
                technology_constraints=[
                    TechnologyConstraint(technology="python", constraint="must use python", rationale="fast")
                ],
                assumptions=[],
                ambiguities=[],
                acceptance_criteria=[
                    AcceptanceCriterion(id="ac_1", requirement_id="req_1", criterion="It works")
                ]
            )
        )
    )

class TestPlanningDecomposition(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        client = AsyncMock()
        config = Mock(spec=LLMModelConfig)
        self.agent = PlanningDesignAgent(llm_client=client, model_config=config, knowledge_retriever=None)

    async def test_decomposition_success(self):
        request = make_dummy_request()
        
        with patch("backend.agents.planning.agent.generate_with_repair", new_callable=AsyncMock) as mock_repair:
            from backend.agents.planning.sections import (
                PlanningSectionFoundation, PlanningSectionArchitecture, PlanningSectionDatabase,
                PlanningSectionApi, PlanningSectionWorkflows, PlanningSectionProjectStructure,
                PlanningSectionExecution, PlanningSectionTraceability
            )
            from backend.agents.planning.models import ArchitectureDesign, DatabaseDesign, ApiSpecification, ProjectStructure
            
            mock_repair.side_effect = [
                PlanningSectionFoundation(project_summary="Summary"),
                PlanningSectionArchitecture(architecture=ArchitectureDesign()),
                PlanningSectionDatabase(database=DatabaseDesign()),
                PlanningSectionApi(api=ApiSpecification()),
                PlanningSectionWorkflows(),
                PlanningSectionProjectStructure(project_structure=ProjectStructure(entries=[])),
                PlanningSectionExecution(),
                PlanningSectionTraceability(requirement_traceability=[])
            ]
            
            with patch.object(PlanningDesignAgent, "_validate_against_analysis") as mock_val:
                result = await self.agent.plan(request)
                
                self.assertEqual(mock_repair.call_count, 8)
                self.assertEqual(result.result.project_summary, "Summary")

    async def test_decomposition_exhausted(self):
        request = make_dummy_request()
        
        with patch("backend.agents.planning.agent.generate_with_repair", new_callable=AsyncMock) as mock_repair:
            mock_repair.side_effect = LLMRepairExhaustedError("Failed")
            
            from backend.agents.planning.errors import PlanningProviderError
            with self.assertRaisesRegex(PlanningProviderError, "after retries"):
                await self.agent.plan(request)

if __name__ == "__main__":
    unittest.main()
