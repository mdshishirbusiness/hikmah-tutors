-- Tuition posts shown on the public board. Everything in this table is public by design: the guardian's name, phone
-- and address stay in `leads` and must never get a column here.
-- Option columns store stable keys (app/lib/options.ts).
CREATE TABLE IF NOT EXISTS tuitions (
  code          INTEGER PRIMARY KEY,                -- shown as HTR-<code>
  status        TEXT    NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'available', 'processing', 'booked', 'cancelled', 'closed')),
  is_public     INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  accepting_applications INTEGER NOT NULL DEFAULT 1 CHECK (accepting_applications IN (0, 1)),
  class_level   TEXT    NOT NULL,
  medium        TEXT    NOT NULL,
  subjects      TEXT    NOT NULL,                   -- comma-separated keys
  area          TEXT    NOT NULL,                   -- an area key: neighbourhood only, never an address
  mode          TEXT    NOT NULL DEFAULT 'home' CHECK (mode IN ('home', 'online')),
  salary_kind   TEXT    NOT NULL CHECK (salary_kind IN ('fixed', 'negotiable', 'unspecified')),
  salary_amount INTEGER,                            -- taka; only when salary_kind is 'fixed'
  salary_period TEXT    NOT NULL DEFAULT 'per_month' CHECK (salary_period IN ('per_month', 'per_course')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  student_gender TEXT   CHECK (student_gender IN ('boy', 'girl')),
  tutor_gender_pref TEXT NOT NULL DEFAULT 'any' CHECK (tutor_gender_pref IN ('any', 'male', 'female')),
  requirements_public TEXT NOT NULL DEFAULT '',
  start_note    TEXT    NOT NULL DEFAULT '',
  posted_at     INTEGER,                            -- unix seconds
  closed_at     INTEGER                             -- unix seconds
);

CREATE INDEX IF NOT EXISTS tuitions_board ON tuitions (is_public, status, posted_at DESC);
