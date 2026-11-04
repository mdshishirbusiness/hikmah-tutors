# Design inspiration

Screens the owner showed, with what they like in each. Personal details are blacked out before a file is added here
(the repo is public).

## hts-confirmation-progress.jpg — Home Tutor Service, tutor's "Applied" tab (owner, 2026-11-03)

What the owner pointed at:
- **Applied is the centre tab** of the bottom bar, raised and filled: a tutor's applications are one tap away.
- **After selection the tutor sees the guardian's contact** and a **Confirmation Progress** checklist the tutor ticks:
  Called → Met → Tutored 2 Days → Confirmed (the owner marked the last two).
- Each application card carries its code and a status pill (e.g. SHORTLISTED).

What we would do differently (Claude):
- The warning box uses yellow text on a light fill; our rule is mango only as a fill behind dark text.
- Tutor ticks are the tutor's own report; Confirmed should still be checked by HTR with the guardian.
- The demo length should come from the tuition (not always 2 days), and there should be a "didn't work out" way out
  so a backup tutor can be moved up quickly.

## Expanding task card (screen recording, owner, 2026-11-05; not stored here)

A small task card ("Design System"). Collapsed: an icon, the title, a thin green bar and "75%", a priority and status
tag, and avatars. Tapped, it opens with a smooth height change to "3 of 4" and a tree of steps: check circles on a
thin connector line, done ones filled, the open one hollow. Then its properties. Light grey surface, soft shadow,
no clutter.

What the owner wants from it: profile progress that feels designed, not AI-made, with light motion that invites the
tutor to finish. How we use it (not a copy): the Profile checklist is a light card that opens into the tutor's steps,
grouped by section (Teaching, each level's Experience, About). Each group has its own colour; the connector line and
check circles fill as steps are done; the next step is the one highlighted row.

## icon-fact-rows.png — a tuition site's detail rows (owner, 2026-11-04)

What the owner likes:
- Each fact is an **icon in a soft circle, a bold label and the value below** ("Subjects / Physics, Chemistry",
  "Location / Mirpur 10"): calm, scannable, nothing squeezed into a two-column table.
- Short English labels.

How we use it: the tuition page's facts (Subjects, Location, Days, Time, Student, Medium, Start), with our emerald
circle (`brand-50` fill, `brand-700` icon) instead of the lavender.
