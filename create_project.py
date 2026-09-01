import requests

url = "http://localhost:8000/projects"
payload = {
    "project_description": "Build a small full-stack task management web application.\n\nRequirements:\n- Users can create tasks.\n- Users can view all tasks.\n- Users can mark tasks as completed.\n- Users can delete tasks.\n- Provide a REST API.\n- Provide a simple browser-based frontend.\n- Persist tasks using the technology available in the selected stack.\n- Include clear API error handling.\n- Include a health endpoint.\n- The application must be runnable as a Docker container.",
    "technology_stack": ["Python", "FastAPI", "SQLite", "Vanilla JS", "HTML", "CSS"]
}

print("Creating project...")
response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
try:
    print(response.json())
except Exception as e:
    print(response.text)
