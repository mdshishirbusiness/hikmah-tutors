-- Moderators (owner, 2026-11-16): staff the owner adds by Gmail at /admin/team. users.role stays 'owner' | 'tutor';
-- a signed-in user whose email has a live row here is a moderator, with only the switches in `perms`.
CREATE TABLE staff (
  id         INTEGER PRIMARY KEY,
  email      TEXT    NOT NULL UNIQUE,              -- lowercase Gmail
  name       TEXT,
  perms      TEXT    NOT NULL DEFAULT '',          -- comma-separated keys from app/lib/staff.ts
  added_by   INTEGER REFERENCES users (id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  removed_at INTEGER                               -- set on Remove; adding the same Gmail again clears it
);

-- Which moderator looks after a tuition (owner, 2026-11-16): a moderator sees only their own. Set when a moderator
-- makes the tuition, or by the owner. NULL = the owner's alone. Private table, so it never reaches the public board.
ALTER TABLE tuition_private ADD COLUMN staff_id INTEGER REFERENCES staff (id);
CREATE INDEX tuition_private_staff ON tuition_private (staff_id) WHERE staff_id IS NOT NULL;
