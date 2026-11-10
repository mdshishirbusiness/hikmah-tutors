-- HSC subject marks go up to 200 (owner, 2026-11-11: an HSC subject is two papers, 100 each). SSC stays out of 100.
-- SQLite cannot change a CHECK in place, so the table is rebuilt with the same rows.
CREATE TABLE tutor_subject_marks_new (
  tutor_id INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  exam     TEXT    NOT NULL CHECK (exam IN ('ssc', 'hsc')),
  subject  TEXT    NOT NULL,
  marks    INTEGER NOT NULL CHECK (marks >= 0 AND marks <= CASE exam WHEN 'hsc' THEN 200 ELSE 100 END),
  PRIMARY KEY (tutor_id, exam, subject)
);
INSERT INTO tutor_subject_marks_new (tutor_id, exam, subject, marks) SELECT tutor_id, exam, subject, marks FROM tutor_subject_marks;
DROP TABLE tutor_subject_marks;
ALTER TABLE tutor_subject_marks_new RENAME TO tutor_subject_marks;
