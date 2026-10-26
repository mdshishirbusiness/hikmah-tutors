// One lead (guardian request) and its validation. Shared by the phone (before saving or queueing)
// and the server (before writing to D1), so a queued lead is always one the server will accept.
import { CLASS_LEVELS, DAYS_PER_WEEK, LEAD_SOURCES, MEDIUMS, STUDENT_GENDERS, SUBJECTS, TUTOR_GENDERS } from "./options";

export type LeadInput = {
  client_id: string;
  created_at: number; // unix seconds
  phone: string;
  guardian_name: string;
  class_level: string;
  medium: string;
  student_gender: string;
  tutor_gender: string;
  subjects: string[];
  area: string;
  address: string;
  salary: number | null;
  days_per_week: number | null;
  notes: string;
  lead_source: string;
};

export type LeadErrors = Partial<Record<"phone" | "class_level" | "area" | "salary" | "form", string>>;

/** Bangla digits (০-৯) → 0-9 */
const enDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

/** 01XXXXXXXXX from anything a person may paste: +880 1711-000000, 8801711000000, ০১৭১১০০০০০০ … or "" if invalid */
export function bdPhone(raw: unknown): string {
  const digits = enDigits(String(raw ?? ""))
    .replace(/\D/g, "")
    .replace(/^(?:00)?88/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? digits : "";
}

const keys = (list: { key: string }[]) => new Set(list.map((o) => o.key));
const CLASS_KEYS = keys(CLASS_LEVELS);
const MEDIUM_KEYS = keys(MEDIUMS);
const GENDER_KEYS = keys(TUTOR_GENDERS);
const STUDENT_GENDER_KEYS = keys(STUDENT_GENDERS);
const SOURCE_KEYS = keys(LEAD_SOURCES);
const SUBJECT_KEYS = keys(SUBJECTS);
const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const oneOf = (v: unknown, allowed: Set<string>) => (allowed.has(String(v)) ? String(v) : "");

/** Cleans untrusted input. Returns the lead ready to store, or the errors to show (in Bangla). */
export function parseLead(body: unknown): { lead: LeadInput; errors: null } | { lead: null; errors: LeadErrors } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const errors: LeadErrors = {};

  const client_id = String(b.client_id ?? "");
  if (!CLIENT_ID.test(client_id)) errors.form = "অনুরোধটি ঠিক নেই, পাতাটি আবার খোলো";

  const nowSec = Math.floor(Date.now() / 1000);
  const created = Math.floor(Number(b.created_at));
  // a phone clock can be a little wrong; anything absurd falls back to "now"
  const created_at = created > nowSec - 60 * 60 * 24 * 30 && created < nowSec + 60 * 60 ? created : nowSec;

  const phone = bdPhone(b.phone);
  if (!phone) errors.phone = "সঠিক মোবাইল নম্বর লেখো (01XXXXXXXXX)";

  const class_level = oneOf(b.class_level, CLASS_KEYS);
  if (!class_level) errors.class_level = "শ্রেণি বেছে নাও";

  const area = text(b.area, 60); // an area key, or free text typed under "অন্য এলাকা"
  if (!area) errors.area = "এলাকা বেছে নাও বা লেখো";

  let salary: number | null = null;
  if (b.salary !== null && b.salary !== undefined && String(b.salary).trim() !== "") {
    const n = Math.round(Number(enDigits(String(b.salary)).replace(/,/g, "")));
    if (!Number.isFinite(n) || n < 500 || n > 200000) errors.salary = "বেতন ৫০০ থেকে ২,০০,০০০ টাকার মধ্যে লেখো";
    else salary = n;
  }

  const days = Number(b.days_per_week);
  const days_per_week = (DAYS_PER_WEEK as readonly number[]).includes(days) ? days : null;

  const subjects = Array.isArray(b.subjects)
    ? [...new Set(b.subjects.map(String).filter((s) => SUBJECT_KEYS.has(s)))]
    : [];

  if (Object.keys(errors).length) return { lead: null, errors };
  return {
    lead: {
      client_id,
      created_at,
      phone,
      guardian_name: text(b.guardian_name, 60),
      class_level,
      medium: oneOf(b.medium, MEDIUM_KEYS),
      student_gender: oneOf(b.student_gender, STUDENT_GENDER_KEYS),
      tutor_gender: oneOf(b.tutor_gender, GENDER_KEYS),
      subjects,
      area,
      address: text(b.address, 200),
      salary,
      days_per_week,
      notes: text(b.notes, 500),
      lead_source: oneOf(b.lead_source, SOURCE_KEYS),
    },
    errors: null,
  };
}
