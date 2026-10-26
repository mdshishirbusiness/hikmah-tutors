# HTR public API regression tests: tuitions board, detail, search, filters, privacy, share, leads, headers
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
PRIVATE = ["SYNTHETIC-PRIVATE-MARKER", "SYNTHETIC-ADDRESS", "01700000101", "Sample Guardian", "guardian_id", "exact_address", "private_notes"]


def codes(params=None):
    r = requests.get(f"{BASE_URL}/api/tuitions", params=params or {})
    assert r.status_code == 200, r.text
    return [t["code"] for t in r.json()["items"]]


# Board listing
def test_list_public_only():
    r = requests.get(f"{BASE_URL}/api/tuitions")
    items = r.json()["items"]
    c = [t["code"] for t in items]
    assert {9001, 9002, 9003, 9004, 9006} <= set(c) and 9005 not in c and 9007 not in c
    for t in items:
        assert t["code_label"] == f"HTR-{t['code']}"
        assert isinstance(t["fees"], dict)
    t9002 = [t for t in items if t["code"] == 9002][0]
    assert t9002["salary_amount"] is None


# Search equivalence
@pytest.mark.parametrize("q,exp", [("Shaheb Bazar", [9001]), ("saheb bazar", [9001]), ("সাহেব বাজার", [9001]),
                                   ("kazla", [9003]), ("HTR-9004", [9004])])
def test_search(q, exp):
    assert codes({"q": q}) == exp


# Filters
@pytest.mark.parametrize("params,exp", [({"class_level": "hsc-1st"}, [9003]), ({"class_level": "ssc-2027"}, [9001]), ({"area": "kazla"}, [9003]),
                                        ({"subject": "math"}, [9001, 9006]), ({"mode": "online"}, [9004]),
                                        ({"tutor_gender": "female"}, [9001]), ({"salary_min": 4000}, [9001, 9006]),
                                        ({"days": 3}, [9001, 9006])])
def test_filters(params, exp):
    got = codes(params)
    assert set(exp) <= set(got), got
    assert not ({9005, 9007} & set(got))


def test_sort_salary_desc():
    c = codes({"sort": "salary_desc"})
    assert c.index(9006) < c.index(9001) < c.index(9003), c
    assert c.index(9003) < c.index(9002) and c.index(9003) < c.index(9004), c


# Detail + fees
def test_detail_9001_fees():
    r = requests.get(f"{BASE_URL}/api/tuitions/HTR-9001")
    assert r.status_code == 200
    f = r.json()["fees"]
    print(f)
    assert f["basis"] == 4000 and f["standard_total"] == 2400 and f["first"] == 1200 and f["second"] == 1200
    assert f["early_total"] == 2000 and f["saving"] == 400 and f["is_example"] is False


def test_detail_9003_fees():
    f = requests.get(f"{BASE_URL}/api/tuitions/HTR-9003").json()["fees"]
    assert f["standard_total"] == 2000 and f["first"] == 1000 and f["second"] == 1000 and f["early_total"] == 1667


def test_detail_9002_example():
    d = requests.get(f"{BASE_URL}/api/tuitions/HTR-9002").json()
    assert d["fees"]["is_example"] is True and d["fees"]["basis"] == 4000
    assert d["salary_amount"] is None


@pytest.mark.parametrize("code", ["HTR-9005", "HTR-9999", "HTR-abc"])
def test_detail_404(code):
    assert requests.get(f"{BASE_URL}/api/tuitions/{code}").status_code == 404


def test_detail_closed_9007():
    r = requests.get(f"{BASE_URL}/api/tuitions/HTR-9007")
    assert r.status_code == 200
    d = r.json()
    assert d["not_available"] is True and d["is_available"] is False


def test_similar_9003():
    r = requests.get(f"{BASE_URL}/api/tuitions/HTR-9003/similar")
    assert r.status_code == 200
    c = [t["code"] for t in r.json()["items"]]
    print("similar 9003:", c)
    assert 9005 not in c and 9003 not in c and 9007 not in c


def test_similar_for_draft_should_not_leak():
    r = requests.get(f"{BASE_URL}/api/tuitions/HTR-9005/similar")
    print("similar 9005 status:", r.status_code)
    assert r.status_code == 404


# Privacy
@pytest.mark.parametrize("path", ["/api/tuitions", "/api/tuitions/HTR-9001", "/api/tuitions/HTR-9003", "/api/tuitions/HTR-9002",
                                  "/api/tuitions/HTR-9007", "/api/tuitions/HTR-9003/similar", "/api/share/HTR-9001",
                                  "/api/options", "/api/settings/public"])
def test_privacy(path):
    body = requests.get(f"{BASE_URL}{path}").text
    for p in PRIVATE:
        assert p not in body, f"{p} leaked in {path}"


# Share
def test_share_html():
    r = requests.get(f"{BASE_URL}/api/share/HTR-9001")
    assert r.status_code == 200
    h = r.text
    import re
    title = re.search(r'og:title" content="([^"]+)"', h).group(1)
    img = re.search(r'og:image" content="([^"]+)"', h).group(1)
    url = re.search(r'og:url" content="([^"]+)"', h).group(1)
    assert "HTR-9001" in title
    assert img.endswith("/api/share/HTR-9001.png")
    assert url.endswith("/tuitions/HTR-9001")
    assert 'http-equiv="refresh"' in h


@pytest.mark.parametrize("p", ["HTR-9001.png", "HTR-9007.png", "site.png", "HTR-9005.png"])
def test_share_png(p):
    from PIL import Image
    import io
    r = requests.get(f"{BASE_URL}/api/share/{p}")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/png")
    im = Image.open(io.BytesIO(r.content))
    assert im.size == (1200, 630)


# Security headers
def test_security_headers():
    h = requests.get(f"{BASE_URL}/api/tuitions").headers
    assert h.get("X-Content-Type-Options") == "nosniff"
    assert "Strict-Transport-Security" in h
    assert "Referrer-Policy" in h
    assert "Permissions-Policy" in h
    assert "frame-ancestors 'none'" in h.get("Content-Security-Policy", "")


# Leads (validation first, then valid until 429)
def lead(**kw):
    body = {"name": "Test Guardian", "phone": "+880 1711-000000", "area": "kazla", "class_level": "hsc-1st",
            "subjects": ["physics"], "note": "", "consent": True, "website": "", "client_id": str(uuid.uuid4())}
    body.update(kw)
    return requests.post(f"{BASE_URL}/api/leads", json=body)


def test_leads_flow():
    r = lead(phone="01211000000")
    assert r.status_code == 422 and r.json()["detail"] == "invalid_phone"
    assert lead(consent=False).status_code == 422
    assert lead(class_level="xyz").status_code == 422
    r = lead(website="spam")
    assert r.status_code in (200, 201) and r.json()["ok"] is True
    statuses = [lead().status_code for _ in range(6)]
    print("valid lead statuses:", statuses)
    assert 201 in statuses
    assert statuses[-1] == 429
