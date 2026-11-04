// How complete a tutor's profile is, shared by Home, Profile and (part C) the owner's applicant order. The experience
// for each level weighs most, because that is what the owner reads first when picking a tutor (owner, 2026-11-05).
import { bandOf } from "./fit";
import { BANDS, labelOf } from "./options";

export type Band = "junior" | "ssc" | "hsc";
export type Level = {
  band: Band; students: number | null; years: number | null; approach: string | null; story: string | null;
  makes_notes: number; takes_tests: number; gives_homework: number; reports_guardian: number;
};
export type ProgressStep = { key: string; label: string; section: string; weight: number; done: boolean };

const BAND_SHORT: Record<Band, string> = { junior: "Junior", ssc: "SSC", hsc: "HSC" };
export const bandShort = (b: Band) => BAND_SHORT[b];
export const bandLabel = (b: Band) => labelOf(BANDS, b);

/** Real sentences, not "ok": a few words at least. */
const written = (s: string | null | undefined, min = 40) => (s ?? "").trim().length >= min;
export const hasHabits = (l: Level) => l.makes_notes + l.takes_tests + l.gives_homework + l.reports_guardian > 0;

/** The levels a tutor teaches: from their classes and subjects, plus any level they already wrote about. */
export function taughtBands(classes: string[], subjects: { band: string }[], levels: Pick<Level, "band">[]): Band[] {
  const set = new Set<string>([...classes.map((c) => bandOf(c) ?? ""), ...subjects.map((s) => s.band), ...levels.map((l) => l.band)]);
  return (["junior", "ssc", "hsc"] as Band[]).filter((b) => set.has(b));
}

export function profileSteps(
  t: { photo_key: string | null; anywhere: number; min_salary: number | null; transport: string | null; demo_willing: number | null; about: string | null },
  choices: { areas: string[]; classes: string[]; subjects: { band: string }[] },
  levels: Level[],
): ProgressStep[] {
  const steps: ProgressStep[] = [
    { key: "photo", label: "Your photo", section: "photo", weight: 2, done: !!t.photo_key },
  ];
  for (const band of taughtBands(choices.classes, choices.subjects, levels)) {
    const l = levels.find((x) => x.band === band);
    const name = BAND_SHORT[band];
    steps.push(
      { key: `${band}-numbers`, label: `${name}: students and years`, section: `exp-${band}`, weight: 2, done: !!l && (l.students ?? 0) > 0 && l.years !== null },
      { key: `${band}-approach`, label: `${name}: how you teach`, section: `exp-${band}`, weight: 2, done: written(l?.approach) },
      { key: `${band}-habits`, label: `${name}: your habits`, section: `exp-${band}`, weight: 1, done: !!l && hasHabits(l) },
      { key: `${band}-story`, label: `${name}: a student you helped`, section: `exp-${band}`, weight: 1, done: written(l?.story) },
    );
  }
  steps.push(
    { key: "areas", label: "Areas you teach in", section: "areas", weight: 1, done: t.anywhere === 1 || choices.areas.length > 0 },
    { key: "classes", label: "Classes you want", section: "classes", weight: 1, done: choices.classes.length > 0 },
    { key: "subjects", label: "Subjects", section: "subjects", weight: 1, done: choices.subjects.length > 0 },
    { key: "min_salary", label: "Lowest salary", section: "min_salary", weight: 1, done: t.min_salary !== null },
    { key: "transport", label: "How you travel", section: "transport", weight: 1, done: t.transport !== null },
    { key: "demo", label: "Demo class", section: "demo", weight: 1, done: t.demo_willing !== null },
    { key: "about", label: "About you", section: "about", weight: 1, done: written(t.about, 30) },
  );
  return steps;
}

/** 0–100, by weight. */
export function profilePercent(steps: ProgressStep[]) {
  const total = steps.reduce((n, s) => n + s.weight, 0);
  return total ? Math.round((100 * steps.filter((s) => s.done).reduce((n, s) => n + s.weight, 0)) / total) : 0;
}

/** What one missing step adds, in percent points. */
export const stepGain = (steps: ProgressStep[], step: ProgressStep) =>
  Math.round((100 * step.weight) / steps.reduce((n, s) => n + s.weight, 0));
