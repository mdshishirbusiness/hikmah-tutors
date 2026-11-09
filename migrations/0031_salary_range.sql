-- Optional top of a salary range (owner, 2026-11-09): salary_amount stays the lowest figure, this is the "up to".
-- NULL = a single figure. Fees and the board's salary filter keep using salary_amount (the lowest).
ALTER TABLE tuitions ADD COLUMN salary_amount_max INTEGER;
