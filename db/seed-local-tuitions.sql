-- SYNTHETIC tuitions for trying the board on your own computer. Every value is invented. Local database only:
-- run with `npm run db:seed:local`, never against the real database. Safe to run again.
INSERT OR REPLACE INTO tuitions
  (code, status, is_public, accepting_applications, class_level, medium, subjects, area, mode, salary_kind, salary_amount,
   salary_period, days_per_week, student_gender, tutor_gender_pref, requirements_public, start_note, posted_at, closed_at)
VALUES
  (9001, 'available', 1, 1, 'ssc', 'bangla', 'physics,math', 'saheb-bazar', 'home', 'fixed', 4000, 'per_month', 3, 'girl', 'female', 'আগের অভিজ্ঞতা থাকলে ভালো।', 'এই মাসেই', unixepoch() - 3600, NULL),
  (9002, 'available', 1, 1, 'c1-5', 'bangla', 'all', 'uposhohor', 'home', 'fixed', 3000, 'per_month', 4, 'boy', 'any', '', '', unixepoch() - 18000, NULL),
  (9003, 'available', 1, 1, 'hsc', 'ev', 'physics,chemistry,hmath', 'binodpur', 'home', 'fixed', 8000, 'per_month', 4, 'boy', 'male', 'বিজ্ঞান বিভাগের শিক্ষার্থী হলে ভালো।', 'আগামী সপ্তাহে', unixepoch() - 90000, NULL),
  (9004, 'processing', 1, 0, 'olevel', 'em', 'english,math', 'padma-abashik', 'home', 'fixed', 10000, 'per_month', 3, 'girl', 'female', 'O Level পড়ানোর অভিজ্ঞতা দরকার।', '', unixepoch() - 200000, NULL),
  (9005, 'available', 1, 1, 'c6-8', 'madrasa', 'quran,english', 'kazla', 'home', 'negotiable', NULL, 'per_month', 5, 'boy', 'any', '', '', unixepoch() - 300000, NULL),
  (9006, 'available', 1, 1, 'admission', 'bangla', 'biology,chemistry', 'talaimari', 'online', 'fixed', 5000, 'per_course', 3, 'girl', 'any', 'মেডিকেল ভর্তি প্রস্তুতির অভিজ্ঞতা দরকার।', '', unixepoch() - 500000, NULL),
  (9007, 'available', 1, 1, 'ssc', 'bangla', 'math,science', 'terokhadiya', 'home', 'unspecified', NULL, 'per_month', 3, NULL, 'male', '', '', unixepoch() - 800000, NULL),
  -- Booked 5 days ago: off the board, its own link still opens and says it is taken.
  (9008, 'booked', 0, 0, 'c6-8', 'bangla', 'math', 'uposhohor', 'home', 'fixed', 3500, 'per_month', 3, 'girl', 'female', '', '', unixepoch() - 1500000, unixepoch() - 432000),
  -- Draft: must never appear anywhere public, not even by its link.
  (9009, 'draft', 0, 1, 'hsc', 'bangla', 'english', 'kazla', 'home', 'fixed', 6000, 'per_month', 3, NULL, 'any', '', '', NULL, NULL);
