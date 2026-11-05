-- One-off (owner, 2026-11-05): site sign-ups made while codes started at 5001 move to 2489 and up, in the order they
-- joined, so they carry on the sheet's numbering. Every other table points at tutors.id, so only the code changes.
-- Moves nothing if any code from 2489 to 5000 is already taken. Safe to run twice: the second run finds nothing to move.
DROP TABLE IF EXISTS renumber_signups;
CREATE TABLE renumber_signups AS
SELECT id, code AS old_code, 2488 + row_number() OVER (ORDER BY code) AS new_code
FROM tutors WHERE created_via = 'signup' AND code BETWEEN 5001 AND 89999
  AND NOT EXISTS (SELECT 1 FROM tutors WHERE code BETWEEN 2489 AND 5000);

INSERT INTO audit_log (action, entity_type, entity_id, meta_json, created_at)
SELECT 'tutor_codes_renumbered', 'tutor', '', json_object('moved', count(*), 'from', min(old_code), 'to_first', min(new_code)), unixepoch()
FROM renumber_signups HAVING count(*) > 0;

UPDATE tutors SET code = r.new_code, updated_at = unixepoch() FROM renumber_signups r WHERE tutors.id = r.id;
DROP TABLE renumber_signups;

-- Expect: every site sign-up from 2489 up, and nothing left at 5001 or above.
SELECT code, review_status FROM tutors WHERE created_via = 'signup' AND code BETWEEN 2489 AND 89999 ORDER BY code;
