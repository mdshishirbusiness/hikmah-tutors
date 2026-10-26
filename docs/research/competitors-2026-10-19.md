# Competitor research: Porao, Home Tutor Service, Tutor Provide

Checked 19 October 2026 from Dhaka-routed connections (Cloudflare `DAC` edge), phone width 375 px.
Method: public pages in a browser, response headers, and the sites' public JavaScript bundles (read, not run).
No accounts were created and no forms were submitted. Public API responses were inspected for **field names only**;
no tutor or guardian values were read or copied.

Labels: **Seen** = observed directly. **Likely** = inference from a technical signature (stated beside it).

---

## 1. At a glance

| | Porao (porao.com.bd) | Home Tutor Service (hometutorservice.info.bd) | Tutor Provide (tutorprovide.com) |
|---|---|---|---|
| Market | Dhaka-centred, national | **Rajshahi** (titles say "Home Tutor Service Rajshahi"; cities: Rajshahi, Bogura, Natore, Chapainawabganj, Rangpur, Khulna, Barishal) | Dhaka-centred, national (home page: Dhaka 8,022 tuitions, Rajshahi 48) |
| Front end (Seen) | React SPA built with Vite; Tailwind; Radix, Headless UI, framer-motion, react-spring, Lenis, MapLibre, jsPDF, html2canvas, Markdown renderer | React SPA built with Vite (Rolldown); Radix UI (shadcn-style), TanStack Query | Vue 3 + Vuex SPA built with Vite, plus Bootstrap 5, jQuery, Select2, Font Awesome, Ionicons and an admin-template script set |
| Back end | **Laravel (PHP 8.3)** at `dashboard.porao.com.bd/api/v1` (Seen: `X-Powered-By: PHP/8.3`, `XSRF-TOKEN` and `*_session` cookies, `/storage/` paths) | Separate API at `api-hub-….hometutorservice.info.bd/api`. **Likely Node.js + MongoDB** (records carry `_id` and `__v`, the Mongoose signature) | `api.tutorprovide.com/api/v1`. **Likely Java/Spring** (paging fields `totalElements`, `pageSize`, `hasNext`) |
| Hosting edge | Cloudflare | Cloudflare | Cloudflare |
| Server-rendered pages | **No** — empty HTML shell, content arrives by JavaScript | No | No |
| Page weight, home (Seen, one load, approx.) | ~250 requests, ~5 MB of JavaScript | ~41 requests, ~340 KB JavaScript | ~118 requests, ~1.1 MB total (CDN files under-counted) |
| Sign-in | Phone/email + password, phone OTP | Email/phone + password, OTP | Email OTP + password |
| Push | OneSignal | — | Firebase Cloud Messaging |
| Payments | bKash checkout API, wallet, invoices, referral commission | Tutor "pending payment" amounts; admin marks paid; payment-submission queue | SSLCommerz gateway; service charge, **verification charge**, **premium-tutor charge**; coupons |
| Share preview | Generic logo | Generic image | Generic image |

All three are client-rendered single-page apps. Their tuition pages are not in the HTML that Google, Facebook or
WhatsApp first receive, and every shared link shows the same generic preview.

## 2. Features, by site

### Porao (the biggest feature set)
- Roles: tutor, parent, coach; account switcher.
- **Job board behind sign-in**: visiting the board sends you to the sign-in page (Seen).
- Job history tabs: applied, shortlisted, appointed, confirmed, cancelled; saved jobs.
- Tutor profile in many steps: personal, secondary and bachelor education, certificates, teaching location, tutoring
  categories, availability, salary, experience, online teaching; **address verification on a map**.
- Confirmation letters, CV builder (PDF), wallet, invoices, bKash payment, referral bonus, shop, community, online
  lessons, "AI" page, support. Parent side: add students and location, hire a tutor, my tutors.
- Home: two big cards (Hire a tutor / Become a tutor), icon grid, testimonial carousel, cartoon avatars, chat bubble.

### Home Tutor Service (direct Rajshahi competitor)
- Guardians: **post a tuition request without an account** (long form with a "% complete" bar). The form *requires*
  a detailed address (20–300 characters, "helps tutors find your location"). The public tuition-post API includes an
  `address` field and internal fields (`deletedBy`, `deleteReason`, `approvedBy`) (Seen: field names). Likely the
  guardian's address is visible to tutors.
- **Public tutor directory** with filters (city, university, subject) and a claimed "2136+ verified tutors".
- Tutors: register, wait for approval, browse posts, apply, applications list, profile, support tickets, and a
  **resources library** (board books, class-test / half-yearly / annual question papers by college).
- Admin: tuition management, tutor approvals, in-progress and past tuitions, payment submissions,
  **tuition poster and tutor poster generator**, resources, support tickets, admin management.
- Mobile: **bottom tab bar** (Home, Find tutors, Request, Register, Login). Clean green-on-white look.
- Copy claims a "smart algorithm", "24/7 support", "secure payment" — none verifiable on the site.

### Tutor Provide
- Home: banner carousel, category and area tiles with tuition counts, division counts, recent offers.
- Tuition card: ID, "time ago", "Need a Male/Female tutor for … , area", category, class, subject, days/week,
  location, fee, Share, More details. (Good, scannable pattern.)
- Guest post for guardians; guardian dashboard with appointed tutor details.
- Tutor statuses: pending, shortlisted, **demo class**, appointed, confirmed, cancelled; nearby jobs; CV;
  confirmation letters; certificates; chat / live chat; refer & earn; blog; FAQ; gallery; feedback.
- Money: paid verification, paid "premium tutor", service charge, coupons, SSLCommerz.
- The public tuition API returns the staff member who created each post (`createdBy.name`) (Seen: field names).

## 3. What every site has (the minimum to compete)

1. A tuition board with a scannable card: code, class, subject, area, salary, days/week, wanted gender, posted time, share.
2. Browse by area and by category; filters.
3. Tutor account and a profile (education, subjects, classes, preferred areas), with staff approval.
4. Apply and track a status ladder: applied → shortlisted → demo/trial → appointed/confirmed → cancelled.
5. A way for guardians to ask for a tutor without an account.
6. Confirmation letter.
7. Some record of what the tutor owes and whether it is paid.
8. Admin: tuition list, tutor approvals, payment check, post/poster generator.

The PRD's R1 + R2 + R3 already cover all eight. Nothing here calls for a new release item.

## 4. Where Hikmah can clearly win

| Gap in competitors | Hikmah answer (already in PRD unless marked) |
|---|---|
| Empty-shell SPAs: slow first paint on cheap phones, weak Google indexing | Server-rendered board and tuition pages on Workers; near-zero JS to read the board |
| Same generic preview for every shared link | **Per-tuition share card** (salary, class, area, code — public fields only). *Needs owner decision: PRD FR-PUB-011 says generic.* |
| Board hidden behind sign-in (Porao) | Board public; sign-in only to apply (FR-PUB-007) |
| Guardian address likely exposed (HTS); staff names in API (Tutor Provide) | Public view whitelists columns; guardian phone/address never public (FR-PUB-008) |
| Paid verification / premium badges (Tutor Provide) | No registration or verification fee; fee shown with worked example before applying (§7.2) |
| Unverifiable claims and testimonials | Honest content rule (§0 rule 7) |
| Dhaka-first lists; Rajshahi is an afterthought | Rajshahi areas ranked by demand, Bangla and English aliases |
| Generic templates (purple gradient + cartoon avatars; busy orange banners; plain shadcn) | Own visual identity from the logo (forest, emerald, mango, cream) |

## 5. Ideas worth borrowing (patterns only, not copy)

- Tutor Provide's card layout and "Need a female tutor for Class 8, Uposhohor" headline line.
- Home Tutor Service's bottom tab bar on phones and the progress bar on long forms.
- Home Tutor Service's admin **poster generator** — matches PRD §16.7 / roadmap item 4.
- Porao's job-history tabs (one tab per status) for the tutor's applications page.
- A resources library (question papers) as a later reason for tutors to return — *not in PRD; later roadmap at most.*

## 6. Stack check: Supabase + Vercel versus Cloudflare only

Already decided on 2026-10-16 (Cloudflare). Re-checked against this research; **the decision holds.**

- **Cost.** Vercel's free Hobby plan is for non-commercial use, so a business needs Pro (~$20/month); Supabase's free
  projects pause when idle and have no daily backups, so production needs Pro (~$25/month). About $45/month, against
  a ~$10 budget. Cloudflare Workers + D1 + R2 runs on the free plan (commercial use allowed) and Workers Paid is $5/month
  when more headroom or 30-day D1 Time Travel is wanted. *Prices from vendor pages as last recorded in the PRD; recheck
  before paying.*
- **Speed in Bangladesh.** All three competitors already sit behind Cloudflare, and responses here came from the Dhaka
  (`DAC`) edge. Workers render the page at that edge; D1 adds one database round trip.
- **Scale.** A Rajshahi agency has thousands of tuitions and tens of thousands of tutors at most: small for D1.
- **What Supabase would add, and the Cloudflare answer:**
  - Row Level Security → checks in every loader/action + SQLite triggers (already the rule in CLAUDE.md).
  - Built-in auth → Google sign-in through an auth library that stores sessions in D1 (to be chosen at the login step).
  - Storage → R2 private buckets (decided).
  - Realtime → not needed; push later through Web Push from a Worker (free) if approved.
  - Email → an external sender (e.g. Resend or Postmark free tier) for account mail; needs the domain.
  - Scheduled jobs → Workers Cron Triggers. Backups → D1 Time Travel + a nightly export to R2.

## 7. Design direction for a youthful site

- **Board first, bold top band.** A forest colour band with one confident Bangla line and the search; filter chips
  that scroll sideways; cards below. No hero illustration, no cartoon people.
- **The card is the brand.** Salary in very large display type (৳ ৫,০০০), area as a bold chip, class and subject as
  the headline, a thin emerald or mango strip by status ("নতুন" on a mango fill with dark text). Share and save always
  one tap away.
- **App feel on phones.** Bottom tab bar for signed-in tutors: বোর্ড · সেভ · আবেদন · প্রোফাইল. Filters in a bottom sheet.
- **Status as a delivery tracker.** Students know the Foodpanda/Pathao tracker; show the application ladder the same way.
- **Type.** PRD says Hind Siliguri (body). For the large salary and headings, test a bolder display Bangla face
  (for example Anek Bangla, variable weights) against Hind Siliguri Bold; keep only one extra font file, subsetted.
- **Motion.** 150–250 ms CSS: cards rise in on load, a satisfying "applied" confirmation, chip selection. Nothing on
  scroll, all off under reduced motion.
- **Weight budget.** Aim for the board to work with almost no JavaScript; the lesson from Porao's ~5 MB is the opposite.

## 8. Limits of this research

- Signed-in tutor and admin screens were not seen; features there are inferred from route names in the bundles.
- Back-end languages for Home Tutor Service and Tutor Provide are inferences from data shapes.
- Page weights are single loads in one browser and undercount cross-origin files.
- Prices were not re-fetched today.
