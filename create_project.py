import requests
import time
import sys

url = "http://localhost:8000/projects"
payload = {
    "project_description": "Build a simple Todo REST API using Python FastAPI. It must support creating, listing, updating, and deleting todos, use SQLite persistence, include request validation, and expose a health endpoint.",
    "technology_stack": ["Python", "FastAPI", "SQLite"]
}

print("Creating project (Analysis & Planning)...")
response = requests.post(url, json=payload)

if response.status_code != 201:
    print(f"Failed to create project: {response.status_code}")
    print(response.text)
    sys.exit(1)

project_data = response.json()
project_id = project_data.get("project_id")
print(f"Project created with ID: {project_id}")

print("\nStarting full SEAM lifecycle execution...")
run_url = f"http://localhost:8000/projects/{project_id}/run"
run_response = requests.post(run_url, json={})

if run_response.status_code not in (200, 202):
    print(f"Execution failed: {run_response.status_code}")
    print(run_response.text)
    sys.exit(1)

final_data = run_response.json()
print("\n=== EXECUTION COMPLETED ===")
print(f"Final Project Status: {final_data.get('status')}")

# Print tasks summary
tasks = final_data.get("tasks", [])
print("\n=== TASKS SUMMARY ===")
for task_id, task in tasks.items():
    print(f"- {task_id}: {task.get('status')} (Priority: {task.get('priority')})")
    
# Print QA results if any
print("\n=== QA VERDICTS ===")
for task_id, task in tasks.items():
    if "qa_verdict" in task:
        print(f"- {task_id} QA: {task['qa_verdict']}")
