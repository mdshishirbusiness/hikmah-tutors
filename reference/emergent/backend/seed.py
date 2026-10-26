import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from pymongo import ASCENDING, DESCENDING

SEED_PATH = Path(__file__).parent / "seed_data.json"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def ensure_indexes(db):
    await db.tuitions.create_index([("code", ASCENDING)], unique=True)
    await db.tuitions.create_index([("is_public", ASCENDING), ("status", ASCENDING), ("posted_at", DESCENDING)])
    await db.tuitions.create_index([("area", ASCENDING)])
    await db.tuitions.create_index([("class_level", ASCENDING)])
    await db.tuition_private.create_index([("tuition_code", ASCENDING)], unique=True)
    await db.tutors.create_index([("phone", ASCENDING)])
    await db.tutors.create_index([("user_id", ASCENDING)])
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.leads.create_index([("client_id", ASCENDING)], unique=True)
    await db.leads.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
    await db.leads.create_index([("phone", ASCENDING)])
    await db.guardians.create_index([("phone", ASCENDING)])
    await db.applications.create_index(
        [("tuition_code", ASCENDING), ("tutor_id", ASCENDING)],
        unique=True,
        partialFilterExpression={"status": {"$in": ["submitted", "under_review", "shortlisted", "trial_arranged"]}},
        name="one_active_application",
    )
    await db.applications.create_index([("tutor_id", ASCENDING), ("created_at", DESCENDING)])
    await db.application_events.create_index([("application_id", ASCENDING), ("at", ASCENDING)])
    await db.saved_tuitions.create_index([("tutor_id", ASCENDING), ("tuition_code", ASCENDING)], unique=True)
    await db.notifications.create_index([("tutor_id", ASCENDING), ("read_at", ASCENDING), ("created_at", DESCENDING)])
    await db.concerns.create_index([("status", ASCENDING)])
    await db.audit_log.create_index([("at", DESCENDING)])
    await db.audit_log.create_index([("entity_type", ASCENDING), ("entity_id", ASCENDING)])
    await db.settings.create_index([("key", ASCENDING)], unique=True)
    await db.terms_versions.create_index([("kind", ASCENDING), ("version", DESCENDING)], unique=True)
    await db.consents.create_index([("tutor_id", ASCENDING), ("purpose", ASCENDING)])
    await db.claims.create_index([("user_id", ASCENDING)])


def _stamp(doc: dict, ts: str) -> dict:
    doc.setdefault("id", str(uuid.uuid4()))
    doc.setdefault("created_at", ts)
    doc["updated_at"] = ts
    return doc


async def load_seed(db):
    data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    ts = now_iso()

    for key, value in data["settings"].items():
        await db.settings.update_one({"key": key}, {"$setOnInsert": {"key": key, "value": value, "created_at": ts}, "$set": {"updated_at": ts}}, upsert=True)

    from deps import OPTIONS
    await db.settings.update_one({"key": "class_levels"}, {"$setOnInsert": {"key": "class_levels", "value": OPTIONS["class_levels"], "created_at": ts, "updated_at": ts}}, upsert=True)

    await db.counters.update_one({"_id": "tuition_code"}, {"$setOnInsert": {"next": data["settings"]["tuition_code_start"] + len(data["tuitions"])}}, upsert=True)

    for t in data["tuitions"]:
        existing = await db.tuitions.find_one({"code": t["code"]}, {"_id": 0, "posted_at": 1})
        doc = {
            "tuition_type": "admission" if t["class_level"] == "admission" else ("quran" if "quran" in t["subjects"] else "academic"),
            "accepting_applications": t["status"] in ("available", "processing"),
            "students_count": 1,
            "student_gender": None,
            "requirements_public": "",
            "start_note": "",
            "posted_at": (existing or {}).get("posted_at") or (ts if t["status"] != "draft" else None),
            "closed_at": ts if t["status"] in ("closed", "booked", "cancelled") else None,
            "close_reason": "filled" if t["status"] == "closed" else None,
            "created_by": "seed",
            **t,
        }
        doc["updated_at"] = ts
        doc.setdefault("created_at", ts)
        doc["id"] = str(uuid.uuid4())
        await db.tuitions.update_one({"code": t["code"]}, {"$setOnInsert": doc}, upsert=True)

    for p in data["tuition_private"]:
        guardian = {"name": p["guardian_name"], "phone": p["guardian_phone"], "alt_phone": None, "preferred_channel": "call",
                    "lead_source": p["lead_source"], "notes": "", "contact_log": [], "next_follow_up_at": None}
        g = await db.guardians.find_one({"phone": p["guardian_phone"]}, {"_id": 0, "id": 1})
        if not g:
            g = _stamp(guardian, ts)
            await db.guardians.insert_one(dict(g))
        priv = {"tuition_code": p["tuition_code"], "guardian_id": g["id"], "lead_id": None, "exact_address": p["exact_address"],
                "student_label": "", "private_notes": p["private_notes"], "salary_override_reason": None, "updated_at": ts}
        await db.tuition_private.update_one({"tuition_code": p["tuition_code"]}, {"$set": priv, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": ts}}, upsert=True)

    tutor_ids = {}
    for tu in data["tutors"]:
        doc = {"user_id": None, "claim_status": "claimed", "legacy_ref": None, "phone_is_whatsapp": True, "email": None,
               "department": None, "study_status": None, "study_year": None, "education": [], "mediums": ["bangla"],
               "availability": {}, "mode": "home", "experience_years": None, "experience_note": "", "expected_salary_min": None,
               "expected_salary_max": None, "photo_thumb_key": None, "photo_display_key": None, "availability_paused": False,
               "created_via": "staff", **tu}
        existing = await db.tutors.find_one({"phone": tu["phone"]}, {"_id": 0, "id": 1})
        if existing:
            tutor_ids[tu["full_name"]] = existing["id"]
            continue
        _stamp(doc, ts)
        await db.tutors.insert_one(dict(doc))
        tutor_ids[tu["full_name"]] = doc["id"]

    for ld in data["leads"]:
        doc = {"guardian_name": None, "medium": None, "student_gender": None, "tutor_gender": "any", "address": None,
               "salary": None, "days_per_week": None, "notes": "", "lead_source": "website", "consent_given": False,
               "converted_tuition_code": None, "synced_at": ts, **ld}
        _stamp(doc, ts)
        await db.leads.update_one({"client_id": ld["client_id"]}, {"$setOnInsert": doc}, upsert=True)

    for name, code, status in [("Sample Tutor A", 9001, "under_review"), ("Sample Tutor B", 9003, "shortlisted"), ("Sample Tutor B", 9004, "submitted")]:
        tid = tutor_ids.get(name)
        if not tid or await db.applications.find_one({"tuition_code": code, "tutor_id": tid}):
            continue
        app_doc = _stamp({"tuition_code": code, "tutor_id": tid, "status": status, "note": "", "availability_confirmed": True,
                          "terms_version": 1, "terms_accepted_at": ts, "terms_accepted_via": "staff_recorded", "source": "site",
                          "entered_by_owner": False, "reason_code": None}, ts)
        await db.applications.insert_one(dict(app_doc))
        await db.application_events.insert_one({"id": str(uuid.uuid4()), "application_id": app_doc["id"], "from_status": None,
                                                "to_status": status, "actor": "system", "reason_code": None, "message_to_tutor": None, "at": ts})

    from logic.fees import FEE_TERMS_BN, FEE_TERMS_EN
    await db.terms_versions.update_one({"kind": "fee_terms", "version": 1}, {"$setOnInsert": {"id": str(uuid.uuid4()), "kind": "fee_terms", "version": 1,
                                        "text_bn": FEE_TERMS_BN, "text_en": FEE_TERMS_EN, "effective_from": ts, "created_at": ts, "updated_at": ts}}, upsert=True)
