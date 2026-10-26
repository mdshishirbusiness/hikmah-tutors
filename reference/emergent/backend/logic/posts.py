from typing import Callable, List

from logic.text import to_bangla_digits

Label = Callable[[str, str], str]
GENDER_EN = {"male": "Male", "female": "Female", "any": "Male/Female"}


def _salary(t: dict) -> str:
    if t.get("salary_kind") == "fixed" and t.get("salary_amount"):
        per = "month" if t.get("salary_period") == "per_month" else "course"
        return f"৳ {t['salary_amount']:,}/{per}"
    if t.get("salary_kind") == "negotiable":
        return "৳ আলোচনা সাপেক্ষে"
    return "আলোচনা সাপেক্ষে"


def _clean(lines: List[str]) -> str:
    out, prev_blank = [], False
    for ln in lines:
        ln = ln.rstrip()
        if not ln and prev_blank:
            continue
        out.append(ln)
        prev_blank = not ln
    return "\n".join(out).strip("\n")


def _subjects(t: dict, label: Label) -> str:
    return ", ".join(label("subjects", s) for s in t.get("subjects", []))


def headline(t: dict, label: Label) -> str:
    g = {"male": "a male tutor", "female": "a female tutor"}.get(t.get("tutor_gender_pref"), "a tutor")
    return f"Need {g} for {label('class_levels', t['class_level'])} {_subjects(t, label)}, {label('areas', t['area'])}"


def facebook_block(t: dict, label: Label) -> List[str]:
    return [
        f"Class: {label('class_levels', t['class_level'])}",
        f"Subject: {_subjects(t, label)}",
        f"Tutor Needed: {GENDER_EN.get(t.get('tutor_gender_pref'), 'Male/Female')}",
        f"Weekly: {t.get('days_per_week')} days",
        f"Salary: {_salary(t)}",
        f"Location: {label('areas', t['area'])}",
    ]


def whatsapp_block(t: dict, label: Label, link: str = "") -> List[str]:
    lines = [headline(t, label), f"Tuition Code: HTR-{t['code']}", f"Class: {label('class_levels', t['class_level'])}",
             f"Subjects: {_subjects(t, label)}", f"Weekly: {t.get('days_per_week')} days", f"Salary: {_salary(t)}",
             f"Location: {label('areas', t['area'])}"]
    if t.get("start_note"):
        lines.append(f"Start: {t['start_note']}")
    if t.get("requirements_public"):
        lines += ["Guardian Requirement:", t["requirements_public"]]
    if link:
        lines.append(link)
    return lines


def contact_line(t: dict) -> str:
    return f"Tuition - {t['code']}"


def sheet_row(t: dict, label: Label, columns: List[str]) -> str:
    values = {
        "code": f"HTR-{t['code']}", "class": label("class_levels", t["class_level"]), "subjects": _subjects(t, label),
        "area": label("areas", t["area"]), "salary": _salary(t), "days": str(t.get("days_per_week") or ""),
        "tutor_gender": GENDER_EN.get(t.get("tutor_gender_pref"), ""), "status": t.get("status", ""),
    }
    return "\t".join(values.get(c, "") for c in columns)


def generate(tuitions: List[dict], label: Label, settings: dict, include_trust: bool, links: dict) -> dict:
    opening, closing = settings.get("post_opening") or "", settings.get("post_closing") or ""
    trust = settings.get("post_trust") or ""
    multi = len(tuitions) > 1
    head: List[str] = []
    if multi:
        male = sum(1 for t in tuitions if t.get("tutor_gender_pref") == "male")
        female = sum(1 for t in tuitions if t.get("tutor_gender_pref") == "female")
        tpl = settings.get("post_multi_headline") or "{total} tuitions ({male} male, {female} female)"
        bn = to_bangla_digits
        head = [tpl.replace("{total}", bn(str(len(tuitions)))).replace("{male}", bn(str(male))).replace("{female}", bn(str(female))), ""]
    fb = ([opening, ""] if opening else []) + head
    wa = list(head)
    for i, t in enumerate(tuitions):
        if i:
            fb.append("")
            wa.append("")
        if multi:
            fb.append(f"HTR-{t['code']}")
        fb += facebook_block(t, label)
        wa += whatsapp_block(t, label, links.get(t["code"], ""))
    if closing:
        fb += ["", closing]
        wa += ["", closing]
    if include_trust and trust:
        wa += ["", trust]
    return {
        "facebook": _clean(fb),
        "whatsapp": _clean(wa),
        "contact_line": "\n".join(contact_line(t) for t in tuitions),
        "sheet_row": "\n".join(sheet_row(t, label, settings.get("sheet_columns") or []) for t in tuitions),
    }
