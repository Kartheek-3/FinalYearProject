import pytest

from backend.agents.supervisor.models import (
    AgentExecutionResult,
    AgentName,
    AgentResultStatus,
    ProjectExecutionState,
    TaskExecutionState,
    TaskExecutionStatus,
    QAFeedback,
    QAIssue,
    QASeverity
)
from backend.agents.supervisor.service import SupervisorOrchestrator
from backend.agents.planning.models import (
    PlanningArtifact,
    ProjectPlan,
    ImplementationTask,
    ArchitectureDesign,
    DatabaseDesign,
    ApiSpecification,
    ProjectStructure
)


@pytest.mark.asyncio
async def test_supervisor_rework_transition_from_qa():
    """Verify that applying a QA rework feedback transitions a completed task back to READY."""
    orchestrator = SupervisorOrchestrator()
    
    plan = ProjectPlan(
        project_summary="Test Project",
        roadmap=[],
        implementation_tasks=[
            ImplementationTask(
                task_id="task_1",
                title="Create file",
                description="Create a python script.",
                task_type="backend",
                priority="must",
                dependencies=[],
                requirement_ids=[],
                expected_artifacts=[],
                acceptance_criteria=[],
                status="planned",
            )
        ],
        architecture=ArchitectureDesign(style="Script", overview="None", components=[], component_relationships=[], data_flows=[], external_dependencies=[], technology_choices=[]),
        database=DatabaseDesign(persistence_required=False, rationale="None", entities=[]),
        api=ApiSpecification(applicable=False, endpoints=[]),
        workflows=[],
        project_structure=ProjectStructure(root_directory="src", entries=[]),
        implementation_constraints=[],
        design_assumptions=[],
        unresolved_ambiguity_ids=[],
        requirement_traceability=[]
    )
    
    artifact = PlanningArtifact(source_analysis_contract_version="0.1", result=plan)
    state = orchestrator.initialize(artifact, project_id="prj_1")
    
    # 1. State is initially READY
    state = orchestrator.refresh_eligibility(state)
    assert state.tasks["task_1"].status == TaskExecutionStatus.READY
    
    # 2. Begin task
    state, cmd = await orchestrator.begin_task(state, "task_1", AgentName.CODING)
    assert state.tasks["task_1"].status == TaskExecutionStatus.IN_PROGRESS
    
    # 3. Complete task successfully (Coding finished)
    result = AgentExecutionResult(
        agent=AgentName.CODING,
        task_id="task_1",
        status=AgentResultStatus.SUCCEEDED,
        attempt_number=state.tasks["task_1"].attempt_count,
        produced_artifacts=[],
        message="Done"
    )
    state = orchestrator.apply_agent_result(state, result)
    assert state.tasks["task_1"].status == TaskExecutionStatus.COMPLETED
    
    # 4. QA returns Feedback with REWORK_REQUIRED
    issue = QAIssue(
        issue_id="issue_1",
        severity=QASeverity.HIGH,
        affected_task_id="task_1",
        failure_reason="Test failed",
        rework_required=True,
        suggested_remediation="Add subtract"
    )
    
    from backend.agents.supervisor.models import QAVerdict
    feedback = QAFeedback(
        feedback_id="fb_1",
        task_id="task_1",
        verdict=QAVerdict.FAIL,
        issues=[issue],
        artifact_references=[],
        summary="Needs rework"
    )
    
    state = orchestrator.record_qa_feedback(state, feedback)
    
    # Task should transition to REWORK_REQUIRED
    assert state.tasks["task_1"].status == TaskExecutionStatus.REWORK_REQUIRED
    assert state.tasks["task_1"].rework_count == 1
    
    # 5. Refresh eligibility should transition it back to READY
    state = orchestrator.refresh_eligibility(state)
    assert state.tasks["task_1"].status == TaskExecutionStatus.READY
    
    # 6. Begin task again for rework
    state, cmd2 = await orchestrator.begin_task(state, "task_1", AgentName.CODING)
    assert state.tasks["task_1"].status == TaskExecutionStatus.IN_PROGRESS
    assert cmd2.attempt_number == 2  # Attempt count incremented
    assert len(cmd2.rework_feedback) == 1
    assert cmd2.rework_feedback[0].feedback_id == "fb_1"
