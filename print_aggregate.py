import json

with open("C:/Users/KARTHIK/Downloads/FinalYear/generated_projects/prj_69c71f4952dc4816abfdb7b2ce83fb0a/planning/project_plan.json", "r") as f:
    plan = json.load(f)
    print("Planned tasks:", [t["task_id"] for t in plan["result"]["implementation_tasks"]])
    print("Dependencies:")
    for t in plan["result"]["implementation_tasks"]:
        print(f"  {t['task_id']} -> {t.get('dependencies', [])}")
