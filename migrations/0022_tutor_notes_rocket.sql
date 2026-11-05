-- Tutor's own notes and Rocket for Premium (owner, 2026-11-05; docs/DECISIONS.md).

-- What the selected tutor writes down about a tuition ("the guardian said …"). Private to that tutor and the admin.
-- Kept like a diary: written once, never changed; a mistake is removed, not deleted.
CREATE TABLE tutor_notes (
  id             INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications (id),
  tutor_id       INTEGER NOT NULL REFERENCES tutors (id),
  body           TEXT    NOT NULL CHECK (length(body) BETWEEN 1 AND 600),
  created_at     INTEGER NOT NULL,
  removed_at     INTEGER
);
CREATE INDEX tutor_notes_application ON tutor_notes (application_id, created_at DESC);

CREATE TRIGGER tutor_notes_only_remove BEFORE UPDATE ON tutor_notes
WHEN NEW.application_id IS NOT OLD.application_id OR NEW.tutor_id IS NOT OLD.tutor_id OR NEW.body IS NOT OLD.body
  OR NEW.created_at IS NOT OLD.created_at OR OLD.removed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'a note can only be removed once');
END;
CREATE TRIGGER tutor_notes_no_delete BEFORE DELETE ON tutor_notes
BEGIN
  SELECT RAISE(ABORT, 'tutor_notes rows are never deleted');
END;

-- Rocket joins bKash and Nagad, and the tutor pays when applying, so HTR may decline a paid application (with a full
-- refund; owner, 2026-11-05). SQLite can't change a CHECK or trigger in place, so premium_members is rebuilt with the same
-- columns, indexes and triggers (0019). Its only child, premium_problems, is set aside first and rebuilt after, so no
-- foreign key is broken at any step.
CREATE TABLE premium_problems_keep AS SELECT * FROM premium_problems;
DROP TABLE premium_problems;

CREATE TABLE premium_members_new (
  id            INTEGER PRIMARY KEY,
  tutor_id      INTEGER NOT NULL REFERENCES tutors (id),
  status        TEXT    NOT NULL DEFAULT 'applied'
                CHECK (status IN ('applied', 'accepted', 'paid', 'active', 'declined', 'cancelled', 'delivered', 'ended')),
  min_salary    INTEGER NOT NULL CHECK (min_salary >= 2000),
  price         INTEGER NOT NULL CHECK (price >= 1000),
  areas         TEXT    NOT NULL DEFAULT '',
  anywhere      INTEGER NOT NULL DEFAULT 0 CHECK (anywhere IN (0, 1)),
  classes       TEXT    NOT NULL DEFAULT '',
  subjects      TEXT    NOT NULL DEFAULT '',
  terms_version TEXT    NOT NULL,
  applied_at    INTEGER NOT NULL,
  decided_at    INTEGER,
  decline_note  TEXT    CHECK (decline_note IS NULL OR length(decline_note) <= 300),
  pay_method    TEXT    CHECK (pay_method IS NULL OR pay_method IN ('bkash', 'nagad', 'rocket')),
  pay_from      TEXT    CHECK (pay_from IS NULL OR length(pay_from) = 11),
  pay_trx       TEXT    CHECK (pay_trx IS NULL OR length(pay_trx) BETWEEN 6 AND 20),
  pay_amount    INTEGER CHECK (pay_amount IS NULL OR pay_amount > 0),
  paid_at       INTEGER,
  verified_at   INTEGER,
  starts_at     INTEGER,
  ends_at       INTEGER,
  renewals      INTEGER NOT NULL DEFAULT 0,
  placement_id  INTEGER REFERENCES placements (id),
  real_salary   INTEGER CHECK (real_salary IS NULL OR real_salary > 0),
  first_salary_at INTEGER,
  fee_left      INTEGER CHECK (fee_left IS NULL OR fee_left >= 0),
  fee_paid_at   INTEGER,
  fee_trx       TEXT    CHECK (fee_trx IS NULL OR length(fee_trx) BETWEEN 6 AND 20),
  ended_at      INTEGER,
  end_reason    TEXT    CHECK (end_reason IS NULL OR end_reason IN ('delivered', 'day90_refund', 'problems', 'misconduct', 'htr_stopped')),
  refund_amount INTEGER CHECK (refund_amount IS NULL OR refund_amount >= 0),
  refund_due_at INTEGER,
  refund_sent_at INTEGER,
  refund_trx    TEXT    CHECK (refund_trx IS NULL OR length(refund_trx) BETWEEN 6 AND 20),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
INSERT INTO premium_members_new SELECT * FROM premium_members;
DROP TABLE premium_members;
ALTER TABLE premium_members_new RENAME TO premium_members;

CREATE UNIQUE INDEX premium_one_open ON premium_members (tutor_id) WHERE status IN ('applied', 'accepted', 'paid', 'active');
CREATE UNIQUE INDEX premium_pay_trx ON premium_members (pay_trx) WHERE pay_trx IS NOT NULL;
CREATE INDEX premium_status ON premium_members (status, updated_at);
CREATE INDEX premium_refunds ON premium_members (refund_due_at) WHERE refund_due_at IS NOT NULL AND refund_sent_at IS NULL;

CREATE TRIGGER premium_status_rules BEFORE UPDATE OF status ON premium_members
WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'applied'  AND NEW.status IN ('accepted', 'declined', 'cancelled')) OR
  (OLD.status = 'accepted' AND NEW.status IN ('paid', 'cancelled')) OR
  (OLD.status = 'paid'     AND NEW.status IN ('active', 'accepted', 'cancelled', 'declined')) OR
  (OLD.status = 'active'   AND NEW.status IN ('delivered', 'ended'))
)
BEGIN
  SELECT RAISE(ABORT, 'premium status change not allowed');
END;

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

-- premium_problems back, as in 0019.
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
INSERT INTO premium_problems SELECT * FROM premium_problems_keep;
DROP TABLE premium_problems_keep;
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
