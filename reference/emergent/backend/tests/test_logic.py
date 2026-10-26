import pytest

from logic.fees import fee_breakdown, fee_display
from logic.phone import InvalidPhone, normalize_phone
from logic.text import format_taka, matches, normalize_search, to_bangla_digits, to_latin_digits
from logic.transitions import can_transition, tuition_is_public


@pytest.mark.parametrize(
    "basis,std,first,second,early",
    [(2000, 1200, 600, 600, 1000), (2001, 1201, 600, 601, 1001), (3333, 2000, 1000, 1000, 1667),
     (4000, 2400, 1200, 1200, 2000), (5001, 3001, 1500, 1501, 2501), (10000, 6000, 3000, 3000, 5000)],
)
def test_fee_vectors(basis, std, first, second, early):
    f = fee_breakdown(basis)
    assert (f["standard_total"], f["first"], f["second"], f["early_total"]) == (std, first, second, early)
    assert f["first"] + f["second"] == f["standard_total"]


def test_fee_display_example_for_non_fixed():
    assert fee_display("negotiable", None, "per_month")["is_example"] is True
    assert fee_display("fixed", 15000, "per_course")["is_example"] is True
    assert fee_display("fixed", 15000, "per_course")["basis"] == 4000
    assert fee_display("fixed", 4000, "per_month")["is_example"] is False


@pytest.mark.parametrize("raw", ["01711000000", "8801711000000", "+880 1711-000000", "০১৭১১০০০০০০", "1711000000"])
def test_phone_normalizes(raw):
    assert normalize_phone(raw) == "01711000000"


@pytest.mark.parametrize("raw", ["01211000000", "0171100000", "017110000000", "", "abc"])
def test_phone_rejects(raw):
    with pytest.raises(InvalidPhone):
        normalize_phone(raw)


def test_digits():
    assert to_latin_digits("৳ ৪,০০০") == "৳ 4,000"
    assert to_bangla_digits("4000") == "৪০০০"
    assert format_taka(4000) == "৪,০০০"
    assert format_taka(15000, bangla=False) == "15,000"
    assert format_taka(100000, bangla=False) == "1,00,000"


def test_search_equivalence():
    blob = normalize_search("saheb-bazar সাহেব বাজার Saheb Bazar Shaheb Bazar ssc পদার্থ গণিত")
    for q in ["Shaheb Bazar", "saheb bazar", "সাহেব বাজার", "SAHEB", "shaheb"]:
        assert matches(blob, q), q
    assert not matches(blob, "kazla")


def test_search_nukta_forms():
    composed = normalize_search("য়")
    decomposed = normalize_search("য\u09bc")
    assert composed == decomposed
    assert normalize_search("সাগরপাড়া") == normalize_search("সাগরপাড\u09bcা")


def test_transitions():
    assert can_transition("submitted", "under_review", "owner")
    assert can_transition("submitted", "withdrawn", "tutor")
    assert not can_transition("submitted", "under_review", "tutor")
    assert not can_transition("confirmed", "withdrawn", "tutor")
    assert not can_transition("shortlisted", "confirmed", "owner")
    assert can_transition("trial_arranged", "confirmed", "owner")
    assert can_transition("trial_arranged", "shortlisted", "owner")
    assert can_transition("under_review", "opportunity_closed", "system")
    assert not can_transition("under_review", "shortlisted", "system")
    for final in ["confirmed", "not_selected", "withdrawn", "opportunity_closed"]:
        assert not can_transition(final, "submitted", "owner")


def test_tuition_public_rule():
    assert tuition_is_public({"is_public": True, "status": "available"})
    assert tuition_is_public({"is_public": True, "status": "processing"})
    assert not tuition_is_public({"is_public": False, "status": "available"})
    assert not tuition_is_public({"is_public": True, "status": "draft"})
    assert not tuition_is_public({"is_public": True, "status": "booked"})
