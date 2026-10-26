# Hikmah Tutors — PRD for building Release 1 in Emergent

| | |
|---|---|
| Version | 1.0 · 20 October 2026 |
| Built with | Emergent (AI app builder), then the code comes back to this repo as a ZIP |
| Scope | **Release 1 only**: public tuition board, tutor accounts and applications, guardian request form, owner panel |
| Source docs | `docs/PRD.md` (full spec, R1–R3) and `docs/DECISIONS.md` (wins over the PRD). This file is the R1 cut of both, rewritten for Emergent |

---

> **Plan changed on 20 Oct 2026, after Stage 1.** Emergent now builds **design and screens only**. Google sign-in,
> the database, security and every server rule are built in Claude Code on Cloudflare. From Stage 2 on, use
> **Part 5** instead of the old Stages 2–5 in Part 2. Parts 1, 3 and 4 still apply.

## How to use this document (for the owner)

1. Open a new Emergent project. **Upload the two logo files** from `design/brand/` (`logo-square.png`, `logo-wide.png`).
2. Paste **Part 1 (Master brief)** as your first message. Add: "Read this. Don't build yet. Reply with your plan and
   questions."
3. Then paste **one stage at a time from Part 2**. Wait until Emergent finishes and reports before the next stage.
   Test each stage on your phone.
4. Paste **Part 3 (seed data)** together with Stage 1.
5. When Stage 5 is done, sign in as owner, press **সোর্স কোড (ZIP)** in the footer, download it and bring it here.
   Follow **Part 4** before uploading.

Rules for you while working in Emergent:
- **Never paste real tutor, guardian or payment data** into Emergent. Only the synthetic data in Part 3.
- **Never press Emergent's "Deploy".** The real site will run on Cloudflare. The preview link is fine for testing with
  synthetic data.
- Don't paste passwords, API keys or OAuth secrets into the chat. Emergent's own Google sign-in needs none.

---

# PART 1 — Master brief (paste this first)

## 1. What we are building

**Hikmah Tutors Rajshahi (HTR)** is a home-tutor media (agency) in Rajshahi, Bangladesh. Guardians call or WhatsApp
the owner to ask for a tutor. The owner posts the tuition, tutors apply, the owner picks a tutor, and the tutor pays
HTR a one-time "media fee" from the first month's salary. Today all of this lives in one Google Sheet plus Facebook and
WhatsApp posts.

Build a **mobile-first, Bangla-first website** where:
- **Tutors** (mostly university students in Rajshahi, on ordinary Android phones with mobile data) browse open
  tuitions, sign in with Google, keep one profile, apply, save tuitions, and track every application like a
  Foodpanda/Pathao delivery tracker.
- **Guardians** have **no account**. They see WhatsApp and call buttons and a short request form.
- **The owner** (the only staff role for now) takes guardian calls on a fast phone form (Quick Pad), turns leads into
  tuitions, publishes them, reviews applications, shortlists and confirms tutors, and generates the Facebook and
  WhatsApp post text for each tuition.

The home page **is** the tuition board. No long marketing page.

## 2. Non-negotiable rules

1. **Private by default.** A guardian's name, phone number and full address, student details and private notes are
   **never** sent to the browser of a tutor or a visitor: not in pages, API JSON, page source, meta tags, share images,
   URLs, logs or analytics. Public data goes through **one whitelist function** (`to_public_tuition`) and nothing else.
2. **A tutor's phone number, email and photo** are never shown to the public or to other tutors.
3. **Check access on the server, in every endpoint.** Hiding a button is not access control. Every `/api/admin/*`
   endpoint checks that the signed-in user is the owner. Every `/api/me/*` endpoint only touches the signed-in tutor's
   own records.
4. **Staff decide, tutors don't.** A tutor can apply, save, withdraw and report a concern. Only the owner can change
   any other status. The server rejects every other change.
5. **Honest content.** No invented numbers ("5000+ tutors"), no reviews, testimonials, countdowns, "X people viewing",
   or stock photos of people presented as real tutors. Counts shown anywhere must come from real database records.
6. **Words, not just colour.** Every status is a text label (Bangla, with English available). Colour only supports it.
7. **Synthetic data only.** Use the seed data in Part 3. Mark private test fields with `SYNTHETIC-PRIVATE-MARKER-…`
   so tests can prove they never leak.
8. **Release 1 only.** Do **not** build: document upload or identity verification, trial-class records, placements,
   fee payments, ledger, bKash/Nagad submission, prepaid packages (Gold/Platinum/Diamond), SMS, email sending,
   automatic WhatsApp sending, push notifications, guardian accounts, a public tutor directory, or a poster/image
   generator. They come in later releases.
9. **Speed on cheap phones beats effects.** Small bundle, compressed images, CSS transitions only. No heavy animation
   library, no 3D, no video backgrounds, no scroll hijacking.
10. **Never** put the owner's emails, phone numbers or any secret in frontend code. Contact numbers come from the
    settings API.

## 3. Technology

Use Emergent's standard stack: **React frontend + FastAPI backend + MongoDB**, Tailwind CSS.

**This build is a working prototype that will be moved to another stack** (React Router v8 + TypeScript + Tailwind
v4 on Cloudflare Workers with a SQL database, D1/SQLite). It will never be hosted from Emergent. So:
- Write the frontend in **TypeScript** (`.tsx`), function components and hooks only, **Tailwind classes only** (no
  CSS-in-JS, no component library that ships its own styles; small headless helpers are fine).
- Keep **components free of data fetching**: pages fetch through one API client (`frontend/src/api/client.ts`, one
  typed function per endpoint) and pass data down as props. Shared types in `frontend/src/types.ts`.
- Use **plain React Router** routes with the same URLs as §10, so pages can become route modules later.
- Keep the data **flat, SQL-friendly**: one collection per table in §6, string ids, references by id or tuition
  code, arrays only of simple keys, no deeply nested documents. Every rule that matters (whitelist, allowed status
  changes, owner check, unique active application) lives in clearly named functions, not scattered in endpoints.
- No Python-only magic the frontend depends on; the API returns plain JSON.

Code structure (required, so the code can be moved without a rewrite):
- **One option file** `shared/options.json` holds every choice list (classes, mediums, subjects, areas, statuses…)
  with a stable `key`, a Bangla `label`, an English `label_en` and optional `alt` spellings. Both frontend and backend
  read this file. **The database stores only the `key`.** Use exactly the keys in §7.
- **Pure logic modules with unit tests** (no database or framework inside them):
  `backend/logic/phone.py` (phone normalisation), `backend/logic/text.py` (Unicode NFC, Bangla↔Latin digits, search
  normalisation), `backend/logic/fees.py` (fee display arithmetic, §9), `backend/logic/posts.py` (post generator, §11),
  `backend/logic/transitions.py` (allowed status changes, §8).
- **All UI text** in `frontend/src/i18n/bn.json` and `frontend/src/i18n/en.json`. No Bangla strings hard-coded in
  components. Bangla is the default; an English toggle sits in the header and remembers the choice.
- `README.md` at the root: stack, folder map, environment variables (names only, no values), how to run locally, how to
  run the tests.
- Money is **whole taka stored as integers**. No floats for money.
- Times stored in UTC, shown in Bangladesh time (Asia/Dhaka).

## 4. Sign-in and roles

- **Google sign-in only**, using Emergent's built-in (managed) Google login. **No passwords, no SMS OTP, no email
  login.**
- Roles: `tutor` and `owner`. The owner is recognised by an email listed in the backend environment variable
  `OWNER_EMAILS` (comma-separated). Everyone else who signs in is a tutor. Keep the role check in **one function**
  (`require_owner`, `require_tutor`) so Coordinator and Verifier roles can be added later without touching every
  endpoint.
- Visitors can browse the board and tuition pages **without signing in**. Sign-in is needed only to apply, save, or see
  "my" pages.
- Sessions: secure, HTTP-only cookies. "Sign out" in settings.
- Admin pages send `noindex` and are not linked from public pages (except the owner-only footer items in §12).

## 5. Design system

**Feel:** modern and bold, aimed at young tutors (university students), with real polish — the kind of site a student
tells friends about. **No claymorphism**, no purple gradients, no cartoon avatars, no glassmorphism, no heavy shadows.
Boldness comes from **colour bands, very large confident type (salary and area), crisp layout and short purposeful
motion.**

**Colours** (sampled from the logo; use these as Tailwind theme tokens):

| Token | Hex | Use |
|---|---|---|
| `forest` | `#09332A` | Bold bands (top band, section headers, footer), headings |
| `forest-mid` | `#0F4438` | Hover on forest, secondary bands |
| `brand-600` (emerald) | `#11816D` | Primary buttons, links, active chips (white text on it: OK) |
| `brand-700` | `#0E6B5A` | Button hover |
| `brand-500` | `#169A82` | Accents on dark |
| `brand-50` / `brand-100` / `brand-200` | `#EBF6F3` / `#CFEDE6` / `#A3DCCF` | Tinted backgrounds, selected rows |
| `mango` | `#FED262` | **Fill only**: badges like "নতুন", primary button on a forest band (forest text on it) |
| `mango-deep` | `#F9C143` | Mango hover, highlight on forest |
| `cream` | `#FEFDF8` | Page background |
| text | `slate-800` / `slate-600` muted | Body text |

**Mango rule:** mango is a fill behind dark text, or a highlight on forest. **Never** mango text, mango icons, mango
borders or mango focus rings on a light background (contrast 1.4:1 — unreadable).

Status colours (always with a text label): success green-700 on green-100; warning amber-800 on amber-100; danger
red-700 on red-100; info blue-700 on blue-100; neutral slate-700 on slate-100.

**Type:**
- Font: **Hind Siliguri** (Google Fonts, weights 400, 600, 700) for Bangla and Latin. For Bangla digits use
  **Noto Sans Bengali** via `unicode-range: U+09E6-09EF` (Hind Siliguri's ১ is unclear at regular weight).
- Body at least 16 px, Bangla line-height about 1.7. No letter-spacing, uppercase or italics on Bangla. Never cut
  Bangla text by character count (it breaks conjuncts) — use CSS `line-clamp`.
- **Salary is the hero of every card**: very large, bold (`৳ ৫,০০০`). Area is a bold chip.
- Bangla UI shows Bangla digits (৳ ৫,০০০, সপ্তাহে ৩ দিন); English UI shows Latin digits.

**Layout and motion:**
- Phone first, must work perfectly at **360–375 px** width with no horizontal scroll. Tap targets at least 44 × 44 px.
- Signed-in tutors on phones get a **bottom tab bar**: **বোর্ড · সেভ · আবেদন · প্রোফাইল**. Visitors get a simple top
  bar (logo, language toggle, "সাইন ইন").
- Filters open as a **bottom sheet** on phones; filter chips scroll sideways.
- Motion: 150–250 ms CSS transitions (cards rise in on first load, chip select, a satisfying "আবেদন হয়েছে" check
  animation, save heart). Nothing on scroll. All non-essential motion off under `prefers-reduced-motion`.
- Skeleton loaders, not spinners, for lists. Every list has a helpful empty state and an error state.
- Visible focus ring (3 px blue-800 on light, white on forest). Labels above inputs; errors under the field, in Bangla.
- Owner panel: same tokens, denser layout, left sidebar on desktop, bottom/top tabs on phone. Tables become cards on
  phones.

**Logo:** use the uploaded `logo-wide.png` in the header/footer and `logo-square.png` for the favicon/app icon
(make a compressed WebP/PNG version under 30 KB for the header).

**Tone of Bangla text:** clear, friendly চলিত Bangla, "আপনি" for tutors and guardians. English only for names like
WhatsApp, Facebook, SSC, HSC, O Level, Google.

## 6. Data model (MongoDB collections)

Every document has `created_at` and `updated_at` (UTC). Fields that hold a choice store the **key** from §7.

**`users`** — `email, name, picture_url, role ("tutor" | "owner"), last_login_at`

**`tutors`** — one per tutor.
`user_id (null if unclaimed import), claim_status ("unclaimed" | "claim_pending" | "claimed"), legacy_ref,
full_name, gender ("male" | "female"), phone ("01XXXXXXXXX"), phone_is_whatsapp (bool), email,
institution, department, study_status ("studying" | "graduated"), study_year, education [ {level, institution,
group_or_subject, year} ], subjects [keys], class_levels [keys], mediums [keys], areas [area keys],
availability { "sat": ["morning","afternoon","evening"], … }, mode ("home" | "online" | "both"),
experience_years, experience_note (≤300), expected_salary_min, expected_salary_max (optional ints),
photo_thumb_key, photo_display_key, availability_paused (bool), created_via ("signup" | "import" | "staff")`

**`consents`** — `tutor_id, purpose ("matching" | "share_with_guardian" | "contact_by_htr"), terms_version,
given_at, withdrawn_at, given_via ("site" | "staff_recorded")`

**`claims`** — `user_id, phone_entered, matched_tutor_id (server-side only, never returned), status
("pending" | "approved" | "declined"), decided_at`

**`leads`** — guardian requests, from the owner's Quick Pad **or** the public form. **Owner-only.**
`client_id (UUID made on the device, unique — retries never duplicate), channel ("quickpad" | "web_form"),
phone, guardian_name, class_level, medium, student_gender, tutor_gender, subjects [keys], area (key or free text),
address (Quick Pad only), salary (int, per month, optional), days_per_week, notes, lead_source, consent_given (web form),
status ("new" | "contacted" | "converted" | "discarded"), converted_tuition_code, created_at (time typed on the
phone), synced_at (time it reached the server)`

**`guardians`** — **owner-only.** `name, phone, alt_phone, preferred_channel ("whatsapp" | "call"), lead_source,
notes, contact_log [ {at, note} ], next_follow_up_at`

**`tuitions`** — the public part of a tuition.
`code (int, unique, never reused; shown as "HTR-330"), status (§8), is_public (bool), accepting_applications (bool),
tuition_type ("academic" | "admission" | "language" | "quran" | "skill" | "short_course"), class_level, medium,
subjects [keys], area, mode ("home" | "online"), salary_kind ("fixed" | "negotiable" | "unspecified"),
salary_amount (int or null), salary_period ("per_month" | "per_course"), days_per_week, students_count,
student_gender, tutor_gender_pref ("any" | "male" | "female"), requirements_public (text), start_note,
posted_at, closed_at, close_reason, created_by`
- `salary_kind = fixed` requires `salary_amount` and `salary_period`. `salary_amount` is **never 0**; unknown is null.
- Fixed monthly salary must be **at least ৳2,000** unless the owner writes an override reason.

**`tuition_private`** — **owner-only**, one per tuition.
`tuition_code, guardian_id, lead_id, exact_address, student_label, private_notes, salary_override_reason`

**`counters`** — `{_id: "tuition_code", next: <int>}`. The owner sets the starting number in settings (it must
continue from the last code in the old sheet). Allocate atomically (`find_one_and_update` with `$inc`).

**`applications`** — `tuition_code, tutor_id, status (§8), note (≤300), availability_confirmed (bool),
terms_version, terms_accepted_at, terms_accepted_via ("site" | "staff_recorded"), source ("site" | "whatsapp" |
"messenger" | "phone" | "walk_in"), entered_by_owner (bool), reason_code (for not_selected)`
- **Unique**: one *active* application per tutor per tuition (partial unique index on `{tuition_code, tutor_id}` where
  status is not `withdrawn`, `not_selected` or `opportunity_closed`).

**`application_events`** — append-only. `application_id, from_status, to_status, actor ("tutor" | "owner" |
"system"), reason_code, message_to_tutor, at`

**`saved_tuitions`** — `tutor_id, tuition_code` (unique pair)

**`notifications`** — `tutor_id, kind, tuition_code, application_id, read_at`. No personal data in it.

**`concerns`** — `reporter_tutor_id, target_type, target_ref, category ("unsafe" | "misconduct" | "harassment" |
"payment_dispute" | "other"), description, status ("open" | "in_progress" | "closed"), owner_notes`

**`audit_log`** — **append-only** (no update or delete code path exists anywhere). `actor_user_id, action,
entity_type, entity_id, reason, meta (no sensitive values), at`. Write an entry for: phone reveals, exports, code
download, every status change, publish/unpublish, claim decisions, settings and terms changes.

**`settings`** — key/value: `contact_whatsapp`, `contact_call`, `facebook_page_url` (placeholders until the owner
fills them in the settings page), post templates, closing lines, multi-offer headline, `daily_application_limit`
(default 20), `closed_page_days` (default 30).

**`terms_versions`** — `kind ("fee_terms" | "privacy_notice" | "tutor_terms"), version, text_bn, text_en,
effective_from`. Never edited in place: a change publishes a new version.

**Private photo storage:** tutor photos are stored in a private folder or bucket that is **not** publicly served.
They are delivered only through `GET /api/files/photo/{tutor_id}?size=thumb|display`, which checks that the viewer is
that tutor or the owner.

## 7. Choice lists (copy into `shared/options.json` — keep these keys exactly)

**Class levels** (`class_levels`): `c1-5` ১ম–৫ম · `c6-8` ৬ষ্ঠ–৮ম · `ssc` ৯ম–১০ম (SSC) · `hsc` একাদশ–দ্বাদশ (HSC) ·
`admission` ভর্তি প্রস্তুতি · `olevel` O Level · `alevel` A Level · `other` অন্যান্য

**Mediums** (`mediums`): `bangla` বাংলা মাধ্যম · `ev` ইংলিশ ভার্সন · `em` ইংলিশ মিডিয়াম · `madrasa` মাদ্রাসা

**Subjects** (`subjects`): `all` সব বিষয় · `math` গণিত · `science` বিজ্ঞান · `english` ইংরেজি · `bangla` বাংলা ·
`physics` পদার্থ · `chemistry` রসায়ন · `biology` জীববিজ্ঞান · `hmath` উচ্চতর গণিত · `ict` আইসিটি ·
`accounting` হিসাববিজ্ঞান · `quran` কুরআন / আরবি

**Tutor gender** (`tutor_genders`): `any` যেকোনো · `male` পুরুষ · `female` মহিলা
**Student gender** (`student_genders`): `boy` ছেলে · `girl` মেয়ে
**Lead source** (`lead_sources`): `call` ফোন কল · `whatsapp` WhatsApp · `facebook` Facebook ·
`referral` পরিচিত / রেফারেন্স · `old` পুরোনো গার্ডিয়ান · `website` ওয়েবসাইট · `other` অন্যান্য
**Days per week:** 2, 3, 4, 5, 6 · **Salary presets (Quick Pad chips):** 3000, 4000, 5000, 6000, 8000, 10000

**Areas** (`areas`) — Rajshahi only, **in this order** (most requested first; the first 12 are shown as quick chips,
the rest are found by search; `alt` = English spellings used by search):

```
uposhohor উপশহর (Uposhohor Upashahar) · terokhadiya তেরখাদিয়া (Terokhadiya) · court-station কোর্ট স্টেশন (Court Station)
vodra ভদ্রা (Vodra Bhadra) · padma-abashik পদ্মা আবাসিক (Padma Residential Podda Abashik) · sopura সপুরা (Sopura)
hetem-kha হেতেম খাঁ (Hetem Kha) · laxmipur লক্ষ্মীপুর (Laxmipur) · binodpur বিনোদপুর (Binodpur) · kazla কাজলা (Kazla Kajla)
sagarpara সাগরপাড়া (Sagarpara Sagorpara) · nowdapara নওদাপাড়া (Nowdapara Nawdapara)
shah-makhdum শাহ মখদুম (Shah Makhdum Mokhdum) · saheb-bazar সাহেব বাজার (Saheb Bazar Shaheb Bazar)
talaimari তালাইমারী (Talaimari Talaimary) · bornali বর্ণালী মোড় (Bornali Mor) · shalbagan শালবাগান (Shalbagan)
kazihata কাজীহাটা (Kazihata) · choto-bongram ছোট বনগ্রাম (Choto Bongram) · baharampur বহরমপুর (Baharampur Bohorompur)
rajpara রাজপাড়া (Raj Para Rajpara) · jadughar জাদুঘর (Jadughar Museum) · tikapara টিকাপাড়া (Tikapara)
rani-bazar রাণীবাজার (Rani Bazar) · sadhur-mor সাধুর মোড় (Sadhur Mor) · dabtola ডাবতলা (Dabtola)
seroil শিরোইল (Seroil Shiroil) · veripara ভেড়িপাড়া (Veripara Police Line) · kumarpara কুমারপাড়া (Kumarpara)
dorikhorbona দড়িখরবনা (নগর ভবন) (Dorikhorbona Nagar Bhaban Nagarvaban) · amchattar আমচত্বর (Aam Chattar Amchottor)
dashpukur দাশপুকুর (Dashpukur) · alupotti আলুপট্টি (Alupotti) · kadirganj কাদিরগঞ্জ (Kadirganj)
chondrima চন্দ্রিমা (Chondrima Chandrima) · pathanpara পাঠানপাড়া (Pathanpara) · raipara রায়পাড়া (Raipara)
dinggadoba ডিংগাডোবা (Dinggadoba Dinga Doba) · ghoshpara ঘোষপাড়া (Ghoshpara) · vatapara ভাটাপাড়া (Vata Para Bhatapara)
new-market নিউ মার্কেট (New Market) · basar-road বাশার রোড (Basar Road) · cantonment ক্যান্টনমেন্ট (Cantonment)
mohisbathan মহিষবাথান (Mohisbathan) · banalata বনলতা আবাসিক (Banalata Bonolota) · horogram হড়গ্রাম (Horogram)
hadir-mor হাদির মোড় (Hadir Mor) · fire-service ফায়ার সার্ভিস মোড় (Fire Service More) · city-college সিটি কলেজ (City College)
bgb-camp বিজিবি ক্যাম্প (BGB Camp School) · malopara মালোপাড়া (Malopara) · meherchondi মেহেরচণ্ডী (Meherchondi)
baneshwar বানেশ্বর (Baneshwar) · durgapur দুর্গাপুর (Durgapur)
```
Plus `online` অনলাইন (Online) for online tuitions. The owner can add areas and aliases in settings; existing keys are
never changed or deleted (only hidden).

## 8. Statuses and allowed changes

**Tuition** (`status`): `draft` খসড়া · `available` খালি আছে · `processing` প্রক্রিয়াধীন · `follow_up` ফলো-আপ প্রয়োজন ·
`booked` বুকড · `cancelled` বাতিল · `closed` সমাপ্ত.
A tuition is public **only** when `is_public = true` **and** status is `available` or `processing`. Publishing is a
separate button. "Accepting applications" can be switched off without unpublishing. `follow_up`, `booked`,
`cancelled`, `closed` are never public. A closed/booked tuition's page stays reachable for 30 days with a banner
"এই টিউশনটি আর খালি নেই" and links to similar tuitions, then shows "not found".

**Application** (`status`), with tutor-facing Bangla labels:

| Key | Bangla | Set by |
|---|---|---|
| `submitted` | আবেদন জমা হয়েছে | tutor or owner |
| `under_review` | পর্যালোচনায় আছে | owner |
| `shortlisted` | শর্টলিস্টেড | owner |
| `trial_arranged` | ট্রায়াল ক্লাস ঠিক হয়েছে | owner |
| `confirmed` | কনফার্মড | owner |
| `not_selected` | এবার নির্বাচিত হননি | owner (with reason: `filled`, `guardian_pref`, `not_matched`, `no_response`, `other`) |
| `withdrawn` | আবেদন তুলে নেওয়া হয়েছে | tutor |
| `opportunity_closed` | টিউশনটি বন্ধ হয়ে গেছে | system |

Allowed changes (enforced in `logic/transitions.py` and checked on the server for every change; anything else returns
an error):

| From | To |
|---|---|
| submitted | under_review, not_selected, withdrawn, opportunity_closed |
| under_review | shortlisted, not_selected, withdrawn, opportunity_closed |
| shortlisted | trial_arranged, not_selected, withdrawn, opportunity_closed |
| trial_arranged | confirmed, shortlisted, not_selected, withdrawn, opportunity_closed |
| confirmed, not_selected, withdrawn, opportunity_closed | none (final) |

- The tutor may only make the change **to `withdrawn`**, and only before `confirmed`.
- Every change writes an `application_events` row and a tutor notification.
- When the owner sets an application to **confirmed**: the tuition becomes `booked` (not public), and every other
  active application on it becomes `opportunity_closed` with a notification. (Trial records, placements and fees are
  later releases — in R1 "confirmed" is only this status change.)
- When the owner closes or cancels a tuition: every active application becomes `opportunity_closed`.
- A withdrawn tutor can apply again only while the tuition is still open.

## 9. Fee terms shown before applying (display only in R1 — no payments)

HTR charges the tutor a one-time media fee on the **first month's salary**. No registration or application fee on
this standard route. From the second month the tutor keeps 100%.

**Canonical Bangla wording (show verbatim; Bangla governs):**
> মোট ৬০% পরিশোধ করব (৩০% কনফার্মেশনের পর + বাকি ৩০% প্রথম স্যালারি পেয়ে) জয়েন করার ৭ দিনের মধ্যে ৫০% পরিশোধ করব (ডিসকাউন্ট অফার)।

English (informational): "I will pay a total of 60% (30% after confirmation + the remaining 30% after receiving my
first salary). [Discount offer:] I will pay 50% within 7 days of joining."

These are **two alternative options, never added together**. Show them as two side-by-side cards:
- **স্ট্যান্ডার্ড অপশন (৬০%)** — 30% after confirmation + 30% after the first salary.
- **আর্লি পেমেন্ট অপশন (৫০%, ডিসকাউন্ট)** — the full 50% within 7 days of joining.

Arithmetic (`logic/fees.py`, integers only):
```python
standard_total = (basis * 60 + 50) // 100
early_total    = (basis * 50 + 50) // 100
first          = standard_total // 2
second         = standard_total - first   # an odd taka goes to the second instalment
```
For a fixed monthly salary, use it as the basis and show real numbers (e.g. salary ৳4,000 → standard ৳1,200 + ৳1,200
= ৳2,400; early ৳2,000; saving ৳400). For negotiable/unspecified/per-course salaries, show the percentages with the
worked example at ৳4,000 and the line "চূড়ান্ত বেতন ঠিক হলে হিসাব দেখানো হবে". Unit tests must pass these vectors:

| Basis | Standard total | 1st | 2nd | Early total |
|---|---|---|---|---|
| 2000 | 1200 | 600 | 600 | 1000 |
| 2001 | 1201 | 600 | 601 | 1001 |
| 3333 | 2000 | 1000 | 1000 | 1667 |
| 4000 | 2400 | 1200 | 1200 | 2000 |
| 5001 | 3001 | 1500 | 1501 | 2501 |
| 10000 | 6000 | 3000 | 3000 | 5000 |

The apply page requires ticking "আমি ফি-এর শর্তগুলো পড়েছি এবং মেনে নিচ্ছি"; the server stores the accepted
`terms_version` and time on the application.

## 10. Screens

### 10.1 Public (no sign-in)

**`/` — Tuition board (home)**
- Top: a **forest band** with the logo, one confident Bangla line (e.g. "রাজশাহীর টিউশন, এক জায়গায়"), a short sub-line
  ("এলাকা, ক্লাস আর বেতন দেখে বেছে নিন। আবেদন করতে শুধু Google দিয়ে সাইন ইন।") and a search box. A small link
  "কীভাবে কাজ করে · ফি" to the info pages.
- Filter chips that scroll sideways: area, class, subject, medium, tutor gender, mode, salary range (fixed monthly only),
  days per week. On phones "আরও ফিল্টার" opens a bottom sheet. **Filters live in the URL** (shareable, back button
  restores them, never reset silently).
- Sort: newest (default), salary high → low (fixed monthly only; per-course salaries are never mixed into monthly
  sorting or ranges).
- **Tuition card** (the card is the brand):
  - Headline: class + subjects (e.g. "HSC · রসায়ন"), with medium.
  - **Salary in very large bold type**: "৳ ৪,০০০ / মাস" · negotiable: "৳ আলোচনা সাপেক্ষে" · unspecified: "বেতন উল্লেখ
    নেই" · per course: "৳ ১৫,০০০ / কোর্স". Never "৳ 0".
  - Area as a bold chip, days ("সপ্তাহে ৩ দিন"), tutor wanted ("মহিলা টিউটর" / "পুরুষ টিউটর" / "যেকোনো"), mode, code
    "HTR-330", posted time ("২ ঘণ্টা আগে").
  - "নতুন" badge (mango fill, forest text) for tuitions posted in the last 48 hours. Status strip "প্রক্রিয়াধীন" when
    processing.
  - Save (heart) and Share always one tap away. One primary action: open the tuition.
- Search: Bangla and English, alternative spellings (via `alt`), both digit systems, and Unicode-normalised (য়/ড়/ঢ়
  typed either way must match).
- **Guardian panel** (below the first few cards and in the footer): "টিউটর খুঁজছেন?" with **WhatsApp-এ লিখুন** (first),
  **কল করুন**, and **অনুরোধ পাঠান** (to the form). WhatsApp opens `https://wa.me/<number>?text=<pre-filled>` with
  "আমি একজন টিউটর খুঁজছি। ক্লাস: __, বিষয়: __, এলাকা: __।".
- Empty state: "এই ফিল্টারে এখন কোনো টিউশন নেই। ফিল্টার কমিয়ে দেখুন।" with a "ফিল্টার মুছুন" button.

**`/tuitions/HTR-330` — Tuition detail**
- All public facts, big salary and area, requirements text, posted date, availability.
- The **fee-terms box** (§9) with the real numbers for this salary.
- **আবেদন করুন** (sign-in required; if the profile is missing required items, it opens the checklist instead of failing).
  **সেভ** and **শেয়ার**. A WhatsApp link "এই টিউশন নিয়ে প্রশ্ন" pre-filled with "HTR-330 টিউশন সম্পর্কে জানতে চাই।".
- Similar tuitions (same area or class) at the bottom.

**Per-tuition share card** (owner decision): sharing a tuition on Facebook/WhatsApp shows a preview image built
**only** from public fields: code, class, subject, area, salary, days — in brand colours, logo, large salary. Because
the React app is rendered in the browser and Facebook's crawler does not run JavaScript, add a backend route:
- `GET /api/share/HTR-330` → a tiny HTML page with Open Graph tags (`og:title`, `og:description`, `og:image`,
  `og:url`) and an instant redirect to `/tuitions/HTR-330`. The Share button shares this URL.
- `GET /api/share/HTR-330.png` → a 1200 × 630 image. **Bangla must render with correct conjuncts**: if Pillow is used
  it needs the `raqm` layout engine (`features.check("raqm")`); otherwise render an HTML card with a headless browser.
  Compare against the browser's rendering before accepting.
- Never any guardian, student or address data in the image or tags. Closed tuitions return a generic site image.

**Info pages:** `/how-it-works` (কীভাবে কাজ করে — 4 short steps: সাইন ইন → প্রোফাইল → আবেদন → শর্টলিস্ট ও ট্রায়াল),
`/fees` (§9 wording, both options, worked examples, "no registration fee on the standard route"), `/privacy`,
`/terms` (both marked "খসড়া — আইনি পর্যালোচনা বাকি" until the owner replaces them), `/contact`.

**`/request-tutor` — Guardian request form (no account)**
Short, about five fields: **নাম, মোবাইল নম্বর, এলাকা, ক্লাস, বিষয়**, plus an optional note and a consent checkbox
linking to the privacy page. **No full address field** (the owner takes it on the phone). WhatsApp and call buttons
on the same page. Submitting creates a private `lead` (channel `web_form`) and shows "ধন্যবাদ! আমরা শীঘ্রই আপনাকে
ফোন করব।". Nothing is published automatically. Rate-limited (e.g. 5 per hour per IP) with a hidden honeypot field.

### 10.2 Tutor (signed in)

Bottom tab bar on phones: **বোর্ড** (`/`) · **সেভ** (`/me/saved`) · **আবেদন** (`/me/applications`) ·
**প্রোফাইল** (`/me/profile`). Bell icon in the header → `/me/notifications` with an unread dot.

- **`/signin`** — one big "Google দিয়ে সাইন ইন" button and one line on why ("আবেদন করতে ও আবেদনের অবস্থা দেখতে").
  First sign-in → a short welcome that leads to the profile, and acceptance of the privacy notice and tutor terms
  (stored in `consents`, with version).
- **`/me`** — tutor home: profile checklist if incomplete, latest status changes, suggested tuitions (matching their
  areas, classes and subjects).
- **`/me/profile`** — the fields in §6 `tutors`, in short steps with a progress bar (save and resume at any step).
  Show a **checklist of what is required to apply**: name, mobile, gender, institution, subjects and classes,
  preferred areas, photo. (A checklist, not a misleading percentage.) Phone accepts any format and is normalised to
  `01XXXXXXXXX` (prefixes 013–019 only; Bangla digits accepted).
  - **Photo**: crop square on the phone, compress to WebP (about 100 KB or less), a 128 px thumbnail and a 512 px
    display size, reject non-images, strip EXIF/location. Stored privately (§6).
  - **"কে কী দেখতে পায়"** panel: you see everything; HTR sees everything; a guardian sees only your name, photo,
    institution and subjects, and only if you are shortlisted; nobody else sees your profile.
  - Three separate consent switches: matching · sharing with a guardian when shortlisted · contact by HTR on phone or
    WhatsApp.
  - "Availability pause" switch: a paused tutor stays signed in but cannot be shortlisted.
- **Apply** (from a tuition page, a single screen): short note (≤300 characters), "আমি এই সময়ে পড়াতে পারব" checkbox, the
  fee-terms box with acceptance, submit. Then a satisfying confirmation and "এরপর কী হবে": the owner reviews; you'll
  see every change in আবেদন. Daily limit 20 applications.
- **`/me/applications`** — tabs per status group (চলমান · কনফার্মড · বন্ধ). Each row: code, class/subject, area,
  status label, last change, next expected step. Tapping opens a **delivery-tracker style timeline**: জমা → পর্যালোচনা
  → শর্টলিস্ট → ট্রায়াল → কনফার্ম, with times. "আবেদন তুলে নিন" button where allowed (with a confirm dialog).
  "সমস্যা জানান" (report a concern) link.
- **`/me/saved`** — saved tuitions; closed ones are greyed with the closed label.
- **`/me/notifications`** — list, unread first, mark as read. The site never claims WhatsApp/SMS/email delivery.
- **`/me/settings`** — language, availability pause, consent switches, "আমার তথ্যের কপি" (download own data as JSON),
  "অ্যাকাউন্ট বন্ধের অনুরোধ", sign out.
- **`/claim`** — for tutors already in HTR's records: enter the mobile number on record. The answer is **always**
  "ধন্যবাদ, আমরা যাচাই করে জানাব" whether or not it matches (never reveal whether a number exists). The owner approves
  in the panel; on approval the record links to this Google account, and the tutor must re-confirm availability and
  accept the notice and terms.

### 10.3 Owner panel (`/admin/*`, owner only)

- **`/admin` — Work queue**: new applications · claims waiting · new leads not yet contacted · guardian follow-ups due
  today · open concerns. Each item shows the reason and a one-tap action. Small daily numbers computed from real
  records (open tuitions, applications waiting, follow-ups due). No decorative numbers.
- **`/admin/quick` — Quick Pad** (the owner uses this **during a phone call**, one-handed):
  - One screen, big tap chips: phone number (numeric keypad), class chips, medium, student gender, tutor gender,
    subject chips (multi), **area chips (top 12) + search for the rest + "অন্য এলাকা" free text**, address/landmark,
    salary preset chips + custom amount, days chips, lead source, notes. Only phone, class and area are required.
  - **Works offline**: if there is no internet, the lead is saved in `localStorage` with a `client_id` (UUID) and the
    time it was typed, shown as "অপেক্ষায় (৩টি)", and sent automatically when the net returns. The server ignores a
    `client_id` it already has, so retries never duplicate.
  - After save: a big "সেভ হয়েছে" and the form clears for the next call.
- **`/admin/leads`** — all leads (Quick Pad + web form), newest first, status filter, duplicate warning (same phone).
  Actions: mark contacted, add a follow-up date, **convert to tuition** (prefills the tuition editor and creates or
  links a `guardians` record), discard.
- **`/admin/tuitions`** — list with status filter and search by code/area/class.
- **`/admin/tuitions/HTR-330` — Tuition editor**, two clearly labelled panels:
  - **Public panel** ("সবাই দেখবে") — the public fields, with a live preview of the public card.
  - **Private panel** ("শুধু আপনি দেখবেন", a different background colour) — guardian, exact address, student label,
    private notes, salary override reason.
  - Code allocated automatically and never reused. Salary validation (§6). Duplicate warning (same guardian phone +
    same class + subject). For SSC and HSC the public requirement text is pre-filled with "পূর্ব অভিজ্ঞতা অগ্রাধিকার
    পাবে" (removable). Buttons: Save draft · **Publish** / Unpublish · Accepting applications on/off · Close (with a
    reason) · Clone.
  - Side panel: **post generator** (§11) and **applications** for this tuition.
- **`/admin/applications`** — all applications, filter by tuition/status. **Compare view**: pick 2–5 applicants and see
  them side by side (photo, institution, subjects, experience, availability, areas, expected salary, note). Actions:
  under review, shortlist, trial arranged, confirm, not selected (reason + optional message), private note. Bulk
  changes ask for confirmation. **Add application for a tutor** (staff-entered) with a source (WhatsApp, Messenger,
  phone, walk-in); fee acceptance recorded as "staff_recorded" with the date.
  Each tutor row has a **WhatsApp button** that opens `wa.me/880…` with a pre-filled template message (shortlisted /
  trial / not selected — wording in settings). The site records "message prepared", never "delivered".
- **`/admin/tutors`** and **`/admin/tutors/:id`** — directory with photo thumbnail, name, institution, subjects,
  classes, areas, availability, online, claim status; filters for each; search by phone. **Phone numbers masked**
  (`017••••••45`) with a "দেখুন" button that reveals it and writes an audit entry. Claims waiting are shown here with
  approve/decline. "Invite to claim" opens WhatsApp with a template.
- **`/admin/posts`** — pick one or several tuitions and generate posts (§11).
- **`/admin/concerns`** — list, status, notes; can put a tuition or tutor on hold.
- **`/admin/settings`** — contact numbers (WhatsApp, call, Facebook page), starting tuition code, areas and aliases
  (add / rename label / hide; never change a key), subjects, post templates and closing lines, message templates,
  terms versions (publish a new version), daily application limit.
- **`/admin/audit`** — read-only audit log with filters.

## 11. Post generator (`logic/posts.py`, pure functions with tests)

From any saved tuition, produce four texts, each with a **Copy** button:

1. **Facebook post** — fields in this fixed order, **no emojis or decorative characters**:
   ```
   {opening line from settings, if any}
   Class: {class}
   Subject: {subjects}
   Tutor Needed: {tutor gender}
   Weekly: {days} days
   Salary: {salary}            (negotiable → ৳ আলোচনা সাপেক্ষে)
   Location: {area}
   {closing lines from settings}
   ```
2. **WhatsApp post**:
   ```
   {one-line headline, e.g. "Need a female tutor for HSC Chemistry, Kazla"}
   Tuition Code: HTR-{code}
   Class: {class}
   Subjects: {subjects}
   Weekly: {days} days
   Salary: {salary}
   Location: {area}
   Start: {start}                (only if given)
   Guardian Requirement:         (only if given)
   {requirement text}
   আগ্রহী শিক্ষকরা নির্দিষ্ট আবেদন ফরম্যাট অনুযায়ী WhatsApp অথবা Facebook Page-এ যোগাযোগ করুন।
   ```
   An optional "Why trust Hikmah Tutors Rajshahi?" block (text from settings) by checkbox: default on for WhatsApp,
   always off for Facebook. A checkbox "add website link" appends the tuition's share link.
3. **Contact-save line**: `Tuition - 330` (number only, **never** starting with "HTR").
4. **Sheet row**: one tab-separated row in the column order set in settings (only the row, nothing else).

**Multiple tuitions** → one combined post whose headline states how many are for male and how many for female tutors
(headline wording in settings), then each block in the order selected.
Rules: never a guardian phone number, address or student name in any post; salary never "0"; Unix newlines, no
trailing spaces. The templates are placeholders until the owner pastes the exact wording into settings.

## 12. Footer (every page) and the owner-only code download

**Footer for everyone** (forest band, cream text, mango only as a fill):
- Logo (wide) and one line: "রাজশাহীর বিশ্বস্ত হোম টিউটর মিডিয়া".
- Links: কীভাবে কাজ করে · ফি · অভিভাবকদের জন্য (request form) · যোগাযোগ · গোপনীয়তা · শর্তাবলি · পুরোনো প্রোফাইল ক্লেইম করুন.
- WhatsApp, call and Facebook buttons (numbers from settings).
- "© ২০২৬ Hikmah Tutors Rajshahi". On phones, leave space so the bottom tab bar never covers the footer.

**Owner-only footer row** — shown **only** when the signed-in user is the owner (the server decides; for everyone
else the row is not rendered at all and the endpoint refuses):
- **অ্যাডমিন প্যানেল** link → `/admin`.
- **সোর্স কোড (ZIP)** button → `GET /api/admin/export/code`.

`GET /api/admin/export/code` requirements:
1. Calls `require_owner`; anyone else gets 403. Writes an `audit_log` entry (`code_download`).
2. Builds a ZIP of the whole project root (in Emergent usually `/app`): `frontend/`, `backend/`, `shared/`,
   `tests/`, `README.md`, and dependency files (`package.json`, lock file, `requirements.txt`).
3. **Excludes**: every `.env` / `.env.*` file and anything with secrets, `node_modules/`, `.git/`, `build/`, `dist/`,
   `__pycache__/`, `.venv/`, `*.log`, uploaded photos/files, database dumps, `.emergent/` or other tool folders.
4. **Adds** `ENV_EXAMPLE.txt` listing every environment variable **name** the app needs, with empty values, and
   `EXPORT_INFO.txt` with the export date and the stack versions (React, FastAPI, Python, Node, MongoDB driver).
5. File name: `hikmah-tutors-code-YYYY-MM-DD.zip`. Streams the file (doesn't hold it all in memory).
6. A second owner-only button **সিড ডেটা (JSON)** → `GET /api/admin/export/seed` downloads the current synthetic
   database as JSON (for testing the import here). Also audit-logged.

## 13. Security checklist (must pass)

- Response headers: Content-Security-Policy, HSTS, `X-Content-Type-Options: nosniff`, Referrer-Policy,
  `frame-ancestors 'none'`, Permissions-Policy.
- Rate limits on sign-in callback, claim, apply and the request form.
- Input validation on every endpoint (Pydantic); unknown option keys rejected; text trimmed; Unicode NFC.
- No secret, owner email or database URL in the frontend bundle.
- Logs and error messages never contain phone numbers, addresses or private notes.
- Photos and private data are never reachable by guessing a URL.

---

# PART 2 — Build stages (paste one at a time)

Header for every stage (paste it on top):
> "Follow the Master brief strictly. Build only this stage. Use only the synthetic seed data. Where something is
> unclear, choose the simplest safe default, list it in your report, and keep going. At the end: run the tests listed,
> report every failure and every assumption, then stop and wait."

**Stage 1 — Foundation, design system, public board.**
"Set up the project structure in §3 (including `shared/options.json` with the exact keys in §7, the i18n files and
the pure logic modules with unit tests for phone, text, fees and transitions). Create all collections and indexes in
§6, load the seed data from Part 3, and build the design tokens and components in §5 (buttons, chips, cards, bottom
sheet, badges, skeletons, empty states, footer). Build the public pages in §10.1: board with filters in the URL,
search, tuition detail with the fee box, info pages, guardian panel and request form, and the per-tuition share
route. Public data only through `to_public_tuition`. Tests: the fee vectors in §9; phone formats `01711000000`,
`8801711000000`, `+880 1711-000000`, `০১৭১১০০০০০০` all become `01711000000`, and `01211000000` is rejected; search for
'Shaheb Bazar', 'saheb bazar' and 'সাহেব বাজার' returns the same tuitions; an anonymous request to every public
endpoint and page source never contains any `SYNTHETIC-PRIVATE-MARKER` or `SYNTHETIC-ADDRESS`; draft tuition 9005 is
never public; negotiable salary never shows 0; the board works at 360 px with no horizontal scroll."

> **Stages 2–5 below are replaced by Part 5** (design and screens only). Kept for reference: they describe what each
> screen must do, which Part 5 still uses.

**Stage 2 — Tutor accounts, profile, apply and track.**
"Add Google sign-in (Emergent managed), the roles in §4, and the tutor screens in §10.2: sign-in, welcome and
consents, profile with checklist and private photo upload, visibility panel, availability pause, apply with fee-terms
acceptance, saved tuitions, applications with the tracker timeline, withdraw, notifications, settings with data copy,
and the claim flow. Tests: tutor A cannot read or change tutor B's profile, photo, applications, saved list or
notifications; a tutor cannot set any application status except `withdrawn`, and not after `confirmed`; one active
application per tuition; the 21st application in a day is refused; claim gives the same answer for a matching and a
non-matching number; a non-image file renamed `.jpg` is rejected and EXIF is stripped; photo URLs refuse other users."

**Stage 3 — Owner panel.**
"Build §10.3: owner check on every `/api/admin/*` endpoint, work queue, Quick Pad with the offline queue and
`client_id`, leads with convert-to-tuition, tuition editor with public/private panels, code counter, publish rules,
applications with compare view and every allowed status change (§8), staff-entered applications, WhatsApp template
buttons, tutor directory with masked phones and logged reveal, claim approval, concerns, settings and audit log.
Tests: every allowed and disallowed transition in §8; confirming one application books the tuition and closes the
others with notifications; closing a tuition closes all active applications; a tutor or visitor gets 403 on every
admin endpoint; the same Quick Pad `client_id` sent twice creates one lead; a phone reveal writes an audit row;
fixed monthly salary under ৳2,000 is refused without an override reason; codes never repeat."

**Stage 4 — Post generator.**
"Build §11 in `logic/posts.py` with the side panel in the tuition editor and `/admin/posts`. Golden tests for: a fixed
salary tuition (9001), a negotiable one (9002), an HSC tuition with a guardian requirement (9003), and a combined post
of 9001 (female) + 9003 (male) whose headline counts 1 female and 1 male. Check: no emoji in Facebook output, no
guardian phone or address anywhere, contact line is exactly `Tuition - 9001`."

**Stage 5 — Footer code export, polish and final report.**
"Build §12 (footer, owner-only row, code ZIP and seed JSON exports with every exclusion) and the §13 security
checklist. Polish: motion and reduced motion, focus rings, empty/loading/error states everywhere in Bangla and
English, long Bangla names and areas never clipped, every screen at 360 px, Lighthouse mobile on `/` and a tuition
page (aim: LCP ≤ 2.5 s, CLS ≤ 0.1, first-load JS ≤ ~200 KB gzip, no image over 100 KB). Tests: a tutor and a visitor
get 403 on `/api/admin/export/code`; the ZIP contains no `.env`, `node_modules` or `.git`; `ENV_EXAMPLE.txt` lists
variable names with empty values. Finish with a report: what was built, every test result, every assumption, known
gaps, and the exact stack versions."

---

# PART 3 — Synthetic seed data (paste with Stage 1)

All invented. Phone numbers are made-up test values in the `01700000xxx` pattern; never call or message them.

```json
{
  "settings": {
    "contact_whatsapp": "01700000000",
    "contact_call": "01700000000",
    "facebook_page_url": "https://facebook.com/",
    "tuition_code_start": 9001
  },
  "tuitions": [
    { "code": 9001, "class_level": "ssc", "medium": "bangla", "subjects": ["physics", "math"],
      "area": "saheb-bazar", "mode": "home", "salary_kind": "fixed", "salary_amount": 4000, "salary_period": "per_month",
      "days_per_week": 3, "tutor_gender_pref": "female", "student_gender": "girl",
      "requirements_public": "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে", "status": "available", "is_public": true },
    { "code": 9002, "class_level": "c1-5", "medium": "bangla", "subjects": ["all"],
      "area": "uposhohor", "mode": "home", "salary_kind": "negotiable", "salary_amount": null, "salary_period": "per_month",
      "days_per_week": 5, "tutor_gender_pref": "any", "status": "available", "is_public": true },
    { "code": 9003, "class_level": "hsc", "medium": "bangla", "subjects": ["chemistry"],
      "area": "kazla", "mode": "home", "salary_kind": "fixed", "salary_amount": 3333, "salary_period": "per_month",
      "days_per_week": 4, "tutor_gender_pref": "male", "student_gender": "boy",
      "requirements_public": "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে", "status": "processing", "is_public": true },
    { "code": 9004, "class_level": "admission", "medium": "bangla", "subjects": ["biology", "chemistry"],
      "area": "online", "mode": "online", "salary_kind": "fixed", "salary_amount": 15000, "salary_period": "per_course",
      "days_per_week": 6, "tutor_gender_pref": "any", "status": "available", "is_public": true },
    { "code": 9005, "class_level": "c6-8", "medium": "ev", "subjects": ["english"],
      "area": "kazla", "mode": "home", "salary_kind": "unspecified", "salary_amount": null, "salary_period": "per_month",
      "days_per_week": 3, "tutor_gender_pref": "any", "status": "draft", "is_public": false },
    { "code": 9006, "class_level": "olevel", "medium": "em", "subjects": ["math", "physics"],
      "area": "padma-abashik", "mode": "home", "salary_kind": "fixed", "salary_amount": 8000, "salary_period": "per_month",
      "days_per_week": 3, "tutor_gender_pref": "any", "status": "available", "is_public": true },
    { "code": 9007, "class_level": "c6-8", "medium": "madrasa", "subjects": ["quran"],
      "area": "terokhadiya", "mode": "home", "salary_kind": "fixed", "salary_amount": 2500, "salary_period": "per_month",
      "days_per_week": 4, "tutor_gender_pref": "male", "status": "closed", "is_public": false }
  ],
  "tuition_private": [
    { "tuition_code": 9001, "guardian_name": "Sample Guardian A", "guardian_phone": "01700000101",
      "exact_address": "SYNTHETIC-ADDRESS-9001", "private_notes": "SYNTHETIC-PRIVATE-MARKER-9001", "lead_source": "facebook" },
    { "tuition_code": 9003, "guardian_name": "Sample Guardian B", "guardian_phone": "01700000103",
      "exact_address": "SYNTHETIC-ADDRESS-9003", "private_notes": "SYNTHETIC-PRIVATE-MARKER-9003", "lead_source": "call" }
  ],
  "tutors": [
    { "full_name": "Sample Tutor A", "gender": "female", "phone": "01700000201", "institution": "Sample University",
      "department": "Physics", "study_status": "studying", "claim_status": "claimed", "subjects": ["physics", "math"],
      "class_levels": ["ssc", "hsc"], "areas": ["saheb-bazar", "uposhohor"], "mode": "home" },
    { "full_name": "Sample Tutor B", "gender": "male", "phone": "01700000202", "institution": "Sample Engineering University",
      "department": "Chemical Engineering", "study_status": "studying", "claim_status": "claimed",
      "subjects": ["chemistry", "biology"], "class_levels": ["hsc", "admission"], "areas": ["kazla"], "mode": "both" },
    { "full_name": "Sample Tutor C (imported)", "gender": "male", "phone": "01700000203", "institution": "Sample College",
      "claim_status": "unclaimed", "subjects": ["english"], "class_levels": ["c6-8"], "areas": ["kazla"],
      "legacy_ref": "LEGACY-0001", "created_via": "import" },
    { "full_name": "সাদিয়া রহমান চৌধুরী (দীর্ঘ নামের পরীক্ষা)", "gender": "female", "phone": "01700000204",
      "institution": "Sample Medical College", "claim_status": "claimed", "subjects": ["biology"],
      "class_levels": ["ssc"], "areas": ["dorikhorbona"], "mode": "home" }
  ],
  "leads": [
    { "client_id": "00000000-0000-4000-8000-000000000001", "channel": "quickpad", "phone": "01700000301",
      "guardian_name": "Sample Guardian C", "class_level": "c6-8", "subjects": ["math", "english"], "area": "binodpur",
      "address": "SYNTHETIC-ADDRESS-LEAD-1", "salary": 3000, "days_per_week": 3, "lead_source": "call", "status": "new" },
    { "client_id": "00000000-0000-4000-8000-000000000002", "channel": "web_form", "phone": "01700000302",
      "guardian_name": "Sample Guardian D", "class_level": "hsc", "subjects": ["physics"], "area": "talaimari",
      "consent_given": true, "status": "new" }
  ]
}
```
Seed applications: Tutor A → 9001 (`under_review`), Tutor B → 9003 (`shortlisted`), Tutor B → 9004 (`submitted`).

---

# PART 4 — Bringing the code back here

Before you upload the ZIP to this chat:
1. Open the ZIP and check there is **no `.env` file** and no file with real names or numbers. If you see one, delete it
   from the ZIP first.
2. Put the ZIP in `C:\Users\HP\Documents\Hikmah Tutors\imports\` (create the folder) and tell me its name.
3. Also download **সিড ডেটা (JSON)** and put it next to the ZIP.

What happens next (decided 2026-10-20, see `docs/DECISIONS.md`): the site lives on **Cloudflare**. The Emergent
screens, components and Bangla copy are moved into this repo's React Router app; the FastAPI/MongoDB backend is the
reference for the logic, which is rewritten as loaders/actions, D1 migrations and SQLite triggers. The tests in Part 2
are rerun on the Cloudflare version before anything goes live.

---

# PART 5 — Design and screens only (from Stage 2 on)

**Why:** the real backend (Google sign-in, database, roles, security, every rule) is built in Claude Code on
Cloudflare. Emergent's job is the **look and the screens**, written so they can be **copied file by file** into a
React Router v8 + Tailwind v4 app with no redesign. Paste **5.1** first, then one stage from **5.3** at a time.

## 5.1 Change-of-plan message (paste first, once)

> **Change of plan.** From now on you build only the design and the screens (frontend). The real backend — Google
> sign-in, database, roles, security and every server rule — is being built elsewhere (React Router v8 framework mode
> + Tailwind CSS v4 on Cloudflare), and your files will be copied there as they are. So:
>
> - **Do not add** Emergent Google auth, sessions, cookies, roles, new FastAPI endpoints or new MongoDB collections.
>   Keep the Stage 1 backend as it is (public endpoints, share card, code export).
> - Every new screen gets its data from **typed mock data** in `frontend/src/mocks/` through the route's `loader`, and
>   saves through the route's `action` (which updates the mocks in memory). No real network calls for new screens.
> - Add a **demo role bar** (dev only, a small strip at the very top): Visitor · Tutor (new, profile incomplete) ·
>   Tutor (complete, with applications) · Owner. It only switches which mock user the loaders see. Keep it in
>   `frontend/src/dev/` so it can be deleted in one go.
> - Follow the **copy-paste contract** below exactly. It matters more than any single screen.
> - Use synthetic data only, never press Deploy, and finish every stage with a report and stop.

## 5.2 Copy-paste contract (paste together with 5.1)

**Folders**
```
frontend/src/
  ui/        small reusable pieces: Button, Chip, Badge, Card, Sheet, Tabs, Field, Toggle, Stepper, EmptyState…
  views/     one file per screen: BoardView.tsx, TuitionDetailView.tsx, ApplyView.tsx … props in, JSX out
  routes/    one file per URL: exports loader, action and a default component that reads useLoaderData /
             useActionData and renders the view. These are the only files that touch mocks.
  lib/       pure TypeScript, no React, no fetch: format.ts, validate.ts, posts.ts, fees.ts, image.ts, search.ts
  mocks/     typed fixture data + in-memory "db" used by loaders/actions (thrown away later)
  i18n/      bn.json, en.json, index.tsx
  dev/       demo role bar and the gallery (thrown away later)
  types.ts   every data shape (the contract the real server will return)
```

**React Router**
- Use **data mode**: `createBrowserRouter` + `RouterProvider`, routes defined in `frontend/src/routes.tsx`, each
  route module with `loader`, `action` and a default component. Convert the Stage 1 pages to this pattern too.
- Import everything from **`"react-router"`** (add the package): `Link`, `NavLink`, `Form`, `useLoaderData`,
  `useActionData`, `useNavigation`, `useSearchParams`, `useFetcher`. Never `react-router-dom`.
- Forms are **`<Form method="post">`** with native inputs whose `name` equals the field name in `types.ts`. The action
  returns `{ errors: { field: "Bangla message" } }` or redirects. Views take `errors` and `values` as props. Pending
  state from `useNavigation()`. Small in-place actions (save heart, mark read, status change) use `useFetcher()`.
- Filters and tabs live in the URL (`useSearchParams`).

**Views and components must be server-render safe**
- No `fetch`, TanStack Query, axios, SWR, `process.env` or `localStorage` inside `views/` or `ui/`.
- Anything browser-only (localStorage, `window`, `navigator.share`, clipboard, matchMedia) runs inside `useEffect`
  or an event handler, never during render.
- The i18n provider takes the language as a prop (`<I18nProvider lang="bn">`); only the language toggle writes it.
- No random ids or `Date.now()` during render (use React `useId`; dates come from data).

**Tailwind (must work unchanged in Tailwind v4)**
- Colour tokens with exactly these names: `forest #09332A`, `forest-mid #0F4438`, `brand-50 #EBF6F3`,
  `brand-100 #CFEDE6`, `brand-200 #A3DCCF`, `brand-500 #169A82`, `brand-600 #11816D`, `brand-700 #0E6B5A`,
  `brand-900 #09332A`, `mango #FED262`, `mango-deep #F9C143`, `cream #FEFDF8`. Other colours only from Tailwind's
  default palette (slate, green, amber, red, blue).
- **Avoid these class names** (their meaning changed in v4): bare `shadow`, `shadow-sm`, bare `rounded`, `rounded-sm`,
  bare `blur`, `blur-sm`, bare `ring`, `outline-none`, any `*-opacity-*`, `flex-shrink-*`, `flex-grow-*`. Use instead:
  `rounded-md`/`rounded-lg`/`rounded-xl`/`rounded-2xl`/`rounded-full`, the custom `shadow-card`, `ring-2`,
  `focus-visible:outline-*`, slash opacity (`bg-forest/80`), `shrink-0`, `grow`.
- Always give a colour with `border` (`border border-brand-100`) and with placeholders (`placeholder:text-slate-400`);
  add `cursor-pointer` to buttons.
- Every custom token, shadow, keyframe and animation goes in `tailwind.config.js` **and** is listed in
  `frontend/DESIGN_TOKENS.md` (name, value, where used).
- No `@apply` in components; plain classes. No CSS modules, no inline style objects except animation delays.

**Libraries:** only `react`, `react-router`, `lucide-react` (icons). No framer-motion, Radix, shadcn, MUI, charts or
date libraries in `views/`, `ui/` or `lib/`. Motion is CSS only (150–250 ms), all off under `prefers-reduced-motion`.

**Types:** every view's props and every mock are typed from `types.ts`, using the field names in Part 1 §6 and the
option keys in §7. Option labels come from `shared/options.json` through `lib/options.ts`.

**Logic worth keeping, as pure TypeScript with Jest tests (`lib/*.test.ts`):**
`format.ts` (taka with Bangla/Latin digits, salary text, time ago, Bangla dates), `validate.ts` (phone
`01[3-9]XXXXXXXX` with Bangla digits, note ≤ 300, required profile items checklist), `fees.ts` (the §9 vectors),
`posts.ts` (the §11 post generator with the golden tests in old Stage 4), `image.ts` (square crop, resize to 512 px and
128 px, WebP about 100 KB, EXIF removed by re-encoding on a canvas), `search.ts` (NFC, digits, alt spellings).

**Gallery:** a dev-only route `/__gallery` that shows every view in every state: loading skeleton, empty, error,
normal, and with the longest realistic Bangla names and areas. This is how each screen is reviewed before and after
the move.

**Accessibility:** min 44 × 44 px tap targets, visible focus, labels above inputs, errors linked with
`aria-describedby`, toasts in an `aria-live` region, status always as text, works at 360 px with no sideways scroll.

## 5.3 Stages (one at a time)

Header for every stage: *"Follow the Master brief (design rules) and the copy-paste contract in Part 5. Screens and
mock data only, no new backend. Report at the end with screenshots at 375 px of every new screen, then stop."*

**Stage 2-UI — Restructure + footer.**
"Move the Stage 1 frontend into the Part 5 structure: data-mode router, `routes/` + `views/` + `ui/`, imports from
`react-router`, mocks folder, demo role bar, `/__gallery` with the Stage 1 views. Remove the unused `components/ui`
(shadcn) folder and unused packages. Footer: the 'সোর্স কোড (ZIP)' and 'অ্যাডমিন প্যানেল' row shows **only in the
Owner demo role**; keep the export endpoint and exclude any uploads folder from the ZIP by name. Remove the Emergent
badge script from `index.html` only if the platform allows it; otherwise list it in the report."

**Stage 3-UI — Tutor screens.**
"Build every tutor screen in Part 1 §10.2 with mocks: sign-in (one 'Google দিয়ে সাইন ইন' button; in the demo it just
switches to the Tutor role), first-time welcome with privacy/terms acceptance, profile in short steps with the progress
bar, required-to-apply checklist, photo crop/compress (`lib/image.ts`), 'কে কী দেখতে পায়' panel, three consent
switches, availability pause; apply screen with the fee box and acceptance, success animation and 'এরপর কী হবে';
`/me` home; applications with status tabs and the delivery-tracker timeline, withdraw with confirm; saved; notifications
with unread dot; settings; claim with the always-same answer. Bottom tab bar বোর্ড · সেভ · আবেদন · প্রোফাইল for
tutor roles. Every state in the gallery."

**Stage 4-UI — Owner panel screens.**
"Build every owner screen in Part 1 §10.3 with mocks: work queue; **Quick Pad** (one-handed, big chips, numeric
phone pad, 'অপেক্ষায় (৩টি)' offline badge — simulate offline with a demo toggle; the real offline queue already
exists elsewhere, so only the screen and its states matter); leads with convert-to-tuition; tuition list; tuition
editor with the Public panel ('সবাই দেখবে') and the Private panel ('শুধু আপনি দেখবেন', different background), live
card preview, publish / accepting / close / clone; applications with compare view (2–5 side by side) and the status
actions allowed by §8, bulk confirm dialog, staff-entered application; tutor directory with masked phone and 'দেখুন';
claims approve/decline; post generator panel and `/admin/posts` using `lib/posts.ts`; concerns; settings; audit log.
Desktop: left sidebar. Phone: tables become cards."

**Stage 5-UI — Polish and hand-over.**
"Polish motion, focus, empty/loading/error states, long Bangla text, 360 px on every screen. Check bundle: no heavy
library in `views/`, `ui/`, `lib/`. Run the Jest tests. Update `README.md` and `frontend/DESIGN_TOKENS.md`. Final
report: list of every route with its view file, loader data type and action fields; every test result; anything you
could not follow in the contract. Then export the ZIP."
