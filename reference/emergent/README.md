# Hikmah Tutors Rajshahi — Release 1 prototype (+ open Admin/Tutor panels)

Mobile-first, Bangla-first tuition board for a home-tutor media in Rajshahi. Built as a working prototype in
Emergent; the code is written so it can be moved to React Router + TypeScript + Tailwind on Cloudflare with a
SQL database later.

## Stack

- Frontend: React 19 + TypeScript (`.tsx`), React Router 7, Tailwind CSS 3 (classes only), TanStack Query.
- Backend: FastAPI (Python 3.11), Motor (MongoDB), Pillow with raqm for Bangla share cards.
- Database: MongoDB — one collection per table in the PRD (§6), string ids, flat documents.

## Folder map

```
shared/options.json        every choice list (keys, Bangla label, English label, alt spellings)
backend/
  server.py                FastAPI app: public API, guardian lead form, share preview routes
  deps.py                  db client + editable class/batch list (settings key class_levels)
  panel_api.py             /api/admin/* (owner) and /api/me* (tutor, demo via X-Tutor-Id) — NO AUTH YET
  logic/posts.py           Facebook/WhatsApp/contact-line/sheet-row post generator
  public_data.py           to_public_tuition — the ONLY whitelist for public tuition data
  seed.py / seed_data.json collections, indexes, synthetic seed data (idempotent)
  share_card.py            1200×630 per-tuition OG image (Pillow + raqm)
  logic/phone.py           phone normalisation (013–019, Bangla digits, +880)
  logic/text.py            Unicode NFC, Bangla↔Latin digits, search normalisation, taka formatting
  logic/fees.py            fee arithmetic (60% standard / 50% early)
  logic/transitions.py     allowed application status changes, public-tuition rule
  tests/test_logic.py      unit tests for the logic modules
frontend/src/
  api/client.ts            one typed function per endpoint (components never fetch)
  types.ts                 shared TypeScript types
  i18n/bn.json, en.json    all UI text; i18n/index.tsx provides t(), digits and language toggle
  lib/                     formatting helpers (digits, salary, time ago), phone check
  components/              Tailwind-only UI pieces (Header, Footer, TuitionCard, FilterSheet, FeeBox …)
  pages/                   Board, TuitionDetail, HowItWorks, Fees, Privacy, Terms, Contact, RequestTutor, SignIn
  pages/tutor/             Tutor panel (home, saved, applications, profile)
  pages/admin/             Admin panel (queue, Quick Pad, leads, tuitions + editor, applications, tutors, posts, settings)
```

## Environment variables (names only)

Backend (`backend/.env`): `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `PUBLIC_SITE_URL`
Frontend (`frontend/.env`): `REACT_APP_BACKEND_URL`

## Run locally

```
cd backend && pip install -r requirements.txt && uvicorn server:app --host 0.0.0.0 --port 8001
cd frontend && yarn install && yarn start
```

## Tests

```
cd backend && python -m pytest tests -q
```

## Public API (Stage 1)

- `GET /api/options` — choice lists
- `GET /api/settings/public` — contact WhatsApp / call / Facebook URL
- `GET /api/tuitions?area=&class_level=&subject=&medium=&tutor_gender=&mode=&salary_min=&salary_max=&days=&q=&sort=`
- `GET /api/tuitions/HTR-9001`, `GET /api/tuitions/HTR-9001/similar`
- `POST /api/leads` — guardian request form (rate-limited, honeypot field `website`)
- `GET /api/export/code` — ZIP of the whole project (no `.env`, `node_modules`, `.git`, caches) + `ENV_EXAMPLE.txt`, `EXPORT_INFO.txt`. Linked from the footer ("কোড ডাউনলোড"). Owner-only check comes in Stage 5.

## Security status

Admin and Tutor panels are intentionally OPEN (no login) in this build. Before going live add auth and an owner-only
guard on every `/api/admin/*` route and on `/api/export/code`; replace the `X-Tutor-Id` demo header with a real session.

System package needed for Bangla share images: `libraqm0` (apt).
