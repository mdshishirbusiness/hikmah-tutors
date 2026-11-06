-- A new photo or document a checked tutor sends from Profile (owner, 2026-11-06). It waits here until the admin approves
-- it (then it becomes the tutor's photo or one of their documents) or declines it (the file is deleted, the reason kept).
-- Files sit in the private R2 bucket (binding PHOTOS); only the admin and the tutor see them.
CREATE TABLE tutor_uploads (
  id          INTEGER PRIMARY KEY,
  tutor_id    INTEGER NOT NULL REFERENCES tutors (id),
  kind        TEXT    NOT NULL CHECK (kind IN ('photo', 'academic', 'nid')),
  label       TEXT    CHECK (label IS NULL OR label IN ('student_id', 'admission', 'result', 'certificate', 'other')),
  r2_key      TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn')),
  note        TEXT    CHECK (note IS NULL OR length(note) <= 300),
  created_at  INTEGER NOT NULL,
  decided_at  INTEGER,
  decided_by  INTEGER REFERENCES users (id)
);
CREATE INDEX tutor_uploads_tutor ON tutor_uploads (tutor_id, created_at DESC);
CREATE INDEX tutor_uploads_pending ON tutor_uploads (status, created_at) WHERE status = 'pending';

-- One photo and one NID wait at a time; a new one withdraws the old first.
CREATE UNIQUE INDEX tutor_uploads_one_photo ON tutor_uploads (tutor_id, kind) WHERE status = 'pending' AND kind IN ('photo', 'nid');

-- A decision is final: only pending rows change, only their status, decision time, decider and note.
CREATE TRIGGER tutor_uploads_decide BEFORE UPDATE ON tutor_uploads
BEGIN
  SELECT RAISE(ABORT, 'upload already decided') WHERE OLD.status <> 'pending';
  SELECT RAISE(ABORT, 'upload fields are fixed')
    WHERE NEW.tutor_id <> OLD.tutor_id OR NEW.kind <> OLD.kind OR NEW.r2_key <> OLD.r2_key OR NEW.created_at <> OLD.created_at
       OR COALESCE(NEW.label, '') <> COALESCE(OLD.label, '');
END;

CREATE TRIGGER tutor_uploads_no_delete BEFORE DELETE ON tutor_uploads
BEGIN
  SELECT RAISE(ABORT, 'uploads are kept');
END;
