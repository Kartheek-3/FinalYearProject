"""Tests for Execution section semantic grounding.

Verifies that:
1. Valid requirement IDs pass semantic validation.
2. Technology names used as requirement_ids are rejected.
3. Invented uppercase requirement IDs are rejected.
4. Non-existent requirement IDs are rejected.
5. Valid acceptance criteria IDs are accepted.
6. Invalid acceptance criteria IDs (tech names) are rejected.
7. No sanitization occurs — bad data is always rejected.
8. No fake IDs are invented by the validator.
9. Cross-artifact integrity is enforced.
"""

from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, MagicMock

from backend.agents.analysis.models import (
    AcceptanceCriterion,
    AnalysisArtifact,
    Assumption,
    Ambiguity,
    DomainIdentification,
    FunctionalRequirement,
    NonFunctionalRequirement,
    RequirementPriority,
    StructuredRequirements,
    TechnologyConstraint,
)
from backend.agents.planning.agent import _make_execution_validator
from backend.agents.planning.models import ImplementationTask, RoadmapPhase, TaskType, TaskStatus


def _make_analysis_artifact(
    functional_ids=("create_todo", "list_todos", "update_todo", "delete_todo"),
    acceptance_ids=("ac_001", "ac_002", "ac_003"),
    tech_names=("React", "TypeScript", "FastAPI", "Python", "SQLite", "Docker"),
):
    """Create a minimal AnalysisArtifact with controlled test data."""
    return AnalysisArtifact(
        result=StructuredRequirements(
            project_summary="Test Todo App",
            functional_requirements=[
                FunctionalRequirement(id=fid, description=f"Req {fid}", priority=RequirementPriority.MUST, rationale="test")
                for fid in functional_ids
            ],
            non_functional_requirements=[],
            domain=DomainIdentification(primary_domain="web", domain_rationale="test"),
            technology_constraints=[
                TechnologyConstraint(technology=t, constraint="must use", rationale="test")
                for t in tech_names
            ],
            assumptions=[],
            ambiguities=[],
            acceptance_criteria=[
                AcceptanceCriterion(id=aid, requirement_id="create_todo", criterion=f"Criterion {aid}")
                for aid in acceptance_ids
            ],
        )
    )


def _make_raw_execution(task_req_ids=None, task_ac_ids=None, task_id="task_001"):
    """Build a minimal raw dict for PlanningSectionExecution."""
    return {
        "roadmap": [
            {
                "phase_id": "phase_1_foundation",
                "title": "Foundation",
                "objective": "Build core",
                "task_ids": [task_id],
                "completion_outcome": "Core built",
            }
        ],
        "implementation_tasks": [
            {
                "task_id": task_id,
                "title": "Test Task",
                "description": "A test implementation task.",
                "task_type": "backend",
                "priority": "must",
                "dependencies": [],
                "requirement_ids": task_req_ids or [],
                "expected_artifacts": ["main.py"],
                "acceptance_criteria": task_ac_ids or [],
                "status": "planned",
            }
        ],
    }


class TestExecutionSemanticValidator(unittest.TestCase):

    def setUp(self):
        self.artifact = _make_analysis_artifact()
        self.validator = _make_execution_validator(self.artifact)

    # --- PASS cases ---

    def test_valid_requirement_ids_pass(self):
        """Valid functional requirement IDs should pass without error."""
        raw = _make_raw_execution(task_req_ids=["create_todo", "list_todos"])
        result = self.validator(raw)
        self.assertEqual(len(result.implementation_tasks), 1)
        self.assertEqual(result.implementation_tasks[0].requirement_ids, ["create_todo", "list_todos"])

    def test_valid_acceptance_criteria_ids_pass(self):
        """Valid acceptance criteria IDs should pass without error."""
        raw = _make_raw_execution(task_req_ids=["create_todo"], task_ac_ids=["ac_001", "ac_002"])
        result = self.validator(raw)
        self.assertEqual(result.implementation_tasks[0].acceptance_criteria, ["ac_001", "ac_002"])

    def test_empty_requirement_ids_pass(self):
        """Empty requirement_ids list should pass (field is optional)."""
        raw = _make_raw_execution(task_req_ids=[])
        result = self.validator(raw)
        self.assertEqual(result.implementation_tasks[0].requirement_ids, [])

    def test_all_valid_analysis_ids_accepted(self):
        """All four functional requirement IDs from analysis should be accepted."""
        raw = _make_raw_execution(
            task_req_ids=["create_todo", "list_todos", "update_todo", "delete_todo"],
            task_ac_ids=["ac_001", "ac_002", "ac_003"],
        )
        result = self.validator(raw)
        self.assertIsNotNone(result)

    # --- FAIL: technology names used as requirement IDs ---

    def test_technology_name_in_requirement_ids_rejected(self):
        """Technology names must be rejected from requirement_ids."""
        raw = _make_raw_execution(task_req_ids=["React"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("TECHNOLOGY NAMES", error_msg)
        self.assertIn("React", error_msg)

    def test_multiple_technology_names_in_requirement_ids_rejected(self):
        """Multiple technology names in requirement_ids should all be named in error."""
        raw = _make_raw_execution(task_req_ids=["React", "TypeScript", "FastAPI"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("TECHNOLOGY NAMES", error_msg)

    def test_technology_name_in_acceptance_criteria_rejected(self):
        """Technology names must be rejected from acceptance_criteria."""
        raw = _make_raw_execution(task_req_ids=["create_todo"], task_ac_ids=["Python"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("TECHNOLOGY NAMES", error_msg)
        self.assertIn("Python", error_msg)

    # --- FAIL: invented/non-existent IDs ---

    def test_invented_requirement_id_rejected(self):
        """Invented requirement IDs not in AnalysisArtifact must be rejected."""
        raw = _make_raw_execution(task_req_ids=["invented_req_123"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("invented_req_123", error_msg)

    def test_nonexistent_acceptance_criteria_rejected(self):
        """Acceptance criteria IDs not in AnalysisArtifact must be rejected."""
        raw = _make_raw_execution(task_req_ids=["create_todo"], task_ac_ids=["ac_999"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("ac_999", error_msg)

    # --- FAIL: uppercase/CamelCase (Pydantic regex catches these) ---

    def test_uppercase_identifier_rejected_by_pydantic(self):
        """CamelCase identifiers must fail the Pydantic Identifier regex."""
        raw = _make_raw_execution(task_req_ids=["CreateTodo"])
        with self.assertRaises(Exception):
            self.validator(raw)

    # --- Semantic error content checks ---

    def test_error_contains_valid_requirement_ids(self):
        """Error message must list the valid requirement IDs for the model to copy."""
        raw = _make_raw_execution(task_req_ids=["React"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("create_todo", error_msg)
        self.assertIn("VALID requirement_ids", error_msg)

    def test_error_contains_valid_acceptance_criteria_ids(self):
        """Error message must list valid acceptance criteria IDs."""
        raw = _make_raw_execution(task_req_ids=["create_todo"], task_ac_ids=["Docker"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("ac_001", error_msg)
        self.assertIn("VALID acceptance_criteria IDs", error_msg)

    def test_error_contains_forbidden_tech_names(self):
        """Error message must list the forbidden technology names."""
        raw = _make_raw_execution(task_req_ids=["React"])
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("FORBIDDEN", error_msg)

    # --- No sanitization: validate that the validator never modifies data ---

    def test_no_sanitization_occurs(self):
        """The validator must reject, never silently fix invalid data."""
        raw = _make_raw_execution(task_req_ids=["React"])
        with self.assertRaises(Exception):
            self.validator(raw)
        # Raw data must be unchanged (validator did not mutate it)
        self.assertEqual(raw["implementation_tasks"][0]["requirement_ids"], ["React"])

    # --- Multiple tasks ---

    def test_multiple_tasks_all_errors_reported(self):
        """When multiple tasks have invalid IDs, all are reported in the error."""
        raw = {
            "roadmap": [],
            "implementation_tasks": [
                {
                    "task_id": "task_a",
                    "title": "Task A",
                    "description": "desc",
                    "task_type": "backend",
                    "priority": "must",
                    "dependencies": [],
                    "requirement_ids": ["React"],
                    "expected_artifacts": [],
                    "acceptance_criteria": [],
                    "status": "planned",
                },
                {
                    "task_id": "task_b",
                    "title": "Task B",
                    "description": "desc",
                    "task_type": "frontend",
                    "priority": "must",
                    "dependencies": [],
                    "requirement_ids": ["TypeScript"],
                    "expected_artifacts": [],
                    "acceptance_criteria": [],
                    "status": "planned",
                },
            ],
        }
        with self.assertRaises(Exception) as ctx:
            self.validator(raw)
        error_msg = str(ctx.exception)
        self.assertIn("task_a", error_msg)
        self.assertIn("task_b", error_msg)


if __name__ == "__main__":
    unittest.main()
