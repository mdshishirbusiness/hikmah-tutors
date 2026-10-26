from logic.fees import fee_display
from logic.transitions import CLOSED_TUITION_STATUSES, tuition_is_public

PUBLIC_TUITION_FIELDS = (
    "code", "status", "accepting_applications", "tuition_type", "class_level", "medium", "subjects",
    "area", "mode", "salary_kind", "salary_amount", "salary_period", "days_per_week", "students_count",
    "student_gender", "tutor_gender_pref", "requirements_public", "start_note", "posted_at", "closed_at",
)


def to_public_tuition(doc: dict) -> dict:
    out = {k: doc.get(k) for k in PUBLIC_TUITION_FIELDS}
    if out["salary_kind"] != "fixed":
        out["salary_amount"] = None
    out["code_label"] = f"HTR-{doc['code']}"
    out["is_available"] = tuition_is_public(doc)
    out["not_available"] = doc.get("status") in CLOSED_TUITION_STATUSES
    out["fees"] = fee_display(out["salary_kind"], out["salary_amount"], out["salary_period"])
    return out


def public_settings(settings: dict) -> dict:
    return {k: settings.get(k) for k in ("contact_whatsapp", "contact_call", "facebook_page_url")}
