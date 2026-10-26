# Hikmah Tutors Rajshahi (HTR) — Website Product Requirements Document

| | |
|---|---|
| **Version** | 1.0 — draft for owner sign-off |
| **Date** | 20 September 2026 |
| **Product** | HTR tuition-opportunity and placement website — Bangla-first, English available |
| **Readers** | Owner (approval) · AI website builder / developers (build) · Bangladeshi legal reviewer (privacy notice, terms, fee wording) |
| **Language** | English. Tutor-facing fee wording, status labels and message templates are given in Bangla and English. |
| **Facts checked** | Vendor pricing and limits, framework support status and the data-protection legal landscape were checked on 20 September 2026 (see §22). They change. Re-verify before buying, building on or launching. |

---

## Contents

0. Builder brief (read this first)
1. Purpose, scope and approval boundary
2. Product overview
3. Confirmed inputs and reconciliation with earlier decisions
4. Release plan
5. Public website and tutor experience
6. Staff experience
7. Business rules: fees, payments, dues and packages
8. Status models and permissions
9. Data model
10. Screens and navigation
11. Notifications and messaging
12. Search, language and data quality
13. Privacy, security and document handling
14. Data migration
15. Architecture, hosting, capacity and cost
16. Design system
17. Analytics and success measures
18. Acceptance criteria and test plan
19. Risks and mitigations
20. Open decisions for the owner
21. Out of scope and later roadmap
22. Sources and evidence limits

Appendices: A Glossary and Bangla labels · B Fee test vectors · C Post generator specification · D Synthetic seed data · E Inputs still needed from the owner · F Staged builder prompts

---

## Conventions

- **Status tags.** `[C]` confirmed by the owner. `[A]` assumption or recommendation: the builder implements it as the default and the owner may change it. `[O]` open decision: the builder must not guess; implement behind a setting or leave out as stated.
- **Priority.** MUST / SHOULD / COULD. **Release.** R1, R2, R3 (§4).
- **IDs.** FR = functional requirement, BR = business rule, SEC = security or privacy requirement, DATA = data rule, T = test.
- **Money.** Bangladeshi taka, written ৳. All amounts are whole taka stored as integers.
- **Time.** Deadlines use Bangladesh time (Asia/Dhaka, UTC+6). Store UTC; display local time.
- **Evidence.** Numbers describing the business are the owner's figures. Numbers describing outcomes are targets, not results. No baseline in this document has been measured.

---

## 0. Builder brief (read this first)

**What to build.** A mobile-first, Bangla-first website where tutors in Rajshahi find tuition opportunities, keep one profile, apply, and track their applications, and where a small HTR team posts tuitions, shortlists tutors, arranges trials, confirms placements and records fees. Guardians have no accounts: they keep contacting HTR by call or WhatsApp.

**Who pays for what.** Tutors pay HTR a one-time placement ("media") fee based on the first month's salary. There is no registration or advance fee on the standard route, and no subscription or recurring commission. Optional prepaid packages (Gold, Platinum, Diamond) are deposits credited against that fee (§7.10). Payments are made outside the website (bKash, Nagad, Rocket) and verified manually by staff.

**Non-negotiables** (each is tested in §18):

1. **Private by default.** Guardian contact details, exact home addresses, student details, private notes, tutor documents and payment evidence never appear in public pages, public API responses, share previews, logs, analytics events or URLs.
2. **Enforce access in the database.** Use Postgres Row Level Security and column-limited views. Hiding a button is not access control. Server-only credentials (the service role) never reach the browser.
3. **Staff control decisions.** Tutors can apply, save, withdraw and report a concern. Only staff can shortlist, select, confirm, verify, or mark anything paid.
4. **One fee engine.** All fee arithmetic lives in one server-side module, uses integer taka, and passes the vectors in Appendix B before any fee screen ships.
5. **Ledger, not overwrite.** Money records are append-only. Corrections are new entries with a reason.
6. **Documents stay private.** Identity and education documents live in a private store. Every view checks permission, uses a short-lived link and writes an audit entry with a reason.
7. **Honest content.** No invented statistics, placement counts, reviews, testimonials, countdowns or "X people viewing" indicators. Stock or generated people are never presented as real tutors.
8. **Words, not just colour.** Every status is a text label in Bangla and English. Colour only reinforces it.
9. **Release in stages.** Build R1, stop and test, then R2, then R3 (§4). Do not implement later-release features early. Use feature flags.
10. **Synthetic data only while building.** Real tutor, guardian or payment data must not be pasted into an AI builder, prompt, issue tracker or any third-party tool. Use Appendix D and generated fixtures.

**Technology defaults** `[A]` (reasons in §15): TypeScript; Next.js 16.x App Router with server-rendered public pages; Supabase (Postgres, Auth, RLS, Storage); Tailwind CSS; a separate private object store for identity documents; custom SMTP for account email; source in GitHub. **Do not use Next.js 14 (end of life).** Hosting must be on a plan that permits commercial use (§15.2).

**Where to look.** Fee rules: §7 and Appendix B. Statuses and permissions: §8. Tables and access rules: §9. Screens: §10. Tests: §18. Everything tagged `[O]` is listed in §20 with the default to implement now. Suggested staged prompts are in Appendix F.

---

## 1. Purpose, scope and approval boundary

### 1.1 Purpose
This document specifies the first full version (V1) of the HTR website so that an AI website builder or a development team can build it without access to earlier conversations. It records confirmed decisions, marks recommendations and assumptions, and lists what still needs the owner's decision.

### 1.2 In scope (V1 = R1 + R2 + R3, delivered in stages)
Tutor accounts and profiles; public tuition board; applying and tracking; staff tuition and guardian management; shortlisting, trials, confirmation and joining; verification of contact, identity and education; fee terms, the two placement-fee arrangements, manual payment review and the ledger; prepaid packages; Bangla/English interface; privacy controls; a reviewed one-time import of existing records; operational exports; and in-site notifications with staff-assisted WhatsApp messages.

### 1.3 Out of scope
See §21. In short: guardian accounts, a public tutor directory, native mobile apps, online payment gateways, automated messaging APIs, live classes, subscriptions, nationwide rollout, AI-driven tutor selection and continuous two-way spreadsheet synchronisation.

### 1.4 Approval boundary
Approving this PRD authorises building the software it describes. It does **not** by itself authorise: importing real personal records; connecting the owner's Google, Meta, payment or messaging accounts; buying paid plans; sending messages to real tutors or guardians; or publishing any tutor's information. Each of those needs a separate owner decision (§14, §15, §20).

### 1.5 Evidence rules
- Facts about vendors, laws and frameworks carry the date checked (§22).
- Capacity numbers in §15 are illustrations from stated assumptions, not measurements.
- Competitor research informs patterns only. Do not copy branding, layouts, text or unverified claims.

---

## 2. Product overview

### 2.1 Positioning `[C]`
> **A Rajshahi-focused tuition opportunity and placement service that helps tutors find relevant work, understand their application progress, and know exactly what fees they owe.**

The advantage is local relevance and operational clarity, not feature count or the size of a national directory. Salary, area, class, subject, schedule and placement terms are visible early. The public home page is the tuition board, not a long promotional page. The experience should match or exceed the best existing Bangladeshi tuition sites while being simpler and more transparent about fees.

### 2.2 Business model `[C]`
- HTR connects guardians with tutors. Guardians continue to contact HTR by phone, WhatsApp or Facebook.
- The tutor pays a **one-time placement fee ("media fee")** calculated on the first month's salary. From the second month the tutor keeps 100% of the salary.
- Two alternative arrangements: **Standard** (60% in two instalments) and **Early-payment** (50% within seven days of joining). Details in §7.
- No registration fee and no advance fee on the standard route. Optional **prepaid packages** are deposits credited against the placement fee (§7.10).
- Payments happen outside the site through bKash, Nagad or Rocket and are verified manually. There is no payment gateway in V1.
- HTR's minimum tuition salary is ৳2,000 per month.

### 2.3 Users and roles
| Role | Who | Access |
|---|---|---|
| Visitor | Anyone | Public tuition board and information pages |
| Tutor | Registered tutor (primary user) | Own profile, applications, placements, fees, notifications |
| Coordinator | HTR staff who shortlist and arrange trials | Tuitions, guardian records, applications, tutor directory. No identity documents, no payments |
| Verifier `[A]` | Staff who review documents | Verification queue and documents (with a recorded reason). No guardian data, no payments |
| Owner | Business owner | Everything, including payments, fee rules, exports, roles, audit log |
| Guardian | Parent or guardian | **No account.** Contacts HTR by call, WhatsApp or the request form (§5.6) |
| System | Scheduled jobs | Reminders, task creation, retention, backups |

Typical tutor `[A]`: a university student or recent graduate in or around Rajshahi (Rajshahi University, RUET, medical college, general Honours or Masters) or a completed graduate or teacher; usually on a phone with mobile data; currently applies by messaging HTR on WhatsApp or Facebook; reads Bangla first.

### 2.4 Product principles
1. **Tuitions first.** Show real opportunities before anything else.
2. **Fees are never a surprise.** Show the terms and the arithmetic before the tutor applies and again at confirmation.
3. **Private by default.** Collect the least sensitive evidence that works; share only what a purpose needs.
4. **Staff-controlled status.** Tutors see status clearly but cannot change decisions.
5. **One record, many outputs.** A tuition is entered once; the site, posts and messages derive from it.
6. **Bangla first, English equal in meaning.** Fee and status meaning is identical in both languages.
7. **Fast on ordinary phones.** Small pages, compressed images, no heavy effects.
8. **Honest.** No fake numbers, reviews or urgency.

---

## 3. Confirmed inputs and reconciliation with earlier decisions

### 3.1 Inputs
| # | Input | Status | Notes |
|---|---|---|---|
| I-01 | Brand **Hikmah Tutors Rajshahi (HTR)**, serving Rajshahi and surrounding areas | `[C]` | |
| I-02 | Primary audience: tutors seeking tuition. Secondary: staff managing guardians, applications, placements and collections | `[C]` | Guardian intake and admin support the tutor flow |
| I-03 | Tutors create profiles, apply and track applications | `[C]` | Requires tutor accounts (see R-01) |
| I-04 | Guardians keep using calls and messages. No guardian account, dashboard or self-service hiring marketplace in V1 | `[C]` | A no-account request form is proposed in §5.6 |
| I-05 | About **1,500** tutor records today; **2,000 profiles** is the planning scenario | `[C]` | Neither figure has been verified against the spreadsheet by the author of this PRD |
| I-06 | Tutor photos appear in relevant staff tables | `[C]` | Display and storage are separate concerns (§13, §15.3) |
| I-07 | Keep the existing logo initially; modest colour adjustment allowed | `[C]` | The logo has not been reviewed for this PRD. Palette fit is provisional (§16.2) |
| I-08 | Smooth animation and high-quality design; one palette for the website and for social posts | `[C]` | Reduced-motion and slow phones take priority (§16.5) |
| I-09 | Inspiration: Porao, Tutor Provide, Caretutors and established global job marketplaces; adapt useful patterns only | `[C]` | Also review AHZ Rajshahi as the closest local comparator `[A]` |
| I-10 | Primarily Bangla with an English toggle | `[C]` | |
| I-11 | Feel: modern and bold, energetic, aimed at younger tutors | `[C]` | §16.2 reconciles this with a trust-first palette |
| I-12 | Fee wording in Bangla (verbatim in §7.2) | `[C]` | Two alternative arrangements, not cumulative |
| I-13 | Fee is one-time, on the first month's salary; tutor keeps 100% afterwards | `[C]` | |
| I-14 | The media fee first falls due after the **second trial class** | `[C]` | Reconciled with the wording's "after confirmation" in §7.4 `[A]` |
| I-15 | Payments verified manually (bKash, Nagad, Rocket to the same number); no gateway | `[C]` | |
| I-16 | Prepaid packages **Gold ৳1,000 / Platinum ৳3,000 / Diamond ৳5,000** promising 1 / 2 / 3 tuitions within 3 / 5 / 6 months, with a refund option if not delivered; the deposit is credited against the media fee | `[C]` | Ships in V1. Detailed rules are open (§7.10, §20) |
| I-17 | Minimum tuition salary ৳2,000 per month | `[C]` | |
| I-18 | Tuition codes look like **HTR-330** | `[C]` | |
| I-19 | Each tuition offer is currently published as four outputs with fixed templates: Facebook post, WhatsApp post, contact-save line, Google Sheet row | `[C]` | Text generation moves into the site in R1 (§6.8, Appendix C) |
| I-20 | Stack: Next.js and Supabase, built with an AI website builder, code in GitHub, deployed to a host | `[C]` | Version and hosting corrections in R-03 |
| I-21 | Target tutors: Rajshahi University, RUET and medical-college students; Honours/Masters students; completed graduates and teachers; all in Rajshahi | `[C]` | |
| I-22 | Current registration data: photo, academic details, interested classes, subjects/skills, email, phone; a subset can teach online | `[C]` | Online capability is a profile flag. Live classes are out of scope |

### 3.2 Where this PRD departs from earlier decisions (owner to confirm)
| # | Earlier decision | This PRD's default | Why |
|---|---|---|---|
| R-01 | A full login system is unnecessary; protect only the admin panel | **Tutor accounts are in scope** | The confirmed direction is that tutors create profiles, apply and track applications. That needs accounts |
| R-02 | Publish the 1,000+ migrated tutor records on the public site immediately after migration, with no re-confirmation step | **No public tutor profiles at launch. Migrated records are staff-only until each tutor claims their profile and consents** | Consent and data-protection exposure (§13.6); guardians contacting tutors directly would bypass placement fees; stale records harm trust |
| R-03 | Next.js 14 deployed to Vercel | **Next.js 16.x, and a hosting plan that permits commercial use** | Next.js 14 is end of life; Vercel's free Hobby plan is restricted to non-commercial use (§15.2) |
| R-04 | Host images on Cloudinary; also move profiles and documents to Supabase Storage | **Private photo bucket; separate private document store; Cloudinary only for public brand images `[O]`** | Photos and documents are personal data and must be permission-checked (§15.3) |
| R-05 | Media fee due after the second trial class | Keep it, and define **Confirmed** as that event | Keeps the ledger aligned with real collection (§7.4) |
| R-06 | Guardian post form as a supporting flow | **Keep it as a no-account request form** that creates a private lead | Matches the "no guardian accounts" direction and reduces manual entry (§5.6) |
| R-07 | Live-class batches (pilot for classes 3–5) | **Out of V1.** Only the "can teach online" flag ships | Separate product line (§21) |

---

## 4. Release plan

The build is staged so the highest-risk parts (documents and money) come last, on top of a tested foundation. R1 + R2 + R3 together are V1.

| Release | Theme | Contents | Exit criteria |
|---|---|---|---|
| **R0** (no code) | Preparation | Restrict the sharing settings of the operations worksheet and of the Drive folders that hold personal data; legal review of privacy notice, tutor terms and fee wording; decide the §20 items needed by R1; choose the hosting plan; supply the Appendix E inputs; prepare synthetic data | Owner sign-off on §20 items due by R1; legal review booked |
| **R1** | Board, accounts, applications | Public tuition board and detail pages; tutor sign-up and sign-in, profile, photo, claim of an imported record; apply, save, withdraw and track; fee-terms display and acceptance record; guardian request form. Staff: tuitions with public/private separation, guardian and lead records, application inbox, shortlisting, staff-entered applications, tutor directory, basic work queue, text post generator, WhatsApp message links, in-site notifications, audit log, admin settings. Reviewed import of active tuitions and tutor profiles (no documents) | §18.1 security tests pass; backups running and a restore tested; Bangla and English copy reviewed; performance and accessibility checks pass; privacy notice and tutor terms published |
| **R2** | Verification and placement | Private document upload; contact, identity and education verification; two trial records per application; confirmation, joining, cancellation and replacement records; confirmation-letter record; historical tuition import for reference | Document-access tests pass; retention job tested; legal sign-off on document handling |
| **R3** | Money | Fee schedule and ledger; payment submission and review; dues reminders and overdue state; first-salary check-ins; prepaid packages (purchase, balance, delivery counter, refunds, liabilities view); collections reports. **Run in shadow mode for one full fee cycle** (staff record everything in both the site and the existing sheet, then reconcile) before the site becomes the system of record | Appendix B vectors pass; reconciliation shows no unexplained difference; owner accepts the §20 policies due by R3 |
| **Later** | Improvements | §21 | |

**Feature flags.** Each release sits behind flags (`docs_enabled`, `fees_enabled`, `packages_enabled`, `wa_links_enabled`) so unfinished parts cannot appear in production.

**Go-live checklist (before any real data is loaded).**
- The operations worksheet and any Drive folder with personal data are restricted to named people.
- The hosting plan permits commercial use; staging and production are separate projects.
- Backups are configured **and a restore has been tested**.
- The custom SMTP domain is verified (SPF and DKIM).
- The privacy notice and tutor terms have been reviewed by a Bangladeshi lawyer.
- Staff accounts are created by the owner with multi-factor authentication.
- The §18.1 tests pass against the production configuration.

---

## 5. Public website and tutor experience

### 5.1 Public tuition board (R1)
- **FR-PUB-001 (MUST).** The home page is the tuition board: search and filters at the top, newest opportunities first, and a short "how HTR works" line that links to the fees page. No long promotional page.
- **FR-PUB-002 (MUST).** Each card shows the tuition code (HTR-330), class and subject(s), area, salary and period, days per week, mode (home or online), posted date, availability, and any stated tutor requirement such as gender. Cards must be scannable on a 360 px-wide phone.
- **FR-PUB-003 (MUST).** Salary types: **fixed** (amount and period), **negotiable** (shown as "৳ আলোচনা সাপেক্ষে" / "Negotiable"), and **not specified** (shown as "Not specified"). Never store or display an unknown salary as zero. Monthly and fixed-course salaries are never mixed in one sort or range filter.
- **FR-PUB-004 (MUST).** Filters: area (Bangla and English names and aliases), class level, subject, curriculum, mode, salary range (fixed monthly salaries only), days per week, tutor requirement. Filters combine, appear in the URL so a filtered view can be shared and restored by the browser's back button, and never reset silently.
- **FR-PUB-005 (SHOULD).** Sort: newest (default) and salary high-to-low (fixed monthly only).
- **FR-PUB-006 (MUST).** Search accepts Bangla and English, common alternative spellings, and either digit system (§12).
- **FR-PUB-007 (MUST).** Tuition detail page at `/tuitions/HTR-330`: server-rendered; shows all public fields and the fee-terms summary; has an **Apply** button (sign-in required) and a **Save** button; shows current availability; offers a WhatsApp or phone link for questions. Closed listings stay reachable for 30 days `[A]` with a clear "no longer available" banner and links to similar tuitions, then return a not-found page.
- **FR-PUB-008 (MUST).** Public pages and API responses expose only a whitelisted set of columns (a database view). Guardian names and numbers, exact addresses, student names and private notes are never included, including in page source, JSON, images, meta tags and share previews.
- **FR-PUB-009 (SHOULD).** Tuition types `[A]` (configurable): academic (class-wise), admission preparation, language, religious or Quran instruction, skill, short fixed-term course. More than one student per tuition is supported.
- **FR-PUB-010 (MUST).** Information pages: How HTR works; Fees (the §7.2 wording in Bangla and English plus worked examples); Privacy notice; Terms; Contact.
- **FR-PUB-011 (SHOULD).** Discoverability: server-rendered pages, correct `lang` attributes, a sitemap of open tuitions, canonical URLs, and a generic share preview (site name and logo only, never tuition-specific private details). Closed tuitions leave the sitemap.
- **FR-PUB-012 (MUST).** A guardian contact panel with a WhatsApp link (pre-filled message), a call link and the Facebook page link, plus the request form (§5.6).

### 5.2 Accounts and sign-in (R1)
- **FR-AUTH-001 (MUST).** Sign-up and sign-in with email and password. **Google sign-in** is offered as well `[A]`. A mobile number is required in the profile. SMS verification is not used in V1 (cost); phone reachability is verified by staff (§5.3).
- **FR-AUTH-002 (MUST).** Account email (verification, password reset) goes through a configured custom SMTP provider with a verified sending domain. The platform's built-in email service must not be used in production (§15.4).
- **FR-AUTH-003 (MUST).** Bot protection on sign-up, sign-in, claim and request forms (for example Cloudflare Turnstile `[A]`), and rate limits on all of them.
- **FR-AUTH-004 (MUST).** **Claim an imported record.** Imported tutors are *unclaimed* and invisible to any tutor. A tutor claims by entering the mobile number on record. The response is always "we will review", whether or not a match exists (no enumeration). Staff approves the claim. On approval the tutor is linked, must re-confirm availability, and must accept the privacy notice and terms before the profile becomes active.
- **FR-AUTH-005 (MUST).** Staff accounts are created only by the owner, require multi-factor authentication `[A]`, and use a separate sign-in route.
- **FR-AUTH-006 (SHOULD).** Staff session timeout (for example 12 hours idle `[A]`); secure, HTTP-only cookies; sign-out on all devices.
- **FR-AUTH-007 (MUST).** Tutors can request account closure and a copy of their data (§13.7).

### 5.3 Tutor profile (R1; verification in R2)
- **FR-PROF-001 (MUST).** Fields: full name; gender; mobile number (and whether it is on WhatsApp); email; current institution; degree or department and year or graduation status; education history; subjects and class levels they can teach; curriculum; preferred areas (multi-select from the canonical list); weekly availability; home, online or both; experience (years and a short note); expected salary range (optional); photo.
- **FR-PROF-002 (MUST).** Do **not** collect national ID, date of birth or social-media links at sign-up. Documents are requested only when a tutor is shortlisted or before confirmation (R2).
- **FR-PROF-003 (MUST).** Save and resume. Show a checklist of what is required to apply (name, mobile, gender, institution, subjects and classes, preferred areas, photo) rather than a percentage that could hide missing essentials.
- **FR-PROF-004 (MUST).** Photo handling: crop to a square on the device; compress to WebP (about 100 KB or less); generate a small thumbnail (about 128 px) and a display size (about 512 px); reject non-images; strip EXIF and location data; store in a **private** bucket; show through short-lived signed links after a permission check.
- **FR-PROF-005 (MUST).** **Availability pause** without deleting the account. A paused tutor cannot be shortlisted for new tuitions.
- **FR-PROF-006 (MUST).** **Three separate verification states**: contact, identity, education. Each is `not started / submitted / in review / verified / rejected / expired`. A photograph or an institution name alone never earns a verified state. Verification states are visible to the tutor and to staff only.
- **FR-PROF-007 (MUST).** A plain-language panel showing who can see which profile fields (the tutor, staff, a guardian when shortlisted, nobody else).
- **FR-PROF-008 (MUST).** Separate consent records for (a) using the profile for matching, (b) sharing name, photo, institution and subjects with a guardian when shortlisted, and (c) contact by HTR by phone or WhatsApp. Each stores the notice version and timestamp.

### 5.4 Apply and track (R1)
- **FR-APP-001 (MUST).** A tutor with the required profile items can apply from a tuition page with a short note (up to 300 characters) and an availability confirmation. Before submission the page shows the **fee terms** (both arrangements, Bangla and English, with a worked example) and requires acceptance. The accepted terms version and time are stored on the application.
- **FR-APP-002 (MUST).** One active application per tutor per tuition. A withdrawn application can be re-submitted only while the tuition is still open. If a closed tuition is reopened, earlier applicants are notified and must apply again explicitly.
- **FR-APP-003 (MUST).** Application statuses: **Submitted, Under review, Shortlisted, Trial arranged, Confirmed, Not selected, Withdrawn, Opportunity closed** (definitions in §8.1). Every status change is recorded with time and actor.
- **FR-APP-004 (MUST).** Tutors can withdraw before Confirmed and can report a concern (§6.9). They cannot set any other status.
- **FR-APP-005 (MUST).** History is preserved when a tuition closes. The tutor's application list shows the final status and, for **Not selected**, a neutral reason category `[A]` (tuition filled; guardian preference; requirements not matched; no response; other).
- **FR-APP-006 (SHOULD).** A saved-tuitions list.
- **FR-APP-007 (SHOULD).** Basic abuse control: a daily limit on new applications per tutor (for example 20 `[A]`).
- **FR-APP-008 (SHOULD).** When a tuition is booked or closed, every pending applicant's status becomes **Opportunity closed** and they receive an in-site notice. This is meant to cut "is it still available?" messages.

### 5.5 Placements and fees for tutors (R2 placements; R3 fees)
- **FR-PLC-001 (MUST, R2).** A tutor with a confirmed placement sees: tuition code, agreed monthly salary, schedule, start date, staff contact, joining status and the confirmation record.
- **FR-FEE-T-001 (MUST, R3).** A fee page per placement shows the chosen arrangement, the fee basis, every amount, due date or trigger, status, payments and the remaining balance, with the discount deadline in Bangladesh time. It offers **Submit payment** (method, transaction ID, amount, payment time, optional screenshot). A submission is *pending review* until staff verifies it. The tutor can never mark money as received.
- **FR-FEE-T-002 (MUST, R3).** The tutor can report **first salary received** with the date. Staff confirms (§7.8).
- **FR-FEE-T-003 (MUST, R3).** Package page: purchased package, deposit status, credit balance, delivery counter, window end date and refund status if any.

### 5.6 Guardian contact and request form (R1)
- **FR-GRD-001 (SHOULD).** A **no-account request form** `[A]`: guardian name, mobile number, area, class, subject(s), days per week, expected salary (optional), tutor gender preference, short note, and a consent checkbox linking to the privacy notice. It creates a private *lead* for staff and never publishes anything automatically. Exact address and student details are collected by staff on the call, not in the form.
- **FR-GRD-002 (MUST).** Every guardian call-to-action offers WhatsApp first: a link pre-filled with a short message (and the tuition code when relevant).
- **FR-GRD-003 (MUST).** Guardian information is never shown to tutors on the site. Staff decide what to share by phone or message.

### 5.7 Notifications and settings (R1)
- **FR-NTF-001 (MUST).** An in-site notification list with an unread indicator for every status change, tuition closure, trial schedule, claim decision and (R3) fee event. No claim of automatic WhatsApp, Messenger, SMS or email delivery unless that channel is separately approved and working (§11).
- **FR-SET-001 (MUST).** Tutor settings: language (default Bangla), availability pause, notification preferences, data copy, account closure request, sign-out.

---

## 6. Staff experience

The staff area supports HTR's daily work. It must not simply reproduce a spreadsheet on screen.

### 6.1 Work queue (basic in R1, complete by R3)
- **FR-STF-001 (MUST).** A landing page listing items that need action, each with the reason, an assignee and a due date: new applications; claims awaiting approval; leads awaiting first contact; guardian follow-ups due; (R2) verification reviews, trials to schedule or record, joining confirmations; (R3) first-salary check-ins, payments awaiting review, overdue fees, package deadlines.
- **FR-STF-002 (SHOULD).** Compact daily indicators computed from real records: available tuitions, applications awaiting action, follow-ups due, active placements, expected collections, verified collections. No decorative numbers.

### 6.2 Tuition management (R1)
- **FR-TUI-001 (MUST).** Create and edit a tuition with a strict split between **public fields** (§5.1) and **private fields** (guardian, exact address, student details, private notes, lead source). Private fields live in a separate table (§9.4).
- **FR-TUI-002 (MUST).** Codes are unique integers displayed as `HTR-###`, continue from the current highest number, and are never reused.
- **FR-TUI-003 (MUST).** Validate the ৳2,000 minimum for fixed monthly salaries (override only with a written reason, for example for short courses). Salary type and period are mandatory.
- **FR-TUI-004 (SHOULD).** Warn about likely duplicates (same guardian number with the same class and subject).
- **FR-TUI-005 (MUST).** Tuition status follows §8.1. **Publish** is a separate explicit action. An **accepting applications** switch can pause applications without unpublishing.
- **FR-TUI-006 (SHOULD).** Clone a tuition; view its full change history.
- **FR-TUI-007 (MUST).** Rules HTR applies today become defaults, not memory: for SSC and HSC level tuitions the guardian-requirement text includes "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে" unless staff removes it.

### 6.3 Guardian and lead records (R1)
- **FR-GRD-STF-001 (MUST).** Private guardian records: name, mobile number(s), preferred channel, lead source (Facebook post, Meta ad, WhatsApp, referral, website, other), assigned staff member, contact history with timestamps, next follow-up date, linked tuitions.
- **FR-GRD-STF-002 (MUST).** Request-form leads appear in a queue and are converted into a tuition draft or discarded. Duplicate contacts can be merged, with a log.

### 6.4 Tutor directory (R1; documents R2)
- **FR-TDR-001 (MUST).** A table with photo thumbnail, name, institution and degree, subjects and classes, areas, availability, online capability, claim status and verification states; filters for each; search by normalized phone number. **Identity-document previews never appear in the table.**
- **FR-TDR-002 (MUST).** Phone numbers are masked by default. A reveal is logged `[A]`.
- **FR-TDR-003 (SHOULD).** An *Invite to claim* action for unclaimed imported tutors that prepares a WhatsApp message (§11).
- **FR-TDR-004 (MUST, R2).** The tutor detail page shows documents only to roles allowed by §8.3, after the viewer enters a reason. The access is logged.

### 6.5 Applications (R1)
- **FR-APS-001 (MUST).** A per-tuition applications table with filters and a **compare view** (2–5 tutors side by side: photo, institution, subjects, experience, availability, areas, expected salary, note, verification states).
- **FR-APS-002 (MUST).** Actions: move to Under review, Shortlist, mark Not selected (with a reason category and an optional message), add private notes. Bulk status changes ask for confirmation.
- **FR-APS-003 (MUST).** **Staff-entered applications.** Staff can record an application on a tutor's behalf with a **source** (site, WhatsApp, Messenger, phone, walk-in). The fee-terms acceptance is then recorded as *given verbally or by message*, with the staff member's name and the date, and the tutor is asked to confirm it in their account when they claim the profile `[A]`.
- **FR-APS-004 (SHOULD).** Message templates with placeholders for common outcomes (shortlisted, trial time, not selected).

### 6.6 Trials, confirmation, joining, cancellation, replacement (R2)
- **FR-PLC-STF-001 (MUST).** Record up to two **trial classes** per application: scheduled time, whether held, outcome (satisfactory, not satisfactory, tutor no-show, guardian no-show, cancelled) and notes.
- **FR-PLC-STF-002 (MUST).** **Confirm** a placement only after the second trial is recorded as held and the guardian has agreed to continue (an owner override with a written reason is possible `[A]`). Confirming records the agreed monthly salary, the **fee basis** (default: the agreed monthly salary), the schedule, the start date and the fee arrangement (default Standard), and stores the terms version accepted. It sets the tuition to **Booked** and every other pending application to **Opportunity closed**.
- **FR-PLC-STF-003 (MUST).** Record **joining** (actual start date) separately from confirmation. Booked never implies joined, paid, verified or salary received.
- **FR-PLC-STF-004 (MUST).** Cancel or end a placement with a reason. **Replacement** creates a new placement or reopens the tuition and links to the old one. Money consequences are handled as ledger adjustments (§7.7).
- **FR-PLC-STF-005 (SHOULD).** A confirmation-letter record: printable or copyable text (Bangla and English) with tutor, tuition code, agreed salary, schedule, start date, and the selected fee arrangement with its amounts. No digital-signature claims.

### 6.7 Fees, payments and packages (R3)
Specified in §7. Staff screens: payment review queue; placement fee view; tutor ledger; package management; liabilities view; collections report.

### 6.8 Post generator (R1)
- **FR-GEN-001 (MUST).** From any saved tuition, produce with one click, each with a copy button: (1) the **Facebook post**, (2) the **WhatsApp post**, (3) the **contact-save line** (`Tuition - 330`, without "HTR"), and (4) the **Google Sheet row** while the sheet is still in use. Formats and rules are in Appendix C.
- **FR-GEN-002 (MUST).** Multi-select tuitions to generate one combined post whose headline states how many offers are for male and how many for female tutors.
- **FR-GEN-003 (MUST).** Generators read only the public fields plus fields the template explicitly allows. Guardian phone numbers and exact addresses are never inserted into posts.
- **FR-GEN-004 (COULD, later).** Branded image cards (§16.7). Not in V1.

### 6.9 Concerns, audit and exports (R1)
- **FR-SAF-001 (MUST).** Tutors and staff can file a **concern** (unsafe or inappropriate situation, misconduct, harassment, payment dispute, other) linked to a tuition, placement, tutor or guardian. Concerns are visible only to the owner and the assigned coordinator, have a status and notes, and can place an account or a tuition on hold.
- **FR-AUD-001 (MUST).** An append-only **audit log** for: document views (with reason), phone reveals, exports, status changes, verification decisions, payment verification, ledger adjustments, fee-rule and terms changes, role changes and imports. Entries store who, when, what and why, not the sensitive values themselves.
- **FR-EXP-001 (MUST).** CSV exports are owner-only by default, masked unless the owner chooses otherwise, and always logged.

### 6.10 Administration (R1)
- **FR-ADM-001 (MUST).** The owner manages: canonical areas (with aliases), subjects, class levels, curricula, tuition types, message templates, terms versions (never edited in place; publish a new version), fee rules (percentages, deadline days, reminder cadence), package definitions, roles and staff accounts, and retention timers.

---

## 7. Business rules: fees, payments, dues and packages

This section specifies the fee engine and everything that touches money. Implement it in one server-side module with unit tests (Appendix B).

### 7.1 Definitions
| Term | Meaning |
|---|---|
| **Placement fee / media fee** | The one-time fee a tutor pays HTR for a placement |
| **Agreed monthly salary** | The monthly amount agreed for the tuition, recorded at confirmation |
| **Fee basis** | The taka amount the percentages apply to. Default `[A]`: the agreed monthly salary for the first month. Staff can record a different basis only with a written reason, and the tutor sees it before accepting |
| **Second trial class** | The second trial session, recorded as held (§6.6) |
| **Confirmed** | Staff has recorded that the second trial was held and the guardian agreed to continue `[A]` (§7.4) |
| **Joining** | The actual start of regular tuition (a recorded date). Application, shortlisting and trials are not joining unless the parties agree that the trial is the start |
| **First salary received** | The tutor received the first month's salary. Reported by the tutor and confirmed by staff |
| **Standard arrangement** | 60% of the fee basis in two instalments |
| **Early-payment arrangement** | 50% of the fee basis paid within seven days of joining |
| **Credit** | Any verified payment or deposit that reduces a balance |

### 7.2 Confirmed fee wording `[C]`
**Bangla (canonical wording; keep verbatim):**

> মোট ৬০% পরিশোধ করব (৩০% কনফার্মেশনের পর + বাকি ৩০% প্রথম স্যালারি পেয়ে) জয়েন করার ৭ দিনের মধ্যে ৫০% পরিশোধ করব (ডিসকাউন্ট অফার)।

**English rendering (informational; Bangla governs `[A]`):**

> I will pay a total of 60% (30% after confirmation + the remaining 30% after receiving my first salary). [Discount offer:] I will pay 50% within 7 days of joining.

The two sentences are **alternatives, not cumulative charges.** The interface presents them as two clearly labelled options and never adds them together.

### 7.3 The two arrangements
| | Standard | Early-payment (discount) |
|---|---|---|
| Total | 60% of the fee basis | 50% of the fee basis |
| When | 30% after confirmation; the remaining 30% after the first salary is received | The whole amount within 7 days of joining |
| Chosen | Default | Elected by the tutor before the deadline (through the fee page or by telling staff) |
| Applies to | One-time, first month only | Same |

No registration, application, browsing or verification fee. No subscription. No recurring or monthly commission.

### 7.4 When the first instalment falls due `[A]`
The fee wording says "after confirmation". HTR's operating rule is that the media fee falls due after the **second trial class**. To keep the ledger aligned with real collection, **Confirmed is defined as the moment the second trial is recorded as held and the guardian agrees to continue.** The first 30% falls due when the placement is set to Confirmed. The system records both trials so the definition is enforced (FR-PLC-STF-002). If the owner's practice differs, this is the one definition to change.

### 7.5 Calculation rules
- **BR-FEE-001.** All amounts are whole taka stored as integers. No decimals, no floating point.
- **BR-FEE-002.** `standard_total = floor((basis × 60 + 50) / 100)` and `early_total = floor((basis × 50 + 50) / 100)` (round half up to a whole taka).
- **BR-FEE-003.** Standard instalments: `instalment_1 = floor(standard_total / 2)` and `instalment_2 = standard_total − instalment_1`. An odd taka goes to the second instalment.
- **BR-FEE-004.** Instalment 1 falls due when the placement is Confirmed. Instalment 2 falls due when the first salary is received (§7.8).
- **BR-FEE-005.** Early-payment: the total may be paid in one or several verified payments that together reach it by the deadline. The joining date is day 1. The deadline is **11:59 p.m. Bangladesh time on day 7**.
- **BR-FEE-006.** **Switching to early after paying instalment 1:** the early total is reduced by the credited payment and the balance is due by the deadline. Example: basis ৳4,000, ৳1,200 already paid, early total ৳2,000, so ৳800 is due.
- **BR-FEE-007.** **Missed deadline:** the early offer lapses and the standard schedule applies, with all verified payments credited. Instalment 1 (if unpaid) becomes due at once; instalment 2 stays tied to the first salary. Staff may adjust dates. **No automatic fine or penalty is ever added.**
- **BR-FEE-008.** **Timely-payment test:** eligibility for the discount depends on the *transaction time* shown by the payment provider (as evidenced by the transaction ID or screenshot), not on when staff reviewed it or when the screenshot was uploaded. If the time cannot be established, use the submission time and flag the payment for staff.
- **BR-FEE-009.** Special cases (first-month concession, partial first month, several students, short course, irregular schedule) require the basis to be stated and shown to the tutor before acceptance. It is never inferred silently.
- **BR-FEE-010.** Terms are versioned. A placement keeps the terms version accepted. Later changes apply to future placements only, unless all parties agree.
- **BR-FEE-011.** The Bangla text governs if the two languages ever differ `[A]`.

### 7.6 Payments and ledger
- **BR-PAY-001.** Payment happens outside the site (bKash, Nagad or Rocket, to the number HTR publishes). The tutor submits method, transaction ID, amount, payment time and an optional screenshot. This creates a **pending review** payment. Only staff (the Owner by default `[A]`) can verify it, which creates the ledger credit.
- **BR-PAY-002.** A transaction ID can be used once per method. Duplicates are blocked and flagged.
- **BR-PAY-003.** The ledger is **append-only**. Entry types: charge, payment, deposit, credit applied, refund, adjustment, waiver, write-off, reversal. Balances are computed from entries. Overpayments become credit. Reversals and corrections are new entries with a reason and an actor.
- **BR-PAY-004.** Payment screenshots are sensitive (§13) and follow the retention rule (§13.5).

### 7.7 Cancellation, failed trial, no-show, non-payment, replacement `[O]`
The refund and adjustment policy is not yet decided. Until it is:
- Every such case needs staff review. The site must **not** promise automatic forfeiture or guaranteed refunds.
- The system supports these outcomes as ledger entries with reason codes: **refund**, **replacement credit**, **waiver**, **write-off**.
- The owner decides which outcome applies in each case: a guardian cancels after the second trial; a tutor stops within an agreed period; a guardian stops paying the tutor; a trial fails. See §20.

### 7.8 First salary and check-ins
- **BR-SAL-001.** The tutor reports the date the first salary was received. Staff confirms (for example by calling the guardian). Only then does instalment 2 fall due. A delayed or disputed salary is never treated as received.
- **BR-SAL-002.** The system creates a **first-salary check-in task** about one month after joining `[A]` (configurable).

### 7.9 Dues process `[A]`
Late payment of the media fee is a recurring problem. The early-payment discount is the incentive; this is the process.
- **BR-DUE-001.** Reminder cadence is configurable. Default: a staff-clicked WhatsApp reminder and an in-site notice at 3, 7 and 14 days after a due date.
- **BR-DUE-002.** A fee item becomes **Overdue** 14 days after its due date `[A]`. Overdue items appear in the work queue and escalate to the owner.
- **BR-DUE-003.** **Application hold** `[O]`: optionally block new applications while an overdue fee exists. Default: **off** (flag only) until the owner decides and the terms say so.
- **BR-DUE-004.** No automatic fines, no public naming, no disclosure of dues to guardians.

### 7.10 Prepaid packages (R3) `[C]` with open rules `[O]`
**Confirmed facts.**

| Package | Deposit | Promise to a qualified tutor |
|---|---|---|
| Gold | ৳1,000 | 1 tuition within 3 months |
| Platinum | ৳3,000 | 2 tuitions within 5 months |
| Diamond | ৳5,000 | 3 tuitions within 6 months |

- The deposit is an **advance credited against the media fee**, not an extra charge. Example: Platinum ৳3,000 plus two tuitions each with fee basis ৳5,000 gives media fees of ৳3,000 + ৳3,000 = ৳6,000. The ৳3,000 credit is applied and the tutor owes ৳3,000 more.
- If the promise is not delivered, a **refund** option applies.
- The balance remaining after the deposit can be settled at month's end.
- Payment is manual, as in §7.6.

**Build requirements.**
- **BR-PKG-001.** A tutor-level **prepaid balance.** A verified package payment creates a *deposit* ledger entry. Each placement fee first draws on the balance (*credit applied*). Ledger and fee screens show deposit, credit used and remaining balance.
- **BR-PKG-002.** Package terms (price, promise, window) are snapshotted on purchase so later edits never change an existing purchase. A purchase has a start date (default `[A]`: the date its payment is verified), an end date, a delivered counter and a status.
- **BR-PKG-003.** A **liabilities view** for the owner: deposits held, promised placements still owed, window end dates, refunds due or paid.
- **BR-PKG-004.** Site copy: any "no advance or registration fee" statement must say it applies to the standard route and mention that optional packages exist.

**Rules the owner must decide** (the builder implements settings, not guesses; see §20): what counts as a delivered tuition (default `[A]`: the placement has joined); when the window starts; what qualifies a tutor and what the tutor must do (response time, offers accepted); partial delivery and partial refunds; whether unused credit carries over, expires or is refunded; whether credit is refundable after it has been applied; how a deposit interacts with the early-payment discount (default `[A]`: credit is applied to the total of the arrangement the tutor chose, and only the remaining balance is subject to the early-payment deadline); whether packages are transferable (default: no).

---

## 8. Status models and permissions

### 8.1 Statuses and who sets them
**Tuition**
| Status | Meaning | Public? | Set by |
|---|---|---|---|
| Draft | Being entered | No | Coordinator, Owner |
| Available | Open for applications | Yes, once published | Coordinator, Owner |
| Processing | Applications under review or guardian conversation under way | Yes, once published | Coordinator, Owner |
| Follow-up needed | Waiting for the guardian or for information | No (auto-unpublished) | Coordinator, Owner |
| Booked | A placement is confirmed | No | System, when a placement is Confirmed |
| Cancelled | Guardian withdrew the request | No | Coordinator, Owner |
| Closed | Finished or archived | No | Coordinator, Owner, System |

Publishing is a separate flag (`is_public`). A tuition is public only when it is published **and** its status is Available or Processing. **Booked never means joined, paid, identity-verified or salary received.**

**Application**
| Status | Meaning | Set by |
|---|---|---|
| Submitted | Created by the tutor or by staff; waiting for staff | Tutor, Staff |
| Under review | Staff started reviewing | Staff |
| Shortlisted | Staff selected the tutor for consideration (the guardian may be sent the tutor's profile summary) | Staff |
| Trial arranged | At least one trial is scheduled | Staff |
| Confirmed | The placement is confirmed (§6.6) | Staff |
| Not selected | Not proceeding; reason category recorded | Staff |
| Withdrawn | The tutor withdrew before Confirmed | Tutor |
| Opportunity closed | The tuition was booked, cancelled or closed without this tutor being confirmed | System |

**Placement:** `confirmed` → `joined` → `ended`; `confirmed` → `cancelled`; `confirmed` or `joined` → `replaced`.
**Trial:** `scheduled`, `held_satisfactory`, `held_not_satisfactory`, `tutor_no_show`, `guardian_no_show`, `cancelled`.
**Verification (per type):** `not_started`, `submitted`, `in_review`, `verified`, `rejected`, `expired`.
**Claim:** `unclaimed`, `claim_pending`, `claimed`.
**Fee item:** `not_due`, `due`, `partially_paid`, `paid`, `overdue`, `waived`, `void`.
**Payment:** `pending_review`, `verified`, `rejected`, `reversed`.
**Package purchase:** `pending_payment`, `active`, `fulfilled`, `expired`, `refund_pending`, `refunded`, `cancelled`.

### 8.2 Allowed application transitions
| From | To |
|---|---|
| Submitted | Under review, Not selected, Withdrawn, Opportunity closed |
| Under review | Shortlisted, Not selected, Withdrawn, Opportunity closed |
| Shortlisted | Trial arranged, Not selected, Withdrawn, Opportunity closed |
| Trial arranged | Confirmed, Shortlisted, Not selected, Withdrawn, Opportunity closed |
| Confirmed | None on the application. Cancellation or replacement happens on the placement (§6.6) |
| Not selected, Withdrawn, Opportunity closed | Terminal. A new application is required, and only while the tuition is open |

Every transition writes an `application_events` row with actor, time and reason. The database (not only the interface) must reject transitions outside this table and any tutor-initiated change other than Withdrawn.

### 8.3 Permission matrix
`✓` allowed · `own` own records only · `—` not allowed · `read` read-only

| Capability | Visitor | Tutor | Coordinator | Verifier | Owner |
|---|---|---|---|---|---|
| View public tuitions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Apply, save, withdraw | — | own | — | — | — |
| View and edit profile, applications, fees | — | own | — | — | — |
| Create and edit tuitions; publish | — | — | ✓ | read | ✓ |
| View guardian and private tuition data | — | — | ✓ | — | ✓ |
| View tutor directory (thumbnails, profile) | — | — | ✓ | ✓ | ✓ |
| Reveal a tutor's phone number (logged) | — | — | ✓ | ✓ | ✓ |
| Shortlist, trial, confirm, enter application for a tutor | — | — | ✓ | — | ✓ |
| Approve account claims | — | — | ✓ | — | ✓ |
| View identity or education documents (reason and log) | — | own | — | ✓ | ✓ |
| Decide verification states | — | — | — | ✓ | ✓ |
| Verify payments and mark received | — | — | — | — | ✓ (delegable `[A]`) |
| Ledger adjustments, refunds, waivers, write-offs | — | — | — | — | ✓ |
| Manage packages and the liabilities view | — | — | — | — | ✓ |
| Use the post generator | — | — | ✓ | — | ✓ |
| Export data | — | own data | — | — | ✓ |
| Manage settings, terms, fee rules, roles | — | — | — | — | ✓ |
| View the audit log | — | — | — | — | ✓ |
| File or view concerns | — | file own | assigned | — | ✓ |

---

## 9. Data model

### 9.1 Principles
- Logical model. The builder may refine names and add helper tables but must keep the constraints, visibility rules and append-only behaviour.
- Postgres in Supabase. Enable Row Level Security on **every** table in an exposed schema, deny by default, and add explicit policies (§9.8). Public reads go through views that list allowed columns.
- Use UUID primary keys, `created_at` and `updated_at` (UTC), and soft deletion only where stated.
- Money columns are integer taka (`amount_taka`). Enumerations are Postgres enums or constrained text.
- Personal data lives in tables that public views never touch.

### 9.2 Reference data (public read, owner write)
- `areas`: `id, name_bn, name_en, aliases text[], parent_id, active`
- `subjects`: `id, name_bn, name_en, aliases text[], category`
- `class_levels`: `id, code, name_bn, name_en, band` (primary, secondary, higher secondary, admission, other)
- `curricula`: `id, name_bn, name_en` (for example Bangla medium, English medium, English version, Madrasa)
- `terms_versions`: `id, kind` (fee_terms, privacy_notice, tutor_terms)`, version, text_bn, text_en, governing_lang='bn', content_hash, effective_from, retired_at`
- `settings`: `key, value_json` (fee percentages, deadline days, reminder cadence, thresholds). A `public_settings` view exposes only what the site may show (for example the published payment number).

### 9.3 People
- `staff_users`: `user_id, role` (owner | coordinator | verifier)`, active, mfa_enabled`
- `tutors`: `id, user_id (null until claimed), claim_status, legacy_ref, full_name, gender, phone_e164, phone_is_whatsapp, email, institution, degree, education_status, experience_years, experience_note, teaches_online, expected_salary_min, expected_salary_max, availability_paused, availability_confirmed_at, photo_thumb_path, photo_display_path, created_via` (signup | import | staff)`, deleted_at`
- `tutor_subjects` (`tutor_id, subject_id, class_level_id`), `tutor_areas` (`tutor_id, area_id`), `tutor_availability` (`tutor_id, weekday, slot`), `tutor_education` (`tutor_id, level, institution, program, year`)
- `consents`: `id, subject_type, subject_id, purpose, terms_version_id, given_at, withdrawn_at, given_via` (site | staff_recorded)
- `tutor_documents` (R2): `id, tutor_id, kind` (identity | student_card | certificate | other)`, storage_key, uploaded_at, review_status, reviewed_by, reviewed_at, delete_after, purged_at`
- `verifications` (R2): `tutor_id, type` (contact | identity | education)`, status, reviewed_by, reviewed_at, staff_note`; unique `(tutor_id, type)`
- `guardians`: `id, name, phone_e164, alt_phone_e164, preferred_channel, private_notes, lead_source, assigned_staff_id`
- `leads`: `id, guardian_name, phone_e164, area_id, class_level_id, subjects, days_per_week, expected_salary, gender_pref, note, status` (new | contacted | converted | discarded)`, converted_tuition_id, consent_id`

### 9.4 Tuitions
- `tuitions`: `id, code int unique, status, is_public, accepting_applications, tuition_type, class_level_id, curriculum_id, area_id, mode` (home | online | hybrid)`, salary_kind` (fixed | negotiable | unspecified)`, salary_amount_taka null, salary_period` (per_month | per_course)`, days_per_week, duration_note, students_count, tutor_gender_pref` (any | male | female)`, requirements_public, start_note, posted_at, closed_at, close_reason, created_by, assigned_staff_id`
  - Checks: `salary_kind='fixed'` requires `salary_amount_taka` and `salary_period`; fixed monthly salaries at least ৳2,000 unless an override reason is stored; `salary_amount_taka` is never 0.
- `tuition_subjects`: `tuition_id, subject_id`
- `tuition_private` (**staff only**): `tuition_id PK, guardian_id, student_label (optional), exact_address, private_notes, lead_source, override_reason`
- `saved_tuitions`: `tutor_id, tuition_id`

### 9.5 Applications and placements
- `applications`: `id, tuition_id, tutor_id, status, note (≤300), availability_confirmed, terms_version_id, terms_accepted_at, terms_accepted_via` (site | staff_recorded)`, source` (site | whatsapp | messenger | phone | walk_in)`, entered_by_staff_id, reason_code, created_at`; partial unique index on `(tuition_id, tutor_id)` where status is in the active set
- `application_events`: `id, application_id, from_status, to_status, actor_type, actor_id, reason_code, message_to_tutor, created_at`
- `trials`: `id, application_id, sequence` (1 or 2)`, scheduled_at, held_at, outcome, notes`
- `placements`: `id, application_id unique, tutor_id, tuition_id, status, agreed_salary_taka, salary_period, fee_basis_taka, fee_basis_note, schedule_note, start_date, confirmed_at, confirmed_by, joined_at, first_salary_received_at, first_salary_confirmed_by, fee_arrangement` (standard | early)`, arrangement_locked_at, terms_version_id, replaced_by_placement_id, cancel_reason`

### 9.6 Money (R3)
- `fee_schedule_items`: `id, placement_id, kind` (standard_1 | standard_2 | early_full)`, amount_taka, trigger, due_at, status`
- `payments`: `id, tutor_id, placement_id null, package_purchase_id null, method` (bkash | nagad | rocket | other)`, trx_id, amount_taka, paid_at, submitted_at, proof_key, status, verified_by, verified_at, note`; unique `(method, trx_id)` for any status other than rejected
- `ledger_entries` (**append-only**): `id, tutor_id, placement_id null, package_purchase_id null, type, amount_taka (signed), reason_code, related_payment_id, related_item_id, created_by, created_at`. Updates and deletes are denied by policy and by trigger. Balances are derived.
- `packages`: `id, code` (gold | platinum | diamond)`, price_taka, promised_tuitions, window_months, active`
- `package_purchases`: `id, tutor_id, package_id, status, price_taka, promised_tuitions, window_months` (snapshots)`, activated_at, window_ends_at, delivered_count, terms_version_id`
- `package_deliveries`: `id, purchase_id, placement_id, counted_at, rule_version`

### 9.7 Operations
- `notifications`: `id, tutor_id, kind, payload_json (no personal data beyond ids), read_at, created_at`
- `tasks`: `id, kind, entity_type, entity_id, assignee_id, due_at, status, created_by` (system or staff)
- `flags` (concerns): `id, reporter_type, reporter_id, target_type, target_id, category, description, status, staff_notes`
- `audit_log` (**append-only**): `id, actor_id, actor_role, action, entity_type, entity_id, reason, meta_json (no sensitive values), created_at`
- `import_batches` and `import_rows` (staging schema, not exposed): `batch_id, source, legacy_ref, raw_json, normalized_json, status` (pending | needs_review | approved | committed | rejected)`, issues text[]`
- `exports_log`: `id, actor_id, kind, filters_json, row_count, created_at`

### 9.8 Access rules (RLS intent)
`R` read · `W` insert or update · `own` own rows · `cols` whitelisted columns only · `—` none

| Table or view | Visitor | Tutor | Coordinator | Verifier | Owner |
|---|---|---|---|---|---|
| `public_tuitions` (view) | R cols | R cols | R | R | R |
| `tuitions`, `tuition_subjects` | — | — | R W | R | R W |
| `tuition_private`, `guardians`, `leads` | — | — | R W | — | R W |
| `tutors` and child tables | — | R W own (not status, verification, staff notes) | R (phone masked via view), W limited | R limited | R W |
| `tutor_documents` | — | own (add, view, delete pending) | — | R W | R W |
| `verifications` | — | R own | R status | R W | R W |
| `applications` | — | R own; insert with checks; update only to Withdrawn | R W | — | R W |
| `application_events` | — | R own (tutor-visible events) | R | — | R |
| `trials`, `placements` | — | R own (subset) | R W | — | R W |
| `fee_schedule_items`, `ledger_entries` | — | R own | R flags only | — | R W (append) |
| `payments` | — | insert own as pending; R own | — | — | R W |
| `packages`, `terms_versions`, `public_settings` | R | R | R | R | R W |
| `package_purchases` | — | R own | — | — | R W |
| `notifications` | — | R own; mark read | — | — | — (server inserts) |
| `audit_log`, `exports_log` | — | — | — | — | R (server inserts) |
| `import_*` | — | — | R W (review) | — | R W |

The service-role credential is used only in server code for: writing audit and notification rows, generating signed links after a permission check, scheduled jobs, and imports. It is never bundled to the browser.

---

## 10. Screens and navigation

### 10.1 Route inventory
| Route | Purpose and key elements | Release |
|---|---|---|
| `/` | Tuition board: search, filters, cards, guardian contact panel | R1 |
| `/tuitions/[code]` | Tuition detail; Apply and Save; fee-terms summary | R1 |
| `/how-it-works`, `/fees`, `/privacy`, `/terms`, `/contact` | Information pages (fees page shows the §7.2 wording and examples) | R1 |
| `/request-tutor` | Guardian request form (no account) | R1 |
| `/signin`, `/signup`, `/claim` | Account and claim flows | R1 |
| `/me` | Tutor home: next actions, recent status changes, suggested tuitions | R1 |
| `/me/profile` | Profile with required-to-apply checklist; visibility panel | R1 |
| `/me/documents` | Private document upload and verification status | R2 |
| `/me/applications`, `/me/saved` | Application list with status timeline; saved tuitions | R1 |
| `/me/placements` | Confirmed placements | R2 |
| `/me/fees`, `/me/packages` | Fee pages; package page | R3 |
| `/me/notifications`, `/me/settings` | Inbox; language, pause, data copy, closure | R1 |
| `/staff` | Work queue | R1 |
| `/staff/tuitions`, `/staff/tuitions/[code]` | List and editor (public/private panels, post generator panel, applications panel) | R1 |
| `/staff/applications` | Cross-tuition inbox and compare view | R1 |
| `/staff/tutors`, `/staff/tutors/[id]` | Directory; tutor detail (documents gated, R2) | R1 |
| `/staff/guardians`, `/staff/leads` | Private guardian records; request-form leads | R1 |
| `/staff/placements` | Trials, confirmation, joining, cancellation | R2 |
| `/staff/payments`, `/staff/ledger`, `/staff/packages` | Payment review; tutor ledger; package and liabilities views | R3 |
| `/staff/posts` | Multi-tuition post generator | R1 |
| `/staff/imports` | Import review | R1 |
| `/staff/reports`, `/staff/settings`, `/staff/audit` | Reports and exports; administration; audit log | R1 |

Staff routes use a separate layout, require a staff role and MFA, send `noindex`, and are excluded from the sitemap.

### 10.2 Navigation
- Mobile tutor navigation: bottom bar with **Tuitions, Saved, Applications, Profile**. The language toggle and notifications sit in the header.
- Desktop: a top navigation with the same destinations. Staff area: a left sidebar.
- Default language is Bangla. The toggle is always visible and remembers the choice.

### 10.3 Key screen requirements
- **Tuition card.** Code, class and subjects, area, salary with period, days, mode, posted date, availability, save icon. One primary action. Salary and area are the most prominent items after the subject line.
- **Tuition detail.** Facts first; fee-terms summary with the two arrangements; Apply. If the tutor lacks required profile items, the button opens the checklist instead of failing.
- **Apply.** A single page: note, availability confirmation, fee terms (both arrangements, Bangla and English), acceptance, submit. Show what happens next.
- **Application list.** Each row shows tuition code, status label, last change, and the next expected step. Selecting it opens the status timeline.
- **Staff work queue.** Groups by urgency, each item with reason and one-click action.
- **Compare view.** Fixed column order; sticky headers; photos at thumbnail size with a click for display size.
- **Tuition editor.** Two panels (Public, Private) with clear labelling of what will be visible; a preview of the public card; a post-generator side panel.
- **Fee page (tutor).** A table with each amount, its trigger or due date, status and the remaining balance; the two arrangements displayed side by side; a countdown **only** as text with the exact deadline (no urgency animations).
- **Empty, loading and error states** for every list, in Bangla and English.

---

## 11. Notifications and messaging

### 11.1 Channels in V1
- **In-site notifications** for tutors (all events below).
- **Account email** (verification, password reset) through the custom SMTP provider. No marketing email.
- **Staff-assisted WhatsApp messages.** Staff click a button that opens WhatsApp with a pre-filled message to the tutor's number. The link format is `https://wa.me/<number>?text=<url-encoded text>` where the number is written in international format without `+` or leading zeros (for a Bangladeshi mobile: `8801XXXXXXXXX`). The site records that a message was *prepared* (and lets staff mark it *sent*). **The site never claims that a message was delivered.**
- No automatic WhatsApp, Messenger, SMS or email notifications until a channel is separately approved (§21).

### 11.2 Event catalogue
| Event | Tutor in-site | Staff-assisted WhatsApp template | Release |
|---|---|---|---|
| Application received | ✓ | — | R1 |
| Status changed (under review, shortlisted, not selected, opportunity closed) | ✓ | T2, T4 | R1 |
| Trial scheduled or changed | ✓ | T3 | R2 |
| Placement confirmed | ✓ | free text | R2 |
| Claim approved or declined | ✓ | — | R1 |
| Invite an imported tutor to claim their profile | — | T1 | R1 |
| Fee due or reminder | ✓ | T5, T6 | R3 |
| Payment verified or rejected | ✓ | — | R3 |
| First-salary check-in | ✓ | T7 | R3 |
| Package purchased, credit applied, window ending | ✓ | free text | R3 |

Staff receive work through the queue (§6.1). No push messages to staff in V1.

### 11.3 Message templates `[A]`
Suggested wording. The owner or a native reviewer approves the final text. Templates are stored in settings and editable by the owner. **Never include guardian phone numbers or addresses.** Keep messages short. Placeholders are in braces.

| ID | English | Bangla |
|---|---|---|
| T1 Invite to claim | Dear {name}, this is Hikmah Tutors Rajshahi. Please claim your profile on our website: {link}. It takes about two minutes and lets you apply for tuitions and see your application status. | প্রিয় {name}, আমরা Hikmah Tutors Rajshahi থেকে বলছি। আমাদের ওয়েবসাইটে আপনার প্রোফাইলটি ক্লেইম করুন: {link}। এতে প্রায় দুই মিনিট লাগবে, এবং এরপর আপনি টিউশনে আবেদন করতে ও আবেদনের অবস্থা দেখতে পারবেন। |
| T2 Shortlisted | Dear {name}, your application for {code} has been shortlisted. Please check your notifications for details: {link} | প্রিয় {name}, {code} টিউশনের জন্য আপনার আবেদন শর্টলিস্ট করা হয়েছে। বিস্তারিত জানতে নোটিফিকেশন দেখুন: {link} |
| T3 Trial scheduled | Dear {name}, the trial class for {code} is scheduled for {date} at {time}. Please be on time, and tell us early if you cannot attend. | প্রিয় {name}, {code} টিউশনের ট্রায়াল ক্লাস {date} তারিখ {time}-এ নির্ধারিত হয়েছে। অনুগ্রহ করে সময়মতো উপস্থিত থাকুন। কোনো কারণে না পারলে আগেই আমাদের জানান। |
| T4 Not selected | Dear {name}, you were not selected for {code} this time. Thank you for applying. You can apply for new tuitions any time: {link} | প্রিয় {name}, এবার {code} টিউশনের জন্য আপনাকে নির্বাচন করা হয়নি। আবেদনের জন্য ধন্যবাদ। নতুন টিউশনে যেকোনো সময় আবেদন করতে পারবেন: {link} |
| T5 Fee due | Dear {name}, ৳{amount} of the media fee for {code} is due by {date}. Details and payment submission: {link} | প্রিয় {name}, {code} টিউশনের মিডিয়া ফি-এর {amount} টাকা {date}-এর মধ্যে পরিশোধ করতে হবে। বিস্তারিত ও পেমেন্ট জমা দিতে: {link} |
| T6 Early-payment deadline | Dear {name}, the last time to pay the discounted 50% media fee for {code} is {deadline}. Details: {link} | প্রিয় {name}, {code} টিউশনের ডিসকাউন্ট অফারে ৫০% মিডিয়া ফি পরিশোধের শেষ সময় {deadline}। বিস্তারিত: {link} |
| T7 First-salary check-in | Dear {name}, have you received the first month's salary for {code}? If yes, please tell us the date on your fee page: {link} | প্রিয় {name}, {code} টিউশনের প্রথম মাসের স্যালারি কি পেয়েছেন? পেয়ে থাকলে তারিখসহ আপনার ফি পেজে জানিয়ে দিন: {link} |
| T8 Guardian to HTR (pre-filled by the website) | Hello, I am looking for a tutor. Class: __, Subject: __, Area: __. *(with a tuition code:)* Hello, I would like to know about {code}. | আমি একজন টিউটর খুঁজছি। ক্লাস: __, বিষয়: __, এলাকা: __। *(টিউশন কোডসহ:)* {code} টিউশন সম্পর্কে জানতে চাই। |

---

## 12. Search, language and data quality

- **DATA-001 Unicode.** Normalize all text to NFC on input, before storing and before comparing. Bengali characters such as য়, ড় and ঢ় can be encoded two ways; both must match in search. Test with both encodings.
- **DATA-002 Digits.** Accept Bangla (০–৯) and Latin (0–9) digits in search, numeric fields and phone numbers. Store Latin digits. The Bangla interface displays Bangla digits by default `[A]`, with amounts formatted consistently (for example ৳ ৫,০০০).
- **DATA-003 Phone numbers.** Canonical form `+8801XXXXXXXXX`. Accept `01XXXXXXXXX`, `8801XXXXXXXXX`, `+880 1XXX-XXXXXX` and similar with spaces or hyphens. Accept mobile prefixes 013–019 `[A]` and reject others with a helpful message. The WhatsApp link uses the digits without `+`.
- **DATA-004 Areas.** A canonical list with Bangla name, English name and aliases. Free-text areas are not allowed on tuitions or profiles. An unknown area sends staff to an "add area or alias" step. Seed the list from a review of the existing sheets `[A]`. Examples of alias sets: Shaheb Bazar / সাহেব বাজার; Uposhohor / Upashahar / উপশহর.
- **DATA-005 Subjects, classes, curricula.** Controlled lists with aliases, as for areas.
- **DATA-006 Search.** Postgres full-text search plus trigram matching on normalized columns and alias tables. Alternative spellings must return the right results. Typical queries respond in about 300 ms or less at the planning scale (a target).
- **DATA-007 Tuition codes.** Unique integers, displayed `HTR-###`, continuing from the current highest number, never reused. Enforce uniqueness in the database.
- **DATA-008 Salary.** Integer taka; type and period mandatory; fixed monthly salaries at least ৳2,000 unless an override reason is stored.
- **DATA-009 Deduplication.** Detect duplicate tutors by normalized phone and email, and duplicate guardians by normalized phone. Merging is a staff action with a log.
- **DATA-010 Time.** Store UTC. Display Asia/Dhaka. Compute deadlines with a time-zone-aware library and test day boundaries.
- **DATA-011 Bangla text handling.** Never truncate Bangla by character count in code (it can split a conjunct). Use CSS line clamping. Test long names, long addresses and mixed Bangla–English strings.
- **DATA-012 Sorting.** Use locale-aware sorting for Bangla names `[A]`.

---

## 13. Privacy, security and document handling

### 13.1 Data classes
| Class | Examples | Who can see it | Storage and delivery |
|---|---|---|---|
| **Public** | Public tuition fields, information pages, package price list | Everyone | Whitelisted views only |
| **Tutor-private** | Profile, photo, applications, own fee records | The tutor; authorised staff | Database with RLS; private photo bucket with signed links |
| **Staff-private** | Guardian and lead data, exact addresses, private notes, concerns, tutor phone numbers | Roles in §8.3; masked by default | Separate tables; never in public views |
| **Restricted** | Identity and education documents, payment screenshots, ledger adjustments | Named roles, with a reason logged | Private object store; permission check, then short-lived link |

### 13.2 Consent and notices
- **SEC-001.** A privacy notice and tutor terms (Bangla and English) are shown at sign-up, at claim, and before documents are uploaded. They state what is collected, why, who sees it, how long it is kept, and how to correct or delete it. Both are versioned; each consent stores the version.
- **SEC-002.** Consent is separate for matching, for sharing name, photo, institution and subjects with a guardian on shortlisting, and for contact by HTR. Withdrawing consent is possible in settings and takes effect on future actions.
- **SEC-003.** Collect the least sensitive acceptable evidence. National ID is not needed to browse or apply. Staff decide, per check, whether a student ID or certificate is enough.
- **SEC-004.** Student and guardian data is minimised: no student names on public pages or posts; the request form does not collect exact addresses; private notes avoid health or family details unless needed.

### 13.3 Security requirements
- **SEC-010.** RLS on every table in an exposed schema, deny by default, tested (§18.1). Public access only through whitelisted views or functions.
- **SEC-011.** The service-role credential stays on the server. Scan the build output for it.
- **SEC-012.** Server-side validation of every input; output encoding; CSRF protection for cookie-authenticated mutations; rate limits and bot protection on public forms and sign-in.
- **SEC-013.** File uploads: accept JPEG, PNG, WebP and PDF only; limit size (about 5 MB before compression); check the real file type; re-encode images and strip EXIF; random object keys; never execute or serve uploads from the application origin.
- **SEC-014.** Security headers: a Content-Security-Policy (no inline scripts except with nonces), HSTS, `X-Content-Type-Options: nosniff`, a strict Referrer-Policy, `frame-ancestors 'none'`, and a Permissions-Policy.
- **SEC-015.** Secrets live in environment variables, never in the repository. Rotate them when staff change.
- **SEC-016.** Dependencies: use a supported, patched framework version; enable automated dependency alerts; keep a lockfile; review packages an AI builder adds; remove unused ones.
- **SEC-017.** Logs, error reports and analytics must not contain phone numbers, emails, names, addresses or document contents. Scrub before sending.
- **SEC-018.** Staff use individual accounts with MFA and least privilege. No shared logins.
- **SEC-019.** Anti-enumeration: sign-in, reset and claim responses do not reveal whether a person or number exists.
- **SEC-020.** Share previews, Open Graph images and meta tags never contain private data.
- **SEC-021.** No third-party service or AI model receives personal data unless the privacy notice names it. This includes the AI builder, analytics, error tracking and the email provider.
- **SEC-022.** Backups are encrypted, and a restore is tested before launch and then regularly `[A]` (quarterly).

### 13.4 Document handling (R2)
- **SEC-030.** Documents are collected only when a tutor is shortlisted or before confirmation, and only the type staff actually need.
- **SEC-031.** Identity documents, education documents and payment screenshots are stored in a **private** object store, separate from profile photos, with no public URL, public bucket or public custom domain.
- **SEC-032.** Viewing requires (a) a role with permission, (b) a reason typed by the viewer, and (c) an audit entry. The server then issues a link that expires within about a minute `[A]`. Expiring links are not a substitute for the permission check: a link can be shared while it is valid.
- **SEC-033.** Photos and documents are never delivered through Google Drive public sharing or any permanent public link.
- **SEC-034.** The directory table never previews identity documents.
- **SEC-035.** If public avatars are ever introduced, they must be stored and served separately so documents are unaffected.

### 13.5 Retention `[A]` (proposed business policy, not legal advice; owner to confirm)
| Data | Proposed retention |
|---|---|
| Raw identity and education documents | Delete 90 days after successful review. Keep only the outcome, reviewer, date and consent. Extend for a documented open dispute |
| Rejected or incomplete documents | Delete after 30 days |
| Payment screenshots | 12 months after verification `[O]` (confirm with an accountant) |
| Ledger and payment records | As accounting practice requires `[O]` (confirm with an accountant) |
| Applications and status history | While the account exists. On closure keep only what financial records and safety concerns justify |
| Unclaimed imported profiles | Review after 12 months; delete if still unclaimed |
| Concerns | While relevant; owner reviews yearly |
| Audit log | 24 months |
| Backups | Rolling 30 days; deleted data leaves backups on that schedule |

A scheduled job performs deletions and writes an audit entry for each batch.

### 13.6 Legal landscape (informational; not legal advice)
Sources dated 2025–2026 report that Bangladesh gazetted a Personal Data Protection Ordinance in November 2025, amended it in February 2026, and (per one 2026 summary) replaced it with a Personal Data Protection Act in April 2026. Descriptions of the law include consent and transparency duties, individual rights, rules on cross-border transfer and on where certain categories of data may be stored, special protection for children's data, and substantial penalties. Sources differ on details such as data categories, thresholds and compliance deadlines.

**This PRD makes no compliance claim.** Before R1 goes live, a Bangladeshi lawyer must review: the privacy notice and consent wording (including sharing tutor details with guardians and any student-related information); retention; the hosting locations and cross-border transfer implications of the chosen vendors (§15); breach handling; and whether any registration or notification is required. Never claim government identity-database verification or legal compliance in site copy.

### 13.7 Data-subject requests
Tutors can view their data, correct it, withdraw consent, request a copy and request closure from settings. Staff process requests within a period the owner sets `[A]`, log them, and retain only what financial records and safety concerns justify. Guardians can make the same requests by contacting HTR; staff handle them through the guardian and lead records.

### 13.8 Incident response
Keep a one-page procedure: who decides, how to contain (revoke keys, disable the affected route or flag), how to assess what was exposed, and how and when to notify affected people and any authority as the law requires (per the legal review). Test the procedure once before launch.

---

## 14. Data migration

### 14.1 Principles
- **A reviewed, one-time import.** Not continuous two-way synchronisation with the spreadsheet.
- **No silent overwriting or publication.** Conflicts, duplicates and incomplete rows are shown for staff review.
- **Preserve original references** (`legacy_ref`, tuition codes) so history stays traceable. Duplicate tuition references are resolved with staff approval.
- **Sensitive content stays private and minimal.** Family, student, health, financial and address notes are not copied into public descriptions.
- **Real data never enters an AI builder.** The builder receives the schema, this PRD and synthetic data. The import is run by the owner (or a trusted developer) on a controlled machine against the real project.

### 14.2 Sources
1. The **operations register** (a worksheet titled "Admin Pannel 1" was reviewed during planning). It is a tuition and guardian operations register, not a complete tutor directory. Its link is intentionally not reproduced in this PRD. The owner should restrict its sharing before anything else (R0).
2. The **tutor Mastersheet** (about 1,500 records), with photos and documents in Drive folders.

### 14.3 Field mapping (purpose level)
| Source information | Target | Rule |
|---|---|---|
| Tuition reference | `tuitions.code` | Preserve; resolve duplicates by review |
| Status (Available, Processing, Follow Up Need, Booked, Cancelled) | `tuitions.status` | Map to §8.1. **Booked does not mean joined, paid, verified or salary received** |
| Guardian and contact information | `guardians` | Private; normalize phones |
| Lead source | `tuition_private.lead_source` | Private |
| Student class, subjects, days, duration, salary | Public tuition fields | Validate salary type and period; flag salaries under ৳2,000 |
| Area (mixed Bangla and English) | `area_id` | Map through aliases; unmatched rows go to review |
| Exact address | `tuition_private.exact_address` | Private only |
| Tutor requirements and notes | `requirements_public` and private notes | Split public wording from private notes; flag mixed text |
| Selected tutor | Link to `tutors` when matched by normalized phone; otherwise keep as private legacy text | Never creates an account or a verified identity |
| Posting date | `posted_at` | |
| Tutor ID, photo, academic details, classes, subjects, email, phone, online capability | `tutors` and child tables | Photos compressed to the §5.3 sizes |

Data-quality issues seen in planning: repeated tuition references; missing information; mixed Bangla and English area spellings; inconsistent contact formatting; notes mixed into structured columns; selected-tutor details not always complete.

### 14.4 Process
1. Export the sheets to files locally (owner). Work in a separate staging schema that the public API cannot reach.
2. Run automated validation and produce an **exceptions report**: duplicates, invalid phones, unknown areas, salaries under ৳2,000, missing required fields, mixed notes.
3. Staff review and resolve exceptions in `/staff/imports`. Nothing is committed or published without approval.
4. Produce a **dry-run report** (counts by outcome). The owner signs off.
5. Commit in batches tagged `import_batch_id`. The import is idempotent by `legacy_ref` and reversible by batch.
6. Verify counts and spot-check records. Delete staging data after a short period `[A]` (30 days).
7. At cutover, freeze the sheet (read-only) and keep it as an archive until the R3 shadow period ends.

### 14.5 Tutor records and documents
- **Imported tutors are unclaimed.** They are visible to staff only, flagged "not re-confirmed", and never public (R-02). Staff can still search them and use the *Invite to claim* action.
- On claim, the tutor re-confirms availability and accepts the notice and terms (FR-AUTH-004).
- **Do not bulk-migrate identity or education documents** `[A]`. Migrate profile fields and compressed photos. Leave documents in a restricted archive until they age out under §13.5, and re-collect only when a tutor is shortlisted. If the owner decides otherwise `[O]`, documents go only into the private store (§15.3), never into a public bucket, and the migration must be tested on synthetic files first.
- Photo import: compress and resize locally (for example with an image library in a script), upload thumbnails and display sizes to the private bucket, and record the paths.

---

## 15. Architecture, hosting, capacity and cost

Vendor facts below were checked on 20 September 2026 (§22). Prices and limits change. Nothing in this section approves a purchase.

### 15.1 Reference architecture `[A]`
```
Browser (Bangla / English, mobile first)
   │
Next.js 16.x, TypeScript, App Router
   ├─ Server-rendered public pages (tuition board, detail, information)
   ├─ Server actions / route handlers for anything privileged
   │
   ├─ Supabase Auth ............ email + password, Google sign-in, staff MFA
   ├─ Supabase Postgres ........ RLS, whitelisted views, append-only ledger
   │                             └─ scheduled export to private storage (backup)
   ├─ Supabase Storage ......... private bucket: tutor photos (thumb + display)
   ├─ Private object store ..... identity/education documents, payment screenshots
   │                             (Cloudflare R2 by default; server issues short-lived links)
   ├─ SMTP provider ............ account emails only
   └─ Bot protection ........... e.g. Cloudflare Turnstile on public forms
```
Keep database access, file storage and the document store behind small interfaces so a provider, region or country of hosting can change later (§13.6).

### 15.2 Hosting plan and commercial use `[O]`
- **Next.js version.** Next.js 14 is past end of life and outside the framework's support policy. The supported lines are 16.x (active) and 15.x (maintenance; reported to reach end of life on 21 October 2026). **Use the latest patched 16.x release** and keep it updated.
- **Vercel Hobby is not for commercial use.** Vercel's fair-use guidelines restrict the free Hobby plan to non-commercial personal use, and define commercial use to include requesting or processing payment from visitors and any deployment used for the financial gain of anyone involved in producing it. HTR's site promotes a paid service and records fees, so treat it as commercial. **Default `[A]`:** Vercel Pro (reported at USD 20 per seat per month; verify at vercel.com/pricing). **Alternative:** another host whose free tier permits commercial use (verify its terms before choosing). Decide in R0.
- Use separate staging and production projects and environment variables.

### 15.3 Storage decisions `[A]` (owner to confirm; §20 O-07)
| Asset | Default | Alternative | Reason |
|---|---|---|---|
| Tutor photos (thumbnail and display) | Supabase Storage, **private bucket**, pre-generated sizes, signed links after permission check | Cloudinary with authenticated delivery | Personal data; access rules stay with the database policies; about 200 MB at planning scale fits the free 1 GB. Do not rely on paid image-transformation features; generate sizes on upload |
| Identity and education documents; payment screenshots | **Private Cloudflare R2 bucket**; server issues short-lived presigned links after permission check | A private Supabase bucket if volume stays small (about 500 MB or less) | Separate from photos; generous free allowance; no egress charge |
| Public brand and social images | Static assets in the repository, or Cloudinary | | Not personal data |

"Cloudflare Hub" in earlier notes is interpreted as Cloudflare R2 `[A]`; confirm. R2's free allowances are not a spending cap: set billing alerts. Keep the documents bucket private, without a public development URL or a public custom domain. A presigned link is a bearer link, so keep it short-lived and log its use.

### 15.4 Supabase and email notes
- The platform's built-in email service is meant for testing: it delivers only to pre-authorised team addresses and its rate limit is small and can change. **Configure a custom SMTP provider** (Supabase's documentation names SendGrid and AWS SES as examples) with SPF and DKIM. After enabling custom SMTP the default limit is 30 new users per hour, which can be raised in settings. Google sign-in reduces email volume.
- Free-plan projects can be paused after a week of inactivity, and downloadable backups are not available on Free. Pro adds nightly backups kept for up to seven days. Supabase's documentation says you can also run your own backups with tools such as `pg_dump`.
- Choose the nearest available region, subject to the data-residency review in §13.6.

### 15.5 Capacity: illustrative scenarios (not measurements)
Year-one assumptions `[A]`. **Low:** 1,500 tutors, 1,500 tuitions, 6,000 applications. **Expected:** 2,000 tutors, 3,000 tuitions, 15,000 applications. **High:** 5,000 tutors, 8,000 tuitions, 50,000 applications. Per-row estimates: tutor 3 KB; tuition 3 KB; application with its events and notifications 5.5 KB; audit 0.5 KB per entry (about 20,000 / 50,000 / 150,000 entries); ledger and payments 2 / 5 / 15 MB; indexes and overhead ×1.5.

| Item | Free-tier allowance (checked 20 Sep 2026) | Low | Expected | High |
|---|---|---|---|---|
| Database size | 500 MB (Supabase Free) | ≈ 80 MB | ≈ 190 MB | ≈ 600 MB (exceeds) |
| Photo storage (≈110 KB per tutor: display plus thumbnail) | 1 GB (Supabase Free) | ≈ 165 MB | ≈ 220 MB | ≈ 550 MB |
| Document storage (30% of tutors reach verification, two files of 500 KB) | 10 GB (R2 Standard) | ≈ 450 MB | ≈ 600 MB | ≈ 1.5 GB |
| Monthly active users | 50,000 (Supabase Free) | ≤ 1,500 | ≤ 2,000 | ≤ 5,000 |

**Bandwidth matters more than storage.** Supabase Free includes 5 GB of egress plus a separate 5 GB of cached egress; R2 has no egress fee. Illustration: 100,000 photo deliveries at 100 KB is about 10 GB, but at an 8 KB thumbnail about 0.8 GB. Therefore: lists use thumbnails only, detail views use the display size, and only the photos for visible rows are requested.

**Conclusions.**
- 2,000 tutor profiles do not by themselves justify a self-managed server. Profile count alone does not determine database growth, simultaneous traffic or reliability. Applications, events, notifications, the audit log and the ledger accumulate faster than profiles.
- The free tiers can plausibly carry the expected scenario's storage. They should not be promised as permanent or reliable. Free-plan pausing and the absence of downloadable backups are unsuitable once real applications and payment records are live.
- **Rule: do not launch with live ledger data unless backups exist and a restore has been tested** (§15.8).
- Revisit the plan when: the database passes about 400 MB; monthly egress approaches the allowance; sign-ups need more than the email limit; or the legal review requires local hosting.

### 15.6 Cost picture (USD; verify; not approved)
| Component | Free option | Paid option used in the launch recommendation |
|---|---|---|
| Database, auth, photo storage | Supabase Free (pausing, no backups) | Supabase Pro, reported at USD 25 per month (8 GB database, 100 GB storage, nightly backups for up to 7 days) |
| Hosting | Not permitted for commercial use on Vercel Hobby | Vercel Pro, reported at USD 20 per seat per month, or a compliant alternative |
| Document store | R2 free allowance (10 GB, 1 M writes, 10 M reads per month) | R2 Standard beyond that: USD 0.015 per GB-month; no egress fee |
| Account email | A provider's free tier if volume fits (verify) | Low-cost plan if needed |
| Bot protection, basic analytics | Free options exist (for example Turnstile, Cloudflare Web Analytics) | |
| Domain | | Annual registration |

An indicative recurring cost for the launch recommendation is about USD 45 per month plus the domain, before taxes and currency conversion. It is an estimate, not a quote.

### 15.7 Self-managed server
Not recommended for V1. A self-managed server moves security updates, backups, recovery, monitoring, TLS and outage response to the business; its invoice is not its full cost. Revisit only if usage or cost thresholds in §15.5 are reached or the legal review requires local hosting.

### 15.8 Backups and reliability
- Nightly logical backup of the database to the private object store (a scheduled job running `pg_dump` or equivalent), retained per §13.5. This is required even on Pro.
- A restore test before launch and quarterly afterwards `[A]`. Record the date and result.
- Uptime monitor and alerts for storage, egress, database size and billing thresholds.
- Error tracking with personal data scrubbed (SEC-017).

---

## 16. Design system

### 16.1 Tone and content design
Friendly, clear, respectful Bangla. Use "আপনি". Short sentences. Prefer the owner's established terms (Appendix A). Avoid slang and unexplained English abbreviations. Explain fee arithmetic with numbers, never with vague phrases. Errors say what happened and what to do next.

### 16.2 Palette
The plan ranks five palettes. Ranking is a design recommendation, not evidence that one performs better. **Default `[A]`: rank 1**, pending the logo review `[O]`.

| Rank | Palette | Primary | Accent | Background | Text | Character |
|---|---|---|---|---|---|---|
| **1 (recommended)** | **Padma Teal + Mango** | `#0F766E` | `#F4C542` | `#F8FAFC` | `#17252A` | Trustworthy and fresh, with a recognisable highlight for posts; regional resonance (Padma river, Rajshahi mango) |
| 2 | Cobalt + Coral | `#2457C5` | `#F27C67` | `#F7F9FC` | `#202938` | Contemporary career-platform feel with warm accents |
| 3 | Forest + Apricot | `#22634B` | `#F2AF88` | `#F7FAF8` | `#202A25` | Established, academic, not heavy |
| 4 | Cranberry + Sky | `#9D3152` | `#93C5E8` | `#FAF8FA` | `#29242A` | Distinctive editorial identity |
| 5 | Graphite + Citron | `#303638` | `#D6E66C` | `#FAFBF7` | `#202522` | Bold, minimal, job-board feel |

**Contrast (WCAG ratios computed for this PRD).** Text needs 4.5:1 (3:1 for large text); interface boundaries and icons need 3:1.

| Palette | Text on background | Primary on background | White on primary | Dark text on accent | Accent on white |
|---|---|---|---|---|---|
| 1 Padma Teal + Mango | 15.0 | 5.2 | 5.5 | 9.7 | **1.6** |
| 2 Cobalt + Coral | 13.9 | 6.1 | 6.5 | 5.5 | **2.7** |
| 3 Forest + Apricot | 14.1 | 6.8 | 7.1 | 7.9 | **1.9** |
| 4 Cranberry + Sky | 14.4 | 6.6 | 7.0 | 8.3 | **1.8** |
| 5 Graphite + Citron | 15.0 | 11.8 | 12.3 | 11.4 | **1.4** |

**Rule.** In every palette the accent fails 3:1 on light backgrounds. **An accent is a fill behind dark text, or a highlight on a dark band. It is never a thin text colour, outline, icon, focus ring or chart line on a light background.**

**Modern and bold, without losing trust `[A]`.** Keep the interface core calm: pale background, teal for primary actions and links, dark text. Then be bold at defined moments:
- Full-strength **deep teal** (`#134E4A`) bands with white text (9.5:1) and mango highlights (5.8:1) for the hero strip, section headers and empty states.
- Mango fills with dark text for badges such as "New", the primary call to action on dark bands, and social-post backgrounds.
- Large, confident type for salary and area on cards.
- If the owner wants a louder identity overall, choose rank 2 or rank 5. The same accent rule applies.

### 16.3 Tokens (light theme; dark mode not required in V1)
```css
:root {
  /* brand (palette 1) */
  --color-primary: #0F766E;          /* 5.5:1 on white */
  --color-primary-hover: #115E59;    /* 7.6:1 on white */
  --color-primary-contrast: #FFFFFF;
  --color-deep: #134E4A;             /* white text 9.5:1 */
  --color-accent: #F4C542;           /* FILL ONLY; dark text 9.7:1 */
  --color-accent-ink: #17252A;

  /* surfaces and text */
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #17252A;             /* 15:1 on background */
  --color-text-muted: #4A5A61;       /* 6.9:1 on background */

  /* lines and focus */
  --color-border: #D6DEE2;           /* decorative dividers only (1.4:1) */
  --color-input-border: #6B7B84;     /* form controls (4.4:1 on white) */
  --color-focus: #1E40AF;            /* 8.7:1 on white */

  /* status (foreground / tinted background; all ≥ 5.3:1) */
  --status-success-fg: #166534; --status-success-bg: #DCFCE7;
  --status-warning-fg: #92400E; --status-warning-bg: #FEF3C7;
  --status-danger-fg:  #B91C1C; --status-danger-bg:  #FEE2E2;
  --status-info-fg:    #1D4ED8; --status-info-bg:    #DBEAFE;
  --status-neutral-fg: #374151; --status-neutral-bg: #F3F4F6;

  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
}
```
- **Focus.** `outline: 3px solid var(--color-focus); outline-offset: 2px;` on light surfaces, so the ring sits on the page background. On deep-teal bands use a white ring.
- **Status meanings are fixed and labelled in words** (with an icon): success = confirmed, verified, paid; warning = pending, due soon; danger = rejected, overdue; info = under review, shortlisted; neutral = closed, withdrawn, not started. Colour never carries meaning alone.

### 16.4 Typography
- **Bangla:** Hind Siliguri. **Latin:** Manrope. Use a per-script stack so each script gets its own font: `font-family: "Manrope", "Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif;` (Manrope has no Bengali glyphs, so the browser falls back to Hind Siliguri for Bangla text).
- Load through the framework's font optimisation (self-hosted, subsetted for Bengali and Latin, `font-display: swap`).
- Body text at least 16 px; Bangla body line-height about 1.7, Latin about 1.5. No negative or added letter-spacing on Bangla. No uppercase transforms on Bangla. No italics for Bangla body text.
- Amounts use tabular figures where the font provides them, and consistent formatting (৳ 5,000 or ৳ ৫,০০০ by language).
- Never compress line-height or clip descenders and matras. Test with the longest realistic names and addresses.

### 16.5 Motion `[C]` (smooth, but never in the way)
- Brief transitions (about 120–250 ms, ease-out) for filter changes, saving a tuition, application feedback, and page navigation. Skeleton loaders instead of spinners on lists.
- Respect `prefers-reduced-motion: reduce`: remove non-essential motion and keep instant state changes.
- Slow phones and slow connections take priority over effects. Prefer CSS transitions; add an animation library only where CSS cannot do the job, and check its size against the performance budget (§18.5).
- **Not allowed:** scroll hijacking, constant autoplay, decorative animations that delay an action, artificial urgency, fake live counters.

### 16.6 Layout and components
- Mobile first (start at 360 px). Tables become stacked cards on mobile. Filters open as a bottom sheet.
- Touch targets at least 44 × 44 px. Labels above inputs; inline validation; error text tied to the field.
- Components: cards, badges (status), tabs, stepper (application timeline), tables with sticky headers (staff), modals only for confirmations, toasts for feedback with an accessible live region, empty states with a next step.
- Mobile screens prioritise salary, location, subject and class, status and the main action. Desktop supports scanning and comparison without becoming a dense spreadsheet.

### 16.7 Social-post brief (a design constraint now; a generator later)
- **Formats:** square 1080 × 1080, portrait 1080 × 1350, story or reel 1080 × 1920 (keep the top and bottom quarter free of key content).
- **Content:** class and subject, general area, salary and period (or "আলোচনা সাপেক্ষে"), days per week, tuition code, and a clear "apply on the website" call to action. Optional short line on how HTR works.
- **Never** include guardian details, exact addresses, student names or private notes.
- **Look:** deep-teal and mango bands, large salary and area, logo in its clear space (equal to the height of the logo's tallest letter `[A]`), Hind Siliguri for Bangla text, accessible contrast. Keep the visual system identical to the website.
- **Text posts** (Facebook and WhatsApp) are generated in R1 from templates (Appendix C). Image cards are later (FR-GEN-004).

### 16.8 Imagery and logo
- Keep the existing logo. Make modest colour adjustments only after the logo file is reviewed `[O]`.
- Real tutor photographs need permission. Stock or generated people are never presented as verified tutors or real customers.
- Icons: a single consistent outline set. Illustrations optional and neutral.

### 16.9 Accessibility
Target WCAG 2.2 AA. Keyboard-operable, visible focus, sufficient contrast, labelled controls, meaningful `lang` attributes for Bangla and English text, alt text for informative images, error messages announced to screen readers, content usable at 200% zoom, and a check with a mobile screen reader in Bangla.

---

## 17. Analytics and success measures

### 17.1 Events (no personal data in payloads)
`board_view`, `filter_used`, `tuition_view`, `apply_start`, `apply_submit`, `save_tuition`, `signup_start`, `signup_complete`, `claim_submit`, `profile_checklist_complete`, `language_toggle`, `guardian_wa_click`, `request_form_submit`, and staff-side counts derived from the database (no tracking of individual staff behaviour beyond the audit log). Use a privacy-friendly analytics tool `[A]` and list it in the privacy notice (SEC-021).

### 17.2 Measures
Baselines have **not** been measured. They must be collected before targets are fixed. Targets below are initial goals, not results.

| Measure | Definition | Baseline | Initial target |
|---|---|---|---|
| Profile completion | New sign-ups with all required-to-apply items complete within 7 days | To be measured | Set after 4 weeks of data |
| Relevant applications per tuition | Applications received within 48 hours of publishing | To be measured | Set after 4 weeks |
| Conversion | Application → shortlisted → trial → confirmed → joined | To be measured | Track each step; set targets after one full cycle |
| Time to first shortlist | Median hours from publish to first shortlist | To be measured | Reduce against baseline |
| Follow-ups on time | Share of staff tasks completed by due date | To be measured | Rising trend |
| Collection | Share of fee items paid by due date; median days to pay; overdue count; early-payment uptake | To be measured | Improve against baseline |
| Cancellations | Placements cancelled before joining or within an agreed period | To be measured | Track |
| Returning tutors | Tutors active in at least two of the last four weeks | To be measured | Track |
| Adoption | Share of applications entered through the site rather than staff-entered | To be measured | Rising trend |

### 17.3 Usability and performance goals (targets)
- A new tutor can sign up, complete the required profile items and apply within about five minutes on a mid-range phone.
- A coordinator can create a tuition and copy the generated posts within about two minutes.
- Public pages meet the §18.5 performance targets on a simulated mid-range phone over a slow mobile connection.

---

## 18. Acceptance criteria and test plan

A release is accepted only when its tests pass. Tests use synthetic data (Appendix D). Fix failures before continuing to the next release.

### 18.1 Security and privacy (must pass before any real data is loaded)
| ID | Test | Expected result |
|---|---|---|
| T-SEC-01 | Anonymous request for tuitions (page and API) | Only whitelisted columns are returned; compare keys to the allow-list |
| T-SEC-02 | Anonymous read of `tuition_private`, `guardians`, `leads`, `tutors`, `tutor_documents`, `payments`, `ledger_entries`, `audit_log` | Denied |
| T-SEC-03 | Tutor A reads or updates Tutor B's profile, applications, notifications, documents, fees; inserts an application for Tutor B | Denied |
| T-SEC-04 | A tutor tries to set `status`, verification, claim status, `verified` payment status, or any status other than Withdrawn | Denied by the database, not just the interface |
| T-SEC-05 | Anonymous or cross-tutor request for a photo or document object; guessing object URLs | Denied; objects have no public URL |
| T-SEC-06 | Coordinator opens a document or verifies a payment; Verifier opens guardian data or payments | Denied |
| T-SEC-07 | View a document; export data | The document view requires a reason and writes an audit entry; the export writes an `exports_log` entry |
| T-SEC-08 | Scan the production build output | The service-role credential and other secrets are absent |
| T-SEC-09 | Seed unique markers in private fields, then request every public page, JSON response, meta tag and share preview | No marker appears anywhere |
| T-SEC-10 | Claim, reset and sign-in with an existing and a non-existing number or email | Identical responses and similar timing |
| T-SEC-11 | Burst requests to sign-up, sign-in, claim and the request form | Rate limits and bot protection engage |
| T-SEC-12 | Upload a non-image renamed to `.jpg`, an oversized file, an image with EXIF location | Rejected, rejected, EXIF removed |
| T-SEC-13 | Check response headers | CSP, HSTS, `nosniff`, Referrer-Policy, `frame-ancestors`, Permissions-Policy present |
| T-SEC-14 | Dependency audit and framework version | No known critical vulnerabilities; framework on a supported, patched release |
| T-SEC-15 | Seed personal markers, then inspect logs, error reports and analytics payloads | No markers |
| T-SEC-16 | Attempt UPDATE or DELETE on `ledger_entries` and `audit_log` as every role | Denied (policy and trigger) |
| T-SEC-17 | Request a document link; wait past expiry; request another tutor's document link | Link expires in about a minute; the second request is refused |

### 18.2 Fee engine
| ID | Test | Expected result |
|---|---|---|
| T-FEE-01 | Every vector in Appendix B | Exact match |
| T-FEE-02 | Properties over many random bases (2,000 to 100,000): instalments sum to the standard total; `early_total ≤ standard_total`; instalment 1 ≤ instalment 2; no negative balance | Hold for all |
| T-FEE-03 | Boundary times in Asia/Dhaka: payment at 23:59:00 on day 7 and at 00:00:00 on day 8, with the server running in UTC | Day 7 eligible; day 8 not |
| T-FEE-04 | Standard first instalment paid, then switch to early and pay the balance by the deadline | Total equals the early total; status Paid; discount kept |
| T-FEE-05 | Early chosen; nothing paid by the deadline | Standard schedule applies; instalment 1 due at once; no penalty entry |
| T-FEE-06 | Submit the same method and transaction ID twice | Second blocked and flagged; a pending payment does not reduce any balance |
| T-FEE-07 | Verify a payment, then reverse it | A reversal entry restores the balance; nothing is edited or deleted |
| T-FEE-08 | Package examples in Appendix B | Exact match; credit applied before any tutor payment is requested |
| T-FEE-09 | Publish new terms after a placement is confirmed | The placement keeps its accepted version |
| T-FEE-10 | Timely payment reviewed after the deadline but with a provider time inside the window | Discount retained |

### 18.3 Workflow
| ID | Test | Expected result |
|---|---|---|
| T-WF-01 | Every allowed and every disallowed application transition (§8.2) | Allowed succeed with an event row; others are rejected by the database |
| T-WF-02 | Confirm without a second held trial | Refused unless the owner overrides with a reason |
| T-WF-03 | Confirm a placement | Tuition becomes Booked; other pending applications become Opportunity closed and notified |
| T-WF-04 | Cancel the placement and reopen the tuition | Earlier applicants are notified and must apply again |
| T-WF-05 | Tutor withdraws before and after Confirmed | Allowed before; refused after |
| T-WF-06 | Staff-entered application | Source stored; acceptance recorded as staff-recorded; tutor asked to confirm on claim |
| T-WF-07 | Imported tutor: public and other-tutor visibility; claim with a matching and a non-matching number | Invisible to all but staff; identical claim responses; staff approval required |
| T-WF-08 | Publish and unpublish rules | Only published Available or Processing tuitions are public |
| T-WF-09 | Guardian request form | Creates a private lead only; nothing public |
| T-WF-10 | Availability pause | Tutor cannot be shortlisted for new tuitions |
| T-WF-11 | Post generator | Matches the golden outputs (Appendix C); no emoji characters; no guardian phone or address |

### 18.4 Data and search
| ID | Test | Expected result |
|---|---|---|
| T-DATA-01 | য়, ড়, ঢ় typed in both encodings | Both match |
| T-DATA-02 | Bangla and Latin digits in search, salary filter and phone fields | Equivalent results |
| T-DATA-03 | Alternative area spellings (for example Shaheb Bazar, সাহেব বাজার) | Same results |
| T-DATA-04 | Phone formats: `01XXXXXXXXX`, `8801XXXXXXXXX`, `+880 1XXX-XXXXXX` | One canonical value; invalid prefixes rejected |
| T-DATA-05 | Duplicate tutors and guardians | Detected; merge is logged |
| T-DATA-06 | Salary rules: unknown salary, negotiable, fixed under ৳2,000 without override | Never zero; distinct display; blocked |
| T-DATA-07 | Tuition code uniqueness and continuation | No duplicates or reuse |
| T-DATA-08 | Import dry-run on a messy synthetic file | Exceptions report matches the seeded problems; nothing committed without approval |
| T-DATA-09 | Long Bangla names and addresses in cards, tables and posts | No clipping of conjuncts or matras |

### 18.5 Experience, accessibility and performance
Targets on a simulated mid-range Android phone over a slow mobile connection.
| ID | Test | Target |
|---|---|---|
| T-UX-01 | Keyboard-only use of sign-in, apply and staff queue; visible focus | Pass |
| T-UX-02 | Contrast of every text and control pairing | At least 4.5:1 for text, 3:1 for controls and icons |
| T-UX-03 | Reduced-motion setting on | Non-essential motion removed |
| T-UX-04 | 200% zoom and 360 px width | No horizontal page scroll; wide tables scroll inside their container |
| T-UX-05 | Mobile screen reader in Bangla on the board, apply and application list | Understandable order and labels |
| T-UX-06 | Core Web Vitals on `/` and `/tuitions/[code]` `[A]` | Largest Contentful Paint ≤ 2.5 s; Interaction to Next Paint ≤ 200 ms; Cumulative Layout Shift ≤ 0.1 |
| T-UX-07 | First-load JavaScript for `/` `[A]` | About 150 KB gzip or less |
| T-UX-08 | Images | Lists use thumbnails; no public page image over about 100 KB |
| T-UX-09 | Status labels | Every status is text in Bangla and English, not colour alone |

### 18.6 Go-live gates
The go-live checklist in §4 and each release's exit criteria apply. The owner signs off after seeing the passing test report.

---

## 19. Risks and mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Personal data exposed through a publicly readable sheet, Drive folders or an AI builder | Restrict sharing now (R0); synthetic data only for building; RLS tests (T-SEC-01–06, 09) |
| 2 | Non-compliance with Bangladesh's data-protection law (consent, cross-border transfer, children's data) | Legal review before R1 and R2; consent design; minimisation; no public tutor profiles; storage behind interfaces (§13.6, §15.1) |
| 3 | The AI builder ships weak access rules, the wrong framework version or hidden secrets | Pin the stack; staged prompts (Appendix F); security tests; a developer reviews the RLS policies and the fee module before real data |
| 4 | Scope is too large for a solo owner | Staged releases; feature flags; shadow mode for money (§4) |
| 5 | Tutors keep using WhatsApp and do not adopt the site | Staff-entered applications; WhatsApp message links; posts point to listings; claim invitations; measure adoption (§17.2) |
| 6 | Fee logic errors or disputes | One fee engine; test vectors; Bangla canonical wording; terms versioning; shadow mode |
| 7 | Late payment of the media fee continues | Dues process (§7.9); early-payment discount; package deposits; optional application hold |
| 8 | Package promises exceed the supply of tuitions or available cash | Liabilities view; owner-set cap on active packages `[O]`; clear terms; refunds tracked |
| 9 | Free-tier pausing, missing backups or limits cause outages or data loss | Paid plan or own nightly backups; restore test; usage alerts (§15.8) |
| 10 | A hosting plan that forbids commercial use | Choose a compliant plan or host in R0 (§15.2) |
| 11 | Framework end of life and security patches | Next.js 16.x; automated dependency alerts; update cadence |
| 12 | Tutors and guardians bypass HTR | Staff-mediated contact; no public tutor contact; no guardian data on the site; clear terms |
| 13 | Stale or duplicate imported data | Dry run and exceptions report; unclaimed status; claim and re-confirm |
| 14 | Safety incidents at home tuitions | Concern flow (§6.9); staff guidance; verification before confirmation; documented procedure |
| 15 | Bangla rendering or search defects | NFC normalisation; alias tables; font fallbacks; tests (§12, §18.4) |
| 16 | Account email not delivered | Custom SMTP with SPF and DKIM; Google sign-in |
| 17 | Dependence on the owner for every approval | Delegable finance role `[A]`; written procedures; audit log |

---

## 20. Open decisions for the owner

The builder implements the **default now** and keeps the item configurable. "Needed by" is the latest release stage at which the decision must be made.

| ID | Decision | Default now | Needed by |
|---|---|---|---|
| O-01 | First-instalment trigger: **Confirmed = second trial held and guardian agrees** | As stated in §7.4 | R2 |
| O-02 | Fee basis: agreed monthly salary recorded at confirmation, with special cases stated in advance | As §7.1 | R2 |
| O-03 | Cancellation, refund and replacement policy: for each case (guardian cancels after the second trial; tutor stops early; guardian stops paying; failed trial) choose refund, replacement credit, waiver or no adjustment | Staff review; ledger supports all four | R3 |
| O-04 | Dues: reminder cadence (3, 7, 14 days), overdue after 14 days, application hold on or off | Cadence as stated; hold **off** | R3 |
| O-05 | Package rules: delivery definition; window start; qualification and tutor obligations; partial delivery and refunds; unused credit; refundability after use; interaction with the early discount; transferability; cap on active packages | Defaults in §7.10; packages stay behind `packages_enabled` until answered | Before `packages_enabled` |
| O-06 | Public tutor visibility: none at launch. Any later showcase is opt-in, without contact details | None | R1 |
| O-07 | Storage: photos in a private Supabase bucket or Cloudinary; documents in R2 or a private Supabase bucket; confirm "Cloudflare Hub" means R2 | §15.3 defaults | R1 (photos), R2 (documents) |
| O-08 | Documents: do not bulk-migrate; collect at shortlisting; 90-day retention | As stated | R2 |
| O-09 | Hosting plan: Vercel Pro or a host whose free tier permits commercial use | Vercel Pro | R0 |
| O-10 | Framework: Next.js 16.x rather than 14 | 16.x | R0 |
| O-11 | Sign-in: Google sign-in on or off; SMTP provider; staff MFA required | On; provider to be chosen; required | R1 |
| O-12 | Guardian request form: in or out | In (no account, private lead) | R1 |
| O-13 | Roles: Coordinator and Verifier definitions; who verifies payments | Owner verifies payments; delegable | R1 |
| O-14 | Palette and logo: rank 1 with bold usage rules, or another palette, after the logo is reviewed | Rank 1 | R1 |
| O-15 | Post templates and text supplied by the owner (Appendix E) | Placeholders until supplied | R1 |
| O-16 | Legal review scope; retention of financial records (accountant); data residency | Review booked before R1 | R0 |
| O-17 | Photo required to apply | Yes | R1 |
| O-18 | Confirmation-letter wording and language | Bangla and English | R2 |
| O-19 | Whether unclaimed profiles count as available for staff shortlisting | Searchable by staff, flagged "not re-confirmed" | R1 |
| O-20 | Later: approval of any automated messaging channel or payment gateway | None in V1 | After V1 |

---

## 21. Out of scope and later roadmap

### 21.1 Not included without a separate decision
Guardian accounts, a guardian dashboard or a self-service hiring marketplace; nationwide rollout; native mobile apps; a public tutor directory or public tutor contact details; public identity files; live chat; video teaching, live classes and batches; attendance or payroll management; automated AI selection of tutors; subscriptions; paid application credits or any registration fee; online payment gateways; automated WhatsApp, Messenger, SMS or email notifications; continuous two-way spreadsheet synchronisation; electronic signatures.

### 21.2 Later roadmap `[A]`, in suggested order
1. Reconcile payments by uploading provider statements (CSV) and auto-matching transaction IDs, still with staff approval.
2. Saved-search alerts through an approved channel.
3. An approved messaging channel with templates (subject to the provider's terms and cost).
4. Branded image cards for social posts (§16.7).
5. Opt-in shareable tutor profiles (separate consent, no contact details).
6. Richer reports and referral tracking.
7. Installable web app convenience.
8. Batches and live classes as a separate module.

---

## 22. Sources and evidence limits

### 22.1 Checked on 20 September 2026 for this PRD
- Supabase pricing and Free-plan limits: https://supabase.com/pricing (limits cross-checked against several 2026 third-party summaries dated March to August 2026; re-read the official page before purchasing).
- Supabase production checklist (pausing, backups, SMTP limit): https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase email and custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Cloudflare R2 pricing and free tier: https://developers.cloudflare.com/r2/pricing
- Vercel fair-use guidelines and Hobby plan: https://vercel.com/docs/limits/fair-use-guidelines and https://vercel.com/docs/plans/hobby (the USD 20 per seat Pro price is from third-party summaries; verify at vercel.com/pricing).
- Next.js support policy and version status: https://nextjs.org/support-policy and https://nextjs.org/docs/14/pages/llms.txt (end-of-life notice and supported-versions table); end-of-life dates from https://endoflife.date/nextjs and https://www.herodevs.com/blog-posts/nextjs-eol-dates-version-support-timeline (third party).
- Bangladesh data protection (all secondary sources; none replaces the statute or legal advice): The Daily Star https://www.thedailystar.net/tech-startup/news/bangladeshs-personal-data-protection-ordinance-2025-key-takeaways-4015401 · Prothom Alo https://en.prothomalo.com/bangladesh/government/teeopu4dfv · Securiti https://securiti.ai/bangladesh-personal-data-protection-act-overview/ · SCL Insights https://bd-scl.com/insights/personal-data-protection-ordinance-2025-compliance.html · Mahbub & Company https://mahbub-law.com/key-highlights-of-the-personal-data-protection-ordinance-2025-for-businesses/ · Digital Policy Alert https://digitalpolicyalert.org/change/18757-personal-data-protection-amendment-ordinance-2026-ordinance-no-23-of-2026
- Contrast ratios (§16) and fee vectors (Appendix B) were computed for this PRD with the WCAG 2.x relative-luminance formula and the integer formulas in §7.5.

### 22.2 Carried from planning research (not re-fetched on 20 September 2026)
- Porao job board: https://www.porao.com.bd/job-board (job results did not load during research; live behaviour is unverified)
- Tutor Provide: https://tutorprovide.com/
- Caretutors FAQ: https://caretutors.com/faq (the retrieved page showed questions rather than full answers; no precise commission or refund claim is inferred)
- Indeed, application management: https://support.indeed.com/hc/en-us/articles/4412589551757-My-Jobs-Managing-Applied-Jobs
- LinkedIn, saved jobs: https://www.linkedin.com/help/linkedin/answer/a513247
- Upwork, identity verification: https://support.upwork.com/hc/en-us/articles/34397755511955-Identity-verification-Frequently-asked-questions
- Supabase phone sign-in: https://supabase.com/docs/guides/auth/phone-login
- Supabase self-hosting responsibilities: https://supabase.com/docs/guides/self-hosting
- Cloudflare R2 public-bucket boundaries: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Google Drive shared-drive ownership: https://developers.google.com/workspace/drive/api/guides/about-shareddrives

### 22.3 Evidence limits
- The owner's operations worksheet is intentionally not linked here. The worksheet reviewed during planning was an operations register, not a complete tutor directory. The full tutor database has not been inspected.
- No authenticated competitor dashboard was inspected. Competitor observations are from public pages only.
- The existing logo has not been reviewed.
- Capacity figures are illustrations from stated assumptions. Prices are as reported by the sources above.
- Descriptions of Bangladeshi law are from secondary summaries and may be incomplete or superseded.

---

## Appendix A. Glossary and Bangla labels

Suggested labels. The owner or a native reviewer confirms them. They follow the owner's established style of Bangla with transliterated English terms.

### A.1 Terms
| English | Bangla (suggested) |
|---|---|
| Tuition | টিউশন |
| Tuition code | টিউশন কোড |
| Tutor | টিউটর |
| Guardian | অভিভাবক |
| Media fee (placement fee) | মিডিয়া ফি |
| Standard option (60%) | স্ট্যান্ডার্ড অপশন (৬০%) |
| Early-payment (discount) option (50%) | আর্লি পেমেন্ট (ডিসকাউন্ট) অপশন (৫০%) |
| Trial class | ট্রায়াল ক্লাস |
| Confirmation | কনফার্মেশন |
| Joining | জয়েন |
| First salary | প্রথম স্যালারি |
| Package | প্যাকেজ |
| Deposit | অগ্রিম জমা (ডিপোজিট) |
| Credit | ক্রেডিট |
| Remaining balance | অবশিষ্ট পাওনা |
| Days per week | সপ্তাহে কত দিন |
| Negotiable | আলোচনা সাপেক্ষে |

### A.2 Status labels
| Application (English) | Bangla | Tuition (English) | Bangla |
|---|---|---|---|
| Submitted | জমা হয়েছে | Draft | খসড়া |
| Under review | পর্যালোচনায় আছে | Available | উপলব্ধ |
| Shortlisted | শর্টলিস্টেড | Processing | প্রক্রিয়াধীন |
| Trial arranged | ট্রায়াল নির্ধারিত | Follow-up needed | ফলো-আপ প্রয়োজন |
| Confirmed | কনফার্মড | Booked | বুকড |
| Not selected | নির্বাচিত হয়নি | Cancelled | বাতিল |
| Withdrawn | প্রত্যাহার করা হয়েছে | Closed | সমাপ্ত |
| Opportunity closed | টিউশনটি বন্ধ হয়েছে | | |

| Verification (English) | Bangla | Payment / fee item (English) | Bangla |
|---|---|---|---|
| Not started | শুরু হয়নি | Pending review | যাচাইয়ের অপেক্ষায় |
| Submitted | জমা দেওয়া হয়েছে | Verified | যাচাইকৃত |
| In review | যাচাই চলছে | Rejected | গৃহীত হয়নি |
| Verified | যাচাইকৃত | Reversed | রিভার্সড |
| Rejected | গৃহীত হয়নি | Not due | এখনো প্রযোজ্য নয় |
| Expired | মেয়াদ শেষ | Due | পরিশোধযোগ্য |
| | | Partially paid | আংশিক পরিশোধিত |
| | | Paid | পরিশোধিত |
| | | Overdue | বকেয়া |
| | | Waived | মওকুফ |

---

## Appendix B. Fee test vectors

### B.1 Formulas (integers only)
```ts
const standardTotal = (basis: number) => Math.floor((basis * 60 + 50) / 100);
const earlyTotal    = (basis: number) => Math.floor((basis * 50 + 50) / 100);
const standardInstalments = (basis: number) => {
  const total = standardTotal(basis);
  const first = Math.floor(total / 2);
  return [first, total - first] as const;   // odd taka goes to the second
};
// Balance if a tutor who paid instalment 1 switches to early: earlyTotal(basis) - first
```

### B.2 Vectors (all amounts in ৳)
| Fee basis | Standard total (60%) | Instalment 1 | Instalment 2 | Early total (50%) | Early balance after paying instalment 1 | Saving vs standard |
|---|---|---|---|---|---|---|
| 2,000 (minimum) | 1,200 | 600 | 600 | 1,000 | 400 | 200 |
| 2,001 | 1,201 | 600 | 601 | 1,001 | 401 | 200 |
| 2,500 | 1,500 | 750 | 750 | 1,250 | 500 | 250 |
| 3,000 | 1,800 | 900 | 900 | 1,500 | 600 | 300 |
| 3,333 | 2,000 | 1,000 | 1,000 | 1,667 | 667 | 333 |
| 3,500 | 2,100 | 1,050 | 1,050 | 1,750 | 700 | 350 |
| 4,000 | 2,400 | 1,200 | 1,200 | 2,000 | 800 | 400 |
| 4,500 | 2,700 | 1,350 | 1,350 | 2,250 | 900 | 450 |
| 5,000 | 3,000 | 1,500 | 1,500 | 2,500 | 1,000 | 500 |
| 5,001 | 3,001 | 1,500 | 1,501 | 2,501 | 1,001 | 500 |
| 6,000 | 3,600 | 1,800 | 1,800 | 3,000 | 1,200 | 600 |
| 7,500 | 4,500 | 2,250 | 2,250 | 3,750 | 1,500 | 750 |
| 10,000 | 6,000 | 3,000 | 3,000 | 5,000 | 2,000 | 1,000 |

Rounding examples: on ৳3,333, exact 60% is 1,999.8 (rounds to 2,000) and exact 50% is 1,666.5 (rounds half up to 1,667). On ৳2,001, exact 60% is 1,200.6 (rounds to 1,201, split 600 + 601).

### B.3 Scenarios
1. **Standard, no switch.** Basis ৳4,000. ৳1,200 due at Confirmed. ৳1,200 due after the first salary is received. Total ৳2,400.
2. **Early from the start.** Basis ৳4,000. Nothing due at Confirmed. ৳2,000 by 11:59 p.m. Bangladesh time on day 7 (joining date is day 1). Total ৳2,000.
3. **Switch after paying instalment 1.** Basis ৳4,000, ৳1,200 verified, tutor elects early, pays ৳800 within the window. Total ৳2,000; status Paid; discount kept.
4. **Missed deadline.** Early chosen, nothing paid by the deadline. Standard schedule applies: ৳1,200 due at once, ৳1,200 after the first salary. No penalty entry.
5. **Deadline boundary.** Joining date 10 October 2026, so day 7 is 16 October 2026. Provider time 16 October 23:59:00 Bangladesh time is eligible; 17 October 00:00:00 is not.
6. **Review after the deadline.** A payment made at 22:15 on day 7 and verified on day 9 keeps the discount (BR-FEE-008).

### B.4 Package scenarios
| Scenario | Standard: total, credit, owed | Early: total, credit, owed |
|---|---|---|
| Platinum ৳3,000; two tuitions, basis ৳5,000 each | 3,000 + 3,000 = 6,000; credit 3,000; **owed 3,000** | 2,500 + 2,500 = 5,000; credit 3,000; owed 2,000 |
| Gold ৳1,000; one tuition, basis ৳2,000 | 1,200; credit 1,000; owed 200 | 1,000; credit 1,000; owed 0 |
| Gold ৳1,000; one tuition, basis ৳5,000 | 3,000; credit 1,000; owed 2,000 | 2,500; credit 1,000; owed 1,500 |
| Diamond ৳5,000; three tuitions, basis ৳4,000 each | 7,200; credit 5,000; owed 2,200 | 6,000; credit 5,000; owed 1,000 |

The first row matches the owner's example: a ৳3,000 package plus two tuitions with ৳6,000 total media fees leaves ৳3,000 to pay. Credit is applied before any request to the tutor for payment. The rules in §7.10 that are still open (delivery definition, refunds, carry-over) do not change this arithmetic.

---

## Appendix C. Post generator specification

**Purpose.** Replace the manual creation of four outputs for every tuition offer. One saved tuition produces all four, in the owner's fixed formats.

### C.1 General rules
- Templates are stored in settings, versioned, and editable only by the owner. The exact template text is supplied by the owner (Appendix E). Until then, use the skeletons below with placeholders.
- Output uses Unix newlines, no trailing spaces, and only the characters the template contains. **Facebook posts contain no emojis or decorative characters** (test with a pattern check).
- Salary text: fixed amount with period; `৳ আলোচনা সাপেক্ষে` when negotiable; omitted or "Not specified" only per the template when unspecified. Never "0".
- SSC and HSC level tuitions: the Guardian Requirement text includes `পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে` (removable by staff).
- Never insert guardian phone numbers, exact addresses or student names.
- The code is stored as an integer and displayed as `HTR-###` unless the owner's template shows another form.

### C.2 Facebook post
Fields, in the owner's fixed order: **Class, Subject, Tutor Needed, Weekly, Salary, Location**, then the standard closing lines. No emojis or decorations. **No trust note.**
```
{owner-supplied Bangla/English opening, if any}
Class: {class}
Subject: {subject}
Tutor Needed: {tutor_needed}
Weekly: {days}
Salary: {salary}          (negotiable → ৳ আলোচনা সাপেক্ষে)
Location: {area}
{owner-supplied standard closing lines}
```

### C.3 WhatsApp post
One-line headline, then single-line labelled fields, then an optional Guardian Requirement section, then the fixed closing line.
```
{one-line headline}
Tuition Code: {code}
Class: {class}
Subjects: {subjects}
Weekly: {days}
Salary: {salary}
Location: {area}
Start: {start}                  (only if provided)
Guardian Requirement:           (section only if provided)
{requirement text}
আগ্রহী শিক্ষকরা নির্দিষ্ট আবেদন ফরম্যাট অনুযায়ী WhatsApp অথবা Facebook Page-এ যোগাযোগ করুন।
```
An optional **"Why trust Hikmah Tutors Rajshahi?"** block (owner-supplied text) can be appended by a checkbox. Default `[A]`: on for WhatsApp, always off for Facebook. When the tutor application flow moves to the website, the owner may replace the fixed closing line with a link (O-15).

### C.4 Contact-save line
`Tuition - {code_number}`, for example `Tuition - 330`. **Never** start with "HTR".

### C.5 Sheet row
One row in the owner's current sheet column order (supplied by the owner), tab-separated, ready to paste. In "for sheet" mode output **only** the row, with no headline or explanation. This output is retired when the site replaces the sheet (end of the R3 shadow period).

### C.6 Multiple offers
Selecting several tuitions produces one combined post. The **headline states how many offers are for male tutors and how many for female tutors** (wording supplied by the owner). Each offer follows its own block from C.2 or C.3, in the order selected `[A]`.

### C.7 Golden tests
Store golden output files for at least three fixtures per output: a fixed salary; a negotiable salary; an SSC or HSC tuition with a guardian requirement; plus a two-offer combined post with one male and one female requirement. Tests compare output byte for byte after placeholder substitution.

---

## Appendix D. Synthetic seed data

All values are invented. Use markers such as `SYNTHETIC-PRIVATE-MARKER-9001` in private fields so tests can prove they never reach public output (T-SEC-09, T-SEC-15).

```json
{
  "tuitions": [
    { "code": 9001, "class_level": "Class 9", "subjects": ["Physics", "Mathematics"],
      "area": "Shaheb Bazar", "salary_kind": "fixed", "salary_amount_taka": 4000, "salary_period": "per_month",
      "days_per_week": 3, "mode": "home", "tutor_gender_pref": "female",
      "requirements_public": "Prior experience preferred", "status": "available", "is_public": true },
    { "code": 9002, "class_level": "Class 5", "subjects": ["All subjects"],
      "area": "Uposhohor", "salary_kind": "negotiable", "salary_amount_taka": null, "salary_period": "per_month",
      "days_per_week": 5, "mode": "home", "tutor_gender_pref": "any", "status": "available", "is_public": true },
    { "code": 9003, "class_level": "HSC 1st year", "subjects": ["Chemistry"],
      "area": "Kazla", "salary_kind": "fixed", "salary_amount_taka": 3333, "salary_period": "per_month",
      "days_per_week": 4, "mode": "home", "tutor_gender_pref": "male",
      "requirements_public": "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে", "status": "processing", "is_public": true },
    { "code": 9004, "class_level": "Admission", "subjects": ["Biology", "Chemistry"],
      "area": "Online", "salary_kind": "fixed", "salary_amount_taka": 15000, "salary_period": "per_course",
      "days_per_week": 6, "mode": "online", "tutor_gender_pref": "any", "status": "available", "is_public": true },
    { "code": 9005, "class_level": "Class 7", "subjects": ["English"],
      "area": "Kazla", "salary_kind": "unspecified", "salary_amount_taka": null, "salary_period": "per_month",
      "days_per_week": 3, "mode": "home", "tutor_gender_pref": "any", "status": "draft", "is_public": false }
  ],
  "tuition_private": [
    { "code": 9001, "guardian_name": "Sample Guardian A", "guardian_phone": "01XXXXXXXXX",
      "exact_address": "SYNTHETIC-ADDRESS-9001", "private_notes": "SYNTHETIC-PRIVATE-MARKER-9001",
      "lead_source": "facebook_post" }
  ],
  "tutors": [
    { "full_name": "Sample Tutor A", "gender": "female", "institution": "Sample University", "claim_status": "claimed",
      "subjects": ["Physics", "Mathematics"], "areas": ["Shaheb Bazar", "Uposhohor"], "teaches_online": false },
    { "full_name": "Sample Tutor B", "gender": "male", "institution": "Sample University", "claim_status": "claimed",
      "subjects": ["Chemistry", "Biology"], "areas": ["Kazla"], "teaches_online": true },
    { "full_name": "Sample Tutor C (imported)", "gender": "male", "institution": "Sample College", "claim_status": "unclaimed",
      "subjects": ["English"], "areas": ["Kazla"], "legacy_ref": "LEGACY-0001" }
  ],
  "messy_import_rows": [
    { "legacy_ref": "ROW-1", "tuition_ref": "HTR-9001", "area": "shaheb bazar", "phone": "+880 1XXX-XXXXXX", "salary": "৪০০০" },
    { "legacy_ref": "ROW-2", "tuition_ref": "HTR-9001", "area": "সাহেব বাজার", "phone": "01XXXXXXXXX", "salary": "4000" },
    { "legacy_ref": "ROW-3", "tuition_ref": "HTR-9010", "area": "Unknown Para", "phone": "12345", "salary": "1500" }
  ]
}
```
Expected import result for the messy rows: ROW-1 and ROW-2 flagged as duplicate references with matching area (alias resolves both); ROW-3 flagged for an unknown area, an invalid phone and a salary under ৳2,000.

---

## Appendix E. Inputs still needed from the owner

1. The current **logo files** (SVG or high-resolution PNG) and any brand colour values.
2. The exact **Facebook post template** (Bangla and English opening if any) and its **standard closing lines**.
3. The **trust-note text** ("Why trust Hikmah Tutors Rajshahi?") and the **apply-procedure text** (Option 1, the short balanced version, as default; other options if kept).
4. The **Google Sheet column order** for the sheet-row output.
5. The **multi-offer headline wording** stating the male and female counts.
6. The current lists of **Rajshahi areas and aliases**, subjects, class levels and curricula used in the sheets.
7. **Confirmation-letter wording** and language.
8. Answers to **§20 O-03 and O-05** (cancellation and refund policy; package rules).
9. The **published payment number** and the **WhatsApp number, Facebook Page link, call number** for the guardian and tutor call-to-action links.
10. The **domain name** and email sender addresses.
11. Outcomes of the **legal review** (privacy notice, tutor terms, fee wording, retention, hosting locations).
12. Decisions on **hosting plan, storage vendors and Next.js version** (O-07, O-09, O-10).
13. Who will hold the **Coordinator and Verifier** roles at launch.

---

## Appendix F. Staged builder prompts

Give the builder only the sections named in each prompt, not the whole PRD at once. Use synthetic data throughout. After each stage, the builder must run the listed tests, report every failure and every assumption made for `[A]` and `[O]` items, and stop.

**General header for every prompt**
"Follow the PRD strictly. Where something is marked `[O]` or is ambiguous, implement the stated default behind a setting and list it in your report. Never invent statistics, testimonials, counts or reviews. Never use real personal data. Do not implement anything outside the stated release. Use Next.js 16.x (latest patched), TypeScript, Supabase and Tailwind."

**Stage 0. Foundation.** "Read PRD §0, §1, §2, §8, §9, §12, §13, §15 and Appendix D. Create the project, the R1 database schema and migrations (§9.2–§9.5 and the R1 parts of §9.7), Row Level Security for every table (§9.8), the `public_tuitions` view, reference-data seeds, server helpers for audit and notifications, and the seed data. No documents, fees or packages. Run T-SEC-01 to T-SEC-06, T-SEC-08 and T-SEC-16."

**Stage 1. R1 public and tutor features.** "Implement §5.1 to §5.4, §5.6 and §5.7, the public and tutor routes in §10, in-site notifications (§11), search rules (§12), and the design tokens and components (§16). Run T-SEC-03, T-SEC-04, T-SEC-09 to T-SEC-13, T-WF-05, T-WF-07 to T-WF-10, T-DATA-01 to T-DATA-04, T-DATA-06 and T-UX-01 to T-UX-09."

**Stage 2. R1 staff features.** "Implement §6.1 to §6.5 and §6.8 to §6.10, the staff routes in §10, the WhatsApp message links and templates (§11), Appendix C with placeholders and golden tests, and the import staging and review screens (§14). Run T-SEC-06, T-SEC-07, T-SEC-15, T-WF-01, T-WF-06, T-WF-11, T-DATA-05, T-DATA-07 to T-DATA-09."

**Stage 3. R2 verification and placement.** "Implement the verification states in §5.3, document handling in §13.4 behind an interface with the private R2 adapter, document gating in §6.4, and trials and placements in §6.6 and §5.5. Run T-SEC-05, T-SEC-07, T-SEC-17, T-WF-02 to T-WF-04."

**Stage 4. R3 money, in shadow mode.** "First implement the fee engine as a pure module with unit tests for every vector in Appendix B (T-FEE-01 to T-FEE-03), with no user interface. Then implement §7.6 to §7.10, the tutor and staff fee screens, the ledger with immutability, dues reminders, and packages behind `fees_enabled` and `packages_enabled`. Run T-FEE-01 to T-FEE-10 and T-SEC-16."

**Stage 5. Hardening.** "Run every test in §18. Produce a report. Review all RLS policies, the fee module and the document-access code line by line. List dependency vulnerabilities and the framework version. Check performance budgets and accessibility."

*End of document.*
