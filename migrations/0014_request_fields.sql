-- One set of request fields for Quick Pad, the guardian form and the tuition editor (owner, 2026-11-04, review step 3).
-- Leads gain what a tuition needs, so "Post" carries everything over without retyping. All columns are optional.

-- "Other" class or subject, as the guardian said it (e.g. Hifz, IELTS).
ALTER TABLE leads ADD COLUMN class_other TEXT CHECK (class_other IS NULL OR length(class_other) <= 60);
ALTER TABLE leads ADD COLUMN subject_other TEXT CHECK (subject_other IS NULL OR length(subject_other) <= 60);
ALTER TABLE tuitions ADD COLUMN class_other TEXT CHECK (class_other IS NULL OR length(class_other) <= 60);
ALTER TABLE tuitions ADD COLUMN subject_other TEXT CHECK (subject_other IS NULL OR length(subject_other) <= 60);

-- A time window, in minutes after midnight (2:00 PM = 840). Either both or neither, and the end after the start.
ALTER TABLE leads ADD COLUMN time_from INTEGER CHECK (time_from IS NULL OR time_from BETWEEN 0 AND 1439);
ALTER TABLE leads ADD COLUMN time_to INTEGER CHECK (time_to IS NULL OR (time_to BETWEEN 1 AND 1440 AND time_to > COALESCE(time_from, -1)));
ALTER TABLE tuitions ADD COLUMN time_from INTEGER CHECK (time_from IS NULL OR time_from BETWEEN 0 AND 1439);
ALTER TABLE tuitions ADD COLUMN time_to INTEGER CHECK (time_to IS NULL OR (time_to BETWEEN 1 AND 1440 AND time_to > COALESCE(time_from, -1)));

-- What a tuition already had and a lead did not.
ALTER TABLE leads ADD COLUMN time_of_day TEXT CHECK (time_of_day IS NULL OR time_of_day IN ('morning', 'noon', 'afternoon', 'evening', 'night', 'flexible'));
ALTER TABLE leads ADD COLUMN session_minutes INTEGER CHECK (session_minutes IS NULL OR session_minutes BETWEEN 30 AND 300);
ALTER TABLE leads ADD COLUMN tutor_from TEXT;

-- Requirement quick picks, comma-separated keys from REQUIREMENTS in app/lib/request.ts (the most common asks in the
-- sheet: experienced, teaches with care, takes regular tests, from the subject's department …).
ALTER TABLE leads ADD COLUMN requirement_keys TEXT;
ALTER TABLE tuitions ADD COLUMN requirement_keys TEXT NOT NULL DEFAULT '';
