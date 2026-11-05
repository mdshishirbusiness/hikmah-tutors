-- Habits as how-often answers (owner, 2026-11-05: a tick for "takes tests" is ticked by everyone, whether they do or
-- not). Each answer has an honest "no" choice, so a guardian-facing claim means something. The old 0/1 ticks stay and
-- are written from these answers (1 = anything but "none"), so older readers keep working.
ALTER TABLE tutor_levels ADD COLUMN tests_how TEXT CHECK (tests_how IS NULL OR tests_how IN ('topic', 'week', 'month', 'exam', 'none'));
ALTER TABLE tutor_levels ADD COLUMN homework_how TEXT CHECK (homework_how IS NULL OR homework_how IN ('every', 'most', 'some', 'none'));
ALTER TABLE tutor_levels ADD COLUMN notes_how TEXT CHECK (notes_how IS NULL OR notes_how IN ('own', 'sheets', 'book', 'none'));
ALTER TABLE tutor_levels ADD COLUMN report_how TEXT CHECK (report_how IS NULL OR report_how IN ('week', 'month', 'exam', 'asked'));

-- Optional numbers many tutors already wrote in the sheet: total marks ("1249/1300") and admission results.
ALTER TABLE tutors ADD COLUMN ssc_marks TEXT CHECK (ssc_marks IS NULL OR length(ssc_marks) <= 20);
ALTER TABLE tutors ADD COLUMN hsc_marks TEXT CHECK (hsc_marks IS NULL OR length(hsc_marks) <= 20);
ALTER TABLE tutors ADD COLUMN admission_result TEXT CHECK (admission_result IS NULL OR length(admission_result) <= 300);

-- The tutor's own marks (out of 100) in the subjects they teach: SSC marks for Junior and SSC subjects, HSC marks for
-- HSC ones. Optional; the owner sees them beside an applicant for a tuition in that subject.
CREATE TABLE tutor_subject_marks (
  tutor_id INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  exam     TEXT    NOT NULL CHECK (exam IN ('ssc', 'hsc')),
  subject  TEXT    NOT NULL,
  marks    INTEGER NOT NULL CHECK (marks BETWEEN 0 AND 100),
  PRIMARY KEY (tutor_id, exam, subject)
);
