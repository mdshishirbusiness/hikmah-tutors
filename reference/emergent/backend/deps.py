import json
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

OPTIONS = json.loads((ROOT_DIR.parent / "shared" / "options.json").read_text(encoding="utf-8"))
PUBLIC_SITE_URL = os.environ["PUBLIC_SITE_URL"].rstrip("/")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

STATE = {"class_levels": list(OPTIONS["class_levels"])}
CLASS_GROUPS = ("early", "school", "ssc", "hsc", "other")


async def load_class_levels():
    row = await db.settings.find_one({"key": "class_levels"}, {"_id": 0})
    if row and isinstance(row.get("value"), list) and row["value"]:
        STATE["class_levels"] = row["value"]


def visible_class_levels() -> list:
    return [c for c in STATE["class_levels"] if not c.get("hidden")]


def all_class_options() -> list:
    return STATE["class_levels"] + OPTIONS["legacy_class_levels"]


def valid_class_keys() -> set:
    return {c["key"] for c in visible_class_levels()}


def is_legacy_class(key: str) -> bool:
    return key in {c["key"] for c in OPTIONS["legacy_class_levels"]}


def merged_options() -> dict:
    return {**OPTIONS, "class_levels": visible_class_levels(), "all_class_levels": all_class_options()}
