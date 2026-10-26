import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from deps import CLASS_GROUPS, OPTIONS, PUBLIC_SITE_URL, STATE, all_class_options, db, is_legacy_class, valid_class_keys
from logic import posts
from logic.phone import InvalidPhone, normalize_phone
from logic.text import clean_text
from logic.transitions import ACTIVE_STATUSES, PUBLIC_TUITION_STATUSES, can_transition
from public_data import to_public_tuition

router = APIRouter(prefix="/api")

PUBLIC_EDIT_FIELDS = ("class_level", "medium", "subjects", "area", "mode", "salary_kind", "salary_amount", "salary_period",
                      "days_per_week", "tutor_gender_pref", "student_gender", "students_count", "requirements_public", "start_note", "tuition_type")
PRIVATE_EDIT_FIELDS = ("guardian_name", "guardian_phone", "exact_address", "student_label", "private_notes")
EDITABLE_SETTINGS = ("contact_whatsapp", "contact_call", "facebook_page_url", "daily_application_limit", "post_opening", "post_closing",
                     "post_trust", "post_multi_headline")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def label_en(group: str, key: str) -> str:
    src = all_class_options() if group == "class_levels" else OPTIONS.get(group, [])
    for o in src:
        if o["key"] == key:
            return o["label_en"]
    return key or ""


def mask_phone(p: Optional[str]) -> str:
    return f"{p[:3]}••••••{p[-2:]}" if p and len(p) >= 6 else "••••"


async def settings_map() -> dict:
    return {r["key"]: r["value"] for r in await db.settings.find({}, {"_id": 0}).to_list(200)}


async def audit(action: str, entity_type: str, entity_id: str, detail: str = ""):
    await db.audit_log.insert_one({"id": str(uuid.uuid4()), "actor": "owner", "action": action, "entity_type": entity_type,
                                   "entity_id": entity_id, "detail": detail, "at": now()})


async def get_tuition_doc(code: int) -> dict:
    t = await db.tuitions.find_one({"code": code}, {"_id": 0})
    if not t:
        raise HTTPException(404, "not_found")
    return t


def admin_tuition(t: dict) -> dict:
    return {**t, "code_label": f"HTR-{t['code']}", "legacy_class": is_legacy_class(t.get("class_level", ""))}


async def record_event(app_id: str, frm: Optional[str], to: str, actor: str, reason: Optional[str] = None, msg: Optional[str] = None):
    await db.application_events.insert_one({"id": str(uuid.uuid4()), "application_id": app_id, "from_status": frm, "to_status": to,
                                            "actor": actor, "reason_code": reason, "message_to_tutor": msg, "at": now()})


# ---------- Admin: overview ----------

@router.get("/admin/overview")
async def admin_overview():
    today_end = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59).isoformat()
    open_t = await db.tuitions.count_documents({"is_public": True, "status": {"$in": list(PUBLIC_TUITION_STATUSES)}})
    new_apps = await db.applications.find({"status": "submitted"}, {"_id": 0}).sort("created_at", -1).to_list(20)
    new_leads = await db.leads.find({"status": "new"}, {"_id": 0}).sort("created_at", -1).to_list(20)
    follow = await db.leads.find({"status": "contacted", "next_follow_up_at": {"$ne": None, "$lte": today_end}}, {"_id": 0}).to_list(20)
    tuitions = await db.tuitions.find({"status": {"$nin": ["closed", "cancelled"]}}, {"_id": 0, "code": 1, "class_level": 1, "status": 1}).to_list(500)
    flagged = [admin_tuition(t) for t in tuitions if is_legacy_class(t["class_level"])]
    tutors = {t["id"]: t["full_name"] for t in await db.tutors.find({}, {"_id": 0, "id": 1, "full_name": 1}).to_list(2000)}
    for a in new_apps:
        a["tutor_name"] = tutors.get(a["tutor_id"], "?")
    return {
        "counts": {"open_tuitions": open_t, "applications_waiting": await db.applications.count_documents({"status": "submitted"}),
                   "new_leads": await db.leads.count_documents({"status": "new"}), "follow_ups_due": len(follow), "flagged_classes": len(flagged)},
        "new_applications": new_apps, "new_leads": new_leads, "follow_ups": follow, "flagged": flagged,
    }


# ---------- Admin: leads ----------

class QuickLeadIn(BaseModel):
    client_id: str = Field(min_length=8, max_length=64)
    phone: str
    class_level: str
    area: str = Field(min_length=1, max_length=60)
    guardian_name: Optional[str] = Field(default=None, max_length=80)
    medium: Optional[str] = None
    student_gender: Optional[str] = None
    tutor_gender: str = "any"
    subjects: List[str] = []
    address: Optional[str] = Field(default=None, max_length=200)
    salary: Optional[int] = Field(default=None, ge=0, le=500000)
    days_per_week: Optional[int] = Field(default=None, ge=1, le=7)
    lead_source: str = "call"
    notes: str = Field(default="", max_length=500)
    typed_at: Optional[str] = None


@router.post("/admin/leads", status_code=201)
async def quick_lead(body: QuickLeadIn):
    if await db.leads.find_one({"client_id": body.client_id}, {"_id": 1}):
        return {"ok": True, "duplicate": True}
    if body.class_level not in valid_class_keys():
        raise HTTPException(422, "invalid_class")
    try:
        phone = normalize_phone(body.phone)
    except InvalidPhone:
        raise HTTPException(422, "invalid_phone")
    ts = now()
    doc = {**body.model_dump(exclude={"typed_at"}), "id": str(uuid.uuid4()), "phone": phone, "channel": "quickpad",
           "area": clean_text(body.area), "notes": clean_text(body.notes), "consent_given": False, "status": "new",
           "converted_tuition_code": None, "next_follow_up_at": None, "created_at": body.typed_at or ts, "synced_at": ts, "updated_at": ts}
    await db.leads.insert_one(doc)
    return {"ok": True, "duplicate": False}


@router.get("/admin/leads")
async def list_leads(status: Optional[str] = None):
    q = {"status": status} if status else {}
    items = await db.leads.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    phones: dict = {}
    for ld in await db.leads.find({}, {"_id": 0, "phone": 1}).to_list(5000):
        phones[ld["phone"]] = phones.get(ld["phone"], 0) + 1
    for ld in items:
        ld["duplicate_count"] = phones.get(ld["phone"], 1) - 1
        ld["legacy_class"] = is_legacy_class(ld.get("class_level") or "")
    return {"items": items}


class LeadPatch(BaseModel):
    status: Optional[Literal["new", "contacted", "converted", "discarded"]] = None
    next_follow_up_at: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=500)


@router.patch("/admin/leads/{lead_id}")
async def patch_lead(lead_id: str, body: LeadPatch):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "next_follow_up_at" in upd and not upd["next_follow_up_at"]:
        upd["next_follow_up_at"] = None
    upd["updated_at"] = now()
    r = await db.leads.update_one({"id": lead_id}, {"$set": upd})
    if not r.matched_count:
        raise HTTPException(404, "not_found")
    return await db.leads.find_one({"id": lead_id}, {"_id": 0})


async def next_code() -> int:
    c = await db.counters.find_one_and_update({"_id": "tuition_code"}, {"$inc": {"next": 1}}, return_document=False)
    return c["next"]


async def link_guardian(name: Optional[str], phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    g = await db.guardians.find_one({"phone": phone}, {"_id": 0, "id": 1})
    if g:
        return g["id"]
    ts = now()
    gid = str(uuid.uuid4())
    await db.guardians.insert_one({"id": gid, "name": name or "", "phone": phone, "alt_phone": None, "preferred_channel": "call",
                                   "lead_source": None, "notes": "", "contact_log": [], "next_follow_up_at": None, "created_at": ts, "updated_at": ts})
    return gid


def requirement_default(class_level: str) -> str:
    return "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে" if class_level.startswith(("ssc", "hsc")) else ""


async def insert_tuition(pub: dict, priv: dict, lead_id: Optional[str] = None) -> dict:
    ts = now()
    code = await next_code()
    doc = {"id": str(uuid.uuid4()), "code": code, "status": "draft", "is_public": False, "accepting_applications": True,
           "tuition_type": "academic", "medium": "bangla", "subjects": [], "mode": "home", "salary_kind": "unspecified",
           "salary_amount": None, "salary_period": "per_month", "days_per_week": 3, "tutor_gender_pref": "any", "student_gender": None,
           "students_count": 1, "requirements_public": requirement_default(pub.get("class_level", "")), "start_note": "",
           "posted_at": None, "closed_at": None, "close_reason": None, "created_by": "owner", "created_at": ts, "updated_at": ts, **pub}
    await db.tuitions.insert_one(dict(doc))
    gid = await link_guardian(priv.get("guardian_name"), priv.get("guardian_phone"))
    await db.tuition_private.insert_one({"id": str(uuid.uuid4()), "tuition_code": code, "guardian_id": gid, "lead_id": lead_id,
                                         "guardian_name": priv.get("guardian_name") or "", "guardian_phone": priv.get("guardian_phone") or "",
                                         "exact_address": priv.get("exact_address") or "", "student_label": priv.get("student_label") or "",
                                         "private_notes": priv.get("private_notes") or "", "salary_override_reason": None, "created_at": ts, "updated_at": ts})
    await audit("tuition_created", "tuition", str(code))
    return doc


@router.post("/admin/leads/{lead_id}/convert")
async def convert_lead(lead_id: str):
    ld = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not ld:
        raise HTTPException(404, "not_found")
    if ld.get("converted_tuition_code"):
        return {"code": ld["converted_tuition_code"]}
    area = ld["area"] if ld["area"] in {a["key"] for a in OPTIONS["areas"]} else "online"
    pub = {"class_level": ld["class_level"], "subjects": ld.get("subjects") or [], "area": area, "medium": ld.get("medium") or "bangla",
           "tutor_gender_pref": ld.get("tutor_gender") or "any", "student_gender": ld.get("student_gender"),
           "days_per_week": ld.get("days_per_week") or 3}
    if ld.get("salary"):
        pub.update({"salary_kind": "fixed", "salary_amount": ld["salary"]})
    note = ld.get("notes") or ""
    if area != ld["area"]:
        note = f"এলাকা (লিড): {ld['area']}\n{note}"
    doc = await insert_tuition(pub, {"guardian_name": ld.get("guardian_name"), "guardian_phone": ld["phone"],
                                     "exact_address": ld.get("address"), "private_notes": note}, lead_id)
    await db.leads.update_one({"id": lead_id}, {"$set": {"status": "converted", "converted_tuition_code": doc["code"], "updated_at": now()}})
    return {"code": doc["code"]}


# ---------- Admin: tuitions ----------

@router.get("/admin/tuitions")
async def admin_tuitions(status: Optional[str] = None, q: Optional[str] = None):
    flt = {"status": status} if status else {}
    items = await db.tuitions.find(flt, {"_id": 0}).sort("code", -1).to_list(2000)
    if q:
        ql = q.lower().replace("htr-", "")
        items = [t for t in items if ql in str(t["code"]) or ql in t["area"] or ql in label_en("areas", t["area"]).lower()
                 or ql in label_en("class_levels", t["class_level"]).lower()]
    counts = {}
    for a in await db.applications.find({}, {"_id": 0, "tuition_code": 1}).to_list(10000):
        counts[a["tuition_code"]] = counts.get(a["tuition_code"], 0) + 1
    return {"items": [{**admin_tuition(t), "applications_count": counts.get(t["code"], 0)} for t in items]}


@router.get("/admin/tuitions/{code}")
async def admin_tuition_detail(code: int):
    t = await get_tuition_doc(code)
    priv = await db.tuition_private.find_one({"tuition_code": code}, {"_id": 0}) or {}
    if priv.get("guardian_id") and not priv.get("guardian_phone"):
        g = await db.guardians.find_one({"id": priv["guardian_id"]}, {"_id": 0}) or {}
        priv["guardian_name"], priv["guardian_phone"] = g.get("name", ""), g.get("phone", "")
    return {"tuition": admin_tuition(t), "private": priv, "applications": await applications_for({"tuition_code": code})}


class TuitionIn(BaseModel):
    class_level: Optional[str] = None
    medium: Optional[str] = None
    subjects: Optional[List[str]] = None
    area: Optional[str] = None
    mode: Optional[Literal["home", "online"]] = None
    salary_kind: Optional[Literal["fixed", "negotiable", "unspecified"]] = None
    salary_amount: Optional[int] = Field(default=None, ge=0, le=500000)
    salary_period: Optional[Literal["per_month", "per_course"]] = None
    days_per_week: Optional[int] = Field(default=None, ge=1, le=7)
    tutor_gender_pref: Optional[Literal["any", "male", "female"]] = None
    student_gender: Optional[Literal["boy", "girl"]] = None
    students_count: Optional[int] = Field(default=None, ge=1, le=20)
    requirements_public: Optional[str] = Field(default=None, max_length=600)
    start_note: Optional[str] = Field(default=None, max_length=120)
    tuition_type: Optional[str] = None
    guardian_name: Optional[str] = Field(default=None, max_length=80)
    guardian_phone: Optional[str] = None
    exact_address: Optional[str] = Field(default=None, max_length=300)
    student_label: Optional[str] = Field(default=None, max_length=80)
    private_notes: Optional[str] = Field(default=None, max_length=1000)
    action: Optional[Literal["publish", "unpublish", "accepting_on", "accepting_off", "processing", "close", "reopen"]] = None
    close_reason: Optional[str] = None


def validate_public(pub: dict, current_class: Optional[str]):
    if "class_level" in pub and pub["class_level"] not in valid_class_keys() and pub["class_level"] != current_class:
        raise HTTPException(422, "invalid_class")
    if "area" in pub and pub["area"] not in {a["key"] for a in OPTIONS["areas"]}:
        raise HTTPException(422, "invalid_area")
    if "subjects" in pub and any(s not in {o["key"] for o in OPTIONS["subjects"]} for s in pub["subjects"]):
        raise HTTPException(422, "invalid_subject")
    if "medium" in pub and pub["medium"] not in {o["key"] for o in OPTIONS["mediums"]}:
        raise HTTPException(422, "invalid_medium")


def split_body(body: TuitionIn) -> tuple:
    data = body.model_dump(exclude_unset=True)
    pub = {k: data[k] for k in PUBLIC_EDIT_FIELDS if k in data}
    priv = {k: data[k] for k in PRIVATE_EDIT_FIELDS if k in data}
    for k in ("requirements_public", "start_note"):
        if k in pub and pub[k] is not None:
            pub[k] = clean_text(pub[k])
    if priv.get("guardian_phone"):
        try:
            priv["guardian_phone"] = normalize_phone(priv["guardian_phone"])
        except InvalidPhone:
            raise HTTPException(422, "invalid_phone")
    return pub, priv


def check_salary(t: dict):
    if t.get("salary_kind") == "fixed" and not (t.get("salary_amount") or 0) > 0:
        raise HTTPException(422, "salary_required")
    if t.get("salary_kind") != "fixed":
        t["salary_amount"] = None


@router.post("/admin/tuitions", status_code=201)
async def create_tuition(body: TuitionIn):
    pub, priv = split_body(body)
    if not pub.get("class_level") or not pub.get("area"):
        raise HTTPException(422, "class_and_area_required")
    validate_public(pub, None)
    check_salary(pub)
    doc = await insert_tuition(pub, priv)
    return {"code": doc["code"]}


async def close_active_applications(code: int):
    for a in await db.applications.find({"tuition_code": code, "status": {"$in": list(ACTIVE_STATUSES)}}, {"_id": 0}).to_list(500):
        await db.applications.update_one({"id": a["id"]}, {"$set": {"status": "opportunity_closed", "updated_at": now()}})
        await record_event(a["id"], a["status"], "opportunity_closed", "system")


@router.put("/admin/tuitions/{code}")
async def update_tuition(code: int, body: TuitionIn):
    t = await get_tuition_doc(code)
    pub, priv = split_body(body)
    validate_public(pub, t["class_level"])
    merged = {**t, **pub}
    check_salary(merged)
    pub["salary_amount"] = merged["salary_amount"]
    ts = now()
    act = body.action
    if act == "publish":
        if not merged.get("subjects"):
            raise HTTPException(422, "subjects_required")
        pub.update({"is_public": True, "status": "available" if t["status"] in ("draft", "follow_up") else t["status"],
                    "posted_at": t.get("posted_at") or ts, "closed_at": None})
    elif act == "unpublish":
        pub.update({"is_public": False})
    elif act in ("accepting_on", "accepting_off"):
        pub["accepting_applications"] = act == "accepting_on"
    elif act == "processing":
        pub["status"] = "processing"
    elif act == "close":
        pub.update({"status": "closed", "is_public": False, "accepting_applications": False, "closed_at": ts,
                    "close_reason": body.close_reason or "filled"})
    elif act == "reopen":
        pub.update({"status": "draft", "is_public": False, "accepting_applications": True, "closed_at": None, "close_reason": None})
    pub["updated_at"] = ts
    await db.tuitions.update_one({"code": code}, {"$set": pub})
    if priv:
        if "guardian_phone" in priv or "guardian_name" in priv:
            old = await db.tuition_private.find_one({"tuition_code": code}, {"_id": 0}) or {}
            priv["guardian_id"] = await link_guardian(priv.get("guardian_name", old.get("guardian_name")), priv.get("guardian_phone", old.get("guardian_phone")))
        priv["updated_at"] = ts
        await db.tuition_private.update_one({"tuition_code": code}, {"$set": priv, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": ts}}, upsert=True)
    if act == "close":
        await close_active_applications(code)
    await audit(f"tuition_{act or 'updated'}", "tuition", str(code))
    return await admin_tuition_detail(code)


# ---------- Applications ----------

async def applications_for(q: dict) -> list:
    apps = await db.applications.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    tutor_ids = list({a["tutor_id"] for a in apps})
    tutors = {t["id"]: t for t in await db.tutors.find({"id": {"$in": tutor_ids}}, {"_id": 0}).to_list(2000)}
    codes = list({a["tuition_code"] for a in apps})
    tuitions = {t["code"]: t for t in await db.tuitions.find({"code": {"$in": codes}}, {"_id": 0}).to_list(2000)}
    out = []
    for a in apps:
        tu = tutors.get(a["tutor_id"], {})
        t = tuitions.get(a["tuition_code"], {})
        out.append({**a, "tutor": {"id": tu.get("id"), "full_name": tu.get("full_name"), "gender": tu.get("gender"), "institution": tu.get("institution"),
                                   "department": tu.get("department"), "subjects": tu.get("subjects", []), "areas": tu.get("areas", []),
                                   "class_levels": tu.get("class_levels", []), "phone_masked": mask_phone(tu.get("phone")),
                                   "experience_note": tu.get("experience_note", "")},
                    "tuition": {"code": t.get("code"), "class_level": t.get("class_level"), "subjects": t.get("subjects", []),
                                "area": t.get("area"), "tutor_gender_pref": t.get("tutor_gender_pref"), "status": t.get("status")}})
    return out


@router.get("/admin/applications")
async def admin_applications(status: Optional[str] = None, code: Optional[int] = None):
    q: dict = {}
    if status:
        q["status"] = status
    if code:
        q["tuition_code"] = code
    return {"items": await applications_for(q)}


class StatusIn(BaseModel):
    to_status: str
    reason_code: Optional[str] = None
    message: Optional[str] = Field(default=None, max_length=300)


@router.post("/admin/applications/{app_id}/status")
async def change_application_status(app_id: str, body: StatusIn):
    a = await db.applications.find_one({"id": app_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "not_found")
    if not can_transition(a["status"], body.to_status, "owner"):
        raise HTTPException(409, "transition_not_allowed")
    if body.to_status == "shortlisted":
        tu = await db.tutors.find_one({"id": a["tutor_id"]}, {"_id": 0, "availability_paused": 1})
        if tu and tu.get("availability_paused"):
            raise HTTPException(409, "tutor_paused")
    await db.applications.update_one({"id": app_id}, {"$set": {"status": body.to_status, "reason_code": body.reason_code, "updated_at": now()}})
    await record_event(app_id, a["status"], body.to_status, "owner", body.reason_code, body.message)
    if body.to_status == "confirmed":
        await db.tuitions.update_one({"code": a["tuition_code"]}, {"$set": {"status": "booked", "is_public": False, "accepting_applications": False,
                                                                           "closed_at": now(), "close_reason": "filled", "updated_at": now()}})
        others = await db.applications.find({"tuition_code": a["tuition_code"], "id": {"$ne": app_id}, "status": {"$in": list(ACTIVE_STATUSES)}}, {"_id": 0}).to_list(500)
        for o in others:
            await db.applications.update_one({"id": o["id"]}, {"$set": {"status": "opportunity_closed", "updated_at": now()}})
            await record_event(o["id"], o["status"], "opportunity_closed", "system")
    await audit("application_status", "application", app_id, f"{a['status']}->{body.to_status}")
    return {"ok": True}


# ---------- Tutors directory ----------

@router.get("/admin/tutors")
async def admin_tutors(q: Optional[str] = None):
    items = await db.tutors.find({}, {"_id": 0}).sort("full_name", 1).to_list(5000)
    if q:
        ql = q.lower()
        digits = re.sub(r"\D", "", q)
        items = [t for t in items if ql in t["full_name"].lower() or ql in (t.get("institution") or "").lower() or (digits and digits in t.get("phone", ""))]
    return {"items": [{**{k: v for k, v in t.items() if k != "phone"}, "phone_masked": mask_phone(t.get("phone"))} for t in items]}


@router.post("/admin/tutors/{tutor_id}/reveal")
async def reveal_phone(tutor_id: str):
    t = await db.tutors.find_one({"id": tutor_id}, {"_id": 0, "phone": 1})
    if not t:
        raise HTTPException(404, "not_found")
    await audit("phone_revealed", "tutor", tutor_id)
    return {"phone": t["phone"]}


# ---------- Settings ----------

class ClassLevelIn(BaseModel):
    key: str = Field(pattern=r"^[a-z0-9-]{1,24}$")
    label: str = Field(min_length=1, max_length=40)
    label_en: str = Field(min_length=1, max_length=40)
    group: str
    hidden: bool = False
    alt: List[str] = []


class SettingsIn(BaseModel):
    contact_whatsapp: Optional[str] = None
    contact_call: Optional[str] = None
    facebook_page_url: Optional[str] = Field(default=None, max_length=200)
    daily_application_limit: Optional[int] = Field(default=None, ge=1, le=100)
    post_opening: Optional[str] = Field(default=None, max_length=500)
    post_closing: Optional[str] = Field(default=None, max_length=800)
    post_trust: Optional[str] = Field(default=None, max_length=800)
    post_multi_headline: Optional[str] = Field(default=None, max_length=200)
    class_levels: Optional[List[ClassLevelIn]] = None


@router.get("/admin/settings")
async def get_admin_settings():
    s = await settings_map()
    out = {k: s.get(k) for k in EDITABLE_SETTINGS}
    out["class_levels"] = STATE["class_levels"]
    out["class_groups"] = list(CLASS_GROUPS)
    return out


@router.put("/admin/settings")
async def put_admin_settings(body: SettingsIn):
    data = body.model_dump(exclude_unset=True)
    for k in ("contact_whatsapp", "contact_call"):
        if data.get(k):
            try:
                data[k] = normalize_phone(data[k])
            except InvalidPhone:
                raise HTTPException(422, f"invalid_{k}")
    if "class_levels" in data:
        levels = data["class_levels"] = [c.model_dump() for c in body.class_levels or []]
        keys = [c["key"] for c in levels]
        if len(keys) != len(set(keys)) or any(c["group"] not in CLASS_GROUPS for c in levels):
            raise HTTPException(422, "invalid_class_levels")
        old_keys = {c["key"] for c in STATE["class_levels"]}
        if not old_keys <= set(keys):
            raise HTTPException(422, "class_keys_cannot_be_removed")
        if not any(not c.get("hidden") for c in levels):
            raise HTTPException(422, "at_least_one_class")
        STATE["class_levels"] = levels
    ts = now()
    for k, v in data.items():
        await db.settings.update_one({"key": k}, {"$set": {"value": v, "updated_at": ts}, "$setOnInsert": {"created_at": ts}}, upsert=True)
    await audit("settings_updated", "settings", ",".join(data.keys()))
    return await get_admin_settings()


# ---------- Posts ----------

class PostsIn(BaseModel):
    codes: List[int] = Field(min_length=1, max_length=20)
    include_trust: bool = True
    include_link: bool = False


@router.post("/admin/posts")
async def generate_posts(body: PostsIn):
    docs = {t["code"]: t for t in await db.tuitions.find({"code": {"$in": body.codes}}, {"_id": 0}).to_list(50)}
    ordered = [to_public_tuition(docs[c]) | {"code": c} for c in body.codes if c in docs]
    if not ordered:
        raise HTTPException(404, "not_found")
    links = {t["code"]: f"{PUBLIC_SITE_URL}/api/share/HTR-{t['code']}" for t in ordered} if body.include_link else {}
    return posts.generate(ordered, label_en, await settings_map(), body.include_trust, links)


# ---------- Tutor panel (demo: tutor chosen by X-Tutor-Id, no login yet) ----------

async def current_tutor(tutor_id: Optional[str]) -> dict:
    if not tutor_id:
        raise HTTPException(400, "tutor_required")
    t = await db.tutors.find_one({"id": tutor_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "tutor_not_found")
    return t


def checklist(t: dict) -> dict:
    return {"name": bool(t.get("full_name")), "phone": bool(t.get("phone")), "gender": t.get("gender") in ("male", "female"),
            "institution": bool(t.get("institution")), "subjects_classes": bool(t.get("subjects")) and bool(t.get("class_levels")),
            "areas": bool(t.get("areas"))}


@router.get("/tutor/demo-list")
async def tutor_demo_list():
    items = await db.tutors.find({"claim_status": "claimed"}, {"_id": 0, "id": 1, "full_name": 1, "gender": 1, "institution": 1}).sort("full_name", 1).to_list(200)
    return {"items": items}


@router.get("/me")
async def me(x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    saved = [s["tuition_code"] for s in await db.saved_tuitions.find({"tutor_id": t["id"]}, {"_id": 0, "tuition_code": 1}).to_list(500)]
    return {"profile": t, "checklist": checklist(t), "saved_codes": saved}


class ProfileIn(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    gender: Optional[Literal["male", "female"]] = None
    phone: Optional[str] = None
    institution: Optional[str] = Field(default=None, max_length=120)
    department: Optional[str] = Field(default=None, max_length=80)
    subjects: Optional[List[str]] = None
    class_levels: Optional[List[str]] = None
    areas: Optional[List[str]] = None
    mode: Optional[Literal["home", "online", "both"]] = None
    experience_note: Optional[str] = Field(default=None, max_length=300)
    expected_salary_min: Optional[int] = Field(default=None, ge=0, le=200000)
    availability_paused: Optional[bool] = None


@router.put("/me")
async def update_me(body: ProfileIn, x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    data = body.model_dump(exclude_unset=True)
    if data.get("phone"):
        try:
            data["phone"] = normalize_phone(data["phone"])
        except InvalidPhone:
            raise HTTPException(422, "invalid_phone")
    if "class_levels" in data and any(c not in {o["key"] for o in all_class_options()} for c in data["class_levels"] or []):
        raise HTTPException(422, "invalid_class")
    for k in ("full_name", "institution", "department", "experience_note"):
        if data.get(k):
            data[k] = clean_text(data[k])
    data["updated_at"] = now()
    await db.tutors.update_one({"id": t["id"]}, {"$set": data})
    return await me(t["id"])


@router.post("/me/saved/{code}")
async def toggle_saved(code: int, x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    q = {"tutor_id": t["id"], "tuition_code": code}
    if await db.saved_tuitions.find_one(q, {"_id": 1}):
        await db.saved_tuitions.delete_one(q)
        return {"saved": False}
    await get_tuition_doc(code)
    await db.saved_tuitions.insert_one({**q, "id": str(uuid.uuid4()), "created_at": now()})
    return {"saved": True}


@router.get("/me/saved")
async def list_saved(x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    codes = [s["tuition_code"] for s in await db.saved_tuitions.find({"tutor_id": t["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)]
    docs = {d["code"]: d for d in await db.tuitions.find({"code": {"$in": codes}}, {"_id": 0}).to_list(500)}
    return {"items": [to_public_tuition(docs[c]) for c in codes if c in docs]}


@router.get("/me/suggested")
async def suggested(x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    docs = await db.tuitions.find({"is_public": True, "status": {"$in": list(PUBLIC_TUITION_STATUSES)}}, {"_id": 0}).sort("posted_at", -1).to_list(500)

    def score(d):
        return (d["area"] in t.get("areas", [])) + (d["class_level"] in t.get("class_levels", [])) + bool(set(d["subjects"]) & set(t.get("subjects", [])))

    ranked = sorted([d for d in docs if score(d) > 0 and d["tutor_gender_pref"] in ("any", t.get("gender"))], key=score, reverse=True)
    return {"items": [to_public_tuition(d) for d in ranked[:12]]}


class ApplyIn(BaseModel):
    code: int
    note: str = Field(default="", max_length=300)
    availability_confirmed: bool
    terms_accepted: bool


@router.post("/me/applications", status_code=201)
async def apply(body: ApplyIn, x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    if not body.availability_confirmed or not body.terms_accepted:
        raise HTTPException(422, "confirm_required")
    if not all(checklist(t).values()):
        raise HTTPException(422, "profile_incomplete")
    if t.get("availability_paused"):
        raise HTTPException(409, "availability_paused")
    tu = await get_tuition_doc(body.code)
    if not (tu.get("is_public") and tu["status"] in PUBLIC_TUITION_STATUSES and tu.get("accepting_applications")):
        raise HTTPException(409, "not_accepting")
    if tu["tutor_gender_pref"] != "any" and tu["tutor_gender_pref"] != t.get("gender"):
        raise HTTPException(409, "gender_mismatch")
    if await db.applications.find_one({"tuition_code": body.code, "tutor_id": t["id"], "status": {"$in": list(ACTIVE_STATUSES)}}, {"_id": 1}):
        raise HTTPException(409, "already_applied")
    limit = int((await settings_map()).get("daily_application_limit", 20))
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    if await db.applications.count_documents({"tutor_id": t["id"], "created_at": {"$gte": since}}) >= limit:
        raise HTTPException(429, "daily_limit")
    ts = now()
    doc = {"id": str(uuid.uuid4()), "tuition_code": body.code, "tutor_id": t["id"], "status": "submitted", "note": clean_text(body.note),
           "availability_confirmed": True, "terms_version": 1, "terms_accepted_at": ts, "terms_accepted_via": "site", "source": "site",
           "entered_by_owner": False, "reason_code": None, "created_at": ts, "updated_at": ts}
    await db.applications.insert_one(dict(doc))
    await record_event(doc["id"], None, "submitted", "tutor")
    doc.pop("_id", None)
    return doc


@router.get("/me/applications")
async def my_applications(x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    apps = await applications_for({"tutor_id": t["id"]})
    ids = [a["id"] for a in apps]
    events: dict = {}
    for e in await db.application_events.find({"application_id": {"$in": ids}}, {"_id": 0}).sort("at", 1).to_list(5000):
        events.setdefault(e["application_id"], []).append(e)
    for a in apps:
        a.pop("tutor", None)
        a["events"] = events.get(a["id"], [])
    return {"items": apps}


@router.post("/me/applications/{app_id}/withdraw")
async def withdraw(app_id: str, x_tutor_id: Optional[str] = Header(None)):
    t = await current_tutor(x_tutor_id)
    a = await db.applications.find_one({"id": app_id, "tutor_id": t["id"]}, {"_id": 0})
    if not a:
        raise HTTPException(404, "not_found")
    if not can_transition(a["status"], "withdrawn", "tutor"):
        raise HTTPException(409, "transition_not_allowed")
    await db.applications.update_one({"id": app_id}, {"$set": {"status": "withdrawn", "updated_at": now()}})
    await record_event(app_id, a["status"], "withdrawn", "tutor")
    return {"ok": True}
