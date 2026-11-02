# Decisions and departures from the PRD

`docs/PRD.md` (v1.0, 20 Sep 2026) is the product spec. Where this file differs, this file wins.
Newest first. Each entry: what was decided, by whom, and why.

## 2026-11-03

Context: a Q&A round on moving the sheet's tutors, tuitions and applications into D1.

- **Release labels no longer bind the order of work** (owner). Claude proposes each next step and the owner approves
  it. One rule stays (owner agreed): money features (fees, payments, Premium) come after the core is live and working.
- **Premium becomes a sign-up system on the website** (owner), replacing the Google Form pilot for new members. Until
  it is built every tutor is a Normal tutor. Tutor type (Normal/Premium) is visible only to the admin and the tutor.
- **A tutor code being given is the verification** (owner): the sheet's "Verified" only means the code was sent on
  WhatsApp, and every registrant is a real person. No "Verified" badge is shown. The site's own document check comes
  later and may bring a badge then.
- **No separate privacy notice before the import** (owner). Tutors still accept the privacy notice and terms on first
  sign-in, as decided on 2026-11-02.
- **The import order** (owner chose Claude's recommendation): rehearse locally → add-only import mode → review page →
  backup restore test on the empty real database → owner-only deploy on `workers.dev` → real import and online review
  → top-ups with the add-only mode → one cutover day, after which the Google Forms close and the sheet is a read-only
  archive. A full re-import would wipe the owner's review, so after the first real load only new rows are added.
- **Every registered tutor is imported** (owner), including flagged ones, which also go on the review list. The owner
  removed duplicate registrations from the sheet. Two tutors may share a phone number (a relative's or a
  friend's), so a shared number is not an error; applications from a shared number are not linked by phone.
- **Old "available" tuitions are closed** (owner): the sheet still shows many as available that are not. Codes 945
  and newer keep the sheet's status; older open ones import as closed. Open ones start hidden until reviewed. Old
  tuitions and unmatched applications use the import's best guess and need no review.
- **Backups** (owner chose Claude's recommendation): D1 Time Travel (always on), a restore test before the real load,
  and an export file before every import and weekly, kept on the owner's computer, never in the repo.
- **Photos and documents** (owner): an Apps Script in the owner's account copies each tutor's photo into a Drive
  folder as `T<code>.jpg`, and the document into a separate private folder as `T<code>-doc.jpg`. Photos are resized
  (~400 px) and uploaded to a private R2 bucket by a local script; only the admin and the tutor see them. Documents
  stay in Drive until verification is built.
- **Deploy first on `workers.dev`, buy the domain before tutors are invited** (owner). Google login runs in Testing
  mode with the owner as the only tester. Two owner emails go in `OWNER_EMAILS`, set on Cloudflare, not in the repo.
- **Claude may read the owner's sheet and Drive through the connected tools** (owner), within the 2026-11-01 rule:
  nothing personal goes into the repo, commit messages or replies.
- **How it was built** (Claude, owner asked for the remaining steps to be done unattended):
  - `scripts/import/load.mjs` replaces `load-local.mjs`: full load or `--add-only` top-up, `--local` or `--remote`,
    `--undo-batch <id>`. A full load on the real database is refused once any import exists. Every real run exports a
    backup to `imports/backups/` first.
  - The top-up matches tutors and tuitions by code and applications by tuition + phone + time (or the same tutor on
    that tuition), and adds children only under parents it created. A tuition already loaded keeps its status even if
    the sheet changes it: after the first load, status lives in the app.
  - `/admin/review` has three lists: flagged tutors (mark checked, or fix a broken email), open tuitions not on the
    board with what each still lacks, and sheet rows still held back.
  - Restore drill on the empty real database passed (2026-11-03): Time Travel restore removed a marker table, and a
    `wrangler d1 export` rebuilt all tables, triggers and migrations in a blank SQLite.
  - Photos: `migrations/0007` adds `tutors.photo_key`; bucket `hikmah-photos` (binding `PHOTOS`); `/photos/tutor/:code`
    serves a photo only to the admin or that tutor, `Cache-Control: private`. `scripts/tutor-files.gs` (Apps Script)
    copies photos and documents into Drive folders by code; `scripts/photos/upload.mjs` resizes to 400 px WebP with
    `sharp` (dev-only, never shipped to phones) and uploads. R2 is not yet enabled on the Hikmah account: the owner
    has to switch it on in the dashboard (done 2026-11-03).
  - The owner's steps for going live are in `docs/GO-LIVE.md`.
- **First real load done** (Claude, owner asked to proceed unattended): R2 enabled by the owner, bucket created,
  migration 0007 applied, then the full load from the 3 Nov CSVs into the real database (batch 1793655251), with a
  backup export first. Only top-ups from now on. Google sign-in was tried with the owner's real account on localhost.
  The live Google client and its secret stay with the owner, as decided on 2026-11-02, so the deploy waits for them.
- **Deployed on workers.dev** (owner asked Claude to do the Google side in Chrome): Claude added the second owner email
  as a test user, created the live client "Hikmah live" and downloaded its file, set `GOOGLE_CLIENT_ID` and
  `OWNER_EMAILS` on Cloudflare, and deployed. The client secret itself is set by the owner with
  `scripts/set-google-secret.mjs`, which reads Google's file and deletes it, so the secret is never typed or shown
  (Claude's own safety rules forbid entering a production secret, whoever allows it). Checked live: the board is public
  and empty, `/admin`, review and photos redirect to login, the design lab and hidden tuitions return 404.

## 2026-11-02

- **The ticket card is built into the real board** (owner asked to build it; details by Claude):
  - Classes are now Play–KG, Class 1–12, SSC 27/28, HSC 27/28, Admission, O/A Level, Other (English labels). The old
    range keys (`c1-5`, `c6-8`, `ssc`, `hsc`) stay readable as `legacy` so imported rows don't break, but they are no
    longer offered, and the admin editor will not publish a tuition until its class is picked from the new list. Add
    the next SSC/HSC batch to `CLASS_LEVELS` each year.
  - The sheet import maps "SSC 27" to `ssc-27` and "Class 9" to `class-9`. A batch with no year, or a year that's not
    listed, imports as Other with a review note instead of being guessed.
  - `migrations/0006` adds `session_minutes` (1, 1.5, 2, 2.5 or 3 hours) and `time_of_day` (morning … night,
    flexible) to tuitions. Both are optional. The card leaves out whatever is unknown.
  - The applicant count is live applications only (submitted through confirmed), as a number. Who applied never
    reaches a public page.
  - Until the apply sheet is built, the card's Apply opens the detail page. Available but not accepting = grey stub
    with "Paused". Share and distance are off the card; share stays on the detail page.
- **English is allowed in the UI** (owner). Tutors are university students and read English well, so not every word
  has to be Bangla. Use whichever reads better and looks more professional.
- **A tuition's class is one class or one exam batch, never a range** (owner): Class 9, Class 10, SSC 27, SSC 28 (and
  the same for HSC). `CLASS_LEVELS` in `app/lib/options.ts` (ranges like ৯ম–১০ম) must change before the board goes live.
- **Board design, round 1 rejected** (owner): five concepts at `/design` (earnings, match, ticket, poster, chat). The
  earnings one was too dark; poster and chat are not to be used as inspiration. Round 2: three light card styles that
  share one detail, apply and done flow. Design is confirmed first, functionality after.
- **Board card: the sideways ticket goes forward** (owner, round 2; the colour-band card was rejected). Refinements the
  owner asked for: no barcode; each subject has its own colour, the same everywhere; the guardian's short English
  requirement line ("RU science faculty, patient female tutor needed") shows on the card.
- **Ticket card details** (owner, agreed in a Q&A round):
  - Tutor gender is a solid chip in English beside the class: Female Tutor (deep rose), Male Tutor (deep blue),
    Male/Female Tutor when there is no preference (forest).
  - Short labels are English: class (SSC 27), medium (Bangla medium), gender, badges and statuses (New, Apply,
    Applied, Processing, Submitted, Under review, Shortlisted, Demo class, Confirmed). Sentences stay Bangla.
  - The card shows how many active applications a tuition has, to everyone ("এখনো কেউ আবেদন করেনি" at zero).
  - The stub has an Apply button that opens the apply sheet over the board (sign-in first, then back to the same
    sheet). Save/bookmark lives on the detail page only. After applying, the stub shows Applied.
  - Distance and the fit count are shown only to a signed-in tutor; the per-class rate stays.
  - Processing tuitions stay on the board with a grey stub and no Apply; booked ones leave the board.
  - Later in the same round (owner): the fit count ("৪/৪ মিল") moves off the card to the detail page only; the stub
    carries salary, per-class rate and the schedule (days, session length, time of day) above Apply; "New" sits on
    the stub beside the code; applicants show as a small stack of anonymous circles with the count. The guardian's
    requirement line sits in the left column in bold forest text with a green bar (a tinted strip at the bottom
    was tried and read poorly).
  - **Per-class rate counts a month as 4 weeks** (owner): 3 days a week = 12 classes, 4 = 16, 5 = 20.
  - Tuitions need a **session length** (e.g. ১.৫ ঘণ্টা), which the data model does not have yet.
- **Tutor profiles are private at launch** (owner). Only the admin can see them: no public tutor directory, and guardians
  don't see profiles. A signed-in tutor sees their own profile, never the admin's notes (owner).
- **The admin tells guardians about a tutor by phone or WhatsApp** (owner). No guardian login at first; a controlled
  share link can come later.
- **Old applicants who match no tutor stay as admin-only history** (owner), linked if that tutor later signs in with a
  matching number.
- **Phase 1 tables** (owner approved Claude's structure; `migrations/0003`). Simpler than PRD §9 for now: `users` holds
  the role with owner and tutor only, and `placements` adds a `selected` stage because the sheet's Booked proves nothing
  more. Tuition subjects stay comma-separated. Payments, documents, verification and notifications wait for their releases.
- **Google sign-in lives in its own `Hikmah Tutors` Google Cloud project under the owner's main Google account** (owner),
  separate from the Towfique HSC project. That account's email is the support address tutors can see on Google's consent
  screen.
- **The owner gave Claude the local Google client file to set up `.dev.vars`** (owner, one exception to "never handle
  OAuth secrets"). That secret is for local use only; the live site gets a new one, set by the owner on Cloudflare.
- **Google sign-in is written directly on the Worker, with no auth library** (Claude): authorization code with PKCE, state
  and nonce, sessions stored hashed in D1, 30-day cookie. It is small, and adds no package to a security path. Admins come
  only from `OWNER_EMAILS`. The mobile-number claim for tutors with no email match is not built yet; they see a message.
- **Import status rules** (Claude). A selected applicant imports as Shortlisted with a `selected` placement, others on a
  booked or cancelled tuition as Opportunity closed. The sheet has no tuition medium, so it stays blank until review.
  Rows needing review, and the applications and placements that depend on them, wait in `import_rows`.
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
