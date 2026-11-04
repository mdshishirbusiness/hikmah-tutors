import { env } from "cloudflare:workers";
import { requirementKeys } from "./request";
import type { PublicTuition } from "./tuition";

// Anyone can read these pages, so columns are named one by one (PRD T-SEC-01), never SELECT *.
// The applicant count is a number only: who applied never leaves the admin pages.
const PUBLIC_COLUMNS = `code, status, accepting_applications, class_level, medium, subjects, area, mode, salary_kind,
  salary_amount, salary_period, days_per_week, session_minutes, time_of_day, student_gender, tutor_gender_pref, tutor_from,
  requirements_public, requirement_keys, class_other, subject_other, time_from, time_to, start_note, posted_at, is_public, closed_at,
  (SELECT count(*) FROM applications a WHERE a.tuition_code = tuitions.code
     AND a.status IN ('submitted', 'under_review', 'shortlisted', 'trial_arranged', 'confirmed')) AS applicants`;

const OPEN = `is_public = 1 AND status IN ('available', 'processing')`;
const CLOSED_PAGE_DAYS = 30; // a closed tuition's link keeps working this long, so shared links don't just die

type Row = Omit<PublicTuition, "code_label" | "subjects" | "tutor_from" | "requirement_keys" | "accepting_applications" | "is_available"> & {
  subjects: string;
  tutor_from: string;
  requirement_keys: string;
  accepting_applications: number;
  is_public: number;
  closed_at: number | null;
};

function toPublic({ is_public, closed_at: _closed, ...r }: Row): PublicTuition {
  return {
    ...r,
    code_label: `HTR-${r.code}`,
    subjects: r.subjects.split(",").filter(Boolean),
    tutor_from: r.tutor_from.split(",").filter(Boolean),
    requirement_keys: requirementKeys(r.requirement_keys),
    accepting_applications: r.accepting_applications === 1,
    salary_amount: r.salary_kind === "fixed" ? r.salary_amount : null,
    is_available: is_public === 1 && (r.status === "available" || r.status === "processing"),
  };
}

export async function openTuitions(): Promise<PublicTuition[]> {
  const { results } = await env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM tuitions WHERE ${OPEN} ORDER BY posted_at DESC LIMIT 2000`).all<Row>();
  return results.map(toPublic);
}

/** Open tuitions, and closed ones for a while after closing. Drafts and hidden posts return null. */
export async function visibleTuition(code: number): Promise<PublicTuition | null> {
  const row = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM tuitions
     WHERE code = ?1 AND (
       (${OPEN}) OR
       (status IN ('booked', 'cancelled', 'closed') AND closed_at > unixepoch() - ?2 * 86400)
     )`,
  )
    .bind(code, CLOSED_PAGE_DAYS)
    .first<Row>();
  return row && toPublic(row);
}

export async function similarTuitions(t: PublicTuition): Promise<PublicTuition[]> {
  const { results } = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM tuitions
     WHERE ${OPEN} AND code != ?1 AND (area = ?2 OR class_level = ?3)
     ORDER BY posted_at DESC LIMIT 4`,
  )
    .bind(t.code, t.area, t.class_level)
    .all<Row>();
  return results.map(toPublic);
}

export type BookedTuition = {
  code: number; class_level: string; area: string; mode: string; salary_kind: string; salary_amount: number | null; subjects: string;
  applicants: number; hours: number | null; university: string | null; department: string | null; booked_at: number;
};

/**
 * Recently booked (owner, 2026-11-04): the last 7 days, with how many applied, how fast it was booked, and the tutor
 * as university and department only, never by name.
 */
export async function recentlyBooked(): Promise<BookedTuition[]> {
  const { results } = await env.DB.prepare(
    `SELECT t.code, t.class_level, t.area, t.mode, t.salary_kind, CASE WHEN t.salary_kind = 'fixed' THEN t.salary_amount END salary_amount, t.subjects,
            (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code) applicants,
            CASE WHEN t.posted_at IS NOT NULL AND p.confirmed_at > t.posted_at THEN (p.confirmed_at - t.posted_at) / 3600 END hours,
            u.university, u.department, p.confirmed_at booked_at
     FROM placements p JOIN tuitions t ON t.code = p.tuition_code LEFT JOIN tutors u ON u.id = p.tutor_id
     WHERE p.status IN ('confirmed', 'joined') AND p.confirmed_at > ? AND t.status = 'booked'
     ORDER BY p.confirmed_at DESC LIMIT 30`,
  ).bind(Math.floor(Date.now() / 1000) - 7 * 86400).all<BookedTuition>();
  return results;
}
