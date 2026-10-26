import json
import logging
import os
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, HTMLResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware

from export_code import build_code_zip
from logic.phone import InvalidPhone, normalize_phone
from logic.text import clean_text, format_taka, matches, normalize_search
from logic.transitions import CLOSED_TUITION_STATUSES, PUBLIC_TUITION_STATUSES
from public_data import public_settings, to_public_tuition
from seed import ensure_indexes, load_seed
from share_card import render_generic, render_tuition_card, salary_text

from deps import OPTIONS, PUBLIC_SITE_URL, ROOT_DIR, all_class_options, client, db, load_class_levels, merged_options, valid_class_keys
from panel_api import router as panel_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("htr")

app = FastAPI(title="Hikmah Tutors Rajshahi API", docs_url=None, redoc_url=None, openapi_url=None)
api = APIRouter(prefix="/api")


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        resp = await call_next(request)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers.setdefault("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'")
        return resp


OPTION_KEYS = {g: {o["key"] for o in OPTIONS[g]} for g in ("mediums", "subjects", "tutor_genders", "modes", "areas")}


def _group(group: str) -> list:
    return all_class_options() if group == "class_levels" else OPTIONS[group]


def _label(group: str, key: str) -> str:
    for o in _group(group):
        if o["key"] == key:
            return o["label"]
    return key or ""


def _opt_blob(group: str, key: str) -> str:
    for o in _group(group):
        if o["key"] == key:
            return " ".join([o["key"], o["label"], o["label_en"], *o.get("alt", [])])
    return key or ""


def search_blob(t: dict) -> str:
    parts = [f"htr-{t['code']}", str(t["code"]), _opt_blob("class_levels", t["class_level"]), _opt_blob("mediums", t["medium"]),
             _opt_blob("areas", t["area"]), _opt_blob("modes", t["mode"]), _opt_blob("tutor_genders", t["tutor_gender_pref"])]
    parts += [_opt_blob("subjects", s) for s in t["subjects"]]
    return normalize_search(" ".join(parts))


async def public_tuition_docs() -> List[dict]:
    cur = db.tuitions.find({"is_public": True, "status": {"$in": list(PUBLIC_TUITION_STATUSES)}}, {"_id": 0}).sort("posted_at", -1)
    return await cur.to_list(2000)


async def get_settings_map() -> dict:
    rows = await db.settings.find({}, {"_id": 0}).to_list(200)
    return {r["key"]: r["value"] for r in rows}


@api.get("/health")
async def health():
    return {"ok": True}


@api.get("/options")
async def options():
    return merged_options()


@api.get("/settings/public")
async def settings_public():
    return public_settings(await get_settings_map())


@api.get("/tuitions")
async def list_tuitions(
    area: Optional[str] = None, class_level: Optional[str] = None, subject: Optional[str] = None, medium: Optional[str] = None,
    tutor_gender: Optional[str] = None, mode: Optional[str] = None, salary_min: Optional[int] = Query(None, ge=0),
    salary_max: Optional[int] = Query(None, ge=0), days: Optional[int] = Query(None, ge=1, le=7), q: Optional[str] = None,
    sort: str = "newest",
):
    docs = await public_tuition_docs()

    def is_fixed_monthly(t):
        return t["salary_kind"] == "fixed" and t["salary_period"] == "per_month" and bool(t.get("salary_amount"))

    def keep(t):
        if area and t["area"] not in area.split(","):
            return False
        if class_level and t["class_level"] not in class_level.split(","):
            return False
        if subject and not set(subject.split(",")) & set(t["subjects"]):
            return False
        if medium and t["medium"] not in medium.split(","):
            return False
        if tutor_gender and t["tutor_gender_pref"] != tutor_gender:
            return False
        if mode and t["mode"] != mode:
            return False
        if salary_min is not None or salary_max is not None:
            if not is_fixed_monthly(t):
                return False
            if salary_min is not None and t["salary_amount"] < salary_min:
                return False
            if salary_max is not None and t["salary_amount"] > salary_max:
                return False
        if days and t["days_per_week"] != days:
            return False
        if q and not matches(search_blob(t), q):
            return False
        return True

    items = [t for t in docs if keep(t)]
    if sort == "salary_desc":
        items.sort(key=lambda t: (0 if is_fixed_monthly(t) else 1, -(t["salary_amount"] if is_fixed_monthly(t) else 0), t.get("posted_at") or ""))
    return {"items": [to_public_tuition(t) for t in items], "total": len(items)}


def _parse_code(code: str) -> int:
    raw = code.upper().replace("HTR-", "")
    if not raw.isdigit():
        raise HTTPException(404, "not_found")
    return int(raw)


async def _visible_tuition(code: str) -> dict:
    t = await db.tuitions.find_one({"code": _parse_code(code)}, {"_id": 0})
    if not t:
        raise HTTPException(404, "not_found")
    if t.get("is_public") and t["status"] in PUBLIC_TUITION_STATUSES:
        return t
    if t["status"] in CLOSED_TUITION_STATUSES and t.get("closed_at"):
        settings = await get_settings_map()
        days = int(settings.get("closed_page_days", 30))
        if datetime.fromisoformat(t["closed_at"]) + timedelta(days=days) > datetime.now(timezone.utc):
            return t
    raise HTTPException(404, "not_found")


@api.get("/tuitions/{code}")
async def get_tuition(code: str):
    return to_public_tuition(await _visible_tuition(code))


@api.get("/tuitions/{code}/similar")
async def similar_tuitions(code: str):
    t = await _visible_tuition(code)
    docs = await public_tuition_docs()
    sim = [d for d in docs if d["code"] != t["code"] and (d["area"] == t["area"] or d["class_level"] == t["class_level"])]
    return {"items": [to_public_tuition(d) for d in sim[:4]]}


_lead_hits: dict = defaultdict(list)
LEAD_LIMIT, LEAD_WINDOW = 5, 3600


class LeadIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=6, max_length=25)
    area: str = Field(min_length=1, max_length=60)
    class_level: str
    tutor_gender: str = "any"
    subjects: List[str] = Field(min_length=1, max_length=12)
    note: str = Field(default="", max_length=300)
    consent: bool
    website: str = Field(default="", max_length=200)
    client_id: Optional[str] = None

    @field_validator("name", "area", "note", mode="before")
    @classmethod
    def _clean(cls, v):
        return clean_text(v) if isinstance(v, str) else v

    @field_validator("class_level")
    @classmethod
    def _cls(cls, v):
        if v not in valid_class_keys():
            raise ValueError("invalid_class")
        return v

    @field_validator("tutor_gender")
    @classmethod
    def _tg(cls, v):
        if v not in OPTION_KEYS["tutor_genders"]:
            raise ValueError("invalid_tutor_gender")
        return v

    @field_validator("subjects")
    @classmethod
    def _subj(cls, v):
        if any(s not in OPTION_KEYS["subjects"] for s in v):
            raise ValueError("invalid_subject")
        return v

    @field_validator("consent")
    @classmethod
    def _consent(cls, v):
        if not v:
            raise ValueError("consent_required")
        return v


@api.post("/leads", status_code=201)
async def create_lead(body: LeadIn, request: Request):
    if body.website:
        return {"ok": True}
    xff = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
    ip = xff[0] if xff else (request.client.host if request.client else "?")
    now = time.time()
    _lead_hits[ip] = [h for h in _lead_hits[ip] if now - h < LEAD_WINDOW]
    if len(_lead_hits[ip]) >= LEAD_LIMIT:
        raise HTTPException(429, "rate_limited")
    try:
        phone = normalize_phone(body.phone)
    except InvalidPhone:
        raise HTTPException(422, "invalid_phone")
    _lead_hits[ip].append(now)
    ts = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()), "client_id": body.client_id or str(uuid.uuid4()), "channel": "web_form", "phone": phone,
        "guardian_name": body.name, "class_level": body.class_level, "medium": None, "student_gender": None, "tutor_gender": body.tutor_gender,
        "subjects": body.subjects, "area": body.area, "address": None, "salary": None, "days_per_week": None,
        "notes": body.note, "lead_source": "website", "consent_given": True, "status": "new", "converted_tuition_code": None,
        "created_at": ts, "synced_at": ts, "updated_at": ts,
    }
    try:
        await db.leads.insert_one(doc)
    except Exception:
        logger.info("duplicate lead client_id ignored")
    logger.info("lead created via web_form")
    return {"ok": True}


@api.get("/share/site.png")
async def share_site_png():
    return Response(render_generic(), media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


@api.get("/share/{code}.png")
async def share_png(code: str):
    try:
        p = to_public_tuition(await _visible_tuition(code))
    except HTTPException:
        return Response(render_generic(), media_type="image/png")
    if not p["is_available"]:
        return Response(render_generic(), media_type="image/png")
    return Response(render_tuition_card(p, merged_options() | {"class_levels": all_class_options()}), media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})


@api.get("/share/{code}", response_class=HTMLResponse)
async def share_html(code: str):
    try:
        p = to_public_tuition(await _visible_tuition(code))
        title = f"{p['code_label']} · {_label('class_levels', p['class_level'])} · {', '.join(_label('subjects', s) for s in p['subjects'])} · {_label('areas', p['area'])}"
        desc = f"{salary_text(p)} · সপ্তাহে {format_taka(p['days_per_week'])} দিন · Hikmah Tutors Rajshahi"
        img = f"{PUBLIC_SITE_URL}/api/share/{p['code_label']}.png" if p["is_available"] else f"{PUBLIC_SITE_URL}/api/share/site.png"
        target = f"{PUBLIC_SITE_URL}/tuitions/{p['code_label']}"
    except HTTPException:
        title, desc = "Hikmah Tutors Rajshahi", "রাজশাহীর বিশ্বস্ত হোম টিউটর মিডিয়া"
        img, target = f"{PUBLIC_SITE_URL}/api/share/site.png", PUBLIC_SITE_URL
    html = f"""<!doctype html><html lang="bn"><head><meta charset="utf-8">
<title>{escape(title)}</title>
<meta property="og:type" content="website"><meta property="og:site_name" content="Hikmah Tutors Rajshahi">
<meta property="og:title" content="{escape(title)}"><meta property="og:description" content="{escape(desc)}">
<meta property="og:image" content="{escape(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="{escape(target)}"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url={escape(target)}"><link rel="canonical" href="{escape(target)}">
</head><body><p>{escape(title)}</p><a href="{escape(target)}">{escape(target)}</a></body></html>"""
    return HTMLResponse(html, headers={"Content-Security-Policy": "default-src 'none'; img-src 'self'; frame-ancestors 'none'"})


@api.get("/export/code")
async def export_code():
    tmp = build_code_zip(ROOT_DIR.parent)
    name = f"hikmah-tutors-code-{datetime.now(timezone.utc):%Y-%m-%d}.zip"
    return FileResponse(tmp, media_type="application/zip", filename=name, background=BackgroundTask(os.remove, tmp))


app.include_router(api)
app.include_router(panel_router)
app.add_middleware(SecurityHeaders)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await ensure_indexes(db)
    await load_seed(db)
    await load_class_levels()
    logger.info("indexes ensured, seed loaded")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
