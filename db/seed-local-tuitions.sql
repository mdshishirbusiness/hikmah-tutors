-- SYNTHETIC tuitions for trying the board on your own computer. Every value is invented. Local database only:
-- run with `npm run db:seed:local`, never against the real database. Safe to run again.

-- Seed applications go first, so the tuitions they point to can be replaced.
DELETE FROM applications WHERE id BETWEEN 90001 AND 90099;

INSERT OR REPLACE INTO tuitions
  (code, status, is_public, accepting_applications, class_level, medium, subjects, area, mode, salary_kind, salary_amount,
   salary_period, days_per_week, session_minutes, time_of_day, student_gender, tutor_gender_pref, requirements_public,
   start_note, posted_at, closed_at)
VALUES
  (9001, 'available', 1, 1, 'ssc-27', 'bangla', 'physics,math,chemistry', 'uposhohor', 'home', 'fixed', 5000, 'per_month', 4, 90, 'afternoon', 'girl', 'female', 'RU science faculty, patient female tutor needed', 'ডিসেম্বরের শুরু থেকে', unixepoch() - 1500, NULL),
  (9002, 'available', 1, 1, 'class-3', 'bangla', 'all', 'saheb-bazar', 'home', 'fixed', 3000, 'per_month', 4, 60, 'evening', 'boy', 'any', '', '', unixepoch() - 18000, NULL),
  (9003, 'available', 1, 1, 'hsc-27', 'ev', 'physics,chemistry,hmath', 'binodpur', 'home', 'fixed', 8000, 'per_month', 4, 120, 'evening', 'boy', 'male', 'RUET/RU engineering student preferred', 'আগামী সপ্তাহে', unixepoch() - 90000, NULL),
  (9004, 'processing', 1, 0, 'olevel', 'em', 'english,math', 'padma-abashik', 'home', 'fixed', 10000, 'per_month', 3, 90, 'afternoon', 'girl', 'female', 'O Level teaching experience needed', '', unixepoch() - 200000, NULL),
  (9005, 'available', 1, 1, 'class-7', 'madrasa', 'quran,english', 'kazla', 'home', 'negotiable', NULL, 'per_month', 5, 60, 'morning', 'boy', 'any', '', '', unixepoch() - 300000, NULL),
  (9006, 'available', 1, 1, 'admission', 'bangla', 'biology,chemistry', 'talaimari', 'online', 'fixed', 5000, 'per_course', 3, 120, 'night', 'girl', 'any', 'মেডিকেল ভর্তি প্রস্তুতির অভিজ্ঞতা দরকার।', '', unixepoch() - 500000, NULL),
  (9007, 'available', 1, 1, 'class-9', 'bangla', 'math,science', 'terokhadiya', 'home', 'unspecified', NULL, 'per_month', 3, NULL, NULL, NULL, 'male', '', '', unixepoch() - 800000, NULL),
  (9010, 'available', 1, 1, 'class-9', 'ev', 'english,bangla', 'kazla', 'home', 'fixed', 4000, 'per_month', 3, 60, 'evening', 'boy', 'any', 'Experienced tutor needed, good at English grammar', 'যত দ্রুত সম্ভব', unixepoch() - 10800, NULL),
  -- Booked 5 days ago: off the board, its own link still opens and says it is taken.
  (9008, 'booked', 0, 0, 'class-6', 'bangla', 'math', 'uposhohor', 'home', 'fixed', 3500, 'per_month', 3, 60, 'afternoon', 'girl', 'female', '', '', unixepoch() - 1500000, unixepoch() - 432000),
  -- Draft: must never appear anywhere public, not even by its link.
  (9009, 'draft', 0, 1, 'hsc-28', 'bangla', 'english', 'kazla', 'home', 'fixed', 6000, 'per_month', 3, NULL, NULL, NULL, 'any', '', '', NULL, NULL);

-- Invented applicants, so the board shows its counts. 'withdrawn' must not be counted.
INSERT INTO applications (id, tuition_code, applicant_name, status, source, created_at, updated_at) VALUES
  (90001, 9001, 'Test Applicant A', 'submitted', 'staff', unixepoch() - 1200, unixepoch() - 1200),
  (90002, 9001, 'Test Applicant B', 'under_review', 'staff', unixepoch() - 900, unixepoch() - 900),
  (90003, 9001, 'Test Applicant C', 'submitted', 'staff', unixepoch() - 600, unixepoch() - 600),
  (90004, 9001, 'Test Applicant D', 'submitted', 'staff', unixepoch() - 300, unixepoch() - 300),
  (90005, 9001, 'Test Applicant E', 'withdrawn', 'staff', unixepoch() - 200, unixepoch() - 200),
  (90006, 9003, 'Test Applicant F', 'submitted', 'staff', unixepoch() - 80000, unixepoch() - 80000),
  (90007, 9004, 'Test Applicant G', 'shortlisted', 'staff', unixepoch() - 150000, unixepoch() - 150000),
  (90008, 9004, 'Test Applicant H', 'submitted', 'staff', unixepoch() - 140000, unixepoch() - 140000),
  (90009, 9010, 'Test Applicant I', 'submitted', 'staff', unixepoch() - 9000, unixepoch() - 9000);
