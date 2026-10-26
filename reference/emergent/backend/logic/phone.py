import re

from .text import to_latin_digits

_VALID = re.compile(r"^01[3-9]\d{8}$")


class InvalidPhone(ValueError):
    pass


def normalize_phone(raw: str) -> str:
    s = to_latin_digits(raw or "")
    s = re.sub(r"[^\d]", "", s)
    if s.startswith("880") and len(s) == 13:
        s = "0" + s[3:]
    elif len(s) == 10 and s.startswith("1"):
        s = "0" + s
    if not _VALID.match(s):
        raise InvalidPhone("invalid_phone")
    return s


def is_valid_phone(raw: str) -> bool:
    try:
        normalize_phone(raw)
        return True
    except InvalidPhone:
        return False


def to_wa_link(phone: str, text: str = "") -> str:
    from urllib.parse import quote
    n = normalize_phone(phone)
    base = f"https://wa.me/88{n}"
    return f"{base}?text={quote(text)}" if text else base
