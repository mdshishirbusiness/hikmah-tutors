# Tutor side: Hikmah vs Porao and Tutor Provide

5 November 2026. From the owner's phone screenshots of both apps, signed in as a tutor (the owner's own test
accounts), plus Porao's guardian "Hire Home Tutor" form. Follows `porao-deep-dive-2026-11-04.md`. No screenshots are
kept in the repo: one showed a real ID card.

## What they ask a tutor for

| | Porao | Tutor Provide | Hikmah today |
|---|---|---|---|
| Sign-up | Phone + OTP, then a long profile | Role pick, name, gender, phone, **password** | Google, then a short join form |
| Personal | Location, preferred areas | ~25 fields, most required: email, parent's number and relation, blood group, religion, nationality, DOB, ID type and number, career objective, division/district/area/exact address, emergency contact (4 fields), Facebook required | Name, phone, gender, photo; the rest HTR keeps |
| Education | One card per degree | SSC, HSC, Honours, Masters, each 6 fields (ID card number, result, year picker) | University, department, session, SSC/HSC group and GPA; locked after HTR checks |
| Teaching | Category, classes, subjects, salary, styles, place, about (130–500 chars), **day × time-slot grid**, experience entries | Categories, classes, subjects, days per week, salary per month and per hour, years of experience | Areas, classes, subjects by level, lowest salary, transport, demo yes/no, pause switch |
| Experience | Free entries (class, location, from–to, text) | A years number | Per level (students, years, approach, habits, a story) plus students taught |
| Documents | Pick a type, upload, 500 KB, max 6 | Primary and secondary ID, live camera or gallery | Documents at join, compressed in the browser, admin-only view |
| Home | Applied · Shortlisted · Appointed counts, invoice banner, profile %, jobs near you, refer & earn, address OTP | Bar chart (empty at 0), six count tiles, "3665 tuitions in your nearby area", profile % | Greeting, profile ring, next step for a selected tutor, updates, For you list, owner notice |
| Board | Match % bar, distance in km from the tutor's location. Opened in Rajshahi, the nearest jobs were Dhaka ones 190+ km away: Porao has little or nothing in Rajshahi | Not seen | Rajshahi only, filters, For you chip |

## Where we are already better
- **Shorter to join.** No password, no ID number, no blood group or religion. Tutor Provide's personal page alone is a
  wall of required fields; most students will stop there.
- **Experience that says something.** Porao accepted "gggg…" for the 500-character About and "bv" as a location:
  length rules don't make text useful. Our per-level questions do.
- **The selected tutor knows what to do next** (Called → Met → Demo done → Confirmed). Theirs show counters only, and
  Tutor Provide draws an empty chart for a new tutor.
- **Local.** Porao's board is effectively Dhaka; a Rajshahi tutor finds nothing near. That gap is ours to fill, and
  worth saying in recruiting posts ("only Rajshahi tuitions").
- **Locked academics** after HTR checks, so guardians can trust them.

## Worth taking (ranked)
1. **When you're free.** Porao's day × slot grid is the one piece of matching data we don't collect. Ours can be
   lighter: three chips per row (Morning · Afternoon · Evening) for "Sat–Thu" and "Friday", or just the three chips.
   The tuition already has `time_of_day`, so For you and the applicant fit can drop clashes. Needs a migration.
2. **Status counts on Home**: a small strip (Applied · Shortlisted · Selected · Confirmed) that opens Applied. Both
   rivals lead with it. Hide it until the first application, so a new tutor never sees a row of zeros.
3. **"N tuitions fit you now"** as one big number on Home (Tutor Provide's 3665 card, but true and local), linking to
   the board with the For you chip on. We already count `forYouTotal`.
4. **A tick on each profile section** when it's done (Porao's green check on every accordion). `profile.ts` already
   knows which steps are done; SectionCard would show it.
5. **Fit on each board card** for a signed-in tutor: not a % bar but the reason ("Your area · Your subjects"), as the
   deep dive suggested for the applicant list.
6. **Take a photo** button on documents (`capture="environment"`), next to choosing a file, as Tutor Provide does.

## Further ideas (ours, not in either app)

For tutors
7. **"Seen by HTR" tick** on each application (like WhatsApp's blue ticks), set when the owner opens the applicant.
   Ends "did you see my application?" messages. Needs `seen_at` on applications.
8. **"How guardians see you"**: the tutor previews the exact WhatsApp summary the owner sends a guardian, with empty
   lines marked "add this". The most direct reason to finish a profile. Reuses the summary builder.
9. **Fast-call badge**: a selected tutor who ticks Called within 1 hour gets "Calls fast", shown in the guardian
   summary and applicant list. Rewards the behaviour we most need.
10. **Tutor share card**: a canvas card ("T-1234 · RU Physics · teaches SSC Science in Upashahar") the tutor posts on
    their own Facebook or WhatsApp status. Free reach for HTR; no phone, no photo unless they choose.
11. **Earnings line**: "You earn ৳X a month through HTR" from confirmed tuitions, on Home and the share card.
12. **Photo guide** before upload (Tutor Provide's three small icons): clear face, plain background, no group photo.

For guardians
13. **Private status link**: after the call, the guardian gets a WhatsApp link to a page with their request's status
    (Searching → Tutors shortlisted → Demo set → Confirmed). Fewer "any update?" calls. Secret token, no login, shows
    only their own request.
14. **Guardian rating at the day-30 call**: the owner records 1–5 and one line; the tutor's profile shows the
    average once there are three. Real ratings, unlike Porao's stars on an empty profile.
15. **"Another child?"** on the request form and in the status page: a second tuition from the same guardian in one
    tap (one lead already makes several tuitions).

For the owner
16. **Area gaps on Insights**: areas where guardians ask but few tutors teach, so recruiting posts can target them.

## Not worth taking
- Passwords, ID numbers, parent's number, blood group, religion, required Facebook.
- Per-hour salary, years-of-experience number (our per-level data is better).
- Paid address verification by post.
- Empty charts; nationwide board; one 500-char minimum on About.
