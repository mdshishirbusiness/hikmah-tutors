-- Applications to teach Hikmah's admission batches (owner, 2026-11-09). Anyone with a Google account applies once; a
-- registered tutor's record is linked. The owner filters, calls, takes a demo, shortlists and finalises.
-- Lists (tracks, subjects, setup, tools, days, times) are comma-separated keys from app/lib/batch.ts.
CREATE TABLE batch_applications (
  id                 INTEGER PRIMARY KEY,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users (id),
  tutor_id           INTEGER REFERENCES tutors (id),
  full_name          TEXT    NOT NULL CHECK (length(full_name) BETWEEN 2 AND 80),
  phone              TEXT    NOT NULL CHECK (length(phone) = 11),
  university         TEXT    CHECK (university IS NULL OR length(university) <= 80),
  department         TEXT    CHECK (department IS NULL OR length(department) <= 80),
  session_year       TEXT    CHECK (session_year IS NULL OR length(session_year) <= 20),
  tracks             TEXT    NOT NULL,
  subjects           TEXT    NOT NULL,
  subject_other      TEXT    CHECK (subject_other IS NULL OR length(subject_other) <= 80),
  admission_result   TEXT    CHECK (admission_result IS NULL OR length(admission_result) <= 200),
  experience_years   INTEGER CHECK (experience_years IS NULL OR experience_years BETWEEN 0 AND 40),
  admission_students INTEGER CHECK (admission_students IS NULL OR admission_students BETWEEN 0 AND 10000),
  experience         TEXT    CHECK (experience IS NULL OR length(experience) <= 600),
  mode               TEXT    NOT NULL CHECK (mode IN ('online', 'offline', 'both')),
  setup              TEXT,
  internet           TEXT    CHECK (internet IS NULL OR internet IN ('broadband', 'mobile')),
  tools              TEXT,
  days               TEXT,
  times              TEXT,
  pay_per_class      INTEGER CHECK (pay_per_class IS NULL OR pay_per_class BETWEEN 0 AND 100000),
  demo_url           TEXT    CHECK (demo_url IS NULL OR (length(demo_url) <= 300 AND demo_url LIKE 'http%')),
  note               TEXT    CHECK (note IS NULL OR length(note) <= 600),
  status             TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'called', 'demo', 'shortlisted', 'final', 'not_now')),
  rating             INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  admin_note         TEXT    CHECK (admin_note IS NULL OR length(admin_note) <= 1000),
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  status_at          INTEGER
);
CREATE INDEX batch_applications_status ON batch_applications (status, created_at DESC);

-- The applicant's answers are fixed once the owner has moved the application on from New.
CREATE TRIGGER batch_applications_lock BEFORE UPDATE ON batch_applications
WHEN OLD.status <> 'new'
BEGIN
  SELECT RAISE(ABORT, 'application answers are fixed after New')
    WHERE NEW.user_id IS NOT OLD.user_id OR NEW.full_name IS NOT OLD.full_name OR NEW.phone IS NOT OLD.phone
       OR NEW.university IS NOT OLD.university OR NEW.department IS NOT OLD.department OR NEW.session_year IS NOT OLD.session_year
       OR NEW.tracks IS NOT OLD.tracks OR NEW.subjects IS NOT OLD.subjects OR NEW.subject_other IS NOT OLD.subject_other
       OR NEW.admission_result IS NOT OLD.admission_result OR NEW.experience_years IS NOT OLD.experience_years
       OR NEW.admission_students IS NOT OLD.admission_students OR NEW.experience IS NOT OLD.experience OR NEW.mode IS NOT OLD.mode
       OR NEW.setup IS NOT OLD.setup OR NEW.internet IS NOT OLD.internet OR NEW.tools IS NOT OLD.tools OR NEW.days IS NOT OLD.days
       OR NEW.times IS NOT OLD.times OR NEW.pay_per_class IS NOT OLD.pay_per_class OR NEW.demo_url IS NOT OLD.demo_url
       OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at;
END;

CREATE TRIGGER batch_applications_no_delete BEFORE DELETE ON batch_applications
BEGIN
  SELECT RAISE(ABORT, 'applications are kept');
END;
