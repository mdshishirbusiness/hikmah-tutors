# Hikmah Tutors — working rules for Claude

Home-tutor media in Rajshahi. The owner takes guardian calls, posts tuitions, and matches tutors who apply.
Today everything lives in a Google Sheet ("Hikmah Tutors Mastersheet Tuition"); this app replaces it step by step.

## Spec and decisions
- `docs/PRD.md` is the product spec. Its R1/R2/R3 labels no longer fix the order (owner, 2026-11-03): propose each
  next step and get the owner's OK. Money features (fees, payments, Premium) come after the core is live.
- `docs/DECISIONS.md` records where we depart from it (stack, roles, design). It wins over the PRD. Add every new owner
  decision there in the same session.

## Stack (decided 2026-10-16, don't reopen without a new reason)
React Router v8 (framework mode, SSR) · TypeScript · Tailwind CSS v4 · Cloudflare Workers + D1 + R2 · Google login (planned).
Judge options by the quality of the result (speed, security, correctness, upkeep), not by how hard they are to build.
D1 has no Row Level Security: every loader/action checks the viewer; append-only tables and status transitions are
enforced with SQLite triggers. Roles: Owner only for now.

## Never
- Use the Towfique HSC Cloudflare account. Hikmah has its own account (`account_id` in `wrangler.jsonc`). Run
  `--remote` commands and deploys in the app's Terminal panel, not Claude's Bash tool: in the desktop app, Bash reads a
  separate wrangler login that can belong to another account. Check `npx wrangler whoami` there first.
- Deploy before Google login has been tried with real Google credentials and `OWNER_EMAILS` is set on Cloudflare.
  `DEV_ADMIN` is for `npm run dev` only (`app/lib/auth.server.ts`).
- Show a guardian's phone number or full address anywhere a tutor or the public can see it. One exception: the tutor
  marked Selected on that tuition sees the guardian's phone (never the address) while the status lasts, each view
  logged (owner, 2026-11-04).
- Show a tutor's phone number, NID or verification document to guardians or the public. One exception: the Selected
  tutor's phone may go into the admin's WhatsApp summary for that guardian; shortlist summaries carry no phone.
- Handle passwords, OAuth secrets or API keys. `.dev.vars` stays gitignored.
- Read or paste real tutor, guardian or payment data into this session, except the owner's operations sheet, which
  Claude may read in full to understand the business and plan the import (owner, 2026-11-01). Don't repeat personal
  details in replies; report counts and patterns.
- Put real data in the repo (code, seeds, tests, docs, commit messages; the repo is public) or in any third-party tool.
  Build and test with synthetic data (PRD Appendix D); the sheet import is a local script the owner runs.
- Write Bangla with PowerShell `Set-Content`/`Out-File` (corrupts UTF-8); use the Write/Edit tools.

## How the code is laid out
- `app/routes.ts` lists every route. Admin pages live under `/admin/*` and call `requireAdmin` in their loader.
- `app/lib/*.server.ts` = server-only (D1). `app/lib/lead.ts` = validation shared by phone and server.
- Choices (classes, areas, subjects…) are in `app/lib/options.ts`. The database stores the `key`; never change a key
  that is in use, only its label. Areas are Rajshahi, ordered by how often guardians ask.
- Quick Pad (`/admin/quick`): saves to `/api/leads`; with no internet the lead waits in localStorage
  (`app/lib/lead-queue.ts`) and is sent when the net is back. `client_id` makes retries safe (no duplicates).
- Tutor pages call `requireTutor` (`app/lib/me.server.ts`). To try them in `npm run dev`, open `/dev/tutor/<code>` for a
  synthetic test tutor (code ≥ 99000, created_via 'staff'); it never works for real tutors or in a production build.
  `/dev/new/<n>` signs in as a new Google account with no tutor record, to try registration (`/me/join`).
- Try and screenshot on invented data: `npm run synthetic:seed` once, then `npm run dev:synthetic` (launch config
  `hikmah-synthetic`, port 5174). The plain `npm run dev` uses `.wrangler/state`, which holds a copy of the real data.
- Request fields (class with Other, subjects, area search, time window, requirement picks, tutor wanted) live in
  `app/components/RequestFields.tsx` and `app/lib/request.ts`; Quick Pad, the guardian form and TuitionFields share
  them, and `leadFromForm` reads them.
- Admin pieces: `app/components/Applicants.tsx` (applicant table/board/detail), `charts.tsx` (no chart library),
  `TuitionFields.tsx` (new and edit tuition), `Avatar.tsx` (private photos via `/photos/tutor/:code`).
- Database changes: a new numbered file in `migrations/`, then `npm run db:migrate:local` (and `db:migrate` for the
  real database on the Hikmah account). Never edit a migration that has run on the real database.

## Checks before saying something works
`npx tsc -b` (after `npx react-router typegen`) with 0 errors, then try it in the browser at phone width (375 px).

## Language and design
- Short UI text is English on every page: navigation, titles, buttons, statuses, field labels, option labels, numbers
  and dates (English digits). Bangla (চলিত) only for longer helper sentences where it reads better, guardian-facing
  explanations, and what people type (owner, 2026-11-04). Option keys never change; Bangla names live in `alt`.
- Modern and bold, aimed at young tutors (university students), with stunning polish: the kind of site a student
  tells friends about (owner, 2026-10-16). NO claymorphism. Boldness comes from colour bands, large confident type
  (salary and area), crisp layout and short purposeful motion, not heavy effects. Palette from the logo
  (`design/brand/`, tokens in `app/app.css`): forest, emerald (`brand-*`), mango, cream. Mango is a fill behind dark
  text or a highlight on forest only, never text or thin lines on a light background.
- Speed on ordinary phones beats effects: CSS transitions first, no heavy animation library without a size check.
- Design inspiration from the owner goes in `design/inspiration/` with a note on what they like in each.
- Phone first: big tap targets (min 44 px), works at 375 px, respects reduced motion.
