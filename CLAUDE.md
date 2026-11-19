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
enforced with SQLite triggers. Roles: Owner and Moderators (migration 0034, owner 2026-11-16). Owner-only pages call
`requireAdmin`; pages a moderator may open call `requireStaff(request, perm)` (switches in `app/lib/staff.ts`, Team page
`/admin/team`). A moderator sees only their own tuitions (`tuition_private.staff_id`): pass `scopeOf(viewer)` to every
tuition query in `admin.server.ts` (`mine()`/`inScope`). Try it in dev at `/dev/staff/1`.

## Never
- Use the Towfique HSC Cloudflare account. Hikmah has its own account (`account_id` in `wrangler.jsonc`). Run
  `--remote` commands and deploys in the app's Terminal panel, not Claude's Bash tool: in the desktop app, Bash reads a
  separate wrangler login that can belong to another account. Check `npx wrangler whoami` there first.
- Deploy before Google login has been tried with real Google credentials and `OWNER_EMAILS` is set on Cloudflare.
  `DEV_ADMIN` is for `npm run dev` only (`app/lib/auth.server.ts`).
- Show a guardian's phone number or full address anywhere a tutor or the public can see it. One exception: the tutor
  marked Selected on that tuition sees the guardian's phone and the address details (house, road, landmark) while
  the status lasts, each view logged (owner, 2026-11-04).
- Show a tutor's phone number, NID or verification document to guardians or the public. One exception: the Selected
  tutor's phone may go into the admin's WhatsApp summary for that guardian; shortlist summaries carry no phone.
  Voice clips: a guardian may hear one only when the owner shares that tutor's profile and the tutor agreed to share
  that clip with guardians (owner, 2026-11-09).
- Handle passwords, OAuth secrets or API keys. `.dev.vars` stays gitignored.
- Read or paste real tutor, guardian or payment data into this session, except the owner's operations sheet, which
  Claude may read in full to understand the business and plan the import (owner, 2026-11-01). Don't repeat personal
  details in replies; report counts and patterns. The owner may paste a tuition's "Copy for AI" pack (tutors by code,
  contacts cut out; `app/lib/ai-pack.server.ts`) into their own Gemini or Claude.ai chat (owner, 2026-11-08); keep
  names and contacts out of that pack.
- Put real data in the repo (code, seeds, tests, docs, commit messages; the repo is public) or in any third-party tool.
  Build and test with synthetic data (PRD Appendix D); the sheet import is a local script the owner runs.
- Write Bangla with PowerShell `Set-Content`/`Out-File` (corrupts UTF-8); use the Write/Edit tools.

## How the code is laid out
- `app/routes.ts` lists every route. Admin pages live under `/admin/*` and call `requireAdmin` in their loader.
- Registration documents (`tutor_documents`, files in R2 under `docs/`) are shown only to the admin and the tutor at
  `/docs/tutor/:code/:id`, each admin view logged; the form part is `app/components/JoinDocuments.tsx`.
- `app/lib/*.server.ts` = server-only (D1). `app/lib/lead.ts` = validation shared by phone and server.
- Choices (classes, areas, subjects…) are in `app/lib/options.ts`. The database stores the `key`; never change a key
  that is in use, only its label. Areas are Rajshahi, ordered by how often guardians ask. Areas the owner adds from
  the tuition form live in the `areas` table and join `AREAS` per request (root middleware, `app/lib/areas.server.ts`).
- Offline: `public/sw.js` (registered by `app/components/Offline.tsx`) serves saved pages with no net. A new private
  route must be added to its `NEVER` list if it must not be kept on the phone (documents, lookups, sign-in).
- Past guardian lookup (phone or HTR code) for Quick Pad and New tuition: `app/components/PastGuardian.tsx`.
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
- Tutor experience per level lives in `tutor_levels` (migration 0015, prefilled from the sheet's statements).
  `app/lib/profile.ts` scores profile completeness (Home ring, Profile progress, and the applicant order);
  `LevelSummary.tsx` shows one level to the owner. Section headings use `SectionCard.tsx`.
- Follow-ups and notes: `app/lib/followups.server.ts`, posted to `/admin/followups` from `app/components/FollowUps.tsx`
  (button, row, notes panel). Dhaka-time helpers and Bangla "ago" lines are in `app/lib/dhaka.ts`.
- Premium (migration 0019): rules, terms and WhatsApp texts in `app/lib/premium.ts`, steps in `premium.server.ts`
  (triggers hold the status order and fix a verified receipt). Pages `/me/premium` and `/admin/premium`. Cards are
  drawn on a canvas in `app/lib/cards.ts` and shared or saved by `ShareCard.tsx`.
- Media fee ledger (migration 0027): each tuition's fee terms (`fee_kind`, `fee_value`) and the append-only
  `fee_entries` (charge, payment, reduction, credit, reversal; balance = sum of `delta`). Rules in `app/lib/fee.ts`, ledger
  in `fee.server.ts`; the charge is written inside `moveApplication` on confirm and reversed on undo. Admin `/admin/money`,
  tutor card `app/components/FeeDue.tsx` on Home.
- Referral and wallet (migration 0028): `/r/<code>` links, credit rules in `app/lib/referral.ts`, ledger and credit in
  `app/lib/referral.server.ts` (call `creditReferral` after anything that can complete a referral), `/me/wallet`;
  wallet credit is spent on a fee from Money (`useWalletCredit` in `fee.server.ts`).
- Call list (`/admin/calls`, migration 0026): the owner phones tutors and rates them per level and per subject at each
  level, with notes; `app/lib/calls.server.ts`, shared rules in `app/lib/rating.ts`, "Ask to update" texts in
  `app/lib/ask.ts`. Ratings are private (audited as 'tutor_check'); tutors see only "HTR checked".
- Admission batch teachers (migration 0029): choices and form checks in `app/lib/batch.ts`, saves and the admin list in
  `batch.server.ts`; apply at `/batch/apply` (any Google account), review at `/admin/batches`.
- Owner's voice clips (migration 0033): pages that can have one in `app/lib/voice.ts`, uploads in `voice.server.ts`
  (`/admin/voice`), the floating player `app/components/VoiceNote.tsx` (mounted in `root.tsx`), audio at `/voice/:slot`.
  Short clips on parts of a page (`VOICE_SPOTS`, the `VoiceSpot` pill). Clips are made with ElevenLabs by
  `scripts/voice/make.mjs` from `scripts/voice/lines.mjs` (keys in `.dev.vars`, never printed; no owner name in clips).
- WhatsApp Inbox (migration 0035, owner 2026-11-18): YCloud webhook `/api/wa/webhook` → `app/lib/wa.server.ts` (events,
  sending, Inbox data, retention), the AI in `wa-ai.server.ts` (Haiku 5.5, phones/addresses cut out, lead upsert, handoff),
  its words in `wa-style.ts` (draft until the owner approves), alerts and crons in `alerts.server.ts` (Web Push with no
  payload, owner's WhatsApp template, nightly email). Pages `/admin/inbox` (switch `inbox`). Try it locally with
  `node scripts/wa/fake.mjs --url http://localhost:5174` on `npm run dev:synthetic`.
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
