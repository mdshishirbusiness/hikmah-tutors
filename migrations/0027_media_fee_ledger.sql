-- Media fee ledger (owner, 2026-11-09, ready tutors plan step 3). Starts fresh: nothing imported from the sheet.

-- Each tuition's fee: Standard (60%, or 50% paid early; app/lib/fee.ts) or Custom, a percent of the first month's
-- salary or a fixed taka amount (short-term tuitions). It may change until a tutor confirms; fee_changed_at lets
-- applicants who applied before the change see "Media fee changed".
ALTER TABLE tuitions ADD COLUMN fee_kind TEXT NOT NULL DEFAULT 'standard' CHECK (fee_kind IN ('standard', 'percent', 'fixed'));
ALTER TABLE tuitions ADD COLUMN fee_value INTEGER CHECK (fee_value IS NULL OR fee_value > 0);
ALTER TABLE tuitions ADD COLUMN fee_changed_at INTEGER;

-- A confirm with no salary to take a percent of (negotiable, not given): the fee waits on Money until the owner enters
-- the agreed salary. Placements confirmed before the ledger have neither this nor a charge, and stay out of it.
ALTER TABLE placements ADD COLUMN fee_waiting_at INTEGER;

-- Every taka of a placement's fee. Never edited or deleted: a mistake is undone by a reversal entry. The balance is the
-- sum of delta: a charge adds (worked out once, when the tutor confirms), payments, reductions and wallet credits
-- (step 5) take off, and a reversal is the exact opposite of the one entry it undoes.
CREATE TABLE fee_entries (
  id            INTEGER PRIMARY KEY,
  placement_id  INTEGER NOT NULL REFERENCES placements (id),
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id),
  kind          TEXT    NOT NULL CHECK (kind IN ('charge', 'payment', 'reduction', 'credit', 'reversal')),
  delta         INTEGER NOT NULL CHECK (
                  (kind = 'charge' AND delta > 0) OR (kind IN ('payment', 'reduction', 'credit') AND delta < 0) OR (kind = 'reversal' AND delta <> 0)),
  method        TEXT    CHECK (method IN ('bkash', 'nagad', 'rocket', 'cash')),
  txn_ref       TEXT    CHECK (txn_ref IS NULL OR length(txn_ref) <= 40),
  paid_at       INTEGER,                            -- payments: the day the money came, for income by month
  terms         TEXT,                               -- charges: 'standard', 'early', 'percent:20' or 'fixed:1500'
  basis         INTEGER,                            -- charges: the salary the percent was taken from
  later         INTEGER NOT NULL DEFAULT 0,         -- charges: the part due only after the first salary (Standard)
  reverses_id   INTEGER UNIQUE REFERENCES fee_entries (id),
  note          TEXT    CHECK (note IS NULL OR length(note) <= 300),
  created_by    INTEGER REFERENCES users (id),
  created_at    INTEGER NOT NULL,
  CHECK ((kind = 'payment') = (method IS NOT NULL AND paid_at IS NOT NULL)),
  CHECK ((kind = 'charge') = (terms IS NOT NULL)),
  CHECK ((kind = 'reversal') = (reverses_id IS NOT NULL)),
  CHECK (kind NOT IN ('reduction', 'reversal') OR COALESCE(length(trim(note)), 0) > 0)
);
CREATE INDEX fee_entries_placement ON fee_entries (placement_id, created_at);
CREATE INDEX fee_entries_tutor ON fee_entries (tutor_id, created_at);
CREATE INDEX fee_entries_paid ON fee_entries (paid_at) WHERE kind = 'payment';

CREATE TRIGGER fee_entries_fixed BEFORE UPDATE ON fee_entries BEGIN SELECT RAISE(ABORT, 'fee entries are never edited; add a reversal'); END;
CREATE TRIGGER fee_entries_kept BEFORE DELETE ON fee_entries BEGIN SELECT RAISE(ABORT, 'fee entries are never deleted; add a reversal'); END;

-- A reversal undoes exactly one entry of the same placement, by its exact amount; a reversal is never reversed.
CREATE TRIGGER fee_entries_reversal BEFORE INSERT ON fee_entries WHEN NEW.kind = 'reversal'
BEGIN
  SELECT RAISE(ABORT, 'a reversal must undo one entry of this placement, by its amount')
  WHERE NOT EXISTS (SELECT 1 FROM fee_entries o WHERE o.id = NEW.reverses_id AND o.placement_id = NEW.placement_id
                      AND o.kind <> 'reversal' AND o.delta = -NEW.delta);
END;

-- One live charge per placement: a confirm that is undone reverses its charge before a new confirm charges again.
CREATE TRIGGER fee_entries_one_charge BEFORE INSERT ON fee_entries WHEN NEW.kind = 'charge'
BEGIN
  SELECT RAISE(ABORT, 'this placement already has a fee')
  WHERE EXISTS (SELECT 1 FROM fee_entries o WHERE o.placement_id = NEW.placement_id AND o.kind = 'charge'
                  AND NOT EXISTS (SELECT 1 FROM fee_entries r WHERE r.reverses_id = o.id));
END;
