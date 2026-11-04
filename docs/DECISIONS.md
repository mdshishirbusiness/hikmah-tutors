# Decisions and departures from the PRD

`docs/PRD.md` (v1.0, 20 Sep 2026) is the product spec. Where this file differs, this file wins.
Newest first. Each entry: what was decided, by whom, and why.

## 2026-11-05 (Profile: folding sections and a progress line)

- **Done sections fold** (owner: the Profile looked messy). A section on `/me/profile` folds to one line once every
  checklist step pointing at it is done: icon with a green check, the title, and a summary of what was picked
  ("Rani Bazar", "৳3,000 or more", "SSC 4.94 · HSC 4.58"). Tap to open. It folds on load and after a successful
  save, never while the tutor is typing; any link to its `#id` opens it. Study and results counts as done when both
  GPAs are in or HTR has checked the profile. Students you've taught never folds: adding students is the point.
  `SectionCard` folds when given `done`; without it nothing changes, so other pages are untouched.
- **A completion line, not a scroll bar** (owner asked about a scroll progress bar like Towfique HSC's; Claude
  proposed this instead and the owner agreed). Sticky above the jump chips: the same percent as the ring, one segment
  per section (emerald when done), and "Next: …" to the first unfinished step. Reaching 100% shows "Profile complete"
  for a moment, then only the chips stay. A plain scroll bar may come later on long reading pages only (terms,
  guides), with CSS scroll-driven animation and no JavaScript.

## 2026-11-05 (tutor side vs Porao and Tutor Provide)

Context: `docs/research/tutor-side-compare-2026-11-05.md`. The owner picked five ideas (7, 8, 13, 1, 2); the details
are Claude's (migration 0021).

- **Seen by HTR.** An application gets `seen_at` the first time the owner opens it in the tuition's applicant list.
  The tutor's Applied card says "Seen by HTR" (with when); any step past New also counts as seen. It does not change
  the status: In review still means HTR is talking to the guardian.
- **How guardians see you.** Profile shows the tutor the exact WhatsApp summary the owner sends a guardian, one level
  at a time, with each missing line marked and linked to its section. It says what never goes: phone (until
  Selected), photo, Facebook, address.
- **When you're free.** Tutors pick Morning · Noon · Afternoon · Evening · Night, or Any time (`tutors.free_times`;
  not answered never hides anything). For You leaves out a tuition at a time the tutor isn't free; the apply sheet and the applicant list only
  warn (only gender blocks, as before). A tuition with Flexible time, or no time, never clashes. New profile step,
  weight 1.
- **Home counts** (Open · Shortlisted · Selected · Confirmed) stay hidden until the tutor's first application, so a new
  tutor never sees a row of zeros. The strip itself was already built.
- **Guardian status link.** From a tuition, the owner makes a private link (`/s/<token>`) and sends it on WhatsApp.
  The page shows that one request's steps (Received → Posted → Tutors applied → Shortlist → Tutor selected →
  Confirmed), the applicant count and the selected tutor's first name and code. Never a tutor's phone, photo or
  university details beyond the summary, and nothing about other guardians. No login; the token is stored only as a
  hash, a new link replaces the old one, and the page is noindex with no referrer.

## 2026-11-05 (documents at registration)

- **A new tutor sends proof of education when registering on the site** (owner). At least one academic document is
  required: a student ID card is the usual one, but a tutor without it (a new student, say) may send an admission slip,
  result sheet, certificate or other proof. Up to 5 academic documents may be sent to strengthen the profile.
- **NID is optional extra security** (owner) and never counts as the required document. It supersedes none of
  PRD SEC-003: NID is still not needed to browse or apply.
- **Where they live** (Claude): table `tutor_documents` (migration 0020), files in the private R2 bucket under
  `docs/`. Only the admin and the tutor see them, via `/docs/tutor/:code/:id`; each admin view is written to
  `audit_log` (`doc_viewed`). They never appear in lists or tables, and never to guardians or the public. Photos are
  shrunk to 1600 px on the phone (no crop, hidden details such as location dropped) before sending.
- **Not changed**: tutors from the sheet keep their documents in Drive; they never see the registration form.

## 2026-11-05 (part E: Premium Tutor, agreed with the owner in three rounds)

- **The 28–29 Oct Pro rules stand** (owner): the price is 50% of the tutor's minimum salary, as the media fee paid
  in advance. The 90 days run from the day HTR verifies the payment, with no refund before day 90. 3 problems end
  Premium with a 50% refund; misconduct ends it with no refund. Tutors apply first and pay only after HTR accepts.
  Priority only among equally suitable tutors. Admin and the tutor see Premium; guardians and the public never do.
- **No cap on Premium tutors** (owner; replaces the pilot's 10). To keep the 90-day promise, the admin list shows
  each tutor's day count and a "No tuition after 60 days" group, and HTR may decline areas or classes with few
  tuitions (Claude, owner agreed).
- **No pilot members to bring in**: the Google Form was never published (owner).
- **Price**: rounded to the nearest ৳100; the minimum salary is at least ৳2,000, so the price is at least ৳1,000.
  Shown live as the tutor types.
- **One delivered tuition ends Premium** (first salary received and the remaining fee paid); the tutor may buy
  again. The fee left is 50% of the real salary minus the deposit, within 7 days of the first salary.
- **Payment is manual**: the tutor sends money by Send Money or Cash In and enters the number used, the TrxID and
  the amount; the admin verifies. HTR's payment number shows only after HTR accepts the tutor.
- **Only tutors who have finished the required Profile steps can apply.** The form is short: minimum salary,
  areas and classes confirmed, terms accepted. Voice note and teaching sheets wait.
- **What "matching tuition" means is saved when HTR accepts** (areas, classes, subjects, minimum salary); the
  tutor sees it on their Premium page.
- **Problems** (the old yellow cards, in plain words): no reply within 12 hours, refused a matching tuition, wrong
  profile details, a tuition found elsewhere (1 each), trial missed through the tutor's fault (2). The tutor sees
  "সমস্যা: 1 of 3" with the reason.
- **Tutor page `/me/premium`**: what Premium gives (Bangla), a preview of how their application looks to HTR with and
  without Premium, the terms as promises on both sides, the form, then their status, cards, days left and problems.
- **Admin page `/admin/premium`**: Applied, Awaiting payment, Active, Ending soon, Ended. A mango Premium chip on
  applicants; in the applicant order a Premium tutor moves to the top of their own Strength level only.
- **Reminders**: verifying a payment creates a follow-up for day 85 ("refund or renew"); a refund still due 7 days
  after it fell due shows red on Today.
- **Cards drawn in the browser and sent on WhatsApp** (owner's suggestion, from the Towfique HSC English app's
  share cards): Welcome, Payment receipt (PRM-0001…) and Refund receipt, drawn on a canvas with no library. On a
  phone the share sheet puts the picture into WhatsApp; on a computer it saves as a PNG. Every step also has a
  WhatsApp text button. The tutor can save their welcome card; there is no public-share button. A "You're
  Selected" card for every tutor may come later.
- **Terms**: Claude drafts them in Bangla; the owner reviews them before they go live.
- **Honest before every application** (owner): the page always says that a tuition is a matter of rizq ("রিযিকে
  থাকলে ইনশাআল্লাহ পাবেন"), that HTR will try its very best, and that Premium is not a guarantee, and it encourages
  patience. The apply tick says so too, and the same note stays on the page while a term runs. The accepted and
  verified WhatsApp messages carry one line of it.
- **Designs that make tutors want to join** (owner: "more interesting, to inspire others"). Claude's design:
  - The tutor sees their own **Premium pass**: a mango ticket with their photo and a stub with the days, notched
    like the ticket card the owner chose for the board. One light sweep when it appears.
  - **"Watch your name move up"**: an example applicant list where their row rises from 4th to 1st among Good,
    still below the Strong tutor. Other applicants are blank rows, not invented people.
  - **A fee bar** under the minimum salary: a sample tuition's fee split into the Premium part (paid now) and the
    rest (after the first salary), so "not an extra fee" is visible.
  - How it works in 4 coloured steps; the promises in three coloured blocks; a count of Premium tutors once there
    are at least 5 (a number only, never who).
  - The welcome card is the same pass, drawn large; receipts are paper receipts with a VERIFIED or REFUNDED stamp.
- **English digits in Premium's Bangla text too** (CLAUDE.md language rule), e.g. "90 দিন", "24 ঘণ্টা".

## 2026-11-05 (owner's round after part D)

- **"Late" now says what passed, in Bangla**: "2 ঘণ্টা পার", "3 ঘণ্টা পার", "6 ঘণ্টা পার", "1 দিন পার". Each Today
  section has a one-line Bangla rule under its heading (e.g. "নতুন গার্ডিয়ান: 2 ঘণ্টার মধ্যে কল করুন।").
- **Posts in the owner's own templates** (`facebookPost`, `whatsappPost` in `app/lib/whatsapp.ts`). The tuition page
  has two Copy buttons.
  - Facebook: no link, because links cut a post's reach. Tutors comment or inbox "Interested" and get the apply link.
  - WhatsApp: ends with the site's apply link for that tuition (it was a Google Form link).
  - Both: no emoji, no guardian details. SSC/HSC posts add "পূর্ব অভিজ্ঞতা অগ্রাধিকার পাবে" unless "experience" is
    already picked.
  - The sheet-era TSV row and the mobile-save name are not needed, now that the site replaces the sheet.
- **WhatsApp buttons in WhatsApp green** (`.wa-btn` in `app/app.css`: #25D366 with dark text; white on it is under
  3:1). Text links use `.wa-text`.
- **Install as an app**, until there is a Play Store app:
  - The web app manifest and icons, including a padded "maskable" icon for Android.
  - **Install app** buttons in the phone menu, the footer and admin. Android and desktop Chrome open their own prompt;
    an iPhone shows "Share → Add to Home Screen".
  - No service worker, so nothing is cached and data is never stale.

## 2026-11-05 (part D: follow-ups, notes, Today)

- **Follow-ups** (migration 0017): a reminder on a guardian, tutor, lead or tuition, with a due time and a short note.
  - **Follow up** button: on the lead card, the guardian page, the tutor page, the tuition page and the applicant
    panel. Its note starts with "HTR-<code>:" when set from the applicant panel.
  - Quick times in Dhaka time: Today evening (7 PM, or In 1 hour when it's late), Tomorrow 10 AM, In 3 days, Next
    week, or a picked date. Bangla note hints are one tap.
  - Due ones show first on Today. Late ones are rose, with "N ঘণ্টা দেরি".
  - **Done** (optional outcome) or **Tomorrow** (moves to 10 AM).
  - Today's menu item counts follow-ups already due. Reminders appear in the site only.
- **Notes timeline** on guardian and tutor pages ("Notes and follow-ups"): add a note any time.
  - A finished follow-up's outcome lands there with a green dot.
  - Outcomes from a lead or tuition follow-up go to that guardian's notes, found by the lead's guardian or phone.
- **Today in Bangla**: helper lines under each to-do are Bangla with English digits ("নতুন লিড · 3 ঘণ্টা আগে",
  "সিলেক্ট 2 দিন আগে, এখনো কল করেনি"). Titles and labels stay English.
- **Two donuts** on Today: where leads came from and what happened to tuitions posted, both over 90 days.
  - Colours validated with the dataviz checker: emerald, amber, blue, rose, violet, with past five folded into a grey
    Other.
  - Every slice has its number and share in the legend, because amber is under 3:1 contrast.

## 2026-11-05 (part C: applicants ranked by Strength)

`app/lib/strength.ts`, out of 100:
- **Experience at the tuition's level**, up to 50:
  - students taught there (counts fully at 10)
  - years (fully at 4)
  - students listed at that level (fully at 3)
  - listed students with a result or an improvement (fully at 2)
- **Written for the level**, up to 30: how they teach 12, a student they helped 8, habits 6, About 4.
- **With HTR**, up to 20: placements (fully at 3) 14, demos (fully at 3) 6. Minus 5 for each tuition that didn't work
  out for the tutor's own reasons. "Guardian chose someone else" does not count against them.

Gender, area, subjects and university are not in the score. Only a real problem shows, as a small warning: gender,
none of the subjects, or not the university asked for. Applicants further along stay first (Selected before New). Within
a step, the order is Strongest by default; Best fit, Newest and Oldest stay as choices.

The side panel opens with the Strength and its three parts. Then this level's experience (numbers, habits, how they
teach, the story) and the students they've taught, this level first. Then the checks, problems first.

## 2026-11-05 (part B, second pass: owner's design feedback)

The owner said the first Profile progress and section headings looked AI-made, and asked again for colour separation.
Standing preferences are now in Claude's memory: the design bar, colour separation, two or three test records, and
writing every suggestion down.

- **Header logo**: the full logo (`public/brand/logo.webp`, cut by `scripts/make-logo-mark.mjs` on a transparent
  background), not the mark with the name typed beside it. The footer and admin keep the mark on a cream tile, because
  they sit on dark green.
- **Sections**: each has a tinted header band in its colour (white icon tile, eyebrow, title, hint), over a white body
  framed in the same tint. Colours: emerald, amber, sky, violet, rose and slate. Profile parts are numbered chapters
  (01 Teaching, 02 Experience, 03 Academic, 04 About & skills).
- **Profile progress**, inspired by a task-card video the owner sent (not copied):
  - a light card with a ring that fills to the real percentage
  - a bar split into one coloured segment per group
  - the next step as one highlighted row with what it adds
  - tapping opens a step tree, grouped by colour, with check circles
  - motion stays short, and stops under reduced motion
- **Students you've taught** (owner's idea; migration 0016): the tutor adds students one by one:
  - class, area, subjects, from and to (or "still teaching"), result before → after, and what improved
  - quick Bangla phrases help with "what improved"
  - no names are asked
  - shown as a timeline to the tutor and on the admin tutor page
  - the first student is the heaviest step in the progress score; up to 20 students per tutor

## 2026-11-05 (plan agreed with the owner, Q1–Q16)

Agreed in a question round. Built in this order: A → B → C → D → E.

- **A. Quick fixes.**
  - Subjects are a tick list again (the combinations dropdown was hard to use).
  - "Didn't work out" and its reasons are in Bangla.
  - Lowest salary: quick amounts plus a box to type any amount. No range, because a top limit would only hide
    tuitions from the tutor.
  - Section headings get a soft tinted icon tile, the title in forest, a grey hint and a thin coloured accent line,
    the same on every page. No emoji.
- **B. Tutor Profile.**
  - Five sections with jump chips: Availability, Teaching, Experience, Academic, About and skills.
  - Experience, for each level the tutor teaches (Junior / SSC / HSC):
    - students taught and years
    - how I teach
    - habits as taps: notes, regular tests, homework, reports to guardian
    - a student I helped (optional)
  - Experience is prefilled from the sheet's statements; most tutors already have them, e.g. SSC approach 967, Junior
    experience 812.
  - Academic is locked after approval.
  - An animated progress bar with the next step highlighted. "Complete profiles are shown to HTR first" is true,
    because completeness feeds C.
- **C. Applicants ranked by Strength for this tuition.**
  - Order: experience at its level first, then how complete the profile is for that level, then the record with HTR.
  - Gender and area only show as warnings.
  - The side panel opens with that level's approach and story.
  - No AI ranking for now: it would send tutors' details to an outside service. Revisit later.
- **D. Follow-ups and notes.**
  - A follow-up is a reminder on a guardian, tutor, lead or tuition, with a due date (and time) and a note.
  - Created from those pages with quick choices (Today evening, Tomorrow, 3 days, Next week, a date).
  - Shown on Today, red when late, with a count. Done (optional outcome) or Later.
  - A notes timeline on guardian and tutor pages.
  - Reminders appear in the site only, for now.
- **D, admin.**
  - Short labels stay English. Helper lines, tips, reason lists and follow-up notes are Bangla.
  - Today keeps its charts and adds two donuts: lead sources and tuition outcomes, each with a legend and numbers.
- **E. Premium Tutor**, after B and C.

## 2026-11-04 (site review, step 3: one set of request fields)

The owner approved step 3. They asked for the forms to reflect what guardians actually ask, Bangla where it sounds
better and English where it is clearer, and a time window such as "2:00 PM to 6:00 PM". Choices:

- **One set of pickers** (`app/components/RequestFields.tsx`) for Quick Pad, the guardian form and the tuition
  editor (New tuition and Details):
  - classes grouped by level, with **Other + a box** for the guardian's words (shown on the board, e.g. "Hifz class");
  - subjects with **Other + a box**; tutors never pick Other, and fit ignores it;
  - one area search (English or Bangla) with the top 12 as chips; "Other area" only on leads;
  - time of day plus an optional **Between** window in half hours, 6:00 AM–11:00 PM. Picking a start suggests an end
    two hours later. Shown as "2:00–6:00 PM", and it wins over the time of day on the card;
  - **requirement quick picks** plus the free text;
  - tutor gender and **Tutor from**.
- **Requirement picks come from the sheet.** Counted in the notes and qualifications of 615 past tuitions:
  - experience, about 150
  - subject's department or expert, about 40
  - teaches with care, about 34
  - regular tests, about 25
  - "পড়া আদায়", 19
  - regular, 15
  - 3rd/4th year, 6
  - English medium experience, 9
  - polite, 11

  Labels are Bangla where they are a guardian's sentence ("আগে পড়ানোর অভিজ্ঞতা", "নিয়মিত পরীক্ষা নেবেন") and English
  where they are a fact ("3rd/4th year student", "From the subject's department"). This refines the 2026-11-04 rule
  that option labels are English, by the owner's request.
- **Rajshahi College and Varendra University** join Tutor from (about 60 past tuitions asked for RC or VU). A tutor
  counts as RC or VU when their institution names it.
- **Leads now store** time of day, window, session length, tutor from, requirement picks and the Other texts
  (migration 0014). "Post" carries them into the draft tuition, so nothing is typed twice.
- **Owner's changes after seeing it** (same day):
  - Class, medium, subjects and session length are dropdowns.
  - Classes: Play, Nursery and KG are each their own ("Play–KG" stays only on old rows), and admission is
    University, Medical or Engineering. Other opens a box.
  - Subjects: a dropdown of the combinations guardians asked most in the sheet, most asked first, including "Only
    English" and "Only Bangla". "Other combination…" opens every subject as chips.
  - Session length in 15-minute steps, 45 min to 3 hours ("1 hr 15 min"). Guardians ask for "about 1 hr 10–15" or
    "1 hr 40–45".
  - Area gets an address **Details** box (house, road, landmark) on Quick Pad, the guardian form and the tuition
    editor. **The Selected tutor now sees it with the phone**, each view logged. This changes the earlier
    "phone, never the address" rule (CLAUDE.md updated).
- The guardian form is five numbered parts. Only name, phone, area, class and one subject are needed; the rest is
  marked optional. The tuition page now also shows "Tutor from".

## 2026-11-04 (site review, step 2: tutors register on the site)

The owner approved step 2 of `docs/REVIEW-2026-11-04.md`. Choices Claude made:

- **One button for new and old tutors.** "Join as a tutor" (header, phone menu, board hero, footer, How it works) opens
  the same Google sign-in as Log in. A Google account that matches a tutor from the sheet opens Home; any other goes
  to `/me/join`. "Profile not found" is gone.
- **One registration page** (`/me/join`), in six numbered parts: photo, name, mobile and gender; university,
  department and session; areas; classes and subjects by level; lowest salary and transport; terms. It replaces first
  sign-in for new tutors, so subjects are asked up front (match % weighs them most).
- **Photo required.** The browser shrinks it to a 512 px square (WebP, or JPEG on Safari) before upload. This also
  drops the hidden photo details, such as where it was taken. The server keeps only real JPEG/PNG/WebP files under
  900 KB, in the private bucket as `tutors/T<code>.<ext>`.
- **Codes from 5001.** The sheet's codes run 1001–2488 and still grow with top-ups, so site sign-ups never meet them.
- **The owner checks every new tutor** (`review_status`: waiting → approved, or needs fix with a note). Tutors from the
  sheet and ones staff made count as checked.
  - While waiting, a tutor can browse and see For You, but not apply. The server refuses too.
  - Home shows "HTR is checking your profile", or the owner's note with "Fix my registration".
  - Everything stays editable until the owner approves; after that, details lock as for every tutor.
- **Owner side.** New registrations appear in a "New tutors" section on Today, as a mango count on Tutors, and under a
  "New" tab in Tutors. The tutor's admin page has Approve, or a note with Ask to fix.
- **One number, one tutor.** A mobile already on file (main or second number) is refused, with "Message HTR to link it".
  The owner then puts the tutor's new Gmail into **Sign-in email** on their admin page (only when no account is linked
  yet). The tutor logs in again and the old profile opens.
- `/dev/new/<n>` (dev only) signs in as a new Google account, to try registration on invented data.

## 2026-11-04 (site review, step 1)

The owner asked for a deep review of every page (`docs/REVIEW-2026-11-04.md`) and approved its step 1:

- **Page loader** (owner, like Towfique HSC English): a thin emerald bar at the top 0.1 s after a tap; the logo mark,
  name and a sliding bar in the middle when a new page takes over 0.4 s. Filters on the same page show only the bar.
  The bar slides left to right, as on Towfique; the owner may still ask for right to left.
- **Logo mark**: the header, footer, admin and app icons use the mark alone (figure, cap, star), cut cleanly from
  `design/brand/logo-square.png` by `scripts/make-logo-mark.mjs`. The old icon was a crop that showed pieces of the H, T
  and the RAJSHAHI pill. On forest it sits on a cream tile, because the head is forest. A redrawn full logo with whole
  letters is still to do.
- **Phone header**: signed-out visitors see a Log in button beside the menu; the menu is no longer inside the blurred
  header (it opened only 40 px tall).
- Under reduced motion, looping animations play once instead of flickering.

## 2026-11-04 (design and workflow overhaul)

Context: the owner dropped the inspiration-picture step and asked Claude to design "like a high end designer" from the
best products, improve the admin workflow (charts on the dashboard, applications that stay readable at 50 applicants
on a laptop, tutor photos when deciding), finish the planned steps, and commit, push and make the site ready to post
and track tuitions. The owner gave permission for the whole job. Choices Claude made:

- **Type:** Plus Jakarta Sans (variable, self-hosted, 27 KB) for English text and numbers; Bangla still falls through
  to Hind Siliguri. Short UI text is English, so the Latin face sets the tone. Salaries use the extra-bold weight.
- **Admin shell:** a forest sidebar (a colour band, not a dark page) with what waits in each place (new leads, new
  applications, open tuitions, selected tutors, review), one search box for tuition codes, tutor names, codes and
  phones, guardians and areas (Ctrl+K or /), and a New menu (lead or tuition). The phone keeps its bottom bar and +.
- **Applicant workspace** (the owner's 50-applicant case): a ranked table with photo, match %, fit marks (subjects,
  area, university), applied time and step; the picked tutor's whole picture stays on the right (education, history
  with HTR, experience, note, progress ticks, WhatsApp texts, the next move). A Board view shows one column per step.
  On the phone a tap opens the picture as a sheet. J/K or arrows walk the list; after a move it goes on to the next.
  **Match %** = subjects (2), area (1), university when asked (1), class (0.5), minus 0.5 under their lowest salary;
  a gender mismatch is 0. It ranks; it never blocks.
- **One-tap tuition states:** Publish to board (with a checklist of what is missing), Pause / Take applications,
  Hide, Re-open, Close, Cancel, replacing the status select plus two tick boxes. **Copy post** writes a ready post
  for Facebook and WhatsApp groups (public facts and the apply link only). Tabs: Applicants · Details · History.
- **New tuition** can be typed straight in on a laptop (guardian found or added by phone), saved as a draft or
  published at once. Quick Pad stays the fastest way during a call.
- **Today** keeps the ordered to-do list (2026-11-04) and adds four weekly numbers with trends, posted against booked
  by week, the 30-day funnel and top areas. **Insights** has the 26-week view. Charts are plain HTML/CSS (no library),
  emerald and amber checked for colour-blind separation, with values on hover and a table view.
- **Placements** tracks selected tutors' ticks (Called → Met → Demo done) and adds the **day-7 and day-30 check-in
  calls** (Porao decisions); "salary paid" on day 30 records the first salary. They also appear on Today.
- **Porao items built** (migration 0012): do-not-place flag with a reason on tutors and guardians (warnings on the
  applicant list and Leads), one owner notice on every tutor's Home with an end date (written on the Tutors page),
  **Refer a tuition** for tutors (lands on Leads as "Referred by T-…", the tutor sees its status), the public
  Recently booked tab (tutor as university · department only). Leads also show "Known guardian" for repeat phones.
  Not built yet: the on-time badge and fees (money features), and the Quick Pad flag warning (Leads shows it).
- **Tutor Home** (step 3): needs-action card, notice, open/shortlisted/selected/confirmed counts, For You carousel,
  updates with unread dots, profile progress ring, Refer and Fees tiles. **Profile**: pause switch (one tap), chips
  for areas (with a finder), classes, subjects by level, lowest salary, transport, demo class and About, one sticky
  Save bar; locked details listed with Message HTR.
- **Board:** the chip row (All · For You · Female tutor · Male tutor · RU · RUET · Medical), Recently booked, only open
  tuitions as decided (Processing leaves the board; its page still opens), a live "N open now · M booked this week"
  line, and for a signed-in tutor a compact hero and the bottom bar. The header shows a tutor's photo, Admin for the
  owner, or Tutor log in; the footer opens with a mango band for guardians and an emerald band for tutors.
- **Testing on invented data:** `npm run synthetic:seed` builds six months of synthetic tutors, tuitions,
  applications and drawn avatars in `.wrangler/synthetic`; `npm run dev:synthetic` runs on it. Screenshots for the
  owner come from this, never from the local copy of the real data.

## 2026-11-04 (step 3, data side)

Context: step 3 (owner: "Start step 3", data side first while the owner collects design inspiration). Choices Claude
made inside the agreed plan:

- **For You** = open, available tuitions taking applications that pass gender, class (or no classes picked), at least
  one subject at the tuition's band, area (listed, Anywhere, or the address names it; online tuitions skip the area)
  and university (or any). Tuitions the tutor already applied to, even withdrawn, are left out. Home shows the 3
  newest and the total; the board's For You chip (step 4) uses the same rule. **Paused tutors get no For You.**
- **Updates** = the last 30 days of HTR's steps on the tutor's applications (Shortlisted, Selected, Not selected,
  Opportunity closed; the tutor's own moves are not listed) and any profile edit by the admin. "Unread" = newer than
  the tutor's last Home visit (`tutors.updates_seen_at`, migration 0011). Home's red dot: unread updates or a Selected
  application.
- **Profile setup progress** counts what the tutor can fill in themselves: areas, classes, subjects, lowest salary,
  transport, demo class, About. The photo is left out until tutors can upload one.
- **About** is a new field (`tutors.about`, 500 characters), typed by the tutor.
- **A paused tutor can still apply** (owner): the apply sheet warns "You're paused", and applying turns pause off.
- **Profile saves** replace areas, classes and subjects together; locked fields are never read from the form. The
  pause switch saves on its own tap.

## 2026-11-04 (domain)

- **The site's address is `hikmahtutor.com`** (owner bought it; DNS on the Hikmah Cloudflare account). The Worker
  serves it as a custom domain; `www.hikmahtutor.com` redirects to it, so sign-in and the Google callback use one
  address. `hikmah-tutors.hikmahtutor.workers.dev` (and preview URLs) turned off once sign-in on the domain worked.

## 2026-11-04 (Porao comparison)

Context: ideas from `docs/research/porao-deep-dive-2026-11-04.md`, discussed one by one. All by the owner.
Fees and refunds are still built with the money features, after the core is live; these fix the rules now.

- **Check-in calls.** The admin to-do list gets two calls to the guardian per placement: **day 7** after Confirmed
  ("how is it going?") and **day 30** ("first salary paid? happy?"). The day-30 answer records the first salary
  (PRD BR-SAL-001), which makes instalment 2 due. Replaces the single one-month check-in of PRD BR-SAL-002.
- **Fee timing.** Confirmed still means "second trial class held and guardian continues" (PRD §7.4). Each fee
  instalment is to be paid **within 7 days** of falling due. Reminders on days 1, 3 and 7; on day 8 it is **Overdue**
  on the admin to-do list. Replaces the 14-day rule of PRD BR-DUE-001/002. Still no fines (BR-DUE-004).
- **On-time badge** (owner's "pay on time, get priority"): a visible badge for tutors whose fees are all paid within
  the window. It appears after the first on-time fee, is lost while any fee is overdue, and comes back with the next
  on-time fee. Shown on the tutor's profile and apply sheet, and to the admin in the applicant list. Not ranked by it.
- **Refund rule** (fills PRD §7.7 for this case). Guardian ends the tuition, not the tutor's fault; the tutor
  reports it **within 24 hours** and **within 45 days of Confirmed**. HTR first offers a **replacement tuition
  within 30 days** with the paid fee carried over. If none, refund = fee paid − 25% of salary received, never below
  0. The admin decides fault. Goes on the Fees page with a worked example.
- **Do-not-place flag, warning only**: a private flag with a reason on a guardian or a tutor. Quick Pad warns when a
  flagged guardian's phone comes in; the applicant list warns on a flagged tutor. Nothing is blocked.
- **Tutor referrals, no commission yet**: a "Refer a tuition" form for tutors (guardian name, phone, class, area,
  note) that lands on the Leads page as "Referred by <tutor>". The tutor sees its status (New → Called → Posted /
  Not now). A reward is decided with the money features.
- **Tuition card and page show the applicant count** ("৫ জন আবেদন করেছে") **and a start date** (new field). No
  view count.
- **Owner notice**: one short notice to all tutors on Home, with an end date, so it disappears by itself.
- **Requirement lines written from the tuition's fields** ("RU tutor · Science background · Female tutor"); the
  private qualification note stays.

## 2026-11-04

Context: a Q&A round on the whole admin and tutor workflow. Finding: the site cannot yet run a job end to end (leads
cannot become tuitions, tutors cannot apply, a selected tutor has no next step). All by the owner, mostly on Claude's
recommendation.

- **Close the loop before more polish.** Build order: (1) admin side, (2) tutor first sign-in setup, apply sheet and
  Applied tab, (3) Home and Profile tabs, (4) board chips and Recently booked. Each new screen gets one screenshot for
  the owner's OK before it is wired up.
- **Admin**
  - Leads get statuses New → Called → Posted / Not now. "Post as tuition" opens the tuition editor filled in from the
    lead as a hidden draft; one lead can make several tuitions (two children). The Leads page takes the admin design.
  - The admin home becomes an ordered to-do list (uncalled leads, unseen applications on open tuitions, selected tutors
    who have not ticked Called after 3 hours, demos ending, drafts, tutor-ticked Confirmed to check), with the counts as
    a small strip on top.
  - On the phone the admin gets a bottom bar: Today · Leads · Tuitions · Tutors · More, plus "+ Lead". Applications
    live inside each tuition; Guardians and Review sit under More.
  - The tuition page reads summary → applicants sorted by fit (gender, subject, area) → edit form, closed by default.
  - A tuition gets a "Tutor from" choice: Any (default) / RU / RUET / Medical, more than one allowed, shown as a chip on
    the card. The private qualification note stays.
  - "Copy for WhatsApp" on each shortlisted tutor copies a summary for the guardian: code, first name, university,
    department, session, SSC/HSC group and GPA, subjects that fit, experience, about line. No photo, Facebook or
    address. The tutor's phone is included only for the Selected tutor.
  - "Send on WhatsApp" opens WhatsApp to the tutor with a ready message when they are shortlisted or selected. Web Push
    stays later.
- **Tutor**
  - Bottom bar: **Home · Tuitions · Applied · Profile** (owner), replacing the four tabs of 2026-10-19 and the five of
    2026-11-03. No Saved and no Alerts tab. Applied carries a count badge for applications that need the tutor's
    action. A signed-in tutor lands on Tuitions (`/`); a red dot on Home means something needs action.
  - Home, top to bottom: Needs action now · Updates (shortlisted, not selected, profile changed by HTR; red dot while
    unread) · For You (3 newest, "See all") · Profile setup progress. Empty sections hide.
  - First sign-in: check details, confirm availability, accept the terms, then pick preferred areas (no limit, with
    "Anywhere in Rajshahi"), minimum salary and the classes they want. These new fields drive For You and the fit check.
  - Tutors edit areas, classes, subjects, minimum salary, pause, transport, demo willingness and their about text. Name,
    phone, gender, university and results are locked and change through the admin.
  - The university becomes a fixed key (RU / RUET / Medical / Other), mapped from the sheet's free text by the import;
    unclear ones go to the review list.
  - The apply sheet shows a fit check, an optional note and Confirm. Only a gender mismatch blocks; a class, subject,
    area or university mismatch warns. **No limit on active applications** (owner).
  - After selection the tutor sees the guardian's phone (see below) and ticks Called → Met → Demo done → **Confirmed**.
    The tutor ticks Confirmed too (owner: confirming means they owe the fee). Before the tick a sheet says the media
    fee becomes due under the terms. Confirmed marks the tuition Booked, closes the other applicants as Opportunity
    closed, and shows on the admin's to-do list, where the admin can undo it.
  - A selected tutor who has not ticked Called within 3 hours is only flagged to the admin, never dropped automatically.
  - "Didn't work out" (tutor or admin, with a reason: guardian chose someone else / schedule / salary / tutor declined /
    other) puts the tuition back to Processing; the admin picks the next tutor or re-posts it.
- **Board**
  - **Only open tuitions show** (owner: tuitions book within hours, so Processing cards would fill the board),
    replacing the 2026-11-02 rule that Processing cards stay with a grey stub. A Processing tuition leaves the board at
    once and returns if the match falls through.
  - A chip row at the top: **All · For You · Female tutor · Male tutor · RU · RUET · Medical** (owner), All selected by
    default. For You shows tuitions that pass gender, class, subject, area and university, newest first; signed out, it
    opens sign-in. The filter sheet stays.
  - A "সদ্য বুকড" (Recently booked) tab shows the last 7 days: applicant count, how fast it was booked ("৩ ঘণ্টায়
    বুকড"), and the tutor as university and department only ("RU · Physics"), never by name. A name can come later as
    an opt-in.
- **Phone numbers** (owner, replacing two "Never" rules in CLAUDE.md for these cases only): the guardian's phone is
  shown to the one tutor marked Selected, only while that status lasts, and each view is logged; the full address
  never shows, the guardian gives it on the call. The Selected tutor's phone may go to that guardian in the WhatsApp
  summary. Shortlist summaries never carry a phone, so a guardian cannot go round HTR.

Context: the owner found the UI too Bangla-heavy ("স্ট্যাটাস: খসড়া" reads badly) and sent a tuition-detail screenshot
(`design/inspiration/icon-fact-rows.png`).

- **Short UI text is English on every page** (owner, on Claude's recommendation; replaces "Bangla or English, whichever
  reads better" of 2026-11-02 for these): navigation, page titles, buttons, statuses, badges, field labels, filters,
  option labels (classes, subjects, areas, mediums, times) and numbers and dates (৳5,000, 3 days/week, 2 h ago).
  Option keys do not change; `alt` keeps the Bangla names so search still finds "গণিত" or "উপশহর". Labels decided
  earlier in Bangla follow suit (the board's "সদ্য বুকড" tab becomes "Recently booked").
- **Bangla stays where it reads better** (owner: "not everything"): longer helper and explanation sentences in the
  admin, some tutor-facing notes, guardian-facing explanations and form errors, the brand slogan and the board's hero
  line, and whatever people type (requirements, notes).
- **A Bangla/English toggle is not built now** (owner: "if you think necessary"; Claude: no, it doubles every string to
  maintain, and English labels with Bangla explanations already serve both readers). Revisit if guardians struggle.
- **Area names: English labels for now, judged by look and feel** (owner). The screenshots show both; switching back
  is a label change only.
- **Board card:** days per week, student (Male/Female student), time and medium sit as quiet chips in the card's white
  space (owner); the stub keeps code, salary, per-class pay and Apply. The guardian's tutor requirement moves to its own
  full-width strip at the bottom of the card (owner: "a better place").
- **Tuition page:** facts become icon rows (icon circle, bold label, value below) as in the owner's screenshot, and the
  tutor requirement leads the details as a highlighted box.

Context: building the admin tuition page from the plan above (owner approved the language pass and said continue).
Choices Claude made inside the agreed plan:

- **The application status `trial_arranged` now reads "Selected"** (key unchanged): it is the step where the tutor gets
  the guardian's number and arranges the demo. Move buttons use verbs (Review, Shortlist, Select, Confirm).
- **Applicant order:** the furthest step first (Confirmed, Selected, Shortlisted, In review, Applied), then the best fit.
  Fit: subjects counted at the tuition's band only (an SSC tuition ignores a tutor's junior subjects); area = in the
  tutor's chosen areas, or their address names it ("Lives nearby"); university read from the free-text institution
  until the fixed key of step 2 exists. A gender mismatch sinks a card to the bottom; the rest only warn.
- **"Tutor from" is stored as `tuitions.tutor_from`** (migration 0009) and shows as a chip on the board card.
- **"Send to guardian" sits next to "Copy"** on shortlisted and selected tutors: it opens WhatsApp to the guardian with
  the summary already written (a Bangla greeting line, facts in English). The tutor's phone is in it only once Selected.
- **"Message tutor"** opens WhatsApp to the tutor with a ready shortlisted or selected message. It does not carry the
  guardian's number: that view must be logged, so the tutor's app shows it in step 2.
- **The edit form opens by itself for drafts**, since a tuition just posted from a lead needs its details filled in.

Context: step 2 (owner: "Start step 2"), the tutor side. Choices Claude made inside the agreed plan:

- **First sign-in is one page with five numbered parts** (details, areas, lowest salary, classes, confirm), not one
  question per screen, which the owner ruled out in board round 1. Classes start ticked from the bands the tutor
  listed on the old form. A tutor lands on the setup page after sign-in and on the board once it is done; `?edit=1`
  reopens it.
- **University key** (`tutors.university`, migration 0010) is filled from the sheet's institution text: RU 783, RUET
  377, Medical 74, other 220 tutors in the local copy. "Other" is mostly Rajshahi College and Varendra University.
- **Apply is its own private page**, `/tuitions/HTR-…/apply`, drawn as a sheet over the tuition, so public pages never
  depend on who is looking. The card's and the tuition page's Apply open it; signed out goes to sign-in, not set up goes
  to setup first.
- **The guardian's number sits behind "Show number"**: each tap writes a row in `contact_views` (append-only), so a view
  is logged only when the number is really opened. The address never shows.
- **The checklist goes in order** (Called → Met → Demo done → Confirmed). Confirm opens a sheet with both fee plans in
  taka and a tick "I understand the media fee is due".
- **Selecting a tutor moves the tuition to Processing.** "Didn't work out" (tutor or admin) makes the application Not
  selected with the reason and returns a Booked tuition to Processing; migration 0010 allows Booked → Processing. The
  admin's undo of a tutor's Confirmed goes back to Selected; applicants already closed stay closed but can apply again.
- **A tutor can withdraw** an application until they are selected.
- **The admin's Today list** adds "selected tutor hasn't called" after 3 hours and "tutor confirmed" for 7 days.
- **Bottom bar for tutors** on /me and Applied: Home · Tuitions · Applied · Profile, with a red count on Applied. Home
  and Profile both open /me until step 3 splits them.
- **Test sign-in for `npm run dev` only**: `/dev/tutor/99001` signs in as a synthetic test tutor (code 99000 and up,
  added by staff). Real tutors can't be reached this way, and a production build answers 404.

## 2026-11-03

Context: planning the tutor journey from sign-up to getting the guardian's number; the owner showed Home Tutor
Service's "Applied" tab (`design/inspiration/`).

- **The signed-in tutor's bottom bar has five tabs, each with an icon and a written label** (owner), replacing the
  four of 2026-10-19. Applications sit in the middle, raised. The fifth tab is not decided yet.
- **A tuition's demo is 2 days by default** (owner: most are), changeable per tuition.
- **A selected tutor must call the guardian as soon as possible, within 2–3 hours** (owner).
- **After selection the tutor ticks Called → Met → Demo done → Confirmed** (owner liked this from Home Tutor Service).

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

## 2026-11-03

- **Every page except the board and the tuition detail page takes the 21 Oct Emergent design** (owner: "the tuition
  job post page is fine, all other pages' design is useless"). Ported from `reference/emergent/`: the sticky site
  header and full footer, the forest title band for text pages, the admin panel (sidebar on desktop, scrolling tabs on
  the phone, big titles on cream, white cards, toned status pills), the tutor panel look on `/me`, and the login page.
  The 20 Oct export in `imports/emergent` is older and adds nothing.
- **New public pages from the Emergent build** (owner): How it works, Fees, Request a tutor, Contact, Privacy and
  Terms (both marked as drafts), and a 404 page. The how-it-works text was rewritten for the real site (Google login,
  applying coming soon), not the Emergent demo.
- **The Request a tutor form saves a lead with source "website"** (Claude), through the same `parseLead`/`insertLead`
  as the Quick Pad, with a honeypot field and at most 3 requests per phone number per day.
- **Public contact number = the admin WhatsApp 01522136687** for WhatsApp and call buttons (Claude, from the
  2026-10-29 decision; owner to confirm). One place to change it: `app/lib/contact.ts`.
- **Icons from `lucide-react`** (Claude), as in the Emergent build; only the icons used are bundled.
- Left out from Emergent for now: the English/Bangla toggle (the site is Bangla only), the public admin link, the
  code download, the tutor demo picker, saved tuitions and the Premium planning card.

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
