# Decisions and departures from the PRD

`docs/PRD.md` (v1.0, 20 Sep 2026) is the product spec. Where this file differs, this file wins.
Newest first. Each entry: what was decided, by whom, and why.

## 2026-10-26

- **Code lives in a private GitHub repo, `hikmah-tutors`** (owner), so the owner, Claude and Imogen work from one
  place. Secrets never go in it (`.dev.vars`, `.env` and `imports/` stay gitignored).
- **The 21 Oct Emergent export is kept in `reference/emergent/`** (owner), read only, so collaborators can read it
  on GitHub. It is never run or deployed from this repo; see `reference/README.md` for what gets ported and what not.

## 2026-10-20

- **R1 is built in Emergent** (owner), from `docs/EMERGENT_PRD.md` (the R1 cut of the PRD and these decisions).
  The code comes back here as a ZIP. Emergent's stack is React + FastAPI + MongoDB, not the 2026-10-16 stack.
- **Cloudflare stays the home of the site** (owner, same day). The Emergent build is never hosted. Its screens,
  components and copy are moved into this repo (React Router v8 + D1); its FastAPI/MongoDB backend is the reference
  for logic and gets rewritten as loaders/actions, D1 migrations and SQLite triggers. Same reason as 2026-10-16:
  budget about $10/month. The Emergent PRD asks for TypeScript components, a single API client and flat data so the
  move is mostly copying.
- **Emergent does design and screens only from Stage 2** (owner, after Stage 1 came back). Google sign-in, the
  database, roles, security and every server rule are built here in Claude Code on Cloudflare. Emergent writes views
  as props-only components, React Router data-mode routes with mock loaders/actions, and Tailwind classes that work in
  v4, so they can be copied file by file (`docs/EMERGENT_PRD.md` Part 5). Its FastAPI backend stays at Stage 1 and is
  not ported; the logic is rewritten in TypeScript here.
- **Code download is owner-only** (Claude's recommendation, following the owner's footer request). The footer shows
  "সোর্স কোড (ZIP)" only to the signed-in owner. The server checks the role, logs the download, and leaves out
  `.env` files, `node_modules`, `.git` and uploads. A public download would hand out the backend and its settings.
  In the Emergent prototype there is no real login, so the button shows only in the Owner demo role and the endpoint
  stays reachable by URL; acceptable there because it holds only design code and synthetic data and is never the live
  site. The Cloudflare site gets the real owner check.
- **Synthetic data only in Emergent; never use Emergent's "Deploy"** (the live site will be on Cloudflare).
- Downloaded ZIPs go in `imports/` (gitignored).

## 2026-10-19

Context: competitor research in `docs/research/competitors-2026-10-19.md`.

- **Tutor sign-in: Google only** (owner), replacing PRD FR-AUTH-001 (email + password + Google). No passwords, no
  SMS OTP. The mobile number is still required in the profile and is checked by staff (WhatsApp/call). Settles O-11
  sign-in. Account email (password reset, verification) is no longer needed for tutors.
- **Guardian request form stays in R1: short, no account** (owner), confirming O-12. About five fields (name, mobile,
  area, class, subject) plus WhatsApp and call buttons. It creates a private lead only; the full address is taken by
  staff on the phone, never in the form.
- **Per-tuition share card** (owner), replacing PRD FR-PUB-011's generic preview. Each tuition link gets its own
  preview image built only from public fields (code, class, subject, area, salary, days). Never guardian or student
  details. None of the competitors do this.
- **Coverage: Rajshahi city and its surroundings only** (owner), as in the PRD. No district level for now.
- **Board is public; sign-in only to apply or save** (owner), confirming FR-PUB-007.
- **Signed-in tutors on phones get a bottom tab bar** (owner): বোর্ড · সেভ · আবেদন · প্রোফাইল. Visitors keep a
  simple top bar.
- **Later roadmap, not R1** (owner): poster/image generator for social posts (PRD roadmap 4), phone push
  notifications through Web Push (still needs channel approval per §11), one-page CV/profile PDF for tutors.
  A question-paper library was offered and not chosen.
- **No domain yet** (owner, 2026-10-19). Build on localhost; a domain is needed before Google sign-in goes live and
  before share cards can be tested on Facebook/WhatsApp.
- **Stack re-checked against Supabase + Vercel: Cloudflare stays** (asked by owner). Same cost reason as 2026-10-16;
  research found nothing Supabase would add that Workers, D1, R2 and Cron cannot cover for this size.

## 2026-10-16

- **Brand colours come from the logo** (`design/brand/`), replacing the PRD §16.2 palette values: forest `#09332A`,
  emerald `#11816D`, mango `#FED262` / `#F9C143`, cream `#FEFDF8` (tokens in `app/app.css`). Same rule as the PRD:
  mango is a fill or a highlight on forest, never text on a light background. The logo exists only as a ~900 KB PNG;
  a vector (SVG) version and a simplified small icon (favicon, app icon) are still needed.

- **Stack: React Router v8 + TypeScript + Tailwind v4 on Cloudflare Workers + D1** (owner), instead of the PRD's
  Next.js 16 + Supabase. Reason: budget about $10/month; the PRD's own estimate for its stack is about $45/month.
  Cloudflare's free plan allows commercial use, which also settles PRD §15.2 / O-09.
  Consequence: D1 has no Postgres Row Level Security. Access control lives in server code (every loader and action
  checks the viewer), append-only tables and allowed status transitions are enforced with SQLite triggers, and the
  PRD §18.1 security tests are run against the server routes.
- **Documents and photos: Cloudflare R2, private buckets** (fits the PRD default for documents; photos move there too).
- **Roles: Owner only for now** (owner). Coordinator and Verifier come later; keep role checks in one place so they
  can be added without touching every route.
- **Design: modern and bold, for young tutors, with a "wow" level of polish** (owner). No claymorphism. The UI should
  be something a university student tells friends about. Speed on ordinary phones still comes first (PRD §2.4, §16.5).
- **Release order follows the PRD: R1 first** (board, accounts, applications, staff tuition tools). Fees and packages
  (R3) are not built early, even though the old Anti-Gravity code has a fee engine; port it when R3 starts.
- **Old code** (`Documents/Hikmah Tutors Anti-Gravity/htr-website`, Next.js + Supabase, 20 Sep 2026): never connected
  to a database; several staff/money pages use mock data. Reusable later: `src/lib/fee-engine.ts` and its tests
  (295 tests pass), phone/text helpers, status labels.
- **Real personal data never goes to an AI tool** (PRD §0 rule 10, SEC-021). Build and test with synthetic data. The
  sheet import runs as a local script on the owner's computer.
