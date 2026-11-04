// Choices for a tutor's own form (registration and Profile), shared by the page and the server.

/** "Join as a tutor": Google sign-in, then registration (a tutor from the sheet lands on Home instead). */
export const JOIN = "/login?join=1&next=%2Fme%2Fjoin";

export const UNIVERSITIES = [
  { key: "ru", label: "RU", institution: "Rajshahi University" },
  { key: "ruet", label: "RUET", institution: "RUET" },
  { key: "medical", label: "Medical", institution: null },
  { key: "other", label: "Other", institution: null },
] as const;

/** University sessions a current student may be in, newest first (in 2026: 2025-26 … 2016-17). Session Y-(Y+1) starts
 * classes during Y+1, so the newest one is always last year's. */
export function sessionYears(today = new Date()) {
  const newest = today.getFullYear() - 1;
  return Array.from({ length: 10 }, (_, i) => `${newest - i}-${String(newest - i + 1).slice(2)}`);
}

export const SALARIES = [2500, 3000, 4000, 5000, 6000, 8000];

export const CLASS_GROUPS = [
  { band: "junior", label: "Play–Class 8" },
  { band: "ssc", label: "Class 9–10 · SSC" },
  { band: "hsc", label: "Class 11–12 · HSC · Admission" },
  { band: null, label: "Other" },
] as const;

// Subjects that make sense at each band; the rest stay one tap away.
export const BAND_SUBJECTS: Record<string, string[]> = {
  junior: ["all", "math", "english", "science", "bangla", "bgs", "islam", "quran"],
  ssc: ["math", "hmath", "physics", "chemistry", "biology", "english", "ict", "bangla", "accounting", "finance", "all-arts", "all-commerce"],
  hsc: ["physics", "chemistry", "hmath", "math", "biology", "english", "ict", "accounting", "finance", "economics"],
};

/** The largest photo the server takes; the page shrinks photos to a 512 px square first, so this is generous. */
export const PHOTO_MAX_BYTES = 900_000;

/** Proof of education a new tutor sends (owner, 2026-11-05): at least one academic document, up to 5; an NID is an optional extra. */
export const DOC_MAX_BYTES = 1_500_000;
export const ACADEMIC_DOCS_MAX = 5;
export const DOC_LABELS = [
  { key: "student_id", label: "Student ID card" },
  { key: "admission", label: "Admission / registration slip" },
  { key: "result", label: "Result sheet" },
  { key: "certificate", label: "Certificate" },
  { key: "other", label: "Other proof" },
] as const;
export type DocLabel = (typeof DOC_LABELS)[number]["key"];

export const REVIEW_LABEL = { waiting: "Waiting for check", needs_fix: "Asked to fix", approved: "Checked" } as const;
