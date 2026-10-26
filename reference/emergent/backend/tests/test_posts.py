from logic import posts

T = {"code": 330, "class_level": "hsc-1st", "subjects": ["chemistry"], "area": "kazla", "tutor_gender_pref": "female",
     "days_per_week": 4, "salary_kind": "negotiable", "salary_amount": None, "salary_period": "per_month",
     "requirements_public": "", "start_note": "", "status": "available"}
LBL = {"hsc-1st": "HSC 1st Year", "chemistry": "Chemistry", "kazla": "Kazla"}


def label(_g, k):
    return LBL.get(k, k)


def test_contact_line_never_starts_with_htr():
    assert posts.contact_line(T) == "Tuition - 330"


def test_negotiable_salary_never_zero():
    out = posts.generate([T], label, {}, False, {})
    assert "৳ আলোচনা সাপেক্ষে" in out["facebook"] and " 0" not in out["facebook"]


def test_no_trailing_spaces_and_headline():
    out = posts.generate([T, {**T, "code": 331, "tutor_gender_pref": "male"}], label, {"post_multi_headline": "{total}টি ({male}, {female})"}, True, {})
    assert out["whatsapp"].startswith("২টি (১, ১)")
    assert all(ln == ln.rstrip() for ln in out["whatsapp"].split("\n"))
    assert "Need a female tutor for HSC 1st Year Chemistry, Kazla" in out["whatsapp"]
