-- The owner's own check of a tutor by phone (owner, 2026-11-09: a ready tutor is one HTR has talked to and found expert
-- and dedicated). Private to the admin; the tutor sees only "HTR checked". A check is never edited: a re-check adds a
-- new row and the newest one counts.
CREATE TABLE tutor_checks (
  id          INTEGER PRIMARY KEY,
  tutor_id    INTEGER NOT NULL REFERENCES tutors (id),
  clarity     INTEGER CHECK (clarity IS NULL OR clarity BETWEEN 1 AND 5),
  dedication  INTEGER CHECK (dedication IS NULL OR dedication BETWEEN 1 AND 5),
  manner      INTEGER CHECK (manner IS NULL OR manner BETWEEN 1 AND 5),
  note        TEXT    CHECK (note IS NULL OR length(note) <= 1000),
  created_at  INTEGER NOT NULL,
  created_by  INTEGER REFERENCES users (id)
);
CREATE INDEX tutor_checks_tutor ON tutor_checks (tutor_id, created_at DESC);

-- 1–5 for each level (key 'junior', 'ssc', 'hsc') and each subject at a level (key 'hsc:english'): a tutor can be
-- expert in Junior English and not in HSC English (owner, 2026-11-09).
CREATE TABLE tutor_check_scores (
  check_id  INTEGER NOT NULL REFERENCES tutor_checks (id),
  kind      TEXT    NOT NULL CHECK (kind IN ('band', 'subject')),
  key       TEXT    NOT NULL,
  score     INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  PRIMARY KEY (check_id, kind, key)
);

-- The owner's note under each section of the check: one per level, and one for personal qualities.
CREATE TABLE tutor_check_notes (
  check_id  INTEGER NOT NULL REFERENCES tutor_checks (id),
  section   TEXT    NOT NULL CHECK (section IN ('junior', 'ssc', 'hsc', 'traits')),
  body      TEXT    NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  PRIMARY KEY (check_id, section)
);

CREATE TRIGGER tutor_checks_fixed BEFORE UPDATE ON tutor_checks BEGIN SELECT RAISE(ABORT, 'checks are kept as made'); END;
CREATE TRIGGER tutor_checks_kept BEFORE DELETE ON tutor_checks BEGIN SELECT RAISE(ABORT, 'checks are kept'); END;
CREATE TRIGGER tutor_check_scores_fixed BEFORE UPDATE ON tutor_check_scores BEGIN SELECT RAISE(ABORT, 'checks are kept as made'); END;
CREATE TRIGGER tutor_check_scores_kept BEFORE DELETE ON tutor_check_scores BEGIN SELECT RAISE(ABORT, 'checks are kept'); END;
CREATE TRIGGER tutor_check_notes_fixed BEFORE UPDATE ON tutor_check_notes BEGIN SELECT RAISE(ABORT, 'checks are kept as made'); END;
CREATE TRIGGER tutor_check_notes_kept BEFORE DELETE ON tutor_check_notes BEGIN SELECT RAISE(ABORT, 'checks are kept'); END;

-- Each call from the Call list: answered (done), no answer, or call later (which also sets a follow-up).
CREATE TABLE tutor_calls (
  id          INTEGER PRIMARY KEY,
  tutor_id    INTEGER NOT NULL REFERENCES tutors (id),
  outcome     TEXT    NOT NULL CHECK (outcome IN ('done', 'no_answer', 'later')),
  created_at  INTEGER NOT NULL,
  created_by  INTEGER REFERENCES users (id)
);
CREATE INDEX tutor_calls_tutor ON tutor_calls (tutor_id, created_at DESC);
CREATE TRIGGER tutor_calls_fixed BEFORE UPDATE ON tutor_calls BEGIN SELECT RAISE(ABORT, 'calls are a log'); END;
CREATE TRIGGER tutor_calls_kept BEFORE DELETE ON tutor_calls BEGIN SELECT RAISE(ABORT, 'calls are a log'); END;

-- "Ask to update" (owner, 2026-11-09): instead of typing a tutor's experience during the call, the owner sends them a
-- WhatsApp message listing what to add. items: 'hsc:numbers,hsc:approach,hsc:story,ssc:subjects'. The tutor's Profile
-- shows the open ask until they next save it (done_at).
CREATE TABLE tutor_update_asks (
  id          INTEGER PRIMARY KEY,
  tutor_id    INTEGER NOT NULL REFERENCES tutors (id),
  items       TEXT    NOT NULL CHECK (length(items) BETWEEN 1 AND 300),
  created_at  INTEGER NOT NULL,
  created_by  INTEGER REFERENCES users (id),
  done_at     INTEGER
);
CREATE INDEX tutor_update_asks_tutor ON tutor_update_asks (tutor_id, created_at DESC);

-- The owner's question bank for these calls, editable in the app. band 'any' asks everyone; subject '' asks at any
-- subject. Removed questions are hidden, not deleted.
CREATE TABLE call_questions (
  id          INTEGER PRIMARY KEY,
  band        TEXT    NOT NULL DEFAULT 'any' CHECK (band IN ('any', 'junior', 'ssc', 'hsc')),
  subject     TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL CHECK (length(body) BETWEEN 3 AND 300),
  sort        INTEGER NOT NULL DEFAULT 0,
  removed_at  INTEGER,
  created_at  INTEGER NOT NULL
);

-- Draft questions (owner to edit).
INSERT INTO call_questions (band, subject, body, sort, created_at) VALUES
  ('any', '', 'এখন কোন কোন ক্লাস আর subject পড়াচ্ছেন? সপ্তাহে কত দিন?', 1, unixepoch()),
  ('any', '', 'মোট কতজন ছাত্র পড়িয়েছেন? সবচেয়ে বেশিদিন কাকে পড়িয়েছেন, কতদিন?', 2, unixepoch()),
  ('any', '', 'একজন ছাত্রের রেজাল্ট উন্নতি করেছেন, এমন একটা ঘটনা বলুন: আগে কত ছিল, পরে কত হলো?', 3, unixepoch()),
  ('any', '', 'ছাত্র পড়তে না চাইলে বা পড়া না পারলে কী করেন?', 4, unixepoch()),
  ('any', '', 'অভিভাবককে কীভাবে, কত দিন পরপর জানান ছাত্র কেমন করছে?', 5, unixepoch()),
  ('any', '', 'পরীক্ষার সময় বা নিজের পরীক্ষা থাকলে টিউশন কীভাবে চালান? আগে কোনো টিউশন মাঝপথে ছেড়েছেন কি, কেন?', 6, unixepoch()),
  ('any', '', 'কোন কোন এলাকায় যেতে পারবেন, আর কোন সময়ে ফ্রি থাকেন?', 7, unixepoch()),
  ('junior', '', 'ছোট ক্লাসের বাচ্চার মনোযোগ ধরে রাখতে কী করেন?', 10, unixepoch()),
  ('ssc', '', 'SSC-র কোন অধ্যায়গুলো ছাত্রদের সবচেয়ে কঠিন লাগে, আর আপনি কীভাবে বোঝান?', 20, unixepoch()),
  ('ssc', '', 'টেস্ট পরীক্ষার আগে আর SSC-র আগের তিন মাসে কীভাবে প্রস্তুতি করান?', 21, unixepoch()),
  ('hsc', '', 'HSC-র সিলেবাস শেষ করতে কত মাস লাগে? কোন বইয়ের সাথে কোন বই পড়ান?', 30, unixepoch()),
  ('hsc', '', 'Admission-এর প্রস্তুতি আর HSC একসাথে কীভাবে সামলান?', 31, unixepoch()),
  ('any', 'physics', 'ভেক্টর বা নিউটনের গতিসূত্র একজন দুর্বল ছাত্রকে এক মিনিটে কীভাবে বোঝাবেন?', 40, unixepoch()),
  ('any', 'physics', 'Physics-এর অংক আর থিওরি, কোনটা আগে করান, কেন?', 41, unixepoch()),
  ('any', 'math', 'বীজগণিতের সূত্র মুখস্থ না করে বুঝে করানোর জন্য কী করেন?', 42, unixepoch()),
  ('any', 'hmath', 'Higher Math-এর কোন অধ্যায় থেকে শুরু করেন, আর ত্রিকোণমিতি কীভাবে ধরান?', 43, unixepoch()),
  ('any', 'chemistry', 'জারণ-বিজারণ বা মোল ধারণা প্রথমবার কীভাবে বোঝান?', 44, unixepoch()),
  ('any', 'ict', 'ICT-তে প্রোগ্রামিং আর HTML অংশ ছাত্রদের কীভাবে হাতে-কলমে করান?', 45, unixepoch()),
  ('any', 'english', 'Grammar আর writing (paragraph, letter) কীভাবে ভাগ করে পড়ান? Spoken কতটা পারেন?', 46, unixepoch()),
  ('any', 'biology', 'Biology-র বড় অধ্যায় মনে রাখানোর জন্য কোন কৌশল ব্যবহার করেন?', 47, unixepoch()),
  ('any', 'accounting', 'জাবেদা আর খতিয়ান প্রথম দিন কীভাবে শুরু করেন?', 48, unixepoch());
