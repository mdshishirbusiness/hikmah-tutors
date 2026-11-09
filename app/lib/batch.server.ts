// Admission batch teacher applications (migration 0029). The applicant reads and writes only their own row (keyed on
// their user id); the list, status, rating and notes are for the admin.
import { env } from "cloudflare:workers";
import type { Viewer } from "./auth.server";
import { BATCH_STATUSES, type BatchAnswers, readBatchForm } from "./batch";
import { UNIVERSITIES } from "./join";
import { tutorForUser } from "./me.server";

const now = () => Math.floor(Date.now() / 1000);

export type BatchApplication = {
  id: number; user_id: number; tutor_id: number | null; full_name: string; phone: string; university: string | null; department: string | null;
  session_year: string | null; tracks: string; subjects: string; subject_other: string | null; admission_result: string | null;
  experience_years: number | null; admission_students: number | null; experience: string | null; mode: string; setup: string | null;
  internet: string | null; tools: string | null; days: string | null; times: string | null; pay_per_class: number | null;
  demo_url: string | null; note: string | null; status: string; rating: number | null; admin_note: string | null;
  created_at: number; updated_at: number; status_at: number | null;
};

/** The viewer's own application, and what a registered tutor's record already says, to fill a new form. */
export async function myBatchApplication(viewer: Viewer) {
  const [mine, tutor] = await Promise.all([
    env.DB.prepare(`SELECT * FROM batch_applications WHERE user_id = ?`).bind(viewer.id).first<BatchApplication>(),
    tutorForUser(viewer.id),
  ]);
  const uni = tutor && UNIVERSITIES.find((u) => u.key === tutor.university);
  const prefill = {
    full_name: tutor?.full_name ?? viewer.name ?? "",
    phone: tutor?.phone ?? "",
    university: tutor ? (uni && uni.key !== "other" ? uni.label : tutor.institution) ?? "" : "",
    department: tutor?.department ?? "",
    session_year: tutor?.session_year ?? "",
    admission_result: tutor?.admission_result ?? "",
  };
  return { mine, prefill, tutorCode: tutor?.code ?? null };
}

const listed = (a: BatchAnswers) => [a.tracks, a.subjects, a.setup, a.tools, a.days, a.times].map((l) => l.join(",") || null);

/** Saves a new application, or changes one still New. Returns an error in plain words, or null. */
export async function saveBatchApplication(viewer: Viewer, form: FormData): Promise<string | null> {
  const read = readBatchForm(form);
  if ("error" in read) return read.error;
  const a = read.answers;
  const tutor = await tutorForUser(viewer.id);
  const [tracks, subjects, setup, tools, days, times] = listed(a);
  const t = now();
  const fields = [tutor?.id ?? null, a.full_name, a.phone, a.university, a.department, a.session_year, tracks, subjects, a.subject_other,
    a.admission_result, a.experience_years, a.admission_students, a.experience, a.mode, setup, a.internet, tools, days, times,
    a.pay_per_class, a.demo_url, a.note];
  const res = await env.DB.prepare(
    `INSERT INTO batch_applications (user_id, tutor_id, full_name, phone, university, department, session_year, tracks, subjects, subject_other,
       admission_result, experience_years, admission_students, experience, mode, setup, internet, tools, days, times, pay_per_class, demo_url, note,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET tutor_id = excluded.tutor_id, full_name = excluded.full_name, phone = excluded.phone,
       university = excluded.university, department = excluded.department, session_year = excluded.session_year, tracks = excluded.tracks,
       subjects = excluded.subjects, subject_other = excluded.subject_other, admission_result = excluded.admission_result,
       experience_years = excluded.experience_years, admission_students = excluded.admission_students, experience = excluded.experience,
       mode = excluded.mode, setup = excluded.setup, internet = excluded.internet, tools = excluded.tools, days = excluded.days,
       times = excluded.times, pay_per_class = excluded.pay_per_class, demo_url = excluded.demo_url, note = excluded.note,
       updated_at = excluded.updated_at
     WHERE batch_applications.status = 'new'`,
  ).bind(viewer.id, ...fields, t, t).run();
  return res.meta.changes ? null : "HTR is already looking at your application, so it can't be changed now. Message HTR to add something.";
}

// ---------- Admin ----------

export type BatchFilters = { status: string; subject: string; track: string; mode: string; ready: boolean };

export async function listBatchApplications(f: BatchFilters) {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (f.status) { where.push(`b.status = ?`); binds.push(f.status); }
  // Keys never contain commas, so a padded LIKE finds one key in the list.
  if (f.subject) { where.push(`(',' || b.subjects || ',') LIKE ?`); binds.push(`%,${f.subject},%`); }
  if (f.track) { where.push(`(',' || b.tracks || ',') LIKE ?`); binds.push(`%,${f.track},%`); }
  if (f.mode === "online") where.push(`b.mode IN ('online', 'both')`);
  if (f.mode === "offline") where.push(`b.mode IN ('offline', 'both')`);
  if (f.ready) where.push(`(',' || b.setup || ',') LIKE '%,laptop,%' AND (',' || b.setup || ',') LIKE '%,pen_tablet,%'`);
  const [counts, items] = await Promise.all([
    env.DB.prepare(`SELECT status, count(*) n FROM batch_applications GROUP BY status`).all<{ status: string; n: number }>(),
    env.DB.prepare(
      `SELECT b.*, t.code tutor_code FROM batch_applications b LEFT JOIN tutors t ON t.id = b.tutor_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY COALESCE(b.rating, 0) DESC, b.created_at DESC LIMIT 200`,
    ).bind(...binds).all<BatchApplication & { tutor_code: number | null }>(),
  ]);
  return { counts: Object.fromEntries(counts.results.map((c) => [c.status, c.n])) as Record<string, number>, items: items.results };
}

/** Moves an application, and saves the owner's rating and note. Every change is in the audit log (no answers copied). */
export async function updateBatchApplication(id: number, form: FormData, actorId: number | null): Promise<string | null> {
  const status = String(form.get("status") ?? "");
  if (!BATCH_STATUSES.some((s) => s.key === status)) return "Unknown step.";
  const ratingRaw = String(form.get("rating") ?? "");
  const rating = ratingRaw ? Number(ratingRaw) : null;
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return "Rating is 1 to 5.";
  const note = String(form.get("admin_note") ?? "").trim().slice(0, 1000) || null;
  const t = now();
  const res = await env.DB.batch([
    env.DB.prepare(
      `UPDATE batch_applications SET status = ?, rating = ?, admin_note = ?, updated_at = ?,
         status_at = CASE WHEN status = ? THEN status_at ELSE ? END WHERE id = ?`,
    ).bind(status, rating, note, t, status, t, id),
    env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, 'batch_update', 'batch_application', ?, ?, ?)`)
      .bind(actorId, String(id), JSON.stringify({ status, rating }), t),
  ]);
  return res[0].meta.changes ? null : "Application not found.";
}
