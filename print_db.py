import json
import sqlite3
from backend.composition.repository import DefaultProjectRepository
import asyncio

async def main():
    repo = DefaultProjectRepository("C:/Users/KARTHIK/Downloads/FinalYear/.aevum/chroma/chroma.sqlite3")
    agg = await repo.get("prj_69c71f4952dc4816abfdb7b2ce83fb0a")
    if agg:
        for t_id, state in agg.tasks.items():
            print(f"{t_id}: {state.status.value}")
        print("Lifecycle status:", agg.lifecycle_status.value)

asyncio.run(main())
