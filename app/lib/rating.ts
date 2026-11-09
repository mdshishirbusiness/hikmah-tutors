// The owner's phone check of a tutor (owner, 2026-11-09): per level, 1–5 for the level and for each subject at that
// level (Junior English and HSC English are different skills), then personal qualities, with a note under each
// section. Shared by the call screen and the applicant list. Private to the admin; tutors only see "HTR checked".
import { SUBJECTS } from "./options";

// Subjects a tutor can be rated in: not the "all" groups or Other.
export const RATED_SUBJECTS = SUBJECTS.filter((s) => !s.key.startsWith("all") && s.key !== "other");

export type Check = {
  at: number;
  bands: Record<string, number>; // junior / ssc / hsc → 1–5
  subjects: Record<string, number>; // "hsc:english" → 1–5
  clarity: number | null; dedication: number | null; manner: number | null;
  note: string | null; // overall
  notes: Record<string, string>; // junior / ssc / hsc / traits → the note under that section
};

export const TRAITS = [
  { key: "clarity", label: "Skill: explains clearly" },
  { key: "dedication", label: "Dedicated, reliable" },
  { key: "manner", label: "Polite, humble" },
] as const;

export const subjectKey = (band: string, subject: string) => `${band}:${subject}`;

/** A check older than a year is due again (re-check also when the tutor adds new experience). */
export const RECHECK_AFTER = 365 * 86400;
export const isStale = (c: Pick<Check, "at"> | null, now: number) => !!c && now - c.at > RECHECK_AFTER;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * The rating for one tuition, 1–5 with one decimal: its level and its subjects at that level count twice as much as
 * the personal qualities. Null when there is no check. A part the owner did not rate is left out, not counted as zero.
 */
export function ratingFor(c: Check | null, band: string | null, subjects: string[]): number | null {
  if (!c) return null;
  const parts: [number | null, number][] = [
    [band ? c.bands[band] ?? null : null, 2],
    [band ? mean(subjects.map((s) => c.subjects[subjectKey(band, s)]).filter((v): v is number => typeof v === "number")) : null, 2],
    [mean([c.clarity, c.dedication, c.manner].filter((v): v is number => typeof v === "number")), 1],
  ];
  const used = parts.filter(([v]) => v !== null) as [number, number][];
  if (!used.length) return null;
  const w = used.reduce((n, [, x]) => n + x, 0);
  return Math.round((10 * used.reduce((n, [v, x]) => n + v * x, 0)) / w) / 10;
}

/** Builds a Check from its row, score rows and note rows (as read from D1). */
export function checkOf(row: { created_at: number; clarity: number | null; dedication: number | null; manner: number | null; note: string | null },
  scores: { kind: string; key: string; score: number }[], notes: { section: string; body: string }[]): Check {
  const bands: Record<string, number> = {};
  const subjects: Record<string, number> = {};
  for (const s of scores) (s.kind === "band" ? bands : subjects)[s.key] = s.score;
  return {
    at: row.created_at, bands, subjects, clarity: row.clarity, dedication: row.dedication, manner: row.manner, note: row.note,
    notes: Object.fromEntries(notes.map((n) => [n.section, n.body])),
  };
}
