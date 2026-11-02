-- The ticket card's schedule (owner, 2026-11-02): how long each session is and when in the day. Both stay empty until
-- the admin sets them; the card leaves out what it doesn't know.
ALTER TABLE tuitions ADD COLUMN session_minutes INTEGER CHECK (session_minutes BETWEEN 30 AND 300);
ALTER TABLE tuitions ADD COLUMN time_of_day TEXT
  CHECK (time_of_day IN ('morning', 'noon', 'afternoon', 'evening', 'night', 'flexible'));

-- The board counts live applications per tuition.
CREATE INDEX IF NOT EXISTS applications_tuition_status ON applications (tuition_code, status);
