-- A tutor's photo in the private R2 bucket (binding PHOTOS), e.g. tutors/T1234.webp. Served only to the admin and the
-- tutor themself by /photos/tutor/:code. photo_source_url keeps the sheet's Drive link as a fallback.
ALTER TABLE tutors ADD COLUMN photo_key TEXT;
