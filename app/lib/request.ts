// What a guardian asks for, shared by Quick Pad, the guardian form, the tuition editor and every page that shows a
// tuition (owner, 2026-11-04, review step 3). Keys are stored; labels may be reworded.
import { CLASS_LEVELS, SUBJECTS, type Option, labelOf } from "./options";

// The asks guardians made most often in the sheet's 615 tuitions (counted Nov 2026): experience (~150), care (~34),
// regular tests (~25), "পড়া আদায়" (19), the subject's department or an expert (~40), regular (15), 3rd/4th year.
// Bangla where it sounds natural to a guardian, English where it is clearer (owner, 2026-11-04).
export const REQUIREMENTS: Option[] = [
  { key: "experienced", label: "আগে পড়ানোর অভিজ্ঞতা", alt: "experienced experience অভিজ্ঞ" },
  { key: "caring", label: "যত্ন নিয়ে পড়াবেন", alt: "caring যত্নশীল" },
  { key: "takes_lessons", label: "পড়া আদায় করে নেবেন", alt: "lessons" },
  { key: "tests", label: "নিয়মিত পরীক্ষা নেবেন", alt: "tests exam পরীক্ষা" },
  { key: "regular", label: "নিয়মিত আসবেন", alt: "regular punctual" },
  { key: "dept", label: "From the subject's department", alt: "department dept expert" },
  { key: "senior", label: "3rd/4th year student", alt: "senior final year" },
  { key: "em_exp", label: "English medium experience", alt: "english version" },
  { key: "polite", label: "ভদ্র ও আন্তরিক", alt: "polite friendly" },
];
const REQUIREMENT_KEYS = new Set(REQUIREMENTS.map((r) => r.key));

/** Known requirement keys from a comma list or a form's values, in the list's order. */
export const requirementKeys = (raw: string | string[] | null | undefined) => {
  const picked = new Set((Array.isArray(raw) ? raw : (raw ?? "").split(",")).map((s) => s.trim()));
  return REQUIREMENTS.filter((r) => picked.has(r.key) && REQUIREMENT_KEYS.has(r.key)).map((r) => r.key);
};
export const requirementLabels = (keys: string[]) => keys.map((k) => labelOf(REQUIREMENTS, k));

// ---------- The time window: "between 2:00 and 6:00 PM" ----------

/** Half-hour steps a guardian may name, 6:00 AM to 11:00 PM, as minutes after midnight. */
export const TIME_STEPS = Array.from({ length: 35 }, (_, i) => 360 + i * 30);

const clock = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}`;
const half = (m: number) => (m < 720 || m === 1440 ? "AM" : "PM");

/** "2:00 PM" */
export const timeLabel = (m: number) => `${clock(m)} ${half(m)}`;

/** "2:00–6:00 PM", or "11:00 AM–2:00 PM" across noon; "" when not set. */
export function windowLabel(from: number | null | undefined, to: number | null | undefined) {
  if (from == null || to == null) return "";
  return half(from) === half(to) ? `${clock(from)}–${clock(to)} ${half(to)}` : `${timeLabel(from)}–${timeLabel(to)}`;
}

/** Both ends from a form or a queued lead; an error when only one is set or the end is not after the start. */
export function parseWindow(fromRaw: unknown, toRaw: unknown): { time_from: number | null; time_to: number | null; error?: string } {
  const read = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(v));
  const from = read(fromRaw), to = read(toRaw);
  if (from === null && to === null) return { time_from: null, time_to: null };
  if (from === null || to === null || !TIME_STEPS.includes(from) || !TIME_STEPS.includes(to)) return { time_from: null, time_to: null, error: "Pick both times, or neither." };
  if (to <= from) return { time_from: null, time_to: null, error: "The end time must be after the start." };
  return { time_from: from, time_to: to };
}

// ---------- "Other" class or subject ----------

/** The class as shown: the guardian's own words when it is Other. */
export const classLabel = (classLevel: string, classOther?: string | null) =>
  classLevel === "other" && classOther?.trim() ? classOther.trim() : labelOf(CLASS_LEVELS, classLevel);

/** One subject as shown: the guardian's own words for Other. */
export const subjectLabel = (key: string, subjectOther?: string | null) =>
  key === "other" && subjectOther?.trim() ? subjectOther.trim() : labelOf(SUBJECTS, key);
