-- "Tutor from" (owner, 2026-11-04): the universities a guardian wants the tutor from. Comma-separated keys from
-- TUTOR_FROM in app/lib/options.ts (ru, ruet, medical); empty means any university. Shown as a chip on the card.
ALTER TABLE tuitions ADD COLUMN tutor_from TEXT NOT NULL DEFAULT '';
