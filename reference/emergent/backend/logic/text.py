import re
import unicodedata

_BN_DIGITS = "০১২৩৪৫৬৭৮৯"
_LAT_DIGITS = "0123456789"
_BN_TO_LAT = str.maketrans(_BN_DIGITS, _LAT_DIGITS)
_LAT_TO_BN = str.maketrans(_LAT_DIGITS, _BN_DIGITS)

_PUNCT = re.compile(r"[^\w\s\u0980-\u09FF]", re.UNICODE)
_WS = re.compile(r"\s+")


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s or "")


def to_latin_digits(s: str) -> str:
    return (s or "").translate(_BN_TO_LAT)


def to_bangla_digits(s: str) -> str:
    return (s or "").translate(_LAT_TO_BN)


def clean_text(s: str) -> str:
    return _WS.sub(" ", nfc(s)).strip()


def fold_latin(s: str) -> str:
    s = s.replace("sh", "s").replace("ph", "f").replace("bh", "b").replace("kh", "k")
    s = s.replace("aa", "a").replace("ee", "i").replace("oo", "u")
    s = re.sub(r"([a-z])\1", r"\1", s)
    return s


def normalize_search(s: str) -> str:
    s = nfc(s).lower()
    s = to_latin_digits(s)
    s = _PUNCT.sub(" ", s)
    s = _WS.sub(" ", s).strip()
    return fold_latin(s)


def search_tokens(q: str) -> list:
    return [t for t in normalize_search(q).split(" ") if t]


def matches(blob: str, q: str) -> bool:
    toks = search_tokens(q)
    if not toks:
        return True
    return all(t in blob for t in toks)


def format_taka(amount: int, bangla: bool = True) -> str:
    s = f"{amount:,}"
    if amount >= 100000:
        head, tail = str(amount)[:-3], str(amount)[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        parts.insert(0, head)
        s = ",".join(parts) + "," + tail
    return to_bangla_digits(s) if bangla else s
