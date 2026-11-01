-- Rules for the admin tuition editor, enforced here so no page can break them.
CREATE TRIGGER tuitions_status_rules BEFORE UPDATE OF status ON tuitions
WHEN NEW.status <> OLD.status AND NOT (
  (OLD.status = 'draft'      AND NEW.status IN ('available', 'cancelled', 'closed')) OR
  (OLD.status = 'available'  AND NEW.status IN ('processing', 'booked', 'cancelled', 'closed')) OR
  (OLD.status = 'processing' AND NEW.status IN ('available', 'booked', 'cancelled', 'closed')) OR
  (OLD.status = 'booked'     AND NEW.status IN ('available', 'closed')) OR -- available: the placement fell through
  (OLD.status = 'cancelled'  AND NEW.status = 'closed')
)
BEGIN
  SELECT RAISE(ABORT, 'tuition status change not allowed');
END;

-- Public only while open, and only with the details a tutor needs.
CREATE TRIGGER tuitions_publish_rules BEFORE UPDATE ON tuitions
WHEN NEW.is_public = 1 AND (NEW.status NOT IN ('available', 'processing') OR NEW.medium = '' OR NEW.posted_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'tuition cannot be public');
END;
