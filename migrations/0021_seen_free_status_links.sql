-- Tutor side vs Porao and Tutor Provide (owner, 2026-11-05; docs/DECISIONS.md).

-- Seen by HTR: the first time the owner opens an application. Not a status; the ladder is unchanged.
ALTER TABLE applications ADD COLUMN seen_at INTEGER;

-- When the tutor is free: comma-separated TIMES_OF_DAY keys (morning, noon, afternoon, evening, night), or 'any'.
-- NULL = not answered yet; it never hides a tuition.
ALTER TABLE tutors ADD COLUMN free_times TEXT CHECK (free_times IS NULL OR length(free_times) <= 60);

-- A guardian's private status link for one tuition. Only the hash of the token is kept; a new link revokes the old.
CREATE TABLE guardian_links (
  token_hash    TEXT    PRIMARY KEY,
  tuition_code  INTEGER NOT NULL REFERENCES tuitions (code),
  created_by    INTEGER REFERENCES users (id),
  created_at    INTEGER NOT NULL,
  revoked_at    INTEGER
);
CREATE INDEX guardian_links_tuition ON guardian_links (tuition_code, revoked_at);
