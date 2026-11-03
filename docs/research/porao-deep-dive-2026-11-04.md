# Porao deep dive: how their admin side works

Checked 4 November 2026. Follows `competitors-2026-10-19.md` (read that first for stack and page weight).

Method: public pages in the browser, the public JavaScript bundle (`assets/index-*.js`, 1.3 MB, read, not run),
response headers, the public guardian form, and **one** page of the public job-board API, which was summarised as
counts and then deleted. No account was created, nothing was submitted, the admin panel was not touched.
Porao's terms forbid automated access, so this stops here; no repeat crawling.

We cannot see the admin screens. Everything under "admin workflow" is reconstructed from the data the admin screens
write (field names, status values, timeline events) and from the tutor-facing text that explains them.
**Seen** = observed directly. **Likely** = inference, reason given.

---

## 1. The systems behind it

| System | What it does | Evidence |
|---|---|---|
| `porao.com.bd` | React SPA for tutors, parents, coaches | Seen |
| `dashboard.porao.com.bd` | **Laravel** API plus the staff admin panel | Seen: `porao_admin_session` cookie on the root, `/api/*`, `/storage/` |
| `crm.porao.com.bd` | **Perfex CRM** (off-the-shelf PHP CRM): guardian leads and support tickets | Seen: `/forms/wtl/<hash>` (Perfex "web to lead") and `/forms/ticket` |
| `shop.porao.com.bd` | Separate shop | Seen |
| bKash, Nagad, OneSignal push, SMS, AnyChat live chat, Messenger, Instagram, WhatsApp | Payments, notifications, chat | Seen |

So staff work in **two tools**: the CRM for incoming guardian leads and tickets, and the Laravel dashboard for
tuitions, tutors, invoices and wallets. **Likely** a lead is copied by hand from CRM to dashboard (no link field
between them in the job record; the job has its own `source_id`).

## 2. The admin workflow, step by step

### Step 1 — Lead comes in
Channels (Seen): public "Hire tutor" form, phone hotline, live chat, Messenger/Instagram/WhatsApp, parent sign-up in
the app, **tutor-referred leads**, and affiliate partners (`affiliate_partner_id` on the job).

- The public guardian form has only **four fields**: name, student's class, location (free text), phone. It posts
  straight into Perfex CRM. Everything else is collected by phone.
- **Tutor-referred leads** ("My Leads"): a tutor enters a guardian's name, phone, class and address. Copy:
  *"We verify it, and you earn commission once it's confirmed."* Has its own stats page.
- Referral codes at sign-up, with a bonus status per user.

### Step 2 — Staff turn the lead into a tuition job
One record (`tuition_job_offer`) holds everything. Fields grouped as an admin form would:

| Group | Fields |
|---|---|
| Student | name, gender, class, institute, number of students |
| Tuition | category (Bangla Medium / English Version / English Medium), subjects (many), tutoring place (student home, online), days per week, time, session length, job duration, hiring date |
| Money | **`actual_salary` and `salary_for_tutor` as two fields** (the gap would be a hidden margin; on the page checked they were equal), per-category and per-class `charge` lookup values |
| Tutor wanted | gender, religion, university type, current year, board, group, curriculum, education level, exam title, specific universities / departments / colleges / schools |
| Place | city → area (each area has lat/lng), full address, flat/house, road, map pin |
| Internal | `priority_level`, `special_note` (shown to tutors), **`staff_note` (internal)**, `source_id`, `created_by`, **`assigned_to` (owning staff member)**, `assigned_at`, `followed_by` / `followed_at` (follow-up owner) |
| State | `status`, `is_active`, `is_open`, `is_sms_send` |
| Counters | `job_views`, `total_application`, **`new_application`** (applications staff have not opened yet) |
| History | `timeline`: list of `{event, user_id, time}`; seen events `created`, `updated`, `tutor_assigned` |

On the page checked every job had an owner (`assigned_to`) and a staff note; none had a follow-up owner or an SMS sent.

### Step 3 — Publish and push
Job goes to the board; staff can blast SMS to matching tutors (`is_sms_send`), app push (OneSignal), and a Facebook
group. Popups for announcements are managed from the admin (`/api/public/popups`).

### Step 4 — Tutors apply, staff screen
- Apply needs **≥ 80 % profile completion** (Seen, enforced in the app).
- Each application stores a **`match` score** (0–90 seen, steps of 10), **likely** computed by the server from the
  job's "tutor wanted" fields vs the tutor's profile. Staff sort by it.
- Staff opening an application sets `viewed_at` / `viewed_by`, which clears it from `new_application`.

### Step 5 — Status ladder (one timestamp per step, with who did it)

```
Applied ─► Shortlisted ─► Guardian chooses ─► Appointed ─► Confirmed ─► (Closed | Cancelled)
          short_listed_at/by  parent_choose_at   appointed_at   letter + invoice
                              parent_request_accept
```
Tutor sees five tabs with counts: Applied, Shortlisted, Appointed, Confirmed, Cancelled. Application `status`
values seen: empty (applied), `assign`, `closed`.

- **Guardian chooses from the shortlist** (tutor requests in the parent app; parent can accept a request).
- **Appointed** = tutor gets the guardian's contact (terms: *"Once you are assigned a tuition job (e.g., guardian's
  contact number), you cannot cancel"*).
- Female tutors must bring someone to the first meeting (terms).

### Step 6 — Confirmation and the platform charge
- A **confirmation letter** (PDF) per confirmed tuition, listed under "Conf. Letters".
- An **invoice** for the platform charge, due **within 7 days** of confirmation. Pay by bKash, Nagad, or wallet.

| Tuition type | Platform charge (of one month's salary) |
|---|---|
| Home or online | 60 % |
| Crash program, or a 2-month job | 40 % |
| 1-month job | 20 % |
| Address verification (one-time) | BDT 500 |

### Step 7 — After confirmation: the "deal"
Each confirmed tuition becomes a **deal** with a **message thread between tutor and admin team** (feedback,
problems). There is a **class routine** per tutor + student + job. **Likely** used for follow-up calls in month 1.

### Step 8 — Cancellation and refund (admin investigates)
- Tutor must tell Porao within **24 h** of the guardian cancelling, and within **45 days** of confirmation.
- An "investigation team" decides whose fault it was. Tutor's fault → no refund.
- Refund = charge paid − 25 % of salary already received (never below 0). Goes to the **wallet**; Porao has
  **30 days to find another tuition**, else pays it out. Refund money can pay invoices but cannot be withdrawn.
- Wallet has a ledger, statements (PDF), withdrawals with cancel, and a **frozen** state.

### Step 9 — Discipline
Temporary or permanent **bans** for tutors and guardians, with listed reasons. Banned tutor cannot apply; a
banned guardian's requests are not approved for the board.

## 3. Tutor vetting

- **Profile completion score** with fixed weights (Seen): Personal 30 (picture 5, about 3, date of birth 2,
  present location 5, permanent address 5, emergency contact 5, …), Education 30, Tutoring 25 (category 6,
  location 7, salary & style 6, availability 4, experience 2), Documents 10, Parent information 10.
- **Address verification**: pay BDT 500, Porao **posts a letter with a code to the tutor's address**, tutor enters
  the code (apply → verify OTP → status). Changing address later costs a new delivery fee. Gives a "Verified
  Tutor" badge.
- Marketing claims interviews and "only the top 20 %"; nothing in the app shows an interview step.
- Phone OTP at sign-up; tutor can also create a parent profile and switch accounts.

## 4. Other features
CV builder (PDF), public tutor profile preview, "Tutor Hub" listing, coach role (hire a coach), online lessons
and live tutoring, PoraoAI chat (Gemini, called from the browser), community, shop.

## 5. What this means for Hikmah

Worth taking (patterns, our own build):
1. **One record from lead to job.** Porao splits CRM and dashboard; Quick Pad lead → tuition in one place is
   already better. Keep it that way.
2. **Owner, follow-up and timeline on every tuition**: `assigned_to`, next follow-up date, and an append-only event
   log (fits our trigger rule). Even with Owner-only now, the log is what makes disputes and refunds decidable.
3. **Public note vs staff note** as two separate fields.
4. **"New applications" counter** per tuition, cleared when the owner opens them.
5. **Match score** on each application, from the tuition's requirements vs the tutor profile. Ours can show *why*
   ("same area, female, HSC Science").
6. **One timestamp per status step** (`shortlisted_at`, `appointed_at`, `confirmed_at`) instead of a bare status.
7. **Profile completion gate** before applying, with visible weights.
8. **Clear refund rule with a worked example**, when money features come.
9. Tutor-referred leads, later (needs commission tracking).

Worth avoiding:
- Their public job API returns far more than the card shows (internal and location-level fields). Our loaders
  must return only what the viewer may see (CLAUDE.md "Never" list).
- Four-field guardian form then a phone call for everything else: fine for them, but our Quick Pad already
  captures the full job during the call.
- 1.3 MB single JS bundle plus heavy trackers.

## 6. Signed in as a tutor (owner's own account, same day)

Read only: nothing applied for, submitted, paid or changed.

- **Dashboard**: count strip (Applied · Shortlisted · Appointed), a banner for an unpaid invoice with "View
  invoices", profile % card, an admin **Notice Board** (the one notice was a promotion from Feb 2025, still showing
  in Nov 2026), wallet card, member-since date. Bottom bar on phone: Home · Profile · Jobs · Settings.
- **Board**: 742 jobs nationwide. Each card shows a **match % bar** and the **distance in km** from the tutor's
  location, salary, days/week, subjects, area, posted time, wanted gender, Job ID, save. A side panel explains the
  80 % rule. Filter: tuition type (home / online / group), category, class, city, area, subjects, Job ID, salary
  band (2–5k, 5–8k, 8–12k+), **radius 1–50 km**, tutor gender.
- **Job page**: "Need Tutor For Class Nine", "Possible Match" badge, area plus a **landmark-level address visible to
  every signed-in tutor**, salary, Job ID, **hiring (start) date**, posted time, a details grid, qualification
  lines **generated from the structured requirements** ("Must be from Science background"), **applicant count and
  view count**, Apply, Share, Direction (map).
- **Invoices**: applying for address verification created a BDT 500 invoice with a due date at once; it shows
  as a pending banner on the dashboard until paid.
- **Address verification**: "We've sent an OTP to your physical mailing address", then a code box.
- **Wallet**: permanent wallet ID (`<number>@porawallet`), history, deposit, PDF statements, withdraw.
- **Refer a tuition** (tutor-sourced leads): guardian name, phone, class, address, note. Lead statuses shown to
  the tutor: **Under review → Job posted → Tutor assigned → Successful → Commission paid**, or Closed / Unsuccessful.
- **Settings**: personal info, password, social media, account status (locked / unlocked), payment info (bKash,
  Nagad, Upay numbers for payouts), a Bangla pitch to turn on push.
- **Profile**: % bar, star rating, profile view count, **Download CV**, Overview / Students tabs.

## 7. Unknowns
- The admin screens themselves, staff roles and permissions.
- How `match` is calculated; what `priority_level` changes (ordering? SMS?).
- Whether guardians pay anything (a parent invoice page and "Payment Pending For Tuition Matching" text exist).
- Whether `actual_salary` ≠ `salary_for_tutor` is ever used.
