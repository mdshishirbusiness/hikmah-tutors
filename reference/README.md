# Reference code (read only)

Code kept here to read and port from. It is never built, run or deployed from this repo.

## `emergent/` — Emergent export, 21 Oct 2026

React 19 (CRA) + FastAPI + MongoDB, all R1 screens with synthetic data and no login. Unpacked from
`hikmah-tutors-code-2026-10-21.zip` without changes, except the duplicate `memory/EMERGENT_PRD.md` (same as
`docs/EMERGENT_PRD.md`) and empty placeholder files.

How to use it (see `docs/DECISIONS.md`, 2026-10-20):
- Screens, components and Bangla copy (`frontend/src/pages`, `components`, `i18n`) are ported into `app/` as
  React Router v8 routes with loaders/actions. The export did not follow the Part 5 copy-paste contract, so each page
  is split into a route (data) and a view (JSX) while porting.
- `backend/` (especially `panel_api.py`, `logic/`, `public_data.py`) is the reference for the rules; it is rewritten
  as TypeScript loaders/actions, D1 migrations and SQLite triggers. Never port its open `/api/admin/*` endpoints as they
  are: they have no login.
- Do not copy: the Emergent script in `frontend/public/index.html`, `components/ui` (shadcn), TanStack Query, axios,
  sonner, Radix, framer-motion.
