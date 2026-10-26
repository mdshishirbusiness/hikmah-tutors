-- Guardian requests taken on the phone (Quick Pad). Private: only the admin ever reads this table.
-- Option columns store stable keys (app/lib/options.ts); the Bangla labels can change without touching the data.
CREATE TABLE IF NOT EXISTS leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT    NOT NULL UNIQUE,          -- made on the phone, so a retried save can never create a duplicate
  phone         TEXT    NOT NULL,                 -- 01XXXXXXXXX
  guardian_name TEXT,
  class_level   TEXT    NOT NULL,
  medium        TEXT,
  student_gender TEXT,
  tutor_gender  TEXT,
  subjects      TEXT,                             -- comma-separated keys
  area          TEXT    NOT NULL,                 -- an area key, or free text typed under "অন্য এলাকা"
  address       TEXT,                             -- full address / landmark
  salary        INTEGER,                          -- taka per month
  days_per_week INTEGER,
  notes         TEXT,
  lead_source   TEXT,                             -- call, whatsapp, facebook …
  status        TEXT    NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'searching', 'demo', 'confirmed', 'paid', 'lost')),
  created_at    INTEGER NOT NULL,                 -- unix seconds, when it was typed on the phone
  synced_at     INTEGER NOT NULL                  -- unix seconds, when it reached the server
);

CREATE INDEX IF NOT EXISTS leads_created ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status  ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_phone   ON leads (phone);
