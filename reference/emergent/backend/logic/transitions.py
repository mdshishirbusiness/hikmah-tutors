ALLOWED = {
    "submitted": {"under_review", "not_selected", "withdrawn", "opportunity_closed"},
    "under_review": {"shortlisted", "not_selected", "withdrawn", "opportunity_closed"},
    "shortlisted": {"trial_arranged", "not_selected", "withdrawn", "opportunity_closed"},
    "trial_arranged": {"confirmed", "shortlisted", "not_selected", "withdrawn", "opportunity_closed"},
    "confirmed": set(),
    "not_selected": set(),
    "withdrawn": set(),
    "opportunity_closed": set(),
}

ACTIVE_STATUSES = {"submitted", "under_review", "shortlisted", "trial_arranged"}
FINAL_STATUSES = {"confirmed", "not_selected", "withdrawn", "opportunity_closed"}

PUBLIC_TUITION_STATUSES = {"available", "processing"}
CLOSED_TUITION_STATUSES = {"booked", "cancelled", "closed"}


def can_transition(from_status: str, to_status: str, actor: str) -> bool:
    if to_status not in ALLOWED.get(from_status, set()):
        return False
    if actor == "tutor":
        return to_status == "withdrawn"
    if actor == "system":
        return to_status == "opportunity_closed"
    return actor == "owner"


def is_active(status: str) -> bool:
    return status in ACTIVE_STATUSES


def tuition_is_public(doc: dict) -> bool:
    return bool(doc.get("is_public")) and doc.get("status") in PUBLIC_TUITION_STATUSES
