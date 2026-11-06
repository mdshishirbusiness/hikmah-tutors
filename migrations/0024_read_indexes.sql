-- Fewer D1 rows read (2026-11-06). Cloudflare's insights showed the admin sidebar counts and the applications list
-- reading every application (~10k rows) on each admin click, because no index started with status or created_at.

-- Sidebar counts, the Waiting list on admin home and the applications list filtered by status.
CREATE INDEX applications_status ON applications (status, created_at);

-- The applications list with no filter, newest first: walks the index and stops after one page.
CREATE INDEX applications_created ON applications (created_at);

-- Counts and lists by tuition status (sidebar, drafts, Review, the tuitions page's status chips).
CREATE INDEX tuitions_status ON tuitions (status, is_public);

-- Recently booked on the public board: start from the last 7 days of placements, not from every tuition.
CREATE INDEX placements_confirmed ON placements (confirmed_at);
