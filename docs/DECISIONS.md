# Decisions and departures from the PRD

`docs/PRD.md` (v1.0, 20 Sep 2026) is the product spec. Where this file differs, this file wins.
Newest first. Each entry: what was decided, by whom, and why.

## 2026-11-02

- **Tutor profiles are private at launch** (owner). Only the admin can see them: no public tutor directory, and guardians
  don't see profiles. A signed-in tutor sees their own profile, never the admin's notes (owner).
- **The admin tells guardians about a tutor by phone or WhatsApp** (owner). No guardian login at first; a controlled
  share link can come later.
- **Old applicants who match no tutor stay as admin-only history** (owner), linked if that tutor later signs in with a
  matching number.
- **Phase 1 tables** (owner approved Claude's structure; `migrations/0003`). Simpler than PRD §9 for now: `users` holds
  the role with owner and tutor only, and `placements` adds a `selected` stage because the sheet's Booked proves nothing
  more. Tuition subjects stay comma-separated. Payments, documents, verification and notifications wait for their releases.
- **Not imported** (Claude): date of birth, blood group, the "share your situation" text, ID document links and the
  Verified label. Imported tuitions start hidden with empty public requirements, so each needs reviewed wording.
- **Wrangler logs in with the Hikmah email** (owner), replacing the plan for one login across both accounts, which
  could not reach Hikmah from Wrangler. The Towfique HSC account stays as it is; switching to that work needs a new
  `wrangler login`. Hikmah's `account_id` in `wrangler.jsonc` keeps this project on its own account.
- **The real `hikmah` D1 database is in the APAC region** (Claude), the closest to Rajshahi. It has the tables and no data.
- **An imported tutor signs in with Google and is linked by email, with no staff approval** (owner), replacing the
  claim step in PRD FR-AUTH-004 for this case. The Registration form collected the Google account's email automatically,
  so the address is not typed and proves the account. The link needs an exact match to one record. An email on more than
  one record, or a tutor with no match, goes to staff review; the mobile-number claim stays for no match, with the same
  reply whether or not a record exists. On first sign-in the tutor checks their details, confirms availability and
  accepts the privacy notice and terms. The profile stays private to the tutor and staff.

## 2026-11-01

- **Port the Emergent screens into the Cloudflare app, starting with the public board** (owner). `/` is now the board
  and `/tuitions/:code` the detail page, on React Router + D1, from the 21 Oct export. The 20 Oct ZIP is older and is
  not used.
- **Hikmah gets its own Cloudflare account, never the Towfique HSC one** (owner, restated). Work stays on the local
  database until that account exists.
- **`tuitions` holds only public fields** (Claude). Guardian details stay in `leads`, so a public query cannot reach
  them by mistake, and public queries name their columns.
- **Left out until what they depend on is built** (Claude): applying and saving (need Google login; the button says
  applying is coming soon), WhatsApp/call buttons (no public contact number decided yet), the how-it-works and fee pages.
- **Status transition triggers for `tuitions` come with the admin tuition editor** (Claude). Nothing writes tuitions
  yet except the local synthetic seed (`db/seed-local-tuitions.sql`).
- **Claude may read the owner's operations sheet in full, to understand the business and plan the import** (owner),
  replacing PRD §14 "real data never enters an AI builder" for this sheet only. Real data still never goes in the repo, and the import stays a local script the
  owner runs with a reviewed dry run.

## 2026-10-28

Context: the owner wants a "Pro" prepaid option for tutors (PRD §7.10, O-05). Piloted on a Google Form + Sheet first;
built into the site only in R3, as PRD Stage 4 says. Rules decided so far:

- **Price: 50% of the tutor's minimum expected salary** (owner), e.g. minimum ৳3,000 pays ৳1,500. Replaces fixed
  tiers for Pro.
- **Delivered = the tutor has received the first month's salary** of a tuition HTR gave (owner), replacing the PRD
  default "the placement has joined".
- **Window: 90 days from the day HTR verifies the payment** (owner).
- **No refund can be asked for before the 90 days end** (owner, strict term shown before payment).
- The rest were proposed by Claude and accepted by the owner the same day:
  - **The deposit is the media fee paid in advance, not an extra charge.** On a tuition at or above the tutor's
    minimum, the tutor pays only 50% of the real salary minus the deposit, within 7 days of the first salary. A
    tuition below the minimum may be refused with no strike; if accepted, the extra deposit is refunded after the
    first salary.
  - **Pro replaces Gold/Platinum/Diamond** (PRD §7.10 table), so there is one prepaid option.
  - **Strikes.** One strike each for: not answering HTR within 12 hours (9 a.m.–10 p.m.), refusing a tuition that
    meets the tutor's own area/class/subject/minimum salary, wrong or stale profile details, not telling HTR about a
    tuition found elsewhere. Each strike is sent in writing on WhatsApp. **3 strikes end Pro with a 50% refund.**
  - **Trial failed through the tutor's fault** (no-show without 6 hours' notice, over 30 minutes late) = 2 strikes,
    Pro continues. Misconduct or false qualifications end Pro with no refund. A guardian simply choosing someone else
    is not a fault.
  - **Leaving a joined tuition before the first salary** counts as delivered, unless the reason is the guardian's
    misconduct or safety. A guardian ending it before paying the first salary counts as not delivered.
  - **At day 90 HTR contacts the tutor:** full refund, or 90 more days with the deposit kept. Fewer than 3 strikes =
    full refund, to the same bKash/Nagad number, within 7 days, HTR pays the sending charge. If the tutor has joined
    but the first salary falls after day 90, wait for it.
  - **Only exception to "no refund before 90 days":** if HTR rejects the tutor or stops Pro, refund in full at once.
  - **Pilot cap: 10 active Pro tutors**; later no more than half the tuitions HTR gets in a month.
- **Tutor-facing name is "Premium"; strikes are called হলুদ কার্ড, misconduct is a লাল কার্ড** (owner asked for a word
  people understand; Claude proposed the football cards). **Premium gives priority only among equally suitable
  tutors**, never over a clearly better one, so guardians still get the best match.
- **Only registered tutors can buy Premium**; the form asks for the Registration Code and the registered mobile (to
  cross-check the code), not the profile again (owner).
- **Premium form asks what the tutor is best at now** (owner, 2026-10-29): up to 3 subjects and 3 classes, mediums,
  years of tutoring. Optional uploads, stored in the owner's Drive and seen only by HTR: a 3–5 minute **voice note**
  on how they teach (audio, 10 MB), and **their own sheets, notes or exam papers** (PDF/image/Document, up to 5,
  student names and numbers covered). Whether guardians may ever hear or see these is not decided and would need
  the tutor's consent. In the app this belongs to the R2 profile/verification work, not earlier.
- **Apply first, pay after selection** (owner chose Claude's recommendation, 2026-10-29). The Premium form takes no
  money; HTR answers within 24 hours on WhatsApp, and selected tutors pay and fill a separate "পেমেন্ট নিশ্চিতকরণ"
  form. Reason: with 10 places, taking money from tutors who are then turned down means refunds and lost trust.
  Payment goes to the personal number 01845359242 by Send Money or Cash In. Help for tutors: admin WhatsApp
  01522136687, shown on every page.
- **Terms are written as promises on both sides, without the card wording** (owner found হলুদ/লাল কার্ড hard for
  newcomers; 2026-10-29). Rules are unchanged except that HTR first talks to the tutor before counting a problem.
  Few, plain emoji.

## 2026-10-26

- **Code lives in a GitHub repo, `mdshishirbusiness/hikmah-tutors`** (owner), so Claude Code and Emergent work from
  one place instead of passing ZIPs. Public for now (owner); nothing private may be committed: `.dev.vars`, `.env` and
  `imports/` stay gitignored, and only synthetic data goes in.
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
