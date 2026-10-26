# Hikmah Tutors Rajshahi — PRD memory

## Original problem statement
"check how far we have worked. unzip the file and copy the codes and we will work from them" — restore the uploaded Release-1 ZIP
(Stage 1 public board) and continue per approved plan: open (no-login) Admin & Tutor panels from home, tuition-card redesign with
gender colours (male blue / female rose / any green + text labels), exact class/batch selection everywhere (no ranges),
full visual polish, bug fixes, keep footer code-ZIP download. Full master brief: `memory/EMERGENT_PRD.md`.

## Personas
Tutor (university students, phones) · Guardian (no account) · Owner/HTR staff · The user (downloads ZIP, adds security later in Claude Code).

## Architecture
React 19 + TS + Tailwind (CRA/craco) · FastAPI + Motor · MongoDB. `shared/options.json` choice lists.
- `backend/deps.py` db + editable class list state (settings key `class_levels`; legacy ranges in `legacy_class_levels`).
- `backend/panel_api.py` all `/api/admin/*`, `/api/me*`, `/api/tutor/demo-list` (no auth — demo tutor via `X-Tutor-Id`).
- `backend/logic/posts.py` Facebook / WhatsApp / contact line / sheet row generator (+ tests/test_posts.py).
- Frontend: `pages/tutor/*`, `pages/admin/*`, `components/ClassPicker.tsx`, `ApplyDialog.tsx`, `TuitionCard.tsx`, `lib/gender.ts`, `lib/tutorSession.ts`.

## Status at restore (2026-10-20) — what the ZIP contained
Stage 1 only: public board, detail, info pages, request form, share cards, ZIP export, logic tests (22 pass).
Missing vs PRD: all of Stage 2 (tutor sign-in/profile/apply/saved) and Stage 3–5 (owner panel, Quick Pad, post generator, settings).

## Implemented (2026-10-20, this session)
- Restored & running. Open Admin Panel + Tutor Panel (header, hero, footer links). Amber "no login yet" notices.
- Exact classes: Play, Nursery, KG, Class 1–10, SSC 2026–28, HSC 1st/2nd Year, HSC 2026–28, Admission, O/A Level, Other.
  Grouped chip picker in request form, board filter, Quick Pad, tuition editor, tutor profile. Owner edits/adds/hides in Settings.
  Legacy ranges displayed as-is, flagged (queue card, tuition list, editor warning).
- Tuition card redesign (gender strip + label, class → subjects → area/days → salary → code/time, Apply/Save/Share 48px).
- Tutor panel: demo picker, checklist, suggested, saved, apply dialog with fee terms (daily limit, gender match, profile check),
  applications with timeline + withdraw, profile editor. Bottom tab bar on phones.
- Admin panel: work queue with real counts, Quick Pad (offline localStorage queue, idempotent client_id), leads (dup warning,
  contacted, follow-up, convert → prefilled draft, discard), tuitions list/search/filter, editor (public/private panels, live card
  preview, publish/unpublish/accepting/processing/close/reopen, SSC/HSC requirement prefill), applications (owner transitions,
  reasons, compare 2–5, WhatsApp "message prepared"), tutor directory (masked phones + audited reveal), post generator, settings.
- Bug fixes: seed overwrote owner edits on every restart; template jsconfig.json blocked TS start; Pillow/libraqm missing;
  lead rate limit used the load-balancer IP (all guardians shared 5/h); request form ignored tutor gender; Save/Apply led to a dead
  placeholder page; settings 500 on class list (nested defaults); filter bar hidden under hero.

## Backlog
P0 (Phase 2, user in Claude Code): login + owner-only guard for `/api/admin/*` and `/api/export/code`; real tutor accounts.
P1: photo upload (object storage), notifications, claims, concerns, audit log viewer, consents, styled confirm dialogs,
  Bangla date picker, staff-entered applications.
P2 (Phase 3): document verification, trial classes, placement tracking, bKash/Nagad fees, SMS/WhatsApp sending, guardian accounts.

## Notes
- libraqm (Bangla shaping for share PNGs) was installed with apt in this pod — add `libraqm0` to the production image.
- Class list is cached in process memory (single worker OK).
