-- The tutor journey (owner, 2026-11-04): first sign-in setup, applying, and the selected tutor's own progress.

-- University as a fixed key (RU / RUET / Medical / Other), read here from the sheet's free text. Tutors cannot change
-- it; the admin can. RUET is checked first: "Rajshahi University of Engineering" is not RU.
ALTER TABLE tutors ADD COLUMN university TEXT CHECK (university IN ('ru', 'ruet', 'medical', 'other'));
UPDATE tutors SET university = CASE
  WHEN lower(institution) LIKE '%ruet%' OR lower(institution) LIKE '%engineering%' THEN 'ruet'
  WHEN lower(institution) LIKE '%medical%' OR lower(institution) LIKE '%mbbs%' OR lower(institution) LIKE '%dental%'
    OR lower(institution) LIKE '%rmc%' THEN 'medical'
  WHEN lower(institution) LIKE '%rajshahi university%' OR lower(institution) LIKE '%university of rajshahi%'
    OR lower(trim(institution)) IN ('ru', 'r.u', 'r.u.', 'rabi') THEN 'ru'
  ELSE 'other' END
WHERE institution IS NOT NULL AND trim(institution) <> '';

-- Picked on first sign-in. anywhere = "Anywhere in Rajshahi"; otherwise tutor_areas holds the picked areas.
ALTER TABLE tutors ADD COLUMN min_salary INTEGER CHECK (min_salary IS NULL OR min_salary >= 0);
ALTER TABLE tutors ADD COLUMN anywhere INTEGER NOT NULL DEFAULT 0 CHECK (anywhere IN (0, 1));
ALTER TABLE tutors ADD COLUMN setup_done_at INTEGER;

-- The classes a tutor wants (CLASS_LEVELS keys). Empty until the tutor picks them.
CREATE TABLE tutor_classes (
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  class_level   TEXT    NOT NULL,
  PRIMARY KEY (tutor_id, class_level)
);

-- The selected tutor's own ticks: Called → Met → Demo done. Confirmed is the application status itself.
ALTER TABLE applications ADD COLUMN called_at INTEGER;
ALTER TABLE applications ADD COLUMN met_at INTEGER;
ALTER TABLE applications ADD COLUMN demo_done_at INTEGER;

CREATE TRIGGER applications_ticks_rules BEFORE UPDATE OF called_at, met_at, demo_done_at ON applications
WHEN OLD.status NOT IN ('trial_arranged', 'confirmed')
BEGIN
  SELECT RAISE(ABORT, 'progress ticks only after selection');
END;

-- Same ladder as 0003, plus two ways back from Confirmed: the admin undoes a tutor's tick (→ Selected), or the match
-- did not work out (→ Not selected).
DROP TRIGGER applications_status_rules;
CREATE TRIGGER applications_status_rules BEFORE UPDATE OF status ON applications
WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'submitted'      AND NEW.status IN ('under_review', 'not_selected', 'withdrawn', 'opportunity_closed')) OR
  (OLD.status = 'under_review'   AND NEW.status IN ('shortlisted', 'not_selected', 'withdrawn', 'opportunity_closed')) OR
  (OLD.status = 'shortlisted'    AND NEW.status IN ('trial_arranged', 'not_selected', 'withdrawn', 'opportunity_closed')) OR
  (OLD.status = 'trial_arranged' AND NEW.status IN ('confirmed', 'shortlisted', 'not_selected', 'withdrawn', 'opportunity_closed')) OR
  (OLD.status = 'confirmed'      AND NEW.status IN ('trial_arranged', 'not_selected'))
)
BEGIN
  SELECT RAISE(ABORT, 'application status change not allowed');
END;

-- Same as 0005, plus Booked → Processing: a match that did not work out goes back to the admin to pick the next tutor.
DROP TRIGGER tuitions_status_rules;
CREATE TRIGGER tuitions_status_rules BEFORE UPDATE OF status ON tuitions
WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'draft'      AND NEW.status IN ('available', 'cancelled', 'closed')) OR
  (OLD.status = 'available'  AND NEW.status IN ('processing', 'booked', 'cancelled', 'closed')) OR
  (OLD.status = 'processing' AND NEW.status IN ('available', 'booked', 'cancelled', 'closed')) OR
  (OLD.status = 'booked'     AND NEW.status IN ('available', 'processing', 'closed')) OR
  (OLD.status = 'cancelled'  AND NEW.status = 'closed')
)
BEGIN
  SELECT RAISE(ABORT, 'tuition status change not allowed');
END;

-- Every time a selected tutor opens the guardian's number (owner, 2026-11-04). Append-only.
CREATE TABLE contact_views (
  id            INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications (id),
  user_id       INTEGER NOT NULL REFERENCES users (id),
  created_at    INTEGER NOT NULL
);
CREATE INDEX contact_views_app ON contact_views (application_id, created_at);
CREATE TRIGGER contact_views_no_update BEFORE UPDATE ON contact_views
BEGIN
  SELECT RAISE(ABORT, 'contact_views is append-only');
END;
CREATE TRIGGER contact_views_no_delete BEFORE DELETE ON contact_views
BEGIN
  SELECT RAISE(ABORT, 'contact_views is append-only');
END;
