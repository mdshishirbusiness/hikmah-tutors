-- Where a student entry came from: typed by the tutor, or read out of their sheet experience notes.
ALTER TABLE tutor_students ADD COLUMN source TEXT NOT NULL DEFAULT 'tutor' CHECK (source IN ('tutor','sheet'));
