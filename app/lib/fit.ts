// How well a tutor fits a tuition (owner, 2026-11-04): only a gender mismatch blocks; class, subject, area, university
// and salary only warn. Shared by the admin's applicant list and the tutor's apply sheet.
import { AREAS, TUTOR_FROM } from "./options";
import { normalizeSearch } from "./tuition";

export type Band = "junior" | "ssc" | "hsc";

/** The teaching band a class falls in, matching tutor_subjects.band; null when it has none (Other). */
export function bandOf(classLevel: string): Band | null {
  if (["play", "nursery", "kg", "pre", "c1-5", "c6-8"].includes(classLevel)) return "junior";
  const n = /^class-(\d+)$/.exec(classLevel)?.[1];
  if (n) return Number(n) <= 8 ? "junior" : Number(n) <= 10 ? "ssc" : "hsc";
  if (classLevel.startsWith("ssc") || classLevel === "olevel") return "ssc";
  if (classLevel.startsWith("hsc") || classLevel === "alevel" || classLevel.startsWith("admission")) return "hsc";
  return null;
}

/** RU, RUET or Medical from free text; the same rules as migration 0010, for rows the migration has not seen. */
export function universityOf(institution: string | null): string | null {
  if (!institution?.trim()) return null;
  const s = institution.toLowerCase();
  if (/ruet|engineering/.test(s)) return "ruet";
  if (/medical|mbbs|dental|rmc/.test(s)) return "medical";
  if (/rajshahi university|university of rajshahi/.test(s) || ["ru", "r.u", "r.u.", "rabi"].includes(s.trim())) return "ru";
  return "other";
}

/** The key a tutor counts as for "Tutor from": their university, or Rajshahi College / Varendra University read from
 * the institution they typed. */
export function fromKeyOf(university: string | null | undefined, institution: string | null): string | null {
  const uni = university ?? universityOf(institution);
  if (uni !== "other") return uni;
  const s = (institution ?? "").toLowerCase().trim();
  if (/rajshahi college|^r\.?c\.?$/.test(s)) return "rc";
  if (/varendra|^v\.?u\.?$/.test(s)) return "vu";
  return "other";
}

/** True when a free-text address names the area, in English or Bangla. */
function mentionsArea(text: string, areaKey: string): boolean {
  const area = AREAS.find((a) => a.key === areaKey);
  if (!area || !text) return false;
  const hay = normalizeSearch(text);
  const names = [area.label, area.alt?.match(/^[ঀ-৿\s]+/)?.[0], ...(area.alt?.split(/\s+/).filter((w) => /^[A-Za-z]{5,}$/.test(w)) ?? [])];
  return names.some((n) => n && hay.includes(normalizeSearch(n)));
}

export type FitTuition = {
  tutor_gender_pref: string; subjects: string[]; area: string; tutor_from: string[]; class_level: string;
  salary_kind: string; salary_amount: number | null;
};
export type FitTutor = {
  gender: string | null; subject_fit: string | null; areas: string | null; anywhere?: number | null; location: string | null;
  institution: string | null; university?: string | null; classes?: string | null; min_salary?: number | null;
};

export type Fit = {
  gender: "ok" | "mismatch";
  subjects: string[]; // the tuition's subjects this tutor teaches at its band
  subjectTotal: number;
  area: "listed" | "nearby" | "unknown"; // listed = in the tutor's areas (or anywhere); nearby = their address names it
  university: "ok" | "other" | "unknown" | null; // null when the tuition takes any university
  class: "ok" | "other" | "unknown"; // unknown until the tutor picks classes
  salary: "ok" | "low" | null; // low = under the tutor's minimum; null when either side has no number
  score: number;
};

export function fitOf(t: FitTuition, a: FitTutor): Fit {
  const gender = t.tutor_gender_pref !== "any" && a.gender && a.gender !== t.tutor_gender_pref ? "mismatch" : "ok";
  const subjects = (a.subject_fit ?? "").split(",").filter(Boolean);
  const wanted = t.subjects.filter((s) => s !== "other"); // an Other subject is the guardian's words; no tutor lists it
  const area = a.anywhere || (a.areas ?? "").split(",").includes(t.area) ? "listed" : mentionsArea(a.location ?? "", t.area) ? "nearby" : "unknown";
  const uni = fromKeyOf(a.university, a.institution);
  const university = !t.tutor_from.length ? null : !uni ? "unknown" : t.tutor_from.includes(uni) ? "ok" : "other";
  const classes = (a.classes ?? "").split(",").filter(Boolean);
  const cls = !classes.length ? "unknown" : classes.includes(t.class_level) ? "ok" : "other";
  const pay = t.salary_kind === "fixed" ? t.salary_amount : null;
  const salary = !pay || !a.min_salary ? null : pay >= a.min_salary ? "ok" : "low";
  const score = (gender === "mismatch" ? -100 : 0) + (wanted.length ? (2 * subjects.length) / wanted.length : 0)
    + (area === "listed" ? 1 : area === "nearby" ? 0.5 : 0) + (university === "ok" ? 1 : university === "other" ? -1 : 0)
    + (cls === "ok" ? 0.5 : cls === "other" ? -0.5 : 0) + (salary === "low" ? -0.5 : 0);
  return { gender, subjects, subjectTotal: wanted.length, area, university, class: cls, salary, score };
}

export const tutorFromLabel = (keys: string[]) => keys.map((k) => TUTOR_FROM.find((o) => o.key === k)?.label ?? k).join(" · ");
