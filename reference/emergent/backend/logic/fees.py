EXAMPLE_BASIS = 4000

FEE_TERMS_BN = (
    "মোট ৬০% পরিশোধ করব (৩০% কনফার্মেশনের পর + বাকি ৩০% প্রথম স্যালারি পেয়ে) "
    "জয়েন করার ৭ দিনের মধ্যে ৫০% পরিশোধ করব (ডিসকাউন্ট অফার)।"
)
FEE_TERMS_EN = (
    "I will pay a total of 60% (30% after confirmation + the remaining 30% after receiving my first salary). "
    "[Discount offer:] I will pay 50% within 7 days of joining."
)


def fee_breakdown(basis: int) -> dict:
    if not isinstance(basis, int) or basis <= 0:
        raise ValueError("basis must be a positive integer")
    standard_total = (basis * 60 + 50) // 100
    early_total = (basis * 50 + 50) // 100
    first = standard_total // 2
    second = standard_total - first
    return {
        "basis": basis,
        "standard_total": standard_total,
        "first": first,
        "second": second,
        "early_total": early_total,
        "saving": standard_total - early_total,
    }


def fee_display(salary_kind: str, salary_amount, salary_period: str) -> dict:
    real = salary_kind == "fixed" and salary_period == "per_month" and isinstance(salary_amount, int) and salary_amount > 0
    basis = salary_amount if real else EXAMPLE_BASIS
    out = fee_breakdown(basis)
    out["is_example"] = not real
    return out
