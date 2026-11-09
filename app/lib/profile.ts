// How complete a tutor's profile is, shared by Home, Profile and (part C) the owner's applicant order. Experience
// weighs most, because that is what the owner reads first when picking a tutor (owner, 2026-11-05).
import { bandOf } from "./fit";
import { BANDS, labelOf } from "./options";

export type Band = "junior" | "ssc" | "hsc";
export type Level = {
  band: Band; students: number | null; years: number | null; approach: string | null; story: string | null;
  makes_notes: number; takes_tests: number; gives_homework: number; reports_guardian: number;
  tests_how: string | null; homework_how: string | null; notes_how: string | null; report_how: string | null;
};

/**
 * Habits as how-often questions (owner, 2026-11-05: plain ticks get ticked by everyone). Every question has an honest
 * "no" answer (`no`). `col` is the how-often column, `tick` the old 0/1 column written from it (1 unless the answer is
 * `no`). Keys match migration 0023.
 */
export const HABITS = [
  { key: "tests", col: "tests_how", tick: "takes_tests", q: "Tests", owner: "Tests", no: "none",
    options: [["topic", "After every topic"], ["week", "Every week"], ["month", "Every month"], ["exam", "Before exams only"], ["none", "I don't take tests"]] },
  { key: "homework", col: "homework_how", tick: "gives_homework", q: "Homework", owner: "Homework", no: "none",
    options: [["every", "Every class"], ["most", "Most classes"], ["some", "Now and then"], ["none", "I don't give homework"]] },
  { key: "notes", col: "notes_how", tick: "makes_notes", q: "Notes", owner: "Notes", no: "none",
    options: [["own", "My own notes"], ["sheets", "Sheets I prepare"], ["book", "From the book / guide"], ["none", "No notes"]] },
  { key: "report", col: "report_how", tick: "reports_guardian", q: "Guardian updates", owner: "Tells the guardian", no: "asked",
    options: [["week", "Every week"], ["month", "Every month"], ["exam", "After each exam"], ["asked", "When asked"]] },
] as const;
export type HabitCol = (typeof HABITS)[number]["col"];
export const habitAnswer = (l: Level, h: (typeof HABITS)[number]) => (h.options as readonly (readonly [string, string])[]).find(([k]) => k === l[h.col])?.[1] ?? null;
/** One student the tutor taught (no names): class, place, period, result before and after, what improved. */
export type Student = {
  id: number; class_level: string; class_other: string | null; area: string | null; subjects: string | null; started: string | null;
  ended: string | null; result_before: string | null; result_after: string | null; improvement: string | null;
  source?: "tutor" | "sheet";
};

// The checklist groups, in the order the tutor sees them; each has its own colour (SectionCard tones).
export type StepGroup = "students" | Band | "teaching" | "you";
export const STEP_GROUPS: { key: StepGroup; label: string; tone: "brand" | "mango" | "cream" | "slate" }[] = [
  { key: "students", label: "Students you've taught", tone: "brand" },
  { key: "junior", label: "Junior experience", tone: "mango" },
  { key: "ssc", label: "SSC experience", tone: "brand" },
  { key: "hsc", label: "HSC experience", tone: "cream" },
  { key: "teaching", label: "Teaching", tone: "brand" },
  { key: "you", label: "You", tone: "slate" },
];
// `label` stands alone (Home's chips: "SSC · Your habits", owner 2026-11-09); `short` is for lists already grouped by level.
export type ProgressStep = { key: string; label: string; short?: string; section: string; group: StepGroup; weight: number; done: boolean };

const BAND_SHORT: Record<Band, string> = { junior: "Junior", ssc: "SSC", hsc: "HSC" };
export const bandShort = (b: Band) => BAND_SHORT[b];
export const bandLabel = (b: Band) => labelOf(BANDS, b);

/** Real sentences, not "ok": a few words at least. */
export const written = (s: string | null | undefined, min = 40) => (s ?? "").trim().length >= min;
/**
 * The tutor's own marks, shown under the subjects they teach (owner, 2026-11-05: many wrote "Physics 95" in the sheet):
 * SSC marks beside SSC subjects, HSC marks beside HSC ones. "All subjects" picks and Quran have no exam mark.
 */
export const MARK_EXAMS = ["ssc", "hsc"] as const;
export const markable = (subjects: string[]) => subjects.filter((s) => !s.startsWith("all") && s !== "quran");

/** All four habit questions answered (old ticks alone don't count: the tutor is asked how often). */
export const hasHabits = (l: Level) => HABITS.every((h) => l[h.col] !== null);
/** How many of the four the tutor actually does (an answer other than "no"). */
export const habitsDone = (l: Level) => HABITS.filter((h) => l[h.col] !== null && l[h.col] !== h.no).length;

/**
 * The levels a tutor teaches. Once they have picked classes, those decide: a Junior-only tutor is never asked for SSC or
 * HSC experience, even if the sheet prefilled it or an old subject is left at that level (owner, 2026-11-05). Before
 * any class is picked: their subjects, plus any level they already wrote about.
 */
export function taughtBands(classes: string[], subjects: { band: string }[], levels: Pick<Level, "band">[]): Band[] {
  const fromClasses = classes.map((c) => bandOf(c) ?? "").filter(Boolean);
  const set = new Set<string>(fromClasses.length ? fromClasses : [...subjects.map((s) => s.band), ...levels.map((l) => l.band)]);
  return (["junior", "ssc", "hsc"] as Band[]).filter((b) => set.has(b));
}

/** Steps in priority order: the first one not done is "next". */
export function profileSteps(
  t: { photo_key: string | null; anywhere: number; min_salary: number | null; transport: string | null; demo_willing: number | null; about: string | null; free_times?: string | null },
  choices: { areas: string[]; classes: string[]; subjects: { band: string }[] },
  levels: Level[],
  studentCount = 0,
): ProgressStep[] {
  const steps: ProgressStep[] = [
    { key: "photo", label: "Your photo", section: "photo", group: "you", weight: 2, done: !!t.photo_key },
    { key: "students", label: "Add a student you've taught", section: "students", group: "students", weight: 3, done: studentCount > 0 },
  ];
  for (const band of taughtBands(choices.classes, choices.subjects, levels)) {
    const l = levels.find((x) => x.band === band);
    steps.push(
      { key: `${band}-numbers`, label: `${bandShort(band)} · Students and years`, short: "Students and years", section: `exp-${band}`, group: band, weight: 2, done: !!l && (l.students ?? 0) > 0 && l.years !== null },
      { key: `${band}-approach`, label: `${bandShort(band)} · How you teach`, short: "How you teach", section: `exp-${band}`, group: band, weight: 2, done: written(l?.approach) },
      { key: `${band}-habits`, label: `${bandShort(band)} · Your habits`, short: "Your habits", section: "habits", group: band, weight: 1, done: !!l && hasHabits(l) },
      { key: `${band}-story`, label: `${bandShort(band)} · A student you helped`, short: "A student you helped", section: `exp-${band}`, group: band, weight: 1, done: written(l?.story) },
    );
  }
  steps.push(
    { key: "areas", label: "Areas you teach in", section: "areas", group: "teaching", weight: 1, done: t.anywhere === 1 || choices.areas.length > 0 },
    { key: "classes", label: "Classes you want", section: "classes", group: "teaching", weight: 1, done: choices.classes.length > 0 },
    { key: "subjects", label: "Subjects", section: "subjects", group: "teaching", weight: 1, done: choices.subjects.length > 0 },
    { key: "min_salary", label: "Lowest salary", section: "min_salary", group: "teaching", weight: 1, done: t.min_salary !== null },
    { key: "free_times", label: "When you're free", section: "free_times", group: "teaching", weight: 1, done: !!t.free_times },
    { key: "transport", label: "How you travel", section: "transport", group: "teaching", weight: 1, done: t.transport !== null },
    { key: "demo", label: "Demo class", section: "demo", group: "teaching", weight: 1, done: t.demo_willing !== null },
    { key: "about", label: "About you", section: "about", group: "you", weight: 1, done: written(t.about, 30) },
  );
  return steps;
}

/** 0–100, by weight. */
export function profilePercent(steps: ProgressStep[]) {
  const total = steps.reduce((n, s) => n + s.weight, 0);
  return total ? Math.round((100 * steps.filter((s) => s.done).reduce((n, s) => n + s.weight, 0)) / total) : 0;
}

/** The Profile's three tabs (owner, 2026-11-05: one tab at a time, not one long page), and where each group lives. */
export type ProfileTab = "teaching" | "experience" | "you";
export const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: "teaching", label: "Teaching" },
  { key: "experience", label: "Experience" },
  { key: "you", label: "About you" },
];
export const TAB_OF: Record<StepGroup, ProfileTab> = { teaching: "teaching", students: "experience", junior: "experience", ssc: "experience", hsc: "experience", you: "you" };

/** What one missing step adds, in percent points. */
export const stepGain = (steps: ProgressStep[], step: ProgressStep) =>
  Math.round((100 * step.weight) / steps.reduce((n, s) => n + s.weight, 0));

// ---------- Periods ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** "Jan 2024 – Now · 1 yr 10 mo", "Mar 2023 – Dec 2023 · 10 mo", or "" when no start is known. */
export function periodLabel(started: string | null, ended: string | null, today = new Date()) {
  if (!started) return "";
  const end = ended ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const months = (Number(end.slice(0, 4)) - Number(started.slice(0, 4))) * 12 + Number(end.slice(5, 7)) - Number(started.slice(5, 7)) + 1;
  const y = Math.floor(months / 12), m = months % 12;
  const length = [y && `${y} yr`, m && `${m} mo`].filter(Boolean).join(" ");
  return `${month(started)} – ${ended ? month(ended) : "Now"}${length ? ` · ${length}` : ""}`;
}
