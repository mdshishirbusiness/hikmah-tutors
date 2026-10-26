# HTR open Admin/Tutor panel API regression tests (no auth by design)
import io
import os
import uuid
import zipfile

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
A = f"{BASE_URL}/api"
PRIV_KEYS = ("guardian_name", "guardian_phone", "exact_address", "private_notes", "guardian_id")


@pytest.fixture(scope="module")
def tutors():
    items = requests.get(f"{A}/tutor/demo-list").json()["items"]
    by = {t["full_name"]: t["id"] for t in items}
    return {"A": by["Sample Tutor A"], "B": by["Sample Tutor B"]}


def hdr(tid):
    return {"X-Tutor-Id": tid}


@pytest.fixture(scope="module")
def created_codes():
    codes = []
    yield codes
    for c in codes:  # cleanup: close test tuitions
        requests.put(f"{A}/admin/tuitions/{c}", json={"action": "close", "close_reason": "cancelled"})


# Admin overview
def test_overview_counts_and_flagged():
    d = requests.get(f"{A}/admin/overview").json()
    for k in ("open_tuitions", "applications_waiting", "new_leads", "follow_ups_due", "flagged_classes"):
        assert isinstance(d["counts"][k], int)
    assert 9005 in [f["code"] for f in d["flagged"]]  # 9002 may already be fixed by UI tests


# Quick pad leads + leads workflow + convert
def test_quick_lead_validation():
    base = {"client_id": str(uuid.uuid4()), "phone": "01711000222", "class_level": "hsc-2nd", "area": "kazla"}
    assert requests.post(f"{A}/admin/leads", json={**base, "class_level": "c1-5"}).status_code == 422
    assert requests.post(f"{A}/admin/leads", json={**base, "phone": "123"}).status_code == 422
    r = requests.post(f"{A}/admin/leads", json={**base, "notes": "TEST_quick"})
    assert r.status_code == 201 and r.json()["duplicate"] is False
    assert requests.post(f"{A}/admin/leads", json=base).json()["duplicate"] is True


def test_lead_patch_and_convert(created_codes):
    cid = str(uuid.uuid4())
    requests.post(f"{A}/admin/leads", json={"client_id": cid, "phone": "01711000333", "class_level": "c3", "area": "kazla",
                                            "tutor_gender": "female", "salary": 4000, "notes": "TEST_convert", "subjects": ["math"]})
    ld = [x for x in requests.get(f"{A}/admin/leads").json()["items"] if x.get("client_id") == cid][0]
    r = requests.patch(f"{A}/admin/leads/{ld['id']}", json={"status": "contacted", "next_follow_up_at": "2026-02-01"})
    assert r.status_code == 200 and r.json()["status"] == "contacted" and r.json()["next_follow_up_at"] == "2026-02-01"
    r = requests.post(f"{A}/admin/leads/{ld['id']}/convert")
    assert r.status_code == 200
    code = r.json()["code"]
    created_codes.append(code)
    assert requests.post(f"{A}/admin/leads/{ld['id']}/convert").json()["code"] == code
    d = requests.get(f"{A}/admin/tuitions/{code}").json()
    assert d["tuition"]["class_level"] == "c3" and d["tuition"]["tutor_gender_pref"] == "female"
    assert d["tuition"]["salary_kind"] == "fixed" and d["tuition"]["salary_amount"] == 4000
    assert d["private"]["guardian_phone"] == "01711000333"
    assert d["tuition"]["status"] == "draft"


# Tuition editor: create / publish / privacy / close
def test_tuition_create_publish_close(created_codes):
    assert requests.post(f"{A}/admin/tuitions", json={"class_level": "c4", "area": "kazla", "salary_kind": "fixed"}).status_code == 422
    assert requests.post(f"{A}/admin/tuitions", json={"class_level": "c1-5", "area": "kazla"}).status_code == 422
    r = requests.post(f"{A}/admin/tuitions", json={"class_level": "c4", "area": "kazla", "subjects": ["math"], "salary_kind": "fixed",
                                                   "salary_amount": 3500, "tutor_gender_pref": "female",
                                                   "guardian_name": "TEST_Guardian", "guardian_phone": "01711000444",
                                                   "exact_address": "TEST_SECRET_ADDR"})
    assert r.status_code == 201
    code = r.json()["code"]
    created_codes.append(code)
    assert code not in [t["code"] for t in requests.get(f"{A}/tuitions").json()["items"]]
    r = requests.put(f"{A}/admin/tuitions/{code}", json={"action": "publish"})
    assert r.status_code == 200 and r.json()["tuition"]["is_public"] is True
    lst = requests.get(f"{A}/tuitions").text
    assert f'"code":{code}' in lst
    assert "TEST_SECRET_ADDR" not in lst and "01711000444" not in lst and "TEST_Guardian" not in lst
    det = requests.get(f"{A}/tuitions/HTR-{code}").json()
    assert not any(k in det for k in PRIV_KEYS) and det["tutor_gender_pref"] == "female"


def test_publish_requires_subjects(created_codes):
    code = requests.post(f"{A}/admin/tuitions", json={"class_level": "c5", "area": "kazla"}).json()["code"]
    created_codes.append(code)
    r = requests.put(f"{A}/admin/tuitions/{code}", json={"action": "publish"})
    assert r.status_code == 422 and r.json()["detail"] == "subjects_required"


def test_close_removes_from_board():
    code = requests.post(f"{A}/admin/tuitions", json={"class_level": "c6", "area": "kazla", "subjects": ["math"]}).json()["code"]
    requests.put(f"{A}/admin/tuitions/{code}", json={"action": "publish"})
    assert code in [t["code"] for t in requests.get(f"{A}/tuitions").json()["items"]]
    requests.put(f"{A}/admin/tuitions/{code}", json={"action": "close"})
    assert code not in [t["code"] for t in requests.get(f"{A}/tuitions").json()["items"]]


def test_legacy_flag_and_admin_list():
    d = requests.get(f"{A}/admin/tuitions/9005").json()
    assert d["tuition"]["class_level"] == "c6-8" and d["tuition"]["legacy_class"] is True
    # editing other field keeps legacy class allowed
    r = requests.put(f"{A}/admin/tuitions/9005", json={"start_note": d["tuition"].get("start_note") or ""})
    assert r.status_code == 200


# Tutors directory
def test_tutors_masked_and_reveal(tutors):
    items = requests.get(f"{A}/admin/tutors").json()["items"]
    assert items and all("phone" not in t and "••" in t["phone_masked"] for t in items)
    r = requests.post(f"{A}/admin/tutors/{tutors['A']}/reveal")
    assert r.status_code == 200 and r.json()["phone"].isdigit()


# Posts
def test_posts_outputs():
    r = requests.post(f"{A}/admin/posts", json={"codes": [9001, 9003]})
    assert r.status_code == 200
    d = r.json()
    assert set(d) >= {"facebook", "whatsapp", "contact_line", "sheet_row"}
    assert d["contact_line"].splitlines() == ["Tuition - 9001", "Tuition - 9003"]
    assert "01700000101" not in str(d) and "SYNTHETIC" not in str(d)


# Settings
def test_settings_class_levels():
    s = requests.get(f"{A}/admin/settings").json()
    levels = s["class_levels"]
    assert {"c1", "ssc-2027", "hsc-2nd"} <= {c["key"] for c in levels}
    assert requests.put(f"{A}/admin/settings", json={"class_levels": levels[1:]}).status_code == 422
    r = requests.put(f"{A}/admin/settings", json={"class_levels": levels})
    assert r.status_code == 200 and len(r.json()["class_levels"]) == len(levels)


# Tutor panel
def test_me_and_saved_toggle(tutors):
    me = requests.get(f"{A}/me", headers=hdr(tutors["A"])).json()
    assert me["profile"]["full_name"] == "Sample Tutor A" and all(me["checklist"].values())
    assert requests.get(f"{A}/me").status_code == 400
    was = 9006 in me["saved_codes"]
    assert requests.post(f"{A}/me/saved/9006", headers=hdr(tutors["A"])).json()["saved"] is (not was)
    saved = [t["code"] for t in requests.get(f"{A}/me/saved", headers=hdr(tutors["A"])).json()["items"]]
    assert (9006 in saved) is (not was)
    requests.post(f"{A}/me/saved/9006", headers=hdr(tutors["A"]))  # restore
    assert isinstance(requests.get(f"{A}/me/suggested", headers=hdr(tutors["A"])).json()["items"], list)


def test_apply_gender_mismatch(tutors):
    r = requests.post(f"{A}/me/applications", headers=hdr(tutors["A"]),
                      json={"code": 9003, "availability_confirmed": True, "terms_accepted": True})
    assert r.status_code == 409 and r.json()["detail"] == "gender_mismatch"


def test_apply_withdraw_and_owner_transitions(tutors, created_codes):
    code = requests.post(f"{A}/admin/tuitions", json={"class_level": "c7", "area": "kazla", "subjects": ["math"]}).json()["code"]
    created_codes.append(code)
    requests.put(f"{A}/admin/tuitions/{code}", json={"action": "publish"})
    body = {"code": code, "note": "TEST_apply", "availability_confirmed": True, "terms_accepted": True}
    assert requests.post(f"{A}/me/applications", headers=hdr(tutors["A"]), json={**body, "terms_accepted": False}).status_code == 422
    r = requests.post(f"{A}/me/applications", headers=hdr(tutors["A"]), json=body)
    assert r.status_code == 201 and r.json()["status"] == "submitted"
    app_id = r.json()["id"]
    assert requests.post(f"{A}/me/applications", headers=hdr(tutors["A"]), json=body).status_code == 409
    mine = [a for a in requests.get(f"{A}/me/applications", headers=hdr(tutors["A"])).json()["items"] if a["id"] == app_id][0]
    assert mine["events"][0]["to_status"] == "submitted"
    assert requests.post(f"{A}/me/applications/{app_id}/withdraw", headers=hdr(tutors["A"])).status_code == 200
    assert requests.post(f"{A}/me/applications/{app_id}/withdraw", headers=hdr(tutors["A"])).status_code == 409
    # owner transitions on Tutor B application
    rb = requests.post(f"{A}/me/applications", headers=hdr(tutors["B"]), json=body)
    assert rb.status_code == 201
    bid = rb.json()["id"]
    st = lambda to: requests.post(f"{A}/admin/applications/{bid}/status", json={"to_status": to}).status_code
    assert st("confirmed") == 409
    assert st("under_review") == 200
    assert st("shortlisted") == 200
    assert st("submitted") == 409
    assert st("not_selected") == 200
    items = requests.get(f"{A}/admin/applications", params={"code": code}).json()["items"]
    assert {a["status"] for a in items} == {"withdrawn", "not_selected"}


# Code export
def test_export_code_zip():
    r = requests.get(f"{A}/export/code", timeout=60)
    assert r.status_code == 200 and r.headers["content-type"].startswith("application/zip")
    names = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert names and not any(n.endswith(".env") or "/.env" in n for n in names)
    assert any("panel_api.py" in n for n in names)
