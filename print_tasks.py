import json
import glob

files = glob.glob("C:/Users/KARTHIK/Downloads/FinalYear/generated_projects/prj_69c71f4952dc4816abfdb7b2ce83fb0a/runtime/events.jsonl")
if files:
    with open(files[0], "r") as f:
        for line in f:
            data = json.loads(line)
            if data["event_type"] in ("task.started", "task.completed", "qa.started", "qa.completed", "qa.failed"):
                print(data)
