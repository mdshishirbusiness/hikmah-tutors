// Tuition rules and formatting shared by the server and the pages. Ported from the Emergent reference
// (backend/logic/fees.py, logic/text.py, frontend/src/lib/format.ts).
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, TIMES_OF_DAY, labelOf } from "./options";
import { requirementLabels, windowLabel } from "./request";

export type PublicTuition = {
  code: number;
  code_label: string;
  status: string;
  accepting_applications: boolean;
  class_level: string;
  medium: string;
  subjects: string[];
  area: string;
  mode: "home" | "online";
  salary_kind: "fixed" | "negotiable" | "unspecified";
  salary_amount: number | null;
  salary_period: "per_month" | "per_course";
  days_per_week: number;
  session_minutes: number | null;
  time_of_day: string | null;
  student_gender: "boy" | "girl" | null;
  tutor_gender_pref: "any" | "male" | "female";
  tutor_from: string[]; // ru, ruet, medical; empty = any university
  requirements_public: string;
  requirement_keys: string[]; // quick picks (app/lib/request.ts), shown before the free text
  class_other: string | null; // the guardian's words when the class is Other
  subject_other: string | null; // the guardian's words when a subject is Other
  time_from: number | null; // minutes after midnight; a window like 2:00–6:00 PM
  time_to: number | null;
  start_note: string;
  posted_at: number | null;
  is_available: boolean; // on the board
  applicants: number; // live applications; the count is public (owner, 2026-11-02), never who applied
};

export type TuitionFilters = {
  area?: string;
  class_level?: string;
  subject?: string;
  medium?: string;
  tutor_gender?: string;
  mode?: string;
  salary_min?: number;
  days?: number;
  q?: string;
  sort: "newest" | "salary_desc";
};

const positive = (v: string | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export function readFilters(sp: URLSearchParams): TuitionFilters {
  return {
    area: sp.get("area") || undefined,
    class_level: sp.get("class") || undefined,
    subject: sp.get("subject") || undefined,
    medium: sp.get("medium") || undefined,
    tutor_gender: sp.get("gender") || undefined,
    mode: sp.get("mode") || undefined,
    salary_min: positive(sp.get("salary_min")),
    days: positive(sp.get("days")),
    q: sp.get("q")?.trim() || undefined,
    sort: sp.get("sort") === "salary_desc" ? "salary_desc" : "newest",
  };
}

/** Lowercases, makes Bangla digits Latin and folds common English spellings, so "Shaheb" finds "Saheb". */
export function normalizeSearch(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/bh/g, "b")
    .replace(/kh/g, "k")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/([a-z])\1/g, "$1");
}

function searchBlob(t: PublicTuition): string {
  const area = AREAS.find((a) => a.key === t.area);
  const cls = CLASS_LEVELS.find((c) => c.key === t.class_level);
  return normalizeSearch(
    [
      t.code_label,
      t.code,
      area?.label,
      area?.alt,
      cls?.label,
      cls?.alt,
      t.class_other,
      t.subject_other,
      labelOf(MEDIUMS, t.medium),
      ...t.subjects.flatMap((s) => [labelOf(SUBJECTS, s), SUBJECTS.find((o) => o.key === s)?.alt]),
      needText(t),
    ].join(" "),
  );
}

const isFixedMonthly = (t: Pick<PublicTuition, "salary_kind" | "salary_period" | "salary_amount">) =>
  t.salary_kind === "fixed" && t.salary_period === "per_month" && !!t.salary_amount;

/** `items` must arrive newest first. */
export function applyFilters(items: PublicTuition[], f: TuitionFilters): PublicTuition[] {
  const tokens = f.q ? normalizeSearch(f.q).split(" ").filter(Boolean) : [];
  const kept = items.filter((t) => {
    if (f.area && t.area !== f.area) return false;
    if (f.class_level && t.class_level !== f.class_level) return false;
    if (f.subject && !t.subjects.includes(f.subject)) return false;
    if (f.medium && t.medium !== f.medium) return false;
    if (f.tutor_gender && t.tutor_gender_pref !== f.tutor_gender) return false;
    if (f.mode && t.mode !== f.mode) return false;
    if (f.salary_min && (!isFixedMonthly(t) || t.salary_amount! < f.salary_min)) return false;
    if (f.days && t.days_per_week !== f.days) return false;
    if (tokens.length) {
      const blob = searchBlob(t);
      if (!tokens.every((tok) => blob.includes(tok))) return false;
    }
    return true;
  });
  if (f.sort === "salary_desc") {
    const pay = (t: PublicTuition) => (isFixedMonthly(t) ? t.salary_amount! : 0);
    return [...kept].sort((a, b) => pay(b) - pay(a)); // sort is stable: equal pay stays newest first
  }
  return kept;
}

export type Fees = { basis: number; first: number; second: number; standard_total: number; early_total: number; saving: number; is_example: boolean };

const EXAMPLE_BASIS = 4000;

export function feeDisplay(t: Pick<PublicTuition, "salary_kind" | "salary_amount" | "salary_period">): Fees {
  const real = t.salary_kind === "fixed" && t.salary_period === "per_month" && !!t.salary_amount && t.salary_amount > 0;
  const basis = real ? t.salary_amount! : EXAMPLE_BASIS;
  const standard_total = Math.floor((basis * 60 + 50) / 100);
  const early_total = Math.floor((basis * 50 + 50) / 100);
  const first = Math.floor(standard_total / 2);
  return { basis, first, second: standard_total - first, standard_total, early_total, saving: standard_total - early_total, is_example: !real };
}

// English digits everywhere (owner, 2026-11-04).
export const taka = (n: number) => `৳${new Intl.NumberFormat("en-IN").format(n)}`;

const NEW_FOR_SECONDS = 48 * 3600;

export const isNew = (postedAt: number | null, now: number) => postedAt !== null && now - postedAt < NEW_FOR_SECONDS;

export function formatDate(unix: number): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(unix * 1000));
}

/** `now` comes from the loader so the server and the phone render the same text. */
export function timeAgo(unix: number | null, now: number): string {
  if (unix === null) return "";
  const mins = Math.floor(Math.max(0, now - unix) / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatDate(unix);
}

export const GENDER_NEED: Record<PublicTuition["tutor_gender_pref"], string> = {
  male: "Male tutor needed",
  female: "Female tutor needed",
  any: "Male or female tutor",
};

export const GENDER_STYLE: Record<PublicTuition["tutor_gender_pref"], { strip: string; border: string; bar: string; badge: string }> = {
  male: { strip: "bg-blue-50 text-blue-900", border: "border-blue-200", bar: "bg-blue-600", badge: "bg-blue-100 text-blue-900" },
  female: { strip: "bg-rose-50 text-rose-900", border: "border-rose-200", bar: "bg-rose-600", badge: "bg-rose-100 text-rose-900" },
  any: { strip: "bg-emerald-50 text-emerald-900", border: "border-emerald-200", bar: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-900" },
};

/** "45 min", "1 hour", "1 hr 15 min", "2 hours" from minutes. */
export function sessionLength(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} hr ${m} min`;
}

/** "1.5 hours · 2:00–6:00 PM", "1.5 hours · Afternoon", only the part that is known, or "". A window says more than
 * the time of day, so it wins. */
export const scheduleNote = (t: Pick<PublicTuition, "session_minutes" | "time_of_day"> & Partial<Pick<PublicTuition, "time_from" | "time_to">>) =>
  [t.session_minutes && sessionLength(t.session_minutes), windowLabel(t.time_from, t.time_to) || (t.time_of_day && labelOf(TIMES_OF_DAY, t.time_of_day))].filter(Boolean).join(" · ");

/** The tutor requirement as one line: quick picks first, then the admin's own words. */
export const needText = (t: Pick<PublicTuition, "requirements_public"> & Partial<Pick<PublicTuition, "requirement_keys">>) =>
  [...requirementLabels(t.requirement_keys ?? []), t.requirements_public.trim()].filter(Boolean).join(" · ");

/** Monthly salary per class, rounded to ৳10, or null when there is no fixed monthly salary. A month counts as 4 weeks
 * (owner: 3 days a week = 12 classes, 4 = 16, 5 = 20). */
export const perClass = (t: Pick<PublicTuition, "salary_kind" | "salary_amount" | "salary_period" | "days_per_week">) =>
  isFixedMonthly(t) ? Math.round(t.salary_amount! / (t.days_per_week * 4) / 10) * 10 : null;


/** The tutor-gender chip: Female Tutor deep rose, Male Tutor deep blue, no preference forest. */
export const GENDER_CHIP: Record<PublicTuition["tutor_gender_pref"], { label: string; tone: string }> = {
  female: { label: "Female Tutor", tone: "bg-rose-700 text-white" },
  male: { label: "Male Tutor", tone: "bg-blue-700 text-white" },
  any: { label: "Male/Female Tutor", tone: "bg-forest text-cream" },
};

// One colour per subject, the same everywhere, so tutors learn "blue = Math". Dark text on a pale fill (contrast ≥ 7).
export const SUBJECT_TONE: Record<string, string> = {
  math: "bg-blue-50 text-blue-800 ring-blue-100",
  hmath: "bg-indigo-50 text-indigo-800 ring-indigo-100",
  physics: "bg-violet-50 text-violet-800 ring-violet-100",
  chemistry: "bg-orange-50 text-orange-800 ring-orange-100",
  biology: "bg-lime-50 text-lime-800 ring-lime-100",
  science: "bg-teal-50 text-teal-800 ring-teal-100",
  english: "bg-rose-50 text-rose-800 ring-rose-100",
  bangla: "bg-cyan-50 text-cyan-800 ring-cyan-100",
  ict: "bg-sky-50 text-sky-800 ring-sky-100",
  accounting: "bg-amber-50 text-amber-800 ring-amber-100",
  finance: "bg-amber-50 text-amber-800 ring-amber-100",
  economics: "bg-yellow-50 text-yellow-800 ring-yellow-100",
  bgs: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-100",
  quran: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  islam: "bg-emerald-50 text-emerald-800 ring-emerald-100",
};
export const SUBJECT_TONE_OTHER = "bg-slate-100 text-slate-700 ring-slate-200";
