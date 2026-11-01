// Tuition rules and formatting shared by the server and the pages. Ported from the Emergent reference
// (backend/logic/fees.py, logic/text.py, frontend/src/lib/format.ts).
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, labelOf } from "./options";

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
  student_gender: "boy" | "girl" | null;
  tutor_gender_pref: "any" | "male" | "female";
  requirements_public: string;
  start_note: string;
  posted_at: number | null;
  is_available: boolean; // on the board
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
  return normalizeSearch(
    [
      t.code_label,
      t.code,
      area?.label,
      area?.alt,
      labelOf(CLASS_LEVELS, t.class_level),
      labelOf(MEDIUMS, t.medium),
      ...t.subjects.map((s) => labelOf(SUBJECTS, s)),
      t.requirements_public,
    ].join(" "),
  );
}

const isFixedMonthly = (t: PublicTuition) =>
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

export const bnDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export const taka = (n: number) => `৳ ${bnDigits(new Intl.NumberFormat("en-IN").format(n))}`;

const NEW_FOR_SECONDS = 48 * 3600;

export const isNew = (postedAt: number | null, now: number) => postedAt !== null && now - postedAt < NEW_FOR_SECONDS;

export function formatDate(unix: number): string {
  const s = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(unix * 1000));
  const months: Record<string, string> = {
    January: "জানুয়ারি", February: "ফেব্রুয়ারি", March: "মার্চ", April: "এপ্রিল", May: "মে", June: "জুন",
    July: "জুলাই", August: "আগস্ট", September: "সেপ্টেম্বর", October: "অক্টোবর", November: "নভেম্বর", December: "ডিসেম্বর",
  };
  return bnDigits(s.replace(/[A-Za-z]+/, (m) => months[m] ?? m));
}

/** `now` comes from the loader so the server and the phone render the same text. */
export function timeAgo(unix: number | null, now: number): string {
  if (unix === null) return "";
  const mins = Math.floor(Math.max(0, now - unix) / 60);
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${bnDigits(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${bnDigits(hours)} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${bnDigits(days)} দিন আগে`;
  return formatDate(unix);
}

export const GENDER_NEED: Record<PublicTuition["tutor_gender_pref"], string> = {
  male: "পুরুষ টিউটর প্রয়োজন",
  female: "মহিলা টিউটর প্রয়োজন",
  any: "যেকোনো টিউটর (পুরুষ/মহিলা)",
};

export const GENDER_STYLE: Record<PublicTuition["tutor_gender_pref"], { strip: string; border: string; bar: string; badge: string }> = {
  male: { strip: "bg-blue-50 text-blue-900", border: "border-blue-200", bar: "bg-blue-600", badge: "bg-blue-100 text-blue-900" },
  female: { strip: "bg-rose-50 text-rose-900", border: "border-rose-200", bar: "bg-rose-600", badge: "bg-rose-100 text-rose-900" },
  any: { strip: "bg-emerald-50 text-emerald-900", border: "border-emerald-200", bar: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-900" },
};
