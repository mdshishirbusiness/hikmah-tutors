-- A tutor's experience for each level they teach (owner, 2026-11-05, part B). What the owner reads first when picking
-- a tutor: how many students at this level and for how long, how they teach, their habits, and a student they helped.
CREATE TABLE tutor_levels (
  tutor_id         INTEGER NOT NULL REFERENCES tutors (id) ON DELETE CASCADE,
  band             TEXT    NOT NULL CHECK (band IN ('junior', 'ssc', 'hsc')),
  students         INTEGER CHECK (students IS NULL OR students BETWEEN 0 AND 1000),
  years            REAL    CHECK (years IS NULL OR years BETWEEN 0 AND 40),
  approach         TEXT    CHECK (approach IS NULL OR length(approach) <= 2000),  -- "How I teach"
  story            TEXT    CHECK (story IS NULL OR length(story) <= 2000),        -- "A student I helped"
  makes_notes      INTEGER NOT NULL DEFAULT 0 CHECK (makes_notes IN (0, 1)),
  takes_tests      INTEGER NOT NULL DEFAULT 0 CHECK (takes_tests IN (0, 1)),
  gives_homework   INTEGER NOT NULL DEFAULT 0 CHECK (gives_homework IN (0, 1)),
  reports_guardian INTEGER NOT NULL DEFAULT 0 CHECK (reports_guardian IN (0, 1)),
  updated_at       INTEGER NOT NULL,
  PRIMARY KEY (tutor_id, band)
);

-- Prefilled once from the sheet's statements ("strategy" = how I teach, "experience" = the stories), so most tutors
-- start with something written. The statements stay as they were.
INSERT INTO tutor_levels (tutor_id, band, approach, story, updated_at)
SELECT t.id, b.band,
       (SELECT substr(s.body, 1, 2000) FROM tutor_statements s WHERE s.tutor_id = t.id AND s.kind = b.band || '_strategy'),
       (SELECT substr(s.body, 1, 2000) FROM tutor_statements s WHERE s.tutor_id = t.id AND s.kind = b.band || '_experience'),
       unixepoch()
FROM tutors t CROSS JOIN (SELECT 'junior' AS band UNION ALL SELECT 'ssc' UNION ALL SELECT 'hsc') b
WHERE EXISTS (SELECT 1 FROM tutor_statements s WHERE s.tutor_id = t.id AND s.kind IN (b.band || '_strategy', b.band || '_experience'));

-- About and skills: special skills and a demo video link, also prefilled from the sheet.
ALTER TABLE tutors ADD COLUMN skills TEXT CHECK (skills IS NULL OR length(skills) <= 500);
ALTER TABLE tutors ADD COLUMN demo_video_url TEXT CHECK (demo_video_url IS NULL OR length(demo_video_url) <= 300);
UPDATE tutors SET skills = (SELECT substr(body, 1, 500) FROM tutor_statements s WHERE s.tutor_id = tutors.id AND s.kind = 'special_skills')
WHERE EXISTS (SELECT 1 FROM tutor_statements s WHERE s.tutor_id = tutors.id AND s.kind = 'special_skills');
UPDATE tutors SET demo_video_url = (SELECT substr(body, 1, 300) FROM tutor_statements s WHERE s.tutor_id = tutors.id AND s.kind = 'demo_video')
WHERE EXISTS (SELECT 1 FROM tutor_statements s WHERE s.tutor_id = tutors.id AND s.kind = 'demo_video');
