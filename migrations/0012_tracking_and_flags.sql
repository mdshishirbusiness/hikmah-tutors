-- Tracking placements and the Porao-inspired rules (owner, 2026-11-04, docs/DECISIONS.md "Porao comparison").

-- Check-in calls to the guardian after Confirmed: day 7 ("how is it going?") and day 30 ("first salary paid?").
ALTER TABLE placements ADD COLUMN checkin7_at INTEGER;
ALTER TABLE placements ADD COLUMN checkin30_at INTEGER;
ALTER TABLE placements ADD COLUMN checkin_note TEXT CHECK (checkin_note IS NULL OR length(checkin_note) <= 500);

-- Do-not-place flag, warning only: a private reason on a tutor or a guardian. Nothing is blocked.
ALTER TABLE tutors ADD COLUMN flag_reason TEXT CHECK (flag_reason IS NULL OR length(flag_reason) <= 300);
ALTER TABLE guardians ADD COLUMN flag_reason TEXT CHECK (flag_reason IS NULL OR length(flag_reason) <= 300);

-- One short notice to all tutors on their Home, gone by itself after its end date.
CREATE TABLE notices (
  id            INTEGER PRIMARY KEY,
  body          TEXT    NOT NULL CHECK (length(body) BETWEEN 1 AND 300),
  ends_at       INTEGER NOT NULL,
  created_by    INTEGER REFERENCES users (id),
  created_at    INTEGER NOT NULL
);
CREATE INDEX notices_live ON notices (ends_at);

-- A tuition a tutor referred ("Refer a tuition"): it lands on Leads as "Referred by <tutor>".
ALTER TABLE leads ADD COLUMN referred_by INTEGER REFERENCES tutors (id);
CREATE INDEX leads_referred_by ON leads (referred_by) WHERE referred_by IS NOT NULL;
