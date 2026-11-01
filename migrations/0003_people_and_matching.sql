-- Phase 1 tables that replace the Mastersheet. PRIVATE: no public page may read any table in this file.
-- Option columns store stable keys (app/lib/options.ts). Times are unix seconds.

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  google_sub    TEXT    NOT NULL UNIQUE,            -- Google's permanent id for the account
  email         TEXT    NOT NULL UNIQUE,            -- lowercase
  name          TEXT,
  role          TEXT    NOT NULL DEFAULT 'tutor' CHECK (role IN ('owner', 'tutor')),
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE sessions (
  token_hash    TEXT    PRIMARY KEY,                -- never the token itself
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

-- Visible only to the tutor (their own row) and the admin (owner, 2026-11-02). There is no public tutor directory.
-- Left out on purpose: date of birth, blood group, the "share your situation" text and ID document links.
CREATE TABLE tutors (
  id            INTEGER PRIMARY KEY,
  code          INTEGER UNIQUE,                     -- tutor code from the sheet (1001…) or the next free one
  user_id       INTEGER UNIQUE REFERENCES users (id),
  claim_status  TEXT    NOT NULL DEFAULT 'unclaimed' CHECK (claim_status IN ('unclaimed', 'claim_pending', 'claimed')),
  created_via   TEXT    NOT NULL CHECK (created_via IN ('signup', 'import', 'staff')),
  email         TEXT,                               -- lowercase; collected by Google on the sheet's form
  full_name     TEXT    NOT NULL,
  gender        TEXT    CHECK (gender IN ('male', 'female')),
  phone         TEXT    NOT NULL,                   -- 01XXXXXXXXX
  alt_phone     TEXT,
  facebook_url  TEXT,
  photo_source_url TEXT,                            -- the sheet's Drive link, until photos are moved to R2
  institution   TEXT,
  department    TEXT,
  session_year  TEXT,                               -- e.g. 2023-24
  ssc_school    TEXT,
  ssc_year      INTEGER,
  ssc_result    TEXT,
  ssc_group     TEXT,
  hsc_college   TEXT,
  hsc_year      INTEGER,
  hsc_result    TEXT,
  hsc_group     TEXT,
  mediums       TEXT,                               -- comma-separated keys
  current_location TEXT,
  home_division TEXT,
  home_district TEXT,
  priority      TEXT    CHECK (priority IN ('standard', 'urgent')),
  demo_willing  INTEGER CHECK (demo_willing IN (0, 1)),
  transport     TEXT    CHECK (transport IN ('none', 'bicycle', 'motorbike', 'other')),
  referral_code TEXT,
  availability_paused INTEGER NOT NULL DEFAULT 0 CHECK (availability_paused IN (0, 1)),
  availability_confirmed_at INTEGER,                -- imported tutors re-confirm on first sign-in
  terms_accepted_at INTEGER,                        -- on this site; the old form's tick is not carried over
  registered_at INTEGER,
  import_batch_id INTEGER REFERENCES import_batches (id),
  deleted_at    INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
-- An email links to one tutor only: Google sign-in depends on it.
CREATE UNIQUE INDEX tutors_email ON tutors (email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX tutors_phone ON tutors (phone);
CREATE INDEX tutors_alt_phone ON tutors (alt_phone) WHERE alt_phone IS NOT NULL;

CREATE TABLE tutor_subjects (
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  band          TEXT    NOT NULL CHECK (band IN ('junior', 'ssc', 'hsc')),
  subject       TEXT    NOT NULL,
  PRIMARY KEY (tutor_id, band, subject)
);
CREATE INDEX tutor_subjects_find ON tutor_subjects (subject, band);

-- Empty for imported tutors: the sheet never asked where they want to teach. They add this on first sign-in.
CREATE TABLE tutor_areas (
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  area          TEXT    NOT NULL,
  PRIMARY KEY (tutor_id, area)
);
CREATE INDEX tutor_areas_find ON tutor_areas (area);

CREATE TABLE tutor_statements (
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  kind          TEXT    NOT NULL CHECK (kind IN ('junior_strategy', 'junior_experience', 'ssc_strategy', 'ssc_experience',
                  'hsc_strategy', 'hsc_experience', 'english_experience', 'special_skills', 'skills_detail', 'demo_video')),
  body          TEXT    NOT NULL,
  PRIMARY KEY (tutor_id, kind)
);

CREATE TABLE guardians (
  id            INTEGER PRIMARY KEY,
  phone         TEXT    NOT NULL UNIQUE,            -- one guardian can have many tuitions
  alt_phone     TEXT,
  name          TEXT,
  notes         TEXT,
  created_at    INTEGER NOT NULL
);

ALTER TABLE leads ADD COLUMN guardian_id INTEGER REFERENCES guardians (id);
ALTER TABLE leads ADD COLUMN tuition_code INTEGER REFERENCES tuitions (code);
CREATE INDEX leads_guardian ON leads (guardian_id);

-- The private half of a tuition. Raw sheet notes stay here; only reviewed wording goes to tuitions.requirements_public.
CREATE TABLE tuition_private (
  tuition_code  INTEGER PRIMARY KEY REFERENCES tuitions (code) ON DELETE CASCADE,
  guardian_id   INTEGER REFERENCES guardians (id),
  guardian_label TEXT,                              -- what the sheet called them, e.g. Sir, Madam
  exact_address TEXT,
  lead_source   TEXT,
  private_notes TEXT,
  tutor_qualification TEXT,
  raw_json      TEXT,                               -- the sheet's own class, subject, salary, location and status text
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX tuition_private_guardian ON tuition_private (guardian_id);

CREATE TABLE applications (
  id            INTEGER PRIMARY KEY,
  tuition_code  INTEGER NOT NULL REFERENCES tuitions (code),
  tutor_id      INTEGER REFERENCES tutors (id),     -- null: an old applicant who matched no tutor (admin history only)
  applicant_name TEXT,                              -- kept as they gave it, for old records
  applicant_phone TEXT,
  applicant_gender TEXT,
  applicant_shortcode TEXT,
  applicant_location TEXT,
  note          TEXT,
  fee_plan      TEXT    CHECK (fee_plan IN ('standard', 'early')),
  status        TEXT    NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'shortlisted',
                  'trial_arranged', 'confirmed', 'not_selected', 'withdrawn', 'opportunity_closed')),
  source        TEXT    NOT NULL CHECK (source IN ('site', 'sheet_form', 'staff')),
  import_batch_id INTEGER REFERENCES import_batches (id),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
-- One live application per tutor per tuition.
CREATE UNIQUE INDEX applications_one_active ON applications (tuition_code, tutor_id)
  WHERE tutor_id IS NOT NULL AND status IN ('submitted', 'under_review', 'shortlisted', 'trial_arranged', 'confirmed');
CREATE INDEX applications_tuition ON applications (tuition_code, created_at);
CREATE INDEX applications_tutor ON applications (tutor_id, created_at DESC);
CREATE INDEX applications_phone ON applications (applicant_phone);

-- History of every status change. Append-only.
CREATE TABLE application_events (
  id            INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications (id),
  from_status   TEXT,
  to_status     TEXT    NOT NULL,
  actor_user_id INTEGER REFERENCES users (id),      -- null: the system or the import
  reason        TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX application_events_app ON application_events (application_id, created_at);

-- PRD §8.2. Enforced here so no page can skip a step or reopen a finished application.
CREATE TRIGGER applications_status_rules BEFORE UPDATE OF status ON applications
WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'submitted'      AND NEW.status IN ('under_review', 'not_selected', 'withdrawn', 'opportunity_closed')) OR
  (OLD.status = 'under_review'   AND NEW.status IN ('shortlisted', 'not_selected', 'withdrawn', 'opportunity_closed')) OR
  (OLD.status = 'shortlisted'    AND NEW.status IN ('trial_arranged', 'not_selected', 'withdrawn', 'opportunity_closed')) OR
  (OLD.status = 'trial_arranged' AND NEW.status IN ('confirmed', 'shortlisted', 'not_selected', 'withdrawn', 'opportunity_closed'))
)
BEGIN
  SELECT RAISE(ABORT, 'application status change not allowed');
END;

CREATE TRIGGER application_events_no_update BEFORE UPDATE ON application_events
BEGIN
  SELECT RAISE(ABORT, 'application_events is append-only');
END;
CREATE TRIGGER application_events_no_delete BEFORE DELETE ON application_events
BEGIN
  SELECT RAISE(ABORT, 'application_events is append-only');
END;

-- Who got the tuition. Selected, joined and first salary are separate facts: the sheet's "Booked" proves none of them.
CREATE TABLE placements (
  id            INTEGER PRIMARY KEY,
  tuition_code  INTEGER NOT NULL REFERENCES tuitions (code),
  application_id INTEGER UNIQUE REFERENCES applications (id),
  tutor_id      INTEGER REFERENCES tutors (id),
  legacy_tutor_name TEXT,                           -- old selections that matched no tutor
  legacy_tutor_phone TEXT,
  status        TEXT    NOT NULL DEFAULT 'selected'
                CHECK (status IN ('selected', 'confirmed', 'joined', 'ended', 'cancelled', 'replaced')),
  agreed_salary INTEGER,
  fee_plan      TEXT    CHECK (fee_plan IN ('standard', 'early')),
  selected_at   INTEGER,
  confirmed_at  INTEGER,
  joined_at     INTEGER,
  first_salary_at INTEGER,
  note          TEXT,
  import_batch_id INTEGER REFERENCES import_batches (id),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX placements_tuition ON placements (tuition_code);
CREATE INDEX placements_tutor ON placements (tutor_id);

-- Who did what. Never holds the sensitive values themselves. Append-only.
CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users (id),
  action        TEXT    NOT NULL,
  entity_type   TEXT    NOT NULL,
  entity_id     TEXT,
  reason        TEXT,
  meta_json     TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX audit_log_entity ON audit_log (entity_type, entity_id);

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

-- Holding area for a sheet import under review (PRD §14.4). Reversible by batch.
CREATE TABLE import_batches (
  id            INTEGER PRIMARY KEY,
  source        TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'review' CHECK (status IN ('review', 'approved', 'committed', 'rolled_back')),
  report_json   TEXT,
  created_at    INTEGER NOT NULL,
  committed_at  INTEGER
);

CREATE TABLE import_rows (
  id            INTEGER PRIMARY KEY,
  batch_id      INTEGER NOT NULL REFERENCES import_batches (id) ON DELETE CASCADE,
  tab           TEXT    NOT NULL,
  row_no        INTEGER NOT NULL,
  legacy_ref    TEXT,
  raw_json      TEXT    NOT NULL,
  normalized_json TEXT,
  issues        TEXT,                               -- comma-separated codes
  status        TEXT    NOT NULL CHECK (status IN ('ok', 'needs_review', 'approved', 'rejected', 'committed'))
);
CREATE INDEX import_rows_batch ON import_rows (batch_id, status);
