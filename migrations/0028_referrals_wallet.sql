-- Tutor referral and wallet (owner, 2026-11-09, ready tutors plan step 5).

-- Who referred this tutor: set once at registration (a link or the referrer's code), never by the tutor afterwards.
-- The owner may fix a wrong referrer until the referral has earned credit; nobody refers themselves.
ALTER TABLE tutors ADD COLUMN referred_by INTEGER REFERENCES tutors (id);
ALTER TABLE tutors ADD COLUMN referred_at INTEGER;
CREATE INDEX tutors_referred_by ON tutors (referred_by) WHERE referred_by IS NOT NULL;

CREATE TRIGGER tutors_referral_rules BEFORE UPDATE OF referred_by ON tutors
WHEN NEW.referred_by IS NOT OLD.referred_by
BEGIN
  SELECT RAISE(ABORT, 'a tutor cannot refer themselves') WHERE NEW.referred_by = NEW.id;
  SELECT RAISE(ABORT, 'this referral has already earned credit')
  WHERE EXISTS (SELECT 1 FROM wallet_entries w WHERE w.kind = 'referral' AND w.referred_tutor_id = NEW.id
                  AND NOT EXISTS (SELECT 1 FROM wallet_entries r WHERE r.reverses_id = w.id));
END;

-- The wallet: credit a tutor can only spend on media fees (never cash). referral adds, spend takes off (paired with a
-- 'credit' fee entry), and a reversal is the exact opposite of one entry. Never edited or deleted.
CREATE TABLE wallet_entries (
  id                 INTEGER PRIMARY KEY,
  tutor_id           INTEGER NOT NULL REFERENCES tutors (id),
  kind               TEXT    NOT NULL CHECK (kind IN ('referral', 'spend', 'reversal')),
  delta              INTEGER NOT NULL CHECK ((kind = 'referral' AND delta > 0) OR (kind = 'spend' AND delta < 0) OR (kind = 'reversal' AND delta <> 0)),
  referred_tutor_id  INTEGER REFERENCES tutors (id),   -- referral: the tutor who joined
  fee_entry_id       INTEGER REFERENCES fee_entries (id), -- spend: the fee credit it paid
  reverses_id        INTEGER UNIQUE REFERENCES wallet_entries (id),
  note               TEXT    CHECK (note IS NULL OR length(note) <= 300),
  created_by         INTEGER REFERENCES users (id),
  created_at         INTEGER NOT NULL,
  CHECK ((kind = 'referral') = (referred_tutor_id IS NOT NULL)),
  CHECK ((kind = 'spend') = (fee_entry_id IS NOT NULL)),
  CHECK ((kind = 'reversal') = (reverses_id IS NOT NULL))
);
CREATE INDEX wallet_entries_tutor ON wallet_entries (tutor_id, created_at);
-- One live credit per referred tutor.
CREATE UNIQUE INDEX wallet_one_referral ON wallet_entries (referred_tutor_id) WHERE kind = 'referral';

CREATE TRIGGER wallet_entries_fixed BEFORE UPDATE ON wallet_entries BEGIN SELECT RAISE(ABORT, 'wallet entries are never edited; add a reversal'); END;
CREATE TRIGGER wallet_entries_kept BEFORE DELETE ON wallet_entries BEGIN SELECT RAISE(ABORT, 'wallet entries are never deleted; add a reversal'); END;

CREATE TRIGGER wallet_entries_reversal BEFORE INSERT ON wallet_entries WHEN NEW.kind = 'reversal'
BEGIN
  SELECT RAISE(ABORT, 'a reversal must undo one entry of this tutor, by its amount')
  WHERE NOT EXISTS (SELECT 1 FROM wallet_entries o WHERE o.id = NEW.reverses_id AND o.tutor_id = NEW.tutor_id
                      AND o.kind <> 'reversal' AND o.delta = -NEW.delta);
END;

-- A spend never takes the balance below zero.
CREATE TRIGGER wallet_entries_no_overdraw BEFORE INSERT ON wallet_entries WHEN NEW.kind = 'spend'
BEGIN
  SELECT RAISE(ABORT, 'not enough wallet credit')
  WHERE (SELECT COALESCE(sum(delta), 0) FROM wallet_entries WHERE tutor_id = NEW.tutor_id) + NEW.delta < 0;
END;
