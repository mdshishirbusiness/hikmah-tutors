// "Strength for this tuition" (owner, 2026-11-05, part C): how the owner actually picks a tutor. Experience at the
// tuition's level counts most, then how much the tutor has written for that level, then their record with HTR.
// Gender, area and subjects are not in the score; they show as warnings (a tutor rarely applies to a far tuition or
// one for the other gender on purpose). Shared by the server and the applicant pages.
import { bandOf } from "./fit";
import type { Band, Level, Student } from "./profile";

export type StrengthInput = {
  level: Level | null; // the tutor's row for this tuition's level
  students: Pick<Student, "class_level" | "result_before" | "result_after" | "improvement">[];
  about: string | null; placed: number; demos: number; dropped: number;
};
export type Strength = { score: number; experience: number; profile: number; record: number; atLevel: number };

const cap = (n: number, max: number) => Math.min(Math.max(n, 0), max) / max;
const written = (s: string | null | undefined, min = 40) => (s ?? "").trim().length >= min;

/** 0–100: experience up to 50, profile up to 30, record with HTR up to 20. */
export function strengthOf(a: StrengthInput, band: Band | null): Strength {
  const l = a.level;
  const atLevel = a.students.filter((s) => !band || bandOf(s.class_level) === band);
  const improved = atLevel.filter((s) => (s.result_before && s.result_after) || written(s.improvement, 20)).length;
  const experience = 15 * cap(l?.students ?? 0, 10) + 15 * cap(l?.years ?? 0, 4) + 12 * cap(atLevel.length, 3) + 8 * cap(improved, 2);
  const habits = l ? l.makes_notes + l.takes_tests + l.gives_homework + l.reports_guardian : 0;
  const profile = (written(l?.approach) ? 12 : 0) + (written(l?.story) ? 8 : 0) + 6 * cap(habits, 4) + (written(a.about, 30) ? 4 : 0);
  const record = Math.max(0, 14 * cap(a.placed, 3) + 6 * cap(a.demos, 3) - 5 * a.dropped);
  return {
    score: Math.round(Math.min(100, experience + profile + record)),
    experience: Math.round(experience), profile: Math.round(profile), record: Math.round(record), atLevel: atLevel.length,
  };
}

export const strengthWord = (score: number) => (score >= 70 ? "Strong" : score >= 40 ? "Good" : score >= 15 ? "Some" : "Little shown");
/** The Strength level as a number (3 Strong … 0 Little shown), for "first within the level" (Premium, part E). */
export const levelOf = (score: number) => (score >= 70 ? 3 : score >= 40 ? 2 : score >= 15 ? 1 : 0);
