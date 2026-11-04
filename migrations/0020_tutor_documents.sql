-- Documents a tutor sends when registering on the site (owner, 2026-11-05). At least one 'academic' document (student ID
-- card, admission slip, result sheet, certificate...) is required to register; up to 5 are kept. An 'nid' is optional extra
-- security and never replaces the academic one. Files sit in the private R2 bucket (binding PHOTOS) under docs/; only the
-- admin and the tutor see them, and every admin view is written to audit_log.
CREATE TABLE tutor_documents (
  id         INTEGER PRIMARY KEY,
  tutor_id   INTEGER NOT NULL REFERENCES tutors (id),
  kind       TEXT    NOT NULL CHECK (kind IN ('academic', 'nid')),
  label      TEXT    CHECK (label IS NULL OR label IN ('student_id', 'admission', 'result', 'certificate', 'other')),
  r2_key     TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX tutor_documents_tutor ON tutor_documents (tutor_id);
