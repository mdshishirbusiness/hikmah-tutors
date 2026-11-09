-- Areas the owner adds while posting a tuition (owner, 2026-11-09): a guardian names a place not on the list, and from
-- then on it is on the list for every tuition, filter and tutor's area choice. The built-in areas stay in
-- app/lib/options.ts; these are added after them. Keys never change once used.
CREATE TABLE areas (
  key        TEXT    PRIMARY KEY CHECK (length(key) BETWEEN 2 AND 64),
  label      TEXT    NOT NULL CHECK (length(label) BETWEEN 2 AND 40),
  alt        TEXT    CHECK (alt IS NULL OR length(alt) <= 80),
  created_by INTEGER REFERENCES users (id),
  created_at INTEGER NOT NULL
);
