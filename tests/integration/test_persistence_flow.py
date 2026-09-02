import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import json

from backend.main import create_app

@pytest.fixture
def test_client(tmp_path):
    app = create_app()
    return TestClient(app)

def test_create_then_get(test_client):
    res = test_client.post("/projects", json={"project_description": "test", "technology_stack": ["py"]})
    assert res.status_code == 201
    pid = res.json()["project_id"]
    
    get_res = test_client.get(f"/projects/{pid}")
    assert get_res.status_code == 200
    assert get_res.json()["project_id"] == pid

def test_create_workspace_exists(test_client):
    res = test_client.post("/projects", json={"project_description": "test", "technology_stack": ["py"]})
    pid = res.json()["project_id"]
    
    file_res = test_client.get(f"/projects/{pid}/files")
    assert file_res.status_code == 200
    assert isinstance(file_res.json(), list)

def test_run_existing_project(test_client):
    res = test_client.post("/projects", json={"project_description": "test", "technology_stack": ["py"]})
    pid = res.json()["project_id"]
    
    run_res = test_client.post(f"/projects/{pid}/run")
    assert run_res.status_code == 202

def test_missing_project_returns_404(test_client):
    res = test_client.get("/projects/prj_invalid123")
    assert res.status_code == 404

def test_project_id_case_consistency(test_client):
    res = test_client.post("/projects", json={"project_description": "test", "technology_stack": ["py"]})
    pid = res.json()["project_id"]
    
    upper_pid = pid.upper()
    get_res = test_client.get(f"/projects/{upper_pid}")
    assert get_res.status_code == 200
    assert get_res.json()["project_id"] == pid

def test_workspace_id_matches_project_id(test_client):
    res = test_client.post("/projects", json={"project_description": "test", "technology_stack": ["py"]})
    pid = res.json()["project_id"]
    
    db_path = Path(__file__).resolve().parents[2] / "backend" / ".seam_db.json"
    if db_path.exists():
        with open(db_path, "r") as f:
            data = json.load(f)
            assert pid.lower() in data
            assert data[pid.lower()]["workspace"]["project_id"] == pid
            assert data[pid.lower()]["workspace"]["relative_path"] == pid
