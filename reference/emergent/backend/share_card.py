import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from logic.text import format_taka

ASSETS = Path(__file__).parent / "assets"
CACHE = Path(__file__).parent / "cache" / "share"
CACHE.mkdir(parents=True, exist_ok=True)

FOREST = (9, 51, 42)
FOREST_MID = (15, 68, 56)
MANGO = (254, 210, 98)
CREAM = (254, 253, 248)
BRAND = (17, 129, 109)
W, H = 1200, 630


def _font(name: str, size: int, variation: str | None = None):
    f = ImageFont.truetype(str(ASSETS / "fonts" / name), size, layout_engine=ImageFont.Layout.RAQM)
    if variation:
        try:
            f.set_variation_by_axes([700, 100])
        except Exception:
            pass
    return f


def salary_text(t: dict) -> str:
    kind, amount, period = t["salary_kind"], t["salary_amount"], t["salary_period"]
    if kind == "fixed" and amount:
        return f"৳ {format_taka(amount)} / {'মাস' if period == 'per_month' else 'কোর্স'}"
    if kind == "negotiable":
        return "৳ আলোচনা সাপেক্ষে"
    return "বেতন উল্লেখ নেই"


def _label(options: dict, group: str, key: str) -> str:
    for o in options[group]:
        if o["key"] == key:
            return o["label"]
    return key or ""


def _rounded(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def _logo_block(img: Image.Image):
    try:
        logo = Image.open(ASSETS / "logo-square.png").convert("RGBA").resize((120, 120), Image.LANCZOS)
        mask = Image.new("L", (120, 120), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 119, 119), radius=28, fill=255)
        img.paste(logo, (64, 56), mask)
    except FileNotFoundError:
        pass


def render_generic() -> bytes:
    path = CACHE / "site.png"
    if path.exists():
        return path.read_bytes()
    img = Image.new("RGB", (W, H), FOREST)
    d = ImageDraw.Draw(img)
    _logo_block(img)
    d.text((210, 70), "Hikmah Tutors Rajshahi", font=_font("HindSiliguri-Bold.ttf", 46), fill=CREAM)
    d.text((210, 128), "রাজশাহীর বিশ্বস্ত হোম টিউটর মিডিয়া", font=_font("HindSiliguri-Regular.ttf", 34), fill=(163, 220, 207))
    d.text((64, 300), "রাজশাহীর টিউশন,\nএক জায়গায়।", font=_font("HindSiliguri-Bold.ttf", 84), fill=CREAM, spacing=12)
    img.save(path, "PNG", optimize=True)
    return path.read_bytes()


def render_tuition_card(t: dict, options: dict) -> bytes:
    sig = hashlib.sha1(repr(sorted((k, str(v)) for k, v in t.items() if k != "fees")).encode()).hexdigest()[:12]
    path = CACHE / f"{t['code']}-{sig}.png"
    if path.exists():
        return path.read_bytes()

    img = Image.new("RGB", (W, H), FOREST)
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 96, W, H), fill=FOREST_MID)
    _logo_block(img)
    d.text((210, 70), "Hikmah Tutors Rajshahi", font=_font("HindSiliguri-Bold.ttf", 46), fill=CREAM)
    d.text((210, 128), "রাজশাহীর বিশ্বস্ত হোম টিউটর মিডিয়া", font=_font("HindSiliguri-Regular.ttf", 32), fill=(163, 220, 207))

    code_font = _font("HindSiliguri-Bold.ttf", 40)
    code = t["code_label"]
    cw = d.textlength(code, font=code_font)
    _rounded(d, (W - 64 - cw - 48, 72, W - 64, 140), 34, MANGO)
    d.text((W - 64 - cw - 24, 80), code, font=code_font, fill=FOREST)

    headline = f"{_label(options, 'class_levels', t['class_level'])} · " + ", ".join(_label(options, "subjects", s) for s in t["subjects"])
    d.text((64, 210), headline, font=_font("HindSiliguri-SemiBold.ttf", 52), fill=CREAM)
    d.text((64, 282), _label(options, "mediums", t["medium"]), font=_font("HindSiliguri-Regular.ttf", 32), fill=(163, 220, 207))

    sal = salary_text(t)
    sal_font = _font("NotoSansBengali.ttf", 112 if len(sal) < 16 else 84, variation="Bold")
    d.text((58, 330), sal, font=sal_font, fill=MANGO)

    chip_font = _font("HindSiliguri-Bold.ttf", 38)
    area = _label(options, "areas", t["area"])
    aw = d.textlength(area, font=chip_font)
    _rounded(d, (64, 480, 64 + aw + 56, 548), 34, CREAM)
    d.text((92, 489), area, font=chip_font, fill=FOREST)

    meta_font = _font("HindSiliguri-SemiBold.ttf", 34)
    gender = {"male": "পুরুষ টিউটর", "female": "মহিলা টিউটর"}.get(t["tutor_gender_pref"], "যেকোনো টিউটর")
    meta = f"সপ্তাহে {format_taka(t['days_per_week'])} দিন  ·  {gender}  ·  {_label(options, 'modes', t['mode'])}"
    d.text((64 + aw + 88, 494), meta, font=meta_font, fill=CREAM)

    d.text((64, H - 70), "আবেদন করতে Google দিয়ে সাইন ইন করুন · রাজশাহীর টিউশন, এক জায়গায়", font=_font("HindSiliguri-Regular.ttf", 30), fill=(163, 220, 207))

    img.save(path, "PNG", optimize=True)
    return path.read_bytes()
