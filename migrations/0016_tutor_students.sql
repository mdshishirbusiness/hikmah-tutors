-- Students a tutor has taught, one row each (owner, 2026-11-05): the class, where they lived, from when to when, the
-- result before and after, and what improved. No student or guardian names: the form asks for none. The owner reads
-- these when picking a tutor; the tutor's progress counts at least one.
CREATE TABLE tutor_students (
  id            INTEGER PRIMARY KEY,
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  class_level   TEXT    NOT NULL CHECK (length(class_level) <= 40),
  class_other   TEXT    CHECK (class_other IS NULL OR length(class_other) <= 60),
  area          TEXT    CHECK (area IS NULL OR length(area) <= 60),          -- an area key, or the place as typed
  subjects      TEXT    CHECK (subjects IS NULL OR length(subjects) <= 200), -- comma-separated subject keys
  started       TEXT    CHECK (started IS NULL OR started GLOB '[12][0-9][0-9][0-9]-[01][0-9]'),  -- YYYY-MM
  ended         TEXT    CHECK (ended IS NULL OR ended GLOB '[12][0-9][0-9][0-9]-[01][0-9]'),      -- NULL = still teaching
  result_before TEXT    CHECK (result_before IS NULL OR length(result_before) <= 20),
  result_after  TEXT    CHECK (result_after IS NULL OR length(result_after) <= 20),
  improvement   TEXT    CHECK (improvement IS NULL OR length(improvement) <= 600),
  created_at    INTEGER NOT NULL,
  CHECK (ended IS NULL OR started IS NULL OR ended >= started)
);
CREATE INDEX tutor_students_tutor ON tutor_students (tutor_id, started DESC);
