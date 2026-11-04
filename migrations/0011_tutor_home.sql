-- Step 3 (owner, 2026-11-04): the tutor's Home and Profile tabs.

-- The tutor's own short About text, shown to the admin with their applications. Typed by the tutor, so capped.
ALTER TABLE tutors ADD COLUMN about TEXT CHECK (about IS NULL OR length(about) <= 500);

-- When the tutor last opened Home: updates after this carry the red dot.
ALTER TABLE tutors ADD COLUMN updates_seen_at INTEGER;
