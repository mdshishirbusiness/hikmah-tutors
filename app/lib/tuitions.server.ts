import { env } from "cloudflare:workers";
import type { PublicTuition } from "./tuition";

// Anyone can read these pages, so columns are named one by one (PRD T-SEC-01), never SELECT *.
// The applicant count is a number only: who applied never leaves the admin pages.
const PUBLIC_COLUMNS = `code, status, accepting_applications, class_level, medium, subjects, area, mode, salary_kind,
  salary_amount, salary_period, days_per_week, session_minutes, time_of_day, student_gender, tutor_gender_pref, tutor_from,
  requirements_public, start_note, posted_at, is_public, closed_at,
  (SELECT count(*) FROM applications a WHERE a.tuition_code = tuitions.code
     AND a.status IN ('submitted', 'under_review', 'shortlisted', 'trial_arranged', 'confirmed')) AS applicants`;

const OPEN = `is_public = 1 AND status IN ('available', 'processing')`;
const CLOSED_PAGE_DAYS = 30; // a closed tuition's link keeps working this long, so shared links don't just die

type Row = Omit<PublicTuition, "code_label" | "subjects" | "tutor_from" | "accepting_applications" | "is_available"> & {
  subjects: string;
  tutor_from: string;
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
