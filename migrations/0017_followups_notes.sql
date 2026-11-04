-- Follow-ups and conversation notes (owner, 2026-11-05, part D). A follow-up is a reminder to call or check on a
-- guardian, tutor, lead or tuition at a set time; it shows on Today when due. Notes keep what was said with a guardian
-- or a tutor, newest first; a finished follow-up's outcome lands there too. Admin only.
CREATE TABLE followups (
  id         INTEGER PRIMARY KEY,
  kind       TEXT    NOT NULL CHECK (kind IN ('guardian', 'tutor', 'lead', 'tuition')),
  ref_id     INTEGER NOT NULL,                 -- guardians.id, tutors.id, leads.id or tuitions.code
  due_at     INTEGER NOT NULL,                 -- unix seconds
  note       TEXT    CHECK (note IS NULL OR length(note) <= 300),
  done_at    INTEGER,
  outcome    TEXT    CHECK (outcome IS NULL OR length(outcome) <= 300),
  created_by INTEGER REFERENCES users (id),
  created_at INTEGER NOT NULL
);
CREATE INDEX followups_open ON followups (due_at) WHERE done_at IS NULL;
CREATE INDEX followups_ref ON followups (kind, ref_id);

CREATE TABLE contact_notes (
  id          INTEGER PRIMARY KEY,
  kind        TEXT    NOT NULL CHECK (kind IN ('guardian', 'tutor')),
  ref_id      INTEGER NOT NULL,                -- guardians.id or tutors.id
  body        TEXT    NOT NULL CHECK (length(body) BETWEEN 1 AND 600),
  followup_id INTEGER REFERENCES followups (id),
  created_by  INTEGER REFERENCES users (id),
  created_at  INTEGER NOT NULL
);
CREATE INDEX contact_notes_ref ON contact_notes (kind, ref_id, created_at DESC);
