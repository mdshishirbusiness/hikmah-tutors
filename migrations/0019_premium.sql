-- Premium Tutor (owner, 2026-11-05, part E; rules in docs/DECISIONS.md 2026-10-28, 2026-10-29 and 2026-11-05).
-- One row per Premium term: the tutor applies, HTR accepts, the tutor pays and HTR verifies, then 90 days run until a
-- tuition is delivered (first salary received and the fee left paid) or the term ends. Admin and the tutor only.
CREATE TABLE premium_members (
  id            INTEGER PRIMARY KEY,
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id),
  status        TEXT    NOT NULL DEFAULT 'applied'
                CHECK (status IN ('applied', 'accepted', 'paid', 'active', 'declined', 'cancelled', 'delivered', 'ended')),
  min_salary    INTEGER NOT NULL CHECK (min_salary >= 2000),
  price         INTEGER NOT NULL CHECK (price >= 1000),           -- 50% of min_salary, rounded to ৳100
  -- What "a matching tuition" means: saved when the tutor applies, saved again when HTR accepts.
  areas         TEXT    NOT NULL DEFAULT '',                       -- comma-separated keys
  anywhere      INTEGER NOT NULL DEFAULT 0 CHECK (anywhere IN (0, 1)),
  classes       TEXT    NOT NULL DEFAULT '',
  subjects      TEXT    NOT NULL DEFAULT '',                       -- band:subject, comma-separated
  terms_version TEXT    NOT NULL,
  applied_at    INTEGER NOT NULL,
  decided_at    INTEGER,
  decline_note  TEXT    CHECK (decline_note IS NULL OR length(decline_note) <= 300),
  -- The tutor's payment, entered by the tutor, checked by HTR against its bKash/Nagad.
  pay_method    TEXT    CHECK (pay_method IS NULL OR pay_method IN ('bkash', 'nagad')),
  pay_from      TEXT    CHECK (pay_from IS NULL OR length(pay_from) = 11),
  pay_trx       TEXT    CHECK (pay_trx IS NULL OR length(pay_trx) BETWEEN 6 AND 20),
  pay_amount    INTEGER CHECK (pay_amount IS NULL OR pay_amount > 0),
  paid_at       INTEGER,
  verified_at   INTEGER,
  starts_at     INTEGER,
  ends_at       INTEGER,
  renewals      INTEGER NOT NULL DEFAULT 0,
  -- Delivery: the tuition HTR gave, its real salary, the fee left (50% of it minus the deposit).
  placement_id  INTEGER REFERENCES placements (id),
  real_salary   INTEGER CHECK (real_salary IS NULL OR real_salary > 0),
  first_salary_at INTEGER,
  fee_left      INTEGER CHECK (fee_left IS NULL OR fee_left >= 0),
  fee_paid_at   INTEGER,
  fee_trx       TEXT    CHECK (fee_trx IS NULL OR length(fee_trx) BETWEEN 6 AND 20),
  -- The end, and any refund owed.
  ended_at      INTEGER,
  end_reason    TEXT    CHECK (end_reason IS NULL OR end_reason IN ('delivered', 'day90_refund', 'problems', 'misconduct', 'htr_stopped')),
  refund_amount INTEGER CHECK (refund_amount IS NULL OR refund_amount >= 0),
  refund_due_at INTEGER,
  refund_sent_at INTEGER,
  refund_trx    TEXT    CHECK (refund_trx IS NULL OR length(refund_trx) BETWEEN 6 AND 20),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
-- One open term per tutor.
CREATE UNIQUE INDEX premium_one_open ON premium_members (tutor_id) WHERE status IN ('applied', 'accepted', 'paid', 'active');
-- A TrxID pays for one term only.
CREATE UNIQUE INDEX premium_pay_trx ON premium_members (pay_trx) WHERE pay_trx IS NOT NULL;
CREATE INDEX premium_status ON premium_members (status, updated_at);
CREATE INDEX premium_refunds ON premium_members (refund_due_at) WHERE refund_due_at IS NOT NULL AND refund_sent_at IS NULL;

CREATE TRIGGER premium_status_rules BEFORE UPDATE OF status ON premium_members
WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'applied'  AND NEW.status IN ('accepted', 'declined', 'cancelled')) OR
  (OLD.status = 'accepted' AND NEW.status IN ('paid', 'cancelled')) OR
  (OLD.status = 'paid'     AND NEW.status IN ('active', 'accepted', 'cancelled')) OR
  (OLD.status = 'active'   AND NEW.status IN ('delivered', 'ended'))
)
BEGIN
  SELECT RAISE(ABORT, 'premium status change not allowed');
END;

-- Once HTR has verified a payment, its record is fixed (it is the receipt). The same for a sent refund.
CREATE TRIGGER premium_receipt_fixed BEFORE UPDATE ON premium_members
WHEN (OLD.verified_at IS NOT NULL AND (NEW.pay_trx IS NOT OLD.pay_trx OR NEW.pay_amount IS NOT OLD.pay_amount
        OR NEW.pay_method IS NOT OLD.pay_method OR NEW.verified_at IS NOT OLD.verified_at OR NEW.price IS NOT OLD.price))
  OR (OLD.refund_sent_at IS NOT NULL AND (NEW.refund_amount IS NOT OLD.refund_amount OR NEW.refund_trx IS NOT OLD.refund_trx
        OR NEW.refund_sent_at IS NOT OLD.refund_sent_at))
BEGIN
  SELECT RAISE(ABORT, 'a verified payment or a sent refund cannot change');
END;

CREATE TRIGGER premium_members_no_delete BEFORE DELETE ON premium_members
BEGIN
  SELECT RAISE(ABORT, 'premium_members rows are never deleted');
END;

-- Problems during a term (the old হলুদ কার্ড, in plain words). A mistake is removed, not deleted.
CREATE TABLE premium_problems (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER NOT NULL REFERENCES premium_members (id),
  kind       TEXT    NOT NULL CHECK (kind IN ('no_reply', 'refused', 'wrong_profile', 'found_elsewhere', 'trial_missed')),
  points     INTEGER NOT NULL CHECK (points IN (1, 2)),
  note       TEXT    CHECK (note IS NULL OR length(note) <= 300),
  created_by INTEGER REFERENCES users (id),
  created_at INTEGER NOT NULL,
  removed_at INTEGER,
  removed_by INTEGER REFERENCES users (id)
);
CREATE INDEX premium_problems_member ON premium_problems (member_id, created_at);

CREATE TRIGGER premium_problems_only_remove BEFORE UPDATE ON premium_problems
WHEN NEW.member_id IS NOT OLD.member_id OR NEW.kind IS NOT OLD.kind OR NEW.points IS NOT OLD.points OR NEW.note IS NOT OLD.note
  OR NEW.created_at IS NOT OLD.created_at OR OLD.removed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'a problem can only be removed once');
END;
CREATE TRIGGER premium_problems_no_delete BEFORE DELETE ON premium_problems
BEGIN
  SELECT RAISE(ABORT, 'premium_problems rows are never deleted');
END;
