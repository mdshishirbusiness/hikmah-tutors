-- New tutors register on the site and wait for the owner's check (owner, 2026-11-04, site review step 2).
-- Tutors from the sheet and ones the admin made count as checked. Site sign-ups get codes from 5001 up, so they never
-- meet the sheet's codes (1001 up, still growing with top-ups).
ALTER TABLE tutors ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (review_status IN ('waiting', 'needs_fix', 'approved'));
-- What the owner asked the tutor to fix; shown on the tutor's Home.
ALTER TABLE tutors ADD COLUMN review_note TEXT CHECK (review_note IS NULL OR length(review_note) <= 300);
ALTER TABLE tutors ADD COLUMN reviewed_at INTEGER;
CREATE INDEX tutors_review ON tutors (review_status, created_at) WHERE review_status <> 'approved';
