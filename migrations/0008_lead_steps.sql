-- Leads follow New → Called → Posted / Not now (owner, 2026-11-04), replacing the old pipeline statuses, which no page
-- could set. SQLite cannot change a CHECK, so the table is rebuilt. Old 'lost' becomes 'not_now'; the other old
-- statuses meant a tuition was being worked on, so they become 'posted'.
CREATE TABLE leads_next (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT    NOT NULL UNIQUE,
  phone         TEXT    NOT NULL,
  guardian_name TEXT,
  class_level   TEXT    NOT NULL,
  medium        TEXT,
  student_gender TEXT,
  tutor_gender  TEXT,
  subjects      TEXT,
  area          TEXT    NOT NULL,
  address       TEXT,
  salary        INTEGER,
  days_per_week INTEGER,
  notes         TEXT,
  lead_source   TEXT,
  status        TEXT    NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'called', 'posted', 'not_now')),
  created_at    INTEGER NOT NULL,
  synced_at     INTEGER NOT NULL,
  guardian_id   INTEGER REFERENCES guardians (id),
  tuition_code  INTEGER REFERENCES tuitions (code), -- the latest tuition made from this lead
  status_at     INTEGER                             -- unix seconds, last status change
);

INSERT INTO leads_next (id, client_id, phone, guardian_name, class_level, medium, student_gender, tutor_gender, subjects,
                        area, address, salary, days_per_week, notes, lead_source, status, created_at, synced_at,
                        guardian_id, tuition_code)
SELECT id, client_id, phone, guardian_name, class_level, medium, student_gender, tutor_gender, subjects,
       area, address, salary, days_per_week, notes, lead_source,
       CASE status WHEN 'new' THEN 'new' WHEN 'lost' THEN 'not_now' ELSE 'posted' END,
       created_at, synced_at, guardian_id, tuition_code
FROM leads;

DROP TABLE leads;
ALTER TABLE leads_next RENAME TO leads;

CREATE INDEX leads_created  ON leads (created_at DESC);
CREATE INDEX leads_status   ON leads (status, created_at DESC);
CREATE INDEX leads_phone    ON leads (phone);
CREATE INDEX leads_guardian ON leads (guardian_id);

-- One lead can make several tuitions (two children), so each tuition remembers its lead.
ALTER TABLE tuition_private ADD COLUMN lead_id INTEGER REFERENCES leads (id);
CREATE INDEX tuition_private_lead ON tuition_private (lead_id);
