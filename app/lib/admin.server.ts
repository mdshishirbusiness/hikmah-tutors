// Queries behind the admin screens. Private data: only routes under /admin that call requireAdmin may import this.
import { env } from "cloudflare:workers";
import { ADMIN_PAGE_SIZE, TUITION_MOVES, publishGaps } from "./admin-labels";
import { bandOf } from "./fit";
import { AREAS, CLASS_CHOICES, CLASS_LEVELS, LEAD_SOURCES, MEDIUMS, SESSION_MINUTES, SUBJECTS, TIMES_OF_DAY, TUTOR_FROM } from "./options";
import { parseWindow, requirementKeys } from "./request";
import type { Level, Student } from "./profile";

const PAGE_SIZE = ADMIN_PAGE_SIZE;
const pageOffset = (page: number) => (Math.max(page, 1) - 1) * PAGE_SIZE;
const now = () => Math.floor(Date.now() / 1000);
const like = (q: string) => `%${q.replace(/[%_]/g, "")}%`;

async function all<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  return (await env.DB.prepare(sql).bind(...args).all<T>()).results;
}
async function count(sql: string, ...args: unknown[]): Promise<number> {
  return (await env.DB.prepare(sql).bind(...args).first<{ n: number }>())?.n ?? 0;
}

const ACTIVE_APPLICATIONS = `('submitted', 'under_review', 'shortlisted', 'trial_arranged')`;

export async function dashboard() {
  const [open, publicNow, waiting, tutors, leads, held] = await Promise.all([
    count(`SELECT count(*) n FROM tuitions WHERE status IN ('available', 'processing')`),
    count(`SELECT count(*) n FROM tuitions WHERE is_public = 1 AND status IN ('available', 'processing')`),
    count(`SELECT count(*) n FROM applications WHERE status = 'submitted'
           AND tuition_code IN (SELECT code FROM tuitions WHERE status IN ('available', 'processing'))`),
    count(`SELECT count(*) n FROM tutors WHERE deleted_at IS NULL`),
    count(`SELECT count(*) n FROM leads WHERE status = 'new'`),
    reviewCounts().then((c) => c.tutors + c.tuitions + c.held),
  ]);
  return { open, publicNow, waiting, tutors, leads, held };
}

/** The admin's to-do list, most urgent first. Steps that come with the tutor's own ticks (3-hour call, demo, confirm) join later. */
export async function todayList() {
  const [leads, applications, drafts, selected, tutorConfirmed, checkins, newTutors] = await Promise.all([
    all<{ id: number; status: string; class_level: string; area: string; guardian_name: string | null; created_at: number }>(
      `SELECT id, status, class_level, area, guardian_name, created_at FROM leads WHERE status IN ('new', 'called') ORDER BY status = 'new' DESC, created_at LIMIT 20`,
    ),
    all<{ code: number; class_level: string; area: string; waiting: number; oldest: number }>(
      `SELECT t.code, t.class_level, t.area, count(*) waiting, min(a.created_at) oldest
       FROM applications a JOIN tuitions t ON t.code = a.tuition_code
       WHERE a.status = 'submitted' AND t.status IN ('available', 'processing')
       GROUP BY t.code ORDER BY oldest LIMIT 20`,
    ),
    all<{ code: number; class_level: string; area: string; created_at: number | null }>(
      `SELECT t.code, t.class_level, t.area, p.created_at FROM tuitions t LEFT JOIN tuition_private p ON p.tuition_code = t.code
       WHERE t.status = 'draft' ORDER BY t.code DESC LIMIT 20`,
    ),
    // Selected tutors who have not ticked Called: flagged after 3 hours, never dropped (owner, 2026-11-04).
    all<{ code: number; class_level: string; area: string; tutor_code: number | null; selected_at: number }>(
      `SELECT a.tuition_code code, t.class_level, t.area, tu.code tutor_code,
              (SELECT max(e.created_at) FROM application_events e WHERE e.application_id = a.id AND e.to_status = 'trial_arranged') selected_at
       FROM applications a JOIN tuitions t ON t.code = a.tuition_code LEFT JOIN tutors tu ON tu.id = a.tutor_id
       WHERE a.status = 'trial_arranged' AND a.called_at IS NULL ORDER BY selected_at LIMIT 20`,
    ),
    // Confirmed by the tutor's own tick in the last 7 days: the admin checks with the guardian and can undo it.
    all<{ code: number; class_level: string; area: string; tutor_code: number | null; confirmed_at: number }>(
      `SELECT a.tuition_code code, t.class_level, t.area, tu.code tutor_code, e.created_at confirmed_at
       FROM application_events e JOIN applications a ON a.id = e.application_id JOIN users u ON u.id = e.actor_user_id
       JOIN tuitions t ON t.code = a.tuition_code LEFT JOIN tutors tu ON tu.id = a.tutor_id
       WHERE e.to_status = 'confirmed' AND u.role = 'tutor' AND a.status = 'confirmed' AND e.created_at > unixepoch() - 7 * 86400
       ORDER BY e.created_at DESC LIMIT 20`,
    ),
    // Check-in calls due (owner, 2026-11-04): day 7 and day 30 after Confirmed.
    all<{ id: number; code: number; class_level: string; area: string; day: number; confirmed_at: number }>(
      `SELECT pl.id, pl.tuition_code code, t.class_level, t.area, CASE WHEN pl.checkin7_at IS NULL THEN 7 ELSE 30 END day, pl.confirmed_at
       FROM placements pl JOIN tuitions t ON t.code = pl.tuition_code
       WHERE pl.status IN ('confirmed', 'joined') AND pl.confirmed_at > unixepoch() - 75 * 86400
         AND ((pl.checkin7_at IS NULL AND pl.confirmed_at <= unixepoch() - 7 * 86400) OR (pl.checkin30_at IS NULL AND pl.confirmed_at <= unixepoch() - 30 * 86400))
       ORDER BY pl.confirmed_at LIMIT 20`,
    ),
    // Registrations on the site waiting for the owner's check, oldest first.
    all<{ code: number; full_name: string; photo_key: string | null; university: string | null; department: string | null; created_at: number }>(
      `SELECT code, full_name, photo_key, university, department, created_at FROM tutors WHERE review_status = 'waiting' AND deleted_at IS NULL ORDER BY created_at LIMIT 20`,
    ),
  ]);
  return { leads, applications, drafts, selected, tutorConfirmed, checkins, newTutors };
}

// ---------- Leads ----------

export type AdminLead = {
  id: number; phone: string; guardian_name: string | null; class_level: string; medium: string | null; student_gender: string | null;
  tutor_gender: string | null; subjects: string | null; area: string; address: string | null; salary: number | null; days_per_week: number | null;
  notes: string | null; lead_source: string | null; status: string; created_at: number; tuitions: string | null;
  referred_code: number | null; flag_reason: string | null; past: number;
  class_other: string | null; subject_other: string | null; time_of_day: string | null; time_from: number | null; time_to: number | null;
  session_minutes: number | null; tutor_from: string | null; requirement_keys: string | null;
};

export async function listLeads(status: string) {
  const [counts, items] = await Promise.all([
    all<{ status: string; n: number }>(`SELECT status, count(*) n FROM leads GROUP BY status`),
    all<AdminLead>(
      `SELECT l.id, l.phone, l.guardian_name, l.class_level, l.medium, l.student_gender, l.tutor_gender, l.subjects, l.area, l.address, l.salary,
              l.days_per_week, l.notes, l.lead_source, l.status, l.created_at, l.class_other, l.subject_other, l.time_of_day, l.time_from, l.time_to,
              l.session_minutes, l.tutor_from, l.requirement_keys,
              (SELECT group_concat(p.tuition_code) FROM tuition_private p WHERE p.lead_id = l.id) tuitions,
              (SELECT code FROM tutors WHERE id = l.referred_by) referred_code,
              (SELECT flag_reason FROM guardians g WHERE g.phone = l.phone) flag_reason,
              (SELECT count(*) FROM tuition_private p JOIN guardians g ON g.id = p.guardian_id WHERE g.phone = l.phone) past
       FROM leads l ${status ? "WHERE l.status = ?" : ""} ORDER BY l.created_at DESC LIMIT 100`,
      ...(status ? [status] : []),
    ),
  ]);
  return { counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Record<string, number>, items };
}

/** Steps a lead can take by hand. Posted is reached only by posting a tuition. */
const LEAD_MOVES: Record<string, string[]> = { new: ["called", "not_now"], called: ["not_now"], not_now: ["new"] };

export async function moveLead(id: number, to: string, actorId: number | null): Promise<string | null> {
  const lead = await env.DB.prepare(`SELECT status FROM leads WHERE id = ?`).bind(id).first<{ status: string }>();
  if (!lead) return "Lead not found.";
  if (!LEAD_MOVES[lead.status]?.includes(to)) return "Can't move to that step.";
  await env.DB.batch([
    env.DB.prepare(`UPDATE leads SET status = ?, status_at = ? WHERE id = ?`).bind(to, now(), id),
    audit(actorId, "lead_moved", "lead", String(id), { from: lead.status, to }),
  ]);
  return null;
}

/** Makes a hidden draft tuition from a lead and returns its code. The admin finishes the public wording in the editor. */
export async function postLeadAsTuition(id: number, actorId: number | null): Promise<number | null> {
  const l = await env.DB.prepare(`SELECT * FROM leads WHERE id = ?`).bind(id).first<AdminLead & { guardian_id: number | null }>();
  if (!l) return null;
  const t = now();
  const areaKnown = AREAS.some((a) => a.key === l.area);
  const notes = [areaKnown ? "" : `Area (as typed in the lead): ${l.area}`, l.notes ?? ""].filter(Boolean).join("\n");
  // One batch is one transaction, so MAX(code) below is the tuition this batch just made.
  const code = `(SELECT MAX(code) FROM tuitions)`;
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO guardians (phone, name, created_at) VALUES (?, ?, ?)`).bind(l.phone, l.guardian_name, t),
    env.DB.prepare(
      `INSERT INTO tuitions (code, status, is_public, class_level, medium, subjects, area, salary_kind, salary_amount, days_per_week,
                             student_gender, tutor_gender_pref, class_other, subject_other, time_of_day, time_from, time_to, session_minutes, tutor_from, requirement_keys)
       SELECT COALESCE(MAX(code), 0) + 1, 'draft', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM tuitions`,
    ).bind(l.class_level, l.medium ?? "", l.subjects ?? "", areaKnown ? l.area : "", l.salary ? "fixed" : "unspecified", l.salary || null,
      l.days_per_week && l.days_per_week >= 1 && l.days_per_week <= 7 ? l.days_per_week : 3, l.student_gender, l.tutor_gender || "any",
      // Everything the Quick Pad took down carries over (review step 3), so the admin only checks the wording.
      l.class_other, l.subject_other, l.time_of_day, l.time_from, l.time_to, l.session_minutes, l.tutor_from ?? "", l.requirement_keys ?? ""),
    env.DB.prepare(
      `INSERT INTO tuition_private (tuition_code, guardian_id, guardian_label, exact_address, lead_source, private_notes, lead_id, created_at, updated_at)
       VALUES (${code}, (SELECT id FROM guardians WHERE phone = ?), ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(l.phone, l.guardian_name, l.address, l.lead_source, notes || null, id, t, t),
    env.DB.prepare(`UPDATE leads SET status = 'posted', status_at = ?, tuition_code = ${code}, guardian_id = (SELECT id FROM guardians WHERE phone = ?) WHERE id = ?`)
      .bind(t, l.phone, id),
    env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, 'tuition_from_lead', 'tuition', ${code}, ?, ?)`)
      .bind(actorId, JSON.stringify({ lead_id: id }), t),
  ]);
  return (await env.DB.prepare(`SELECT tuition_code FROM leads WHERE id = ?`).bind(id).first<{ tuition_code: number }>())?.tuition_code ?? null;
}

// ---------- Tuitions ----------

export type AdminTuitionRow = {
  code: number; status: string; is_public: number; class_level: string; subjects: string; area: string; salary_kind: string;
  salary_amount: number | null; tutor_gender_pref: string; posted_at: number | null; applications: number;
  fresh?: number; review?: number; short?: number; selected?: number; accepting_applications?: number; guardian?: string | null;
};

export async function listTuitions(f: { q: string; status: string; visibility: string; page: number }) {
  const where = ["1 = 1"];
  const args: unknown[] = [];
  if (f.status) { where.push("t.status = ?"); args.push(f.status); }
  if (f.visibility === "public") where.push("t.is_public = 1");
  if (f.visibility === "hidden") where.push("t.is_public = 0");
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    const areas = AREAS.filter((a) => `${a.label} ${a.alt ?? ""}`.toLowerCase().includes(f.q.toLowerCase())).map((a) => a.key);
    const parts = [];
    if (digits) { parts.push("t.code = ?", "g.phone LIKE ?"); args.push(Number(digits), like(digits)); }
    if (areas.length) { parts.push(`t.area IN (${areas.map(() => "?").join(",")})`); args.push(...areas); }
    where.push(parts.length ? `(${parts.join(" OR ")})` : "0");
  }
  const from = `FROM tuitions t LEFT JOIN tuition_private p ON p.tuition_code = t.code LEFT JOIN guardians g ON g.id = p.guardian_id
                WHERE ${where.join(" AND ")}`;
  const [total, items, statuses] = await Promise.all([
    count(`SELECT count(*) n ${from}`, ...args),
    all<AdminTuitionRow>(
      `SELECT t.code, t.status, t.is_public, t.accepting_applications, t.class_level, t.subjects, t.area, t.salary_kind, t.salary_amount, t.tutor_gender_pref, t.posted_at,
              COALESCE(p.guardian_label, g.name) guardian,
              (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code) applications,
              (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code AND a.status = 'submitted') fresh,
              (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code AND a.status = 'under_review') review,
              (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code AND a.status = 'shortlisted') short,
              (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code AND a.status IN ('trial_arranged', 'confirmed')) selected
       ${from} ORDER BY t.code DESC LIMIT ? OFFSET ?`,
      ...args, PAGE_SIZE, pageOffset(f.page),
    ),
    all<{ status: string; n: number }>(`SELECT status, count(*) n FROM tuitions GROUP BY status`),
  ]);
  return { total, items, statuses: Object.fromEntries(statuses.map((s) => [s.status, s.n])) as Record<string, number> };
}

export type TuitionFull = AdminTuitionRow & {
  medium: string; mode: string; salary_period: string; days_per_week: number; student_gender: string | null; accepting_applications: number;
  requirements_public: string; start_note: string; closed_at: number | null; session_minutes: number | null; time_of_day: string | null;
  tutor_from: string; class_other: string | null; subject_other: string | null; time_from: number | null; time_to: number | null; requirement_keys: string;
};
export type TuitionPrivate = {
  guardian_id: number | null; guardian_label: string | null; guardian_phone: string | null; exact_address: string | null; lead_source: string | null;
  private_notes: string | null; tutor_qualification: string | null; raw_json: string | null;
};
export type Applicant = {
  id: number; tutor_id: number | null; tutor_code: number | null; name: string | null; phone: string | null; gender: string | null; shortcode: string | null;
  location: string | null; note: string | null; fee_plan: string | null; status: string; created_at: number; priority: string | null; transport: string | null;
  institution: string | null; department: string | null; session_year: string | null; ssc_group: string | null; ssc_result: string | null;
  hsc_group: string | null; hsc_result: string | null; university: string | null; anywhere: number | null; min_salary: number | null;
  classes: string | null; // the classes the tutor wants, comma-separated (empty until set up)
  subject_fit: string | null; // the tuition's subjects the tutor teaches at its band, comma-separated
  areas: string | null; // the tutor's chosen areas, comma-separated (empty until they sign in)
  experience: string | null; // the tutor's experience statement for the tuition's band
  photo_key: string | null; about: string | null; demo_willing: number | null; paused: number | null; updated_at: number;
  called_at: number | null; met_at: number | null; demo_done_at: number | null;
  total_apps: number; placed: number; // this tutor's whole record with HTR, for the admin's judgement
  flag_reason: string | null;
  // Part C (owner, 2026-11-05): what the Strength order reads.
  level: Level | null; // the tutor's experience at this tuition's level
  students: Student[]; // students they have taught, this level first
  demos: number; // demo classes done through HTR
  dropped: number; // tuitions that didn't work out for the tutor's own reasons
};

export async function getTuition(code: number) {
  const tuition = await env.DB.prepare(`SELECT t.*, 0 applications FROM tuitions t WHERE t.code = ?`).bind(code).first<TuitionFull>();
  if (!tuition) return null;
  const band = bandOf(tuition.class_level) ?? "";
  const [priv, applicants, placements, history] = await Promise.all([
    env.DB.prepare(
      `SELECT p.guardian_id, p.guardian_label, g.phone guardian_phone, p.exact_address, p.lead_source, p.private_notes, p.tutor_qualification, p.raw_json
       FROM tuition_private p LEFT JOIN guardians g ON g.id = p.guardian_id WHERE p.tuition_code = ?`,
    ).bind(code).first<TuitionPrivate>(),
    all<Applicant>(
      `SELECT a.id, a.tutor_id, t.code tutor_code, COALESCE(t.full_name, a.applicant_name) name, COALESCE(a.applicant_phone, t.phone) phone,
              COALESCE(t.gender, a.applicant_gender) gender, COALESCE(a.applicant_shortcode, t.institution) shortcode,
              COALESCE(a.applicant_location, t.current_location) location, a.note, a.fee_plan, a.status, a.created_at, t.priority, t.transport,
              t.institution, t.department, t.session_year, t.ssc_group, t.ssc_result, t.hsc_group, t.hsc_result, t.university, t.anywhere, t.min_salary,
              (SELECT group_concat(c.class_level) FROM tutor_classes c WHERE c.tutor_id = a.tutor_id) classes,
              (SELECT group_concat(DISTINCT s.subject) FROM tutor_subjects s WHERE s.tutor_id = a.tutor_id AND (? = '' OR s.band = ?)
                 AND instr(',' || ? || ',', ',' || s.subject || ',') > 0) subject_fit,
              (SELECT group_concat(ar.area) FROM tutor_areas ar WHERE ar.tutor_id = a.tutor_id) areas,
              (SELECT body FROM tutor_statements st WHERE st.tutor_id = a.tutor_id AND st.kind = ?) experience,
              t.photo_key, t.about, t.demo_willing, t.availability_paused paused, t.flag_reason, a.updated_at, a.called_at, a.met_at, a.demo_done_at,
              (SELECT count(*) FROM applications x WHERE x.tutor_id = a.tutor_id) total_apps,
              (SELECT count(*) FROM placements pl WHERE pl.tutor_id = a.tutor_id AND pl.status IN ('confirmed', 'joined', 'ended')) placed
       FROM applications a LEFT JOIN tutors t ON t.id = a.tutor_id WHERE a.tuition_code = ? ORDER BY a.created_at`,
      band, band, tuition.subjects, band ? `${band}_experience` : "", code,
    ),
    all<{ id: number; status: string; tutor_id: number | null; tutor_name: string | null; legacy_tutor_name: string | null; legacy_tutor_phone: string | null }>(
      `SELECT p.id, p.status, p.tutor_id, t.full_name tutor_name, p.legacy_tutor_name, p.legacy_tutor_phone
       FROM placements p LEFT JOIN tutors t ON t.id = p.tutor_id WHERE p.tuition_code = ?`,
      code,
    ),
    // What happened, newest first: every applicant step and every edit of the tuition.
    all<{ at: number; kind: string; from_status: string | null; to_status: string | null; reason: string | null; who: string | null; tutor_code: number | null; by_tutor: number }>(
      `SELECT * FROM (
         SELECT e.created_at at, 'step' kind, e.from_status, e.to_status, e.reason, COALESCE(u.full_name, a.applicant_name) who, u.code tutor_code,
                (us.role = 'tutor') by_tutor
         FROM application_events e JOIN applications a ON a.id = e.application_id LEFT JOIN tutors u ON u.id = a.tutor_id
         LEFT JOIN users us ON us.id = e.actor_user_id WHERE a.tuition_code = ?1
         UNION ALL
         SELECT l.created_at, l.action, NULL, NULL, l.meta_json, NULL, NULL, 0 FROM audit_log l
         WHERE l.entity_type = 'tuition' AND l.entity_id = CAST(?1 AS TEXT)
       ) ORDER BY at DESC LIMIT 150`,
      code,
    ),
  ]);
  // Each applicant's experience at this level, students taught and record: three queries for the whole list.
  const ids = `SELECT tutor_id FROM applications WHERE tuition_code = ? AND tutor_id IS NOT NULL`;
  const [levels, students, records] = await Promise.all([
    band ? all<Level & { tutor_id: number }>(
      `SELECT tutor_id, band, students, years, approach, story, makes_notes, takes_tests, gives_homework, reports_guardian
       FROM tutor_levels WHERE band = ? AND tutor_id IN (${ids})`, band, code,
    ) : Promise.resolve([] as (Level & { tutor_id: number })[]),
    all<Student & { tutor_id: number }>(
      `SELECT tutor_id, id, class_level, class_other, area, subjects, started, ended, result_before, result_after, improvement
       FROM tutor_students WHERE tutor_id IN (${ids}) ORDER BY COALESCE(ended, '9999-12') DESC, started DESC`, code,
    ),
    all<{ tutor_id: number; demos: number; dropped: number }>(
      `SELECT x.tutor_id, SUM(x.demo_done_at IS NOT NULL) demos,
              (SELECT count(*) FROM application_events e JOIN applications y ON y.id = e.application_id
               WHERE y.tutor_id = x.tutor_id AND e.reason LIKE 'didn''t work out:%' AND e.reason NOT LIKE '%guardian_chose_other%') dropped
       FROM applications x WHERE x.tutor_id IN (${ids}) GROUP BY x.tutor_id`, code,
    ),
  ]);
  const full: Applicant[] = applicants.map((a) => {
    const level = levels.find((l) => l.tutor_id === a.tutor_id) ?? null;
    const mine = students.filter((st) => st.tutor_id === a.tutor_id);
    const rec = records.find((r) => r.tutor_id === a.tutor_id);
    return {
      ...a,
      level,
      // This tuition's level first, then the rest.
      students: [...mine.filter((st) => bandOf(st.class_level) === band), ...mine.filter((st) => bandOf(st.class_level) !== band)],
      demos: rec?.demos ?? 0,
      dropped: rec?.dropped ?? 0,
      experience: level?.story ?? level?.approach ?? a.experience,
    };
  });
  return { tuition, priv, applicants: full, placements, history };
}

/** Public wording must not carry contact details. Returns an error in Bangla, or null. */
function publicTextProblem(text: string): string | null {
  const digits = text.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[\s-]/g, "");
  if (/01[3-9]\d{8}/.test(digits)) return "Public text can't contain a phone number.";
  return null;
}

/** The checks every tuition's fields pass, whether new or edited. Returns the first problem, or null. */
export function tuitionFieldsProblem(form: FormData): string | null {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const medium = text("medium"), classLevel = text("class_level"), area = text("area");
  const requirements = text("requirements_public"), startNote = text("start_note");
  const days = Number(text("days_per_week")), salaryKind = text("salary_kind"), amount = Number(text("salary_amount"));
  const genderPref = text("tutor_gender_pref");
  const sessionMinutes = Number(text("session_minutes")) || null, timeOfDay = text("time_of_day") || null;
  if (medium && !MEDIUMS.some((m) => m.key === medium)) return "Medium not valid.";
  if (!CLASS_LEVELS.some((c) => c.key === classLevel)) return "Pick a class.";
  if (sessionMinutes !== null && !(SESSION_MINUTES as readonly number[]).includes(sessionMinutes)) return "Session length not valid.";
  if (timeOfDay !== null && !TIMES_OF_DAY.some((o) => o.key === timeOfDay)) return "Time of day not valid.";
  if (!AREAS.some((a) => a.key === area)) return "Pick an area.";
  if (!Number.isInteger(days) || days < 1 || days > 7) return "Days per week must be 1 to 7.";
  if (!["fixed", "negotiable", "unspecified"].includes(salaryKind)) return "Salary type not valid.";
  if (salaryKind === "fixed" && (!Number.isInteger(amount) || amount <= 0)) return "Enter the salary.";
  if (!["any", "male", "female"].includes(genderPref)) return "Tutor choice not valid.";
  if (requirements.length > 500 || startNote.length > 100) return "Text is too long.";
  const classOther = text("class_other"), subjectOther = text("subject_other");
  if (classLevel === "other" && !classOther) return "Write which class (it shows on the board).";
  if (form.getAll("subjects").includes("other") && !subjectOther) return "Write which subject (it shows on the board).";
  if (classOther.length > 60 || subjectOther.length > 60) return "Class or subject text is too long.";
  const window = parseWindow(form.get("time_from"), form.get("time_to"));
  if (window.error) return window.error;
  return publicTextProblem(`${requirements} ${startNote} ${classOther} ${subjectOther}`);
}

export async function updateTuition(code: number, form: FormData, actorId: number | null): Promise<string | null> {
  const current = await env.DB.prepare(`SELECT status, posted_at FROM tuitions WHERE code = ?`).bind(code).first<{ status: string; posted_at: number | null }>();
  if (!current) return "Tuition not found.";

  const text = (name: string) => String(form.get(name) ?? "").trim();
  const status = text("status"), medium = text("medium"), classLevel = text("class_level"), area = text("area");
  const subjects = form.getAll("subjects").map(String).filter((s) => SUBJECTS.some((o) => o.key === s));
  const requirements = text("requirements_public"), startNote = text("start_note");
  const days = Number(text("days_per_week")), salaryKind = text("salary_kind"), amount = Number(text("salary_amount"));
  const genderPref = text("tutor_gender_pref"), publish = form.get("is_public") === "1";
  const sessionMinutes = Number(text("session_minutes")) || null, timeOfDay = text("time_of_day") || null;
  const tutorFrom = form.getAll("tutor_from").map(String).filter((k) => TUTOR_FROM.some((o) => o.key === k));
  const studentGender = ["boy", "girl"].includes(text("student_gender")) ? text("student_gender") : null;
  const window = parseWindow(form.get("time_from"), form.get("time_to"));
  const asks = requirementKeys(form.getAll("requirements").map(String));

  if (status !== current.status && !TUITION_MOVES[current.status]?.includes(status)) return "Can't move to that status.";
  const problem = tuitionFieldsProblem(form);
  if (problem) return problem;

  const open = status === "available" || status === "processing";
  if (publish && !open) return "Only Available or Processing tuitions can go on the board.";
  if (publish && !medium) return "Pick a medium before showing it on the board.";
  if (publish && !subjects.length) return "Pick subjects before showing it on the board.";
  // Old range classes (Class 9–10) can stay on hidden rows, but the board shows one class or one batch only.
  if (publish && !CLASS_CHOICES.some((c) => c.key === classLevel)) return "Pick one class or batch from the new list before showing it on the board.";

  const t = now();
  const postedAt = publish ? current.posted_at ?? t : current.posted_at;
  const closedAt = open || status === "draft" ? null : t;
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE tuitions SET status = ?, is_public = ?, accepting_applications = ?, medium = ?, class_level = ?, subjects = ?, area = ?, days_per_week = ?,
              session_minutes = ?, time_of_day = ?, salary_kind = ?, salary_amount = ?, tutor_gender_pref = ?, tutor_from = ?, requirements_public = ?, start_note = ?, posted_at = ?,
              student_gender = COALESCE(?, student_gender), closed_at = CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(closed_at, ?) END,
              class_other = ?, subject_other = ?, time_from = ?, time_to = ?, requirement_keys = ?
       WHERE code = ?`,
    ).bind(status, publish ? 1 : 0, publish && form.get("accepting") === "1" ? 1 : 0, medium, classLevel, subjects.join(","), area, days, sessionMinutes, timeOfDay, salaryKind, salaryKind === "fixed" ? amount : null,
      genderPref, tutorFrom.join(","), requirements, startNote, postedAt, studentGender, closedAt, closedAt,
      classLevel === "other" ? text("class_other") || null : null, subjects.includes("other") ? text("subject_other") || null : null,
      window.time_from, window.time_to, asks.join(","), code),
    // The private address details sit with the guardian's row, never on the public tuition.
    ...(form.has("exact_address") ? [env.DB.prepare(`UPDATE tuition_private SET exact_address = ?, updated_at = ? WHERE tuition_code = ?`).bind(text("exact_address").slice(0, 200) || null, t, code)] : []),
    audit(actorId, "tuition_updated", "tuition", String(code), { status, is_public: publish }),
  ]);
  return null;
}


// One-tap changes from the tuition page (owner, 2026-11-04: fewer steps than status + tick boxes + Save).
export const TUITION_OPS = ["publish", "pause", "resume", "hide", "close", "cancel", "reopen"] as const;
export type TuitionOp = (typeof TUITION_OPS)[number];

export async function setTuitionState(code: number, op: string, actorId: number | null): Promise<string | null> {
  const t = await env.DB.prepare(`SELECT code, status, is_public, accepting_applications, class_level, area, medium, subjects, posted_at FROM tuitions WHERE code = ?`)
    .bind(code).first<{ code: number; status: string; is_public: number; accepting_applications: number; class_level: string; area: string; medium: string; subjects: string; posted_at: number | null }>();
  if (!t) return "Tuition not found.";
  const at = now();
  const open = t.status === "available" || t.status === "processing";
  let sql: string;
  let args: unknown[];
  switch (op) {
    case "publish": {
      const gaps = publishGaps(t);
      if (gaps.length) return `Fill in first: ${gaps.join(", ")}.`;
      if (!["draft", "available", "processing"].includes(t.status)) return "Re-open this tuition first.";
      sql = `UPDATE tuitions SET status = CASE WHEN status = 'draft' THEN 'available' ELSE status END, is_public = 1, accepting_applications = 1,
             posted_at = COALESCE(posted_at, ?), closed_at = NULL WHERE code = ?`;
      args = [at, code];
      break;
    }
    case "pause":
    case "resume":
      if (!open || !t.is_public) return "Only a tuition on the board takes applications.";
      sql = `UPDATE tuitions SET accepting_applications = ? WHERE code = ?`;
      args = [op === "resume" ? 1 : 0, code];
      break;
    case "hide":
      sql = `UPDATE tuitions SET is_public = 0, accepting_applications = 0 WHERE code = ?`;
      args = [code];
      break;
    case "close":
    case "cancel":
      if (!TUITION_MOVES[t.status]?.includes(op === "close" ? "closed" : "cancelled")) return "Can't do that from this status.";
      sql = `UPDATE tuitions SET status = ?, is_public = 0, accepting_applications = 0, closed_at = ? WHERE code = ?`;
      args = [op === "close" ? "closed" : "cancelled", at, code];
      break;
    case "reopen":
      if (t.status !== "booked" && t.status !== "processing") return "Only a booked or processing tuition can be re-opened.";
      sql = `UPDATE tuitions SET status = 'available', closed_at = NULL WHERE code = ?`;
      args = [code];
      break;
    default:
      return "Unknown action.";
  }
  try {
    await env.DB.batch([env.DB.prepare(sql).bind(...args), audit(actorId, `tuition_${op}`, "tuition", String(code), { from: t.status })]);
    return null;
  } catch {
    return "Can't do that from this status.";
  }
}

/**
 * A tuition typed straight in by the admin (owner, 2026-11-04: "post the tuition when a new guardian comes"): the
 * guardian is found or added by phone, and the tuition is saved as a draft or published at once.
 */
export async function createTuition(form: FormData, actorId: number | null): Promise<{ code?: number; error?: string }> {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const phone = text("guardian_phone").replace(/[\s-]/g, "").replace(/^\+?88/, "");
  if (!/^01[3-9]\d{8}$/.test(phone)) return { error: "Enter the guardian's phone (01XXXXXXXXX)." };
  const source = text("lead_source");
  if (source && !LEAD_SOURCES.some((s) => s.key === source)) return { error: "Source not valid." };
  const problem = tuitionFieldsProblem(form);
  if (problem) return { error: problem };
  const at = now();
  const code = `(SELECT MAX(code) FROM tuitions)`;
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO guardians (phone, name, created_at) VALUES (?, ?, ?)`).bind(phone, text("guardian_name") || null, at),
    env.DB.prepare(
      `INSERT INTO tuitions (code, status, is_public, class_level, medium, subjects, area, salary_kind, days_per_week, tutor_gender_pref)
       SELECT COALESCE(MAX(code), 0) + 1, 'draft', 0, 'other', '', '', '', 'unspecified', 3, 'any' FROM tuitions`,
    ),
    env.DB.prepare(
      `INSERT INTO tuition_private (tuition_code, guardian_id, guardian_label, exact_address, lead_source, private_notes, created_at, updated_at)
       VALUES (${code}, (SELECT id FROM guardians WHERE phone = ?), ?, ?, ?, ?, ?, ?)`,
    ).bind(phone, text("guardian_name") || null, text("exact_address") || null, source || null, text("private_notes") || null, at, at),
    env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, 'tuition_created', 'tuition', ${code}, '{}', ?)`).bind(actorId, at),
  ]);
  const made = (await env.DB.prepare(`SELECT MAX(code) code FROM tuitions`).first<{ code: number }>())?.code;
  if (!made) return { error: "Couldn't save. Try again." };
  // The details go through the same checks as every edit; the draft above only holds the guardian.
  const details = new FormData();
  for (const [k, v] of form.entries()) details.append(k, v);
  details.set("status", "draft");
  details.delete("is_public");
  const error = await updateTuition(made, details, actorId);
  if (error) return { code: made, error };
  if (form.get("publish") === "1") {
    const problem = await setTuitionState(made, "publish", actorId);
    if (problem) return { code: made, error: `Saved as a draft. ${problem}` };
  }
  return { code: made };
}

function audit(actorId: number | null, action: string, entityType: string, entityId: string, meta: unknown) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(actorId, action, entityType, entityId, JSON.stringify(meta), now());
}

/** One step along the ladder. Confirming also books the tuition and closes the other applications. */
export async function moveApplication(id: number, to: string, reason: string, actorId: number | null): Promise<string | null> {
  const app = await env.DB.prepare(`SELECT id, tuition_code, tutor_id, status FROM applications WHERE id = ?`).bind(id).first<{ id: number; tuition_code: number; tutor_id: number | null; status: string }>();
  if (!app) return "Application not found.";
  const t = now();
  const steps = [
    env.DB.prepare(`UPDATE applications SET status = ?, updated_at = ? WHERE id = ?`).bind(to, t, id),
    env.DB.prepare(`INSERT INTO application_events (application_id, from_status, to_status, actor_user_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, app.status, to, actorId, reason || null, t),
    audit(actorId, "application_moved", "application", String(id), { from: app.status, to }),
  ];
  // Selecting a tutor takes the tuition off the open list while the match is tried (owner, 2026-11-04).
  if (to === "trial_arranged" && app.status === "shortlisted") {
    steps.push(env.DB.prepare(`UPDATE tuitions SET status = 'processing' WHERE code = ? AND status = 'available'`).bind(app.tuition_code));
  }
  // A match that didn't work out (owner, 2026-11-04): the tuition goes back to Processing for the next tutor.
  if ((app.status === "trial_arranged" || app.status === "confirmed") && to === "not_selected") {
    steps.push(
      env.DB.prepare(`UPDATE placements SET status = 'cancelled', updated_at = ? WHERE application_id = ? AND status IN ('selected', 'confirmed')`).bind(t, id),
      env.DB.prepare(`UPDATE tuitions SET status = 'processing', closed_at = NULL WHERE code = ? AND status = 'booked'`).bind(app.tuition_code),
    );
  }
  // Undoing a Confirmed (a tutor's tick the admin does not accept): back to Selected and the tuition to Processing.
  // Applicants already closed stay closed; they can apply again.
  if (app.status === "confirmed" && to === "trial_arranged") {
    steps.push(
      env.DB.prepare(`UPDATE placements SET status = 'cancelled', updated_at = ? WHERE application_id = ? AND status = 'confirmed'`).bind(t, id),
      env.DB.prepare(`UPDATE tuitions SET status = 'processing', closed_at = NULL WHERE code = ? AND status = 'booked'`).bind(app.tuition_code),
    );
  }
  if (to === "confirmed") {
    if (app.tutor_id === null) return "Match the applicant to a tutor before confirming.";
    steps.push(
      env.DB.prepare(
        `INSERT INTO application_events (application_id, from_status, to_status, reason, created_at)
         SELECT id, status, 'opportunity_closed', 'another tutor confirmed', ? FROM applications
         WHERE tuition_code = ? AND id <> ? AND status IN ${ACTIVE_APPLICATIONS}`,
      ).bind(t, app.tuition_code, id),
      env.DB.prepare(`UPDATE applications SET status = 'opportunity_closed', updated_at = ? WHERE tuition_code = ? AND id <> ? AND status IN ${ACTIVE_APPLICATIONS}`).bind(t, app.tuition_code, id),
      env.DB.prepare(
        `INSERT INTO placements (tuition_code, application_id, tutor_id, status, confirmed_at, created_at, updated_at) VALUES (?, ?, ?, 'confirmed', ?, ?, ?)
         ON CONFLICT (application_id) DO UPDATE SET status = 'confirmed', confirmed_at = excluded.confirmed_at, updated_at = excluded.updated_at`,
      ).bind(app.tuition_code, id, app.tutor_id, t, t, t),
      env.DB.prepare(`UPDATE tuitions SET status = 'booked', is_public = 0, accepting_applications = 0, closed_at = ? WHERE code = ? AND status IN ('available', 'processing')`).bind(t, app.tuition_code),
    );
  }
  try {
    await env.DB.batch(steps);
    return null;
  } catch {
    return "Can't move to that step."; // the trigger refused the move
  }
}

// ---------- Tutors ----------

export type AdminTutorRow = {
  id: number; code: number; full_name: string; gender: string | null; phone: string; institution: string | null; department: string | null; session_year: string | null;
  current_location: string | null; priority: string | null; claim_status: string; applications: number; placements: number;
  photo_key?: string | null; university?: string | null; setup_done_at?: number | null; availability_paused?: number; last_applied?: number | null; flag_reason?: string | null;
  review_status?: "waiting" | "needs_fix" | "approved";
};

export async function listTutors(f: { q: string; gender: string; subject: string; band: string; page: number; university?: string; state?: string; area?: string; sort?: string }) {
  const where = ["t.deleted_at IS NULL"];
  const args: unknown[] = [];
  if (f.gender) { where.push("t.gender = ?"); args.push(f.gender); }
  if (f.university) { where.push("t.university = ?"); args.push(f.university); }
  if (f.state === "setup") where.push("t.setup_done_at IS NOT NULL");
  if (f.state === "paused") where.push("t.availability_paused = 1");
  if (f.state === "placed") where.push("EXISTS (SELECT 1 FROM placements p WHERE p.tutor_id = t.id AND p.status IN ('confirmed', 'joined'))");
  if (f.state === "active") where.push("EXISTS (SELECT 1 FROM applications a WHERE a.tutor_id = t.id AND a.created_at > unixepoch() - 30 * 86400)");
  if (f.state === "flagged") where.push("t.flag_reason IS NOT NULL");
  if (f.state === "new") where.push("t.review_status <> 'approved'");
  if (f.area) { where.push("(t.anywhere = 1 OR EXISTS (SELECT 1 FROM tutor_areas ar WHERE ar.tutor_id = t.id AND ar.area = ?))"); args.push(f.area); }
  if (f.subject) {
    where.push(`EXISTS (SELECT 1 FROM tutor_subjects s WHERE s.tutor_id = t.id AND s.subject = ?${f.band ? " AND s.band = ?" : ""})`);
    args.push(f.subject);
    if (f.band) args.push(f.band);
  }
  if (f.q) {
    const l = like(f.q);
    where.push(`(t.full_name LIKE ? OR t.email LIKE ? OR t.phone LIKE ? OR t.alt_phone LIKE ? OR t.institution LIKE ? OR t.department LIKE ? OR t.current_location LIKE ? OR t.code = ?)`);
    args.push(l, l, l, l, l, l, l, Number(f.q) || -1);
  }
  const from = `FROM tutors t WHERE ${where.join(" AND ")}`;
  const [total, items] = await Promise.all([
    count(`SELECT count(*) n ${from}`, ...args),
    all<AdminTutorRow>(
      `SELECT t.id, t.code, t.full_name, t.gender, t.phone, t.institution, t.department, t.session_year, t.current_location, t.priority, t.claim_status,
              t.photo_key, t.university, t.setup_done_at, t.availability_paused, t.flag_reason, t.review_status,
              (SELECT count(*) FROM applications a WHERE a.tutor_id = t.id) applications,
              (SELECT max(a.created_at) FROM applications a WHERE a.tutor_id = t.id) last_applied,
              (SELECT count(*) FROM placements p WHERE p.tutor_id = t.id AND p.status IN ('confirmed', 'joined', 'ended')) placements
       ${from} ORDER BY ${f.sort === "active" ? "last_applied DESC NULLS LAST" : f.sort === "placed" ? "placements DESC, t.code DESC" : "t.code DESC"} LIMIT ? OFFSET ?`,
      ...args, PAGE_SIZE, pageOffset(f.page),
    ),
  ]);
  return { total, items };
}

export type TutorFull = AdminTutorRow & {
  email: string | null; alt_phone: string | null; facebook_url: string | null; photo_source_url: string | null; photo_key: string | null; ssc_school: string | null; ssc_year: number | null; ssc_result: string | null;
  ssc_group: string | null; hsc_college: string | null; hsc_year: number | null; hsc_result: string | null; hsc_group: string | null; mediums: string | null; home_division: string | null;
  home_district: string | null; demo_willing: number | null; transport: string | null; referral_code: string | null; registered_at: number | null;
  university: string | null; min_salary: number | null; anywhere: number; setup_done_at: number | null; availability_paused: number; about: string | null;
  flag_reason: string | null; user_id: number | null;
  review_status: "waiting" | "needs_fix" | "approved"; review_note: string | null; reviewed_at: number | null; created_via: string; created_at: number;
  skills: string | null; demo_video_url: string | null;
};

export async function getTutor(code: number) {
  const tutor = await env.DB.prepare(`SELECT t.*, 0 applications, 0 placements FROM tutors t WHERE t.code = ? AND t.deleted_at IS NULL`).bind(code).first<TutorFull>();
  if (!tutor) return null;
  const [subjects, statements, applications, placements, areas, classes, levels, students] = await Promise.all([
    all<{ band: string; subject: string }>(`SELECT band, subject FROM tutor_subjects WHERE tutor_id = ?`, tutor.id),
    all<{ kind: string; body: string }>(`SELECT kind, body FROM tutor_statements WHERE tutor_id = ?`, tutor.id),
    all<{ id: number; tuition_code: number; status: string; created_at: number; updated_at: number; class_level: string; area: string; salary_amount: number | null; salary_kind: string }>(
      `SELECT a.id, a.tuition_code, a.status, a.created_at, a.updated_at, t.class_level, t.area, t.salary_amount, t.salary_kind FROM applications a JOIN tuitions t ON t.code = a.tuition_code
       WHERE a.tutor_id = ? ORDER BY a.created_at DESC LIMIT 100`, tutor.id,
    ),
    all<{ tuition_code: number; status: string; confirmed_at: number | null; agreed_salary: number | null }>(`SELECT tuition_code, status, confirmed_at, agreed_salary FROM placements WHERE tutor_id = ? ORDER BY id DESC`, tutor.id),
    all<{ area: string }>(`SELECT area FROM tutor_areas WHERE tutor_id = ?`, tutor.id),
    all<{ class_level: string }>(`SELECT class_level FROM tutor_classes WHERE tutor_id = ?`, tutor.id),
    all<Level>(`SELECT band, students, years, approach, story, makes_notes, takes_tests, gives_homework, reports_guardian FROM tutor_levels WHERE tutor_id = ?
                ORDER BY CASE band WHEN 'junior' THEN 1 WHEN 'ssc' THEN 2 ELSE 3 END`, tutor.id),
    all<Student>(`SELECT id, class_level, class_other, area, subjects, started, ended, result_before, result_after, improvement FROM tutor_students
                  WHERE tutor_id = ? ORDER BY COALESCE(ended, '9999-12') DESC, started DESC, id DESC`, tutor.id),
  ]);
  return { tutor, subjects, statements, applications, placements, levels, students, areas: areas.map((a) => a.area), classes: classes.map((c) => c.class_level) };
}

// ---------- Guardians ----------

export async function listGuardians(f: { q: string; page: number }) {
  const where = f.q ? `WHERE g.phone LIKE ? OR g.name LIKE ?` : "";
  const args = f.q ? [like(f.q.replace(/[\s-]/g, "")), like(f.q)] : [];
  const [total, items] = await Promise.all([
    count(`SELECT count(*) n FROM guardians g ${where}`, ...args),
    all<{ id: number; phone: string; name: string | null; label: string | null; tuitions: number; last_code: number | null }>(
      `SELECT g.id, g.phone, g.name,
              (SELECT guardian_label FROM tuition_private p WHERE p.guardian_id = g.id AND guardian_label IS NOT NULL ORDER BY tuition_code DESC LIMIT 1) label,
              (SELECT count(*) FROM tuition_private p WHERE p.guardian_id = g.id) tuitions,
              (SELECT max(tuition_code) FROM tuition_private p WHERE p.guardian_id = g.id) last_code
       FROM guardians g ${where} ORDER BY tuitions DESC, last_code DESC LIMIT ? OFFSET ?`,
      ...args, PAGE_SIZE, pageOffset(f.page),
    ),
  ]);
  return { total, items };
}

export async function getGuardian(id: number) {
  const guardian = await env.DB.prepare(`SELECT id, phone, alt_phone, name, notes, flag_reason FROM guardians WHERE id = ?`).bind(id).first<{ id: number; phone: string; alt_phone: string | null; name: string | null; notes: string | null; flag_reason: string | null }>();
  if (!guardian) return null;
  const tuitions = await all<{ code: number; status: string; class_level: string; area: string; label: string | null; exact_address: string | null }>(
    `SELECT t.code, t.status, t.class_level, t.area, p.guardian_label label, p.exact_address FROM tuition_private p JOIN tuitions t ON t.code = p.tuition_code
     WHERE p.guardian_id = ? ORDER BY t.code DESC`, id,
  );
  return { guardian, tuitions };
}

// ---------- Applications ----------

export async function listApplications(f: { status: string; open: boolean; page: number }) {
  const where = ["1 = 1"];
  const args: unknown[] = [];
  if (f.status) { where.push("a.status = ?"); args.push(f.status); }
  if (f.open) where.push(`t.status IN ('available', 'processing')`);
  const from = `FROM applications a JOIN tuitions t ON t.code = a.tuition_code LEFT JOIN tutors u ON u.id = a.tutor_id WHERE ${where.join(" AND ")}`;
  const [total, items] = await Promise.all([
    count(`SELECT count(*) n ${from}`, ...args),
    all<{ id: number; tuition_code: number; status: string; created_at: number; name: string | null; tutor_code: number | null; class_level: string; area: string; photo_key: string | null; department: string | null; university: string | null }>(
      `SELECT a.id, a.tuition_code, a.status, a.created_at, COALESCE(u.full_name, a.applicant_name) name, u.code tutor_code, t.class_level, t.area, u.photo_key, u.department, u.university
       ${from} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      ...args, PAGE_SIZE, pageOffset(f.page),
    ),
  ]);
  return { total, items };
}

// ---------- Review ----------

export type ReviewRow = { id: number; tab: string; row_no: number; legacy_ref: string | null; issues: string | null; raw_json: string };

export async function reviewList(f: { tab: string; page: number }) {
  const tabs = f.tab ? [f.tab] : ["registration", "admin", "old"];
  const marks = tabs.map(() => "?").join(",");
  const [total, rows, dependents, issueRows] = await Promise.all([
    count(`SELECT count(*) n FROM import_rows WHERE status = 'needs_review' AND tab IN (${marks})`, ...tabs),
    all<ReviewRow>(`SELECT id, tab, row_no, legacy_ref, issues, raw_json FROM import_rows WHERE status = 'needs_review' AND tab IN (${marks}) ORDER BY tab, row_no LIMIT ? OFFSET ?`, ...tabs, PAGE_SIZE, pageOffset(f.page)),
    count(`SELECT count(*) n FROM import_rows WHERE status = 'needs_review' AND tab IN ('application', 'placement')`),
    all<{ issues: string | null }>(`SELECT issues FROM import_rows WHERE status = 'needs_review' AND tab IN ('registration', 'admin', 'old')`),
  ]);
  const issueCounts: Record<string, number> = {};
  for (const r of issueRows) for (const i of (r.issues ?? "").split(",")) if (i) issueCounts[i] = (issueCounts[i] ?? 0) + 1;
  // Only a short label leaves the server; the held record itself stays private until it is fixed in the sheet.
  const items = rows.map(({ raw_json, ...r }) => {
    const raw = JSON.parse(raw_json) as { tutor?: { full_name?: string }; private?: { raw?: { class?: string; location?: string } } };
    return { ...r, title: raw.tutor?.full_name || [raw.private?.raw?.class, raw.private?.raw?.location].filter(Boolean).join(" · ") || "" };
  });
  return { total, items, dependents, issueCounts };
}

// The owner's review list after an import (docs/DECISIONS.md, 2026-11-03): flagged tutors, open tuitions not yet on the
// board, and sheet rows still held back. Old tuitions and unmatched applications are left as the import guessed.

const OPEN_UNPUBLISHED = `status IN ('available', 'processing') AND is_public = 0`;

export async function reviewCounts() {
  const [tutors, tuitions, held] = await Promise.all([
    count(`SELECT count(*) n FROM import_rows WHERE status = 'needs_review' AND tab = 'tutor_flag'`),
    count(`SELECT count(*) n FROM tuitions WHERE ${OPEN_UNPUBLISHED}`),
    count(`SELECT count(*) n FROM import_rows WHERE status = 'needs_review' AND tab IN ('registration', 'admin', 'old')`),
  ]);
  return { tutors, tuitions, held };
}

export type FlaggedTutor = { id: number; issues: string | null; code: number; full_name: string; email: string | null; phone: string };

export async function flaggedTutors(page: number) {
  const [total, items] = await Promise.all([
    count(`SELECT count(*) n FROM import_rows WHERE status = 'needs_review' AND tab = 'tutor_flag'`),
    all<FlaggedTutor>(
      `SELECT r.id, r.issues, t.code, t.full_name, t.email, t.phone FROM import_rows r JOIN tutors t ON t.code = CAST(r.legacy_ref AS INTEGER)
       WHERE r.status = 'needs_review' AND r.tab = 'tutor_flag' ORDER BY t.code LIMIT ? OFFSET ?`,
      PAGE_SIZE, pageOffset(page),
    ),
  ]);
  return { total, items };
}

export type TuitionToReview = {
  code: number; status: string; class_level: string; area: string; medium: string; subjects: string; requirements_public: string;
  session_minutes: number | null; posted_at: number | null; applications: number;
};

/** What still stops an open tuition from going on the board, in the editor's words. */
export function tuitionGaps(t: TuitionToReview): string[] {
  const gaps = [];
  if (!CLASS_CHOICES.some((c) => c.key === t.class_level)) gaps.push("Class");
  if (!AREAS.some((a) => a.key === t.area)) gaps.push("Area");
  if (!t.medium) gaps.push("Medium");
  if (!t.subjects) gaps.push("Subjects");
  if (!t.requirements_public) gaps.push("Tutor requirement");
  if (!t.session_minutes) gaps.push("Time");
  return gaps;
}

export async function tuitionsToReview(page: number) {
  const [total, items] = await Promise.all([
    count(`SELECT count(*) n FROM tuitions WHERE ${OPEN_UNPUBLISHED}`),
    all<TuitionToReview>(
      `SELECT t.code, t.status, t.class_level, t.area, t.medium, t.subjects, t.requirements_public, t.session_minutes, t.posted_at,
              (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code AND a.status IN ${ACTIVE_APPLICATIONS}) applications
       FROM tuitions t WHERE ${OPEN_UNPUBLISHED} ORDER BY t.code DESC LIMIT ? OFFSET ?`,
      PAGE_SIZE, pageOffset(page),
    ),
  ]);
  return { total, items: items.map((t) => ({ ...t, gaps: tuitionGaps(t), legacyClass: CLASS_LEVELS.some((c) => c.legacy && c.key === t.class_level) })) };
}

/** Marks a flagged tutor as checked. With an email, fixes it first (the tutor signs in with Google by this address). */
export async function resolveFlaggedTutor(rowId: number, email: string, actorId: number | null): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT legacy_ref FROM import_rows WHERE id = ? AND tab = 'tutor_flag' AND status = 'needs_review'`)
    .bind(rowId).first<{ legacy_ref: string }>();
  if (!row) return "No longer on the review list.";
  const code = Number(row.legacy_ref);
  const steps = [];
  const fixed = email.trim().toLowerCase();
  if (fixed) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fixed)) return "Email not valid.";
    const taken = await count(`SELECT count(*) n FROM tutors WHERE email = ? AND code <> ? AND deleted_at IS NULL`, fixed, code);
    if (taken) return "Another tutor has this email.";
    steps.push(env.DB.prepare(`UPDATE tutors SET email = ?, updated_at = ? WHERE code = ?`).bind(fixed, now(), code));
  }
  steps.push(
    env.DB.prepare(`UPDATE import_rows SET status = 'approved' WHERE id = ?`).bind(rowId),
    audit(actorId, "tutor_flag_resolved", "tutor", String(code), { email_changed: !!fixed }),
  );
  await env.DB.batch(steps);
  return null;
}

// ---------- Shell: sidebar counts and search ----------

/** The small numbers beside the admin's menu items: what is waiting in each place. */
export async function navCounts() {
  const row = await env.DB.prepare(
    `SELECT (SELECT count(*) FROM leads WHERE status = 'new') leads,
            (SELECT count(*) FROM applications a JOIN tuitions t ON t.code = a.tuition_code
              WHERE a.status = 'submitted' AND t.status IN ('available', 'processing')) applications,
            (SELECT count(*) FROM tuitions WHERE status IN ('available', 'processing')) open,
            (SELECT count(*) FROM applications WHERE status = 'trial_arranged') selected,
            (SELECT count(*) FROM tutors WHERE review_status = 'waiting' AND deleted_at IS NULL) new_tutors`,
  ).first<{ leads: number; applications: number; open: number; selected: number; new_tutors: number }>();
  const review = await reviewCounts();
  return { ...(row ?? { leads: 0, applications: 0, open: 0, selected: 0, new_tutors: 0 }), review: review.tutors + review.tuitions + review.held };
}

export type SearchHit = { kind: "tuition" | "tutor" | "guardian" | "lead"; to: string; title: string; sub: string; photo?: { code: number; has: boolean } };

/** One box for everything (admin search): a tuition or tutor code, a name, a phone number or an area. */
export async function globalSearch(raw: string): Promise<SearchHit[]> {
  const q = raw.trim();
  if (q.length < 2 && !/^\d+$/.test(q)) return [];
  const digits = q.replace(/\D/g, "");
  const l = like(q);
  const phone = digits.length >= 5 ? like(digits) : null;
  const code = digits && digits.length <= 6 ? Number(digits) : -1;
  const [tuitions, tutors, guardians] = await Promise.all([
    all<{ code: number; status: string; class_level: string; area: string; salary_amount: number | null }>(
      `SELECT t.code, t.status, t.class_level, t.area, t.salary_amount FROM tuitions t
       LEFT JOIN tuition_private p ON p.tuition_code = t.code LEFT JOIN guardians g ON g.id = p.guardian_id
       WHERE t.code = ? ${phone ? "OR g.phone LIKE ?" : ""} ORDER BY t.code DESC LIMIT 5`,
      code, ...(phone ? [phone] : []),
    ),
    all<{ code: number; full_name: string; institution: string | null; department: string | null; photo_key: string | null }>(
      `SELECT code, full_name, institution, department, photo_key FROM tutors WHERE deleted_at IS NULL
       AND (code = ? OR full_name LIKE ? ${phone ? "OR phone LIKE ? OR alt_phone LIKE ?" : ""} OR email LIKE ?) ORDER BY code DESC LIMIT 6`,
      code, l, ...(phone ? [phone, phone] : []), l,
    ),
    all<{ id: number; phone: string; name: string | null }>(
      `SELECT id, phone, name FROM guardians WHERE name LIKE ? ${phone ? "OR phone LIKE ?" : ""} ORDER BY id DESC LIMIT 4`,
      l, ...(phone ? [phone] : []),
    ),
  ]);
  const areaKeys = AREAS.filter((a) => `${a.label} ${a.alt ?? ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 2);
  const label = (list: { key: string; label: string }[], key: string) => list.find((o) => o.key === key)?.label ?? key;
  return [
    ...tuitions.map((t): SearchHit => ({ kind: "tuition", to: `/admin/tuitions/${t.code}`, title: `HTR-${t.code}`, sub: [label(CLASS_LEVELS, t.class_level), label(AREAS, t.area), t.salary_amount ? `৳${t.salary_amount.toLocaleString("en-IN")}` : ""].filter(Boolean).join(" · ") })),
    ...tutors.map((t): SearchHit => ({ kind: "tutor", to: `/admin/tutors/${t.code}`, title: t.full_name, sub: [`T-${t.code}`, t.institution, t.department].filter(Boolean).join(" · "), photo: { code: t.code, has: !!t.photo_key } })),
    ...guardians.map((g): SearchHit => ({ kind: "guardian", to: `/admin/guardians/${g.id}`, title: g.name || "Guardian", sub: g.phone })),
    ...areaKeys.map((a): SearchHit => ({ kind: "lead", to: `/admin/tuitions?q=${encodeURIComponent(a.label)}`, title: `Tuitions in ${a.label}`, sub: "Area" })),
  ];
}

// ---------- Dashboard numbers ----------

const WEEK = 7 * 86400;

/** Counts per week, oldest first, for the last `weeks` weeks (week 0 = the last 7 days). */
async function weekly(sql: string, weeks: number): Promise<number[]> {
  const since = now() - weeks * WEEK;
  const rows = await all<{ w: number; n: number }>(`SELECT CAST((?1 - ts) / ${WEEK} AS INTEGER) w, count(*) n FROM (${sql}) WHERE ts > ?2 GROUP BY w`, now(), since);
  const out = Array(weeks).fill(0);
  for (const r of rows) if (r.w >= 0 && r.w < weeks) out[weeks - 1 - r.w] = r.n;
  return out;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** The admin's pulse: weekly flow, this week against last, how fast tuitions book, and where demand is. */
export async function pulse(weeks = 12) {
  const [posted, booked, applications, leads, tutors, speed, areas, funnel, open] = await Promise.all([
    weekly(`SELECT posted_at ts FROM tuitions WHERE posted_at IS NOT NULL`, weeks),
    weekly(`SELECT confirmed_at ts FROM placements WHERE confirmed_at IS NOT NULL AND status IN ('confirmed', 'joined', 'ended')`, weeks),
    weekly(`SELECT created_at ts FROM applications`, weeks),
    weekly(`SELECT created_at ts FROM leads`, weeks),
    weekly(`SELECT COALESCE(registered_at, created_at) ts FROM tutors WHERE deleted_at IS NULL`, weeks),
    all<{ hours: number }>(
      `SELECT (p.confirmed_at - t.posted_at) / 3600.0 hours FROM placements p JOIN tuitions t ON t.code = p.tuition_code
       WHERE p.confirmed_at > ? AND t.posted_at IS NOT NULL AND p.confirmed_at > t.posted_at`, now() - 90 * 86400,
    ),
    all<{ area: string; n: number; booked: number }>(
      `SELECT area, count(*) n, sum(status = 'booked') booked FROM tuitions WHERE posted_at > ? AND mode = 'home' GROUP BY area ORDER BY n DESC LIMIT 8`, now() - 30 * 86400,
    ),
    env.DB.prepare(
      `SELECT count(*) posted,
              sum(EXISTS (SELECT 1 FROM applications a WHERE a.tuition_code = t.code)) applied,
              sum(EXISTS (SELECT 1 FROM application_events e JOIN applications a ON a.id = e.application_id WHERE a.tuition_code = t.code AND e.to_status = 'shortlisted')) shortlisted,
              sum(EXISTS (SELECT 1 FROM application_events e JOIN applications a ON a.id = e.application_id WHERE a.tuition_code = t.code AND e.to_status = 'trial_arranged')) selected,
              sum(t.status = 'booked') booked
       FROM tuitions t WHERE t.posted_at > ?`,
    ).bind(now() - 30 * 86400).first<{ posted: number; applied: number; shortlisted: number; selected: number; booked: number }>(),
    count(`SELECT count(*) n FROM tuitions WHERE status = 'available' AND is_public = 1`),
  ]);
  const hours = median(speed.map((s) => s.hours));
  return { weeks, posted, booked, applications, leads, tutors, bookHours: hours === null ? null : Math.round(hours), areas, funnel, open };
}

/** Longer-range numbers for the Insights page. */
export async function insights() {
  const since = now() - 90 * 86400;
  const [base, classes, sources, universities, salary, active] = await Promise.all([
    pulse(26),
    all<{ class_level: string; n: number }>(`SELECT class_level, count(*) n FROM tuitions WHERE posted_at > ? GROUP BY class_level ORDER BY n DESC LIMIT 10`, since),
    all<{ lead_source: string | null; n: number }>(`SELECT lead_source, count(*) n FROM tuition_private p JOIN tuitions t ON t.code = p.tuition_code WHERE t.posted_at > ? GROUP BY lead_source ORDER BY n DESC`, since),
    all<{ university: string | null; n: number; setup: number }>(`SELECT university, count(*) n, sum(setup_done_at IS NOT NULL) setup FROM tutors WHERE deleted_at IS NULL GROUP BY university ORDER BY n DESC`),
    all<{ band: string; avg: number; n: number }>(
      `SELECT CASE WHEN class_level IN ('pre') OR class_level GLOB 'class-[1-8]' THEN 'Class 1–8'
                   WHEN class_level IN ('class-9', 'class-10', 'olevel') OR class_level LIKE 'ssc%' THEN 'SSC'
                   WHEN class_level IN ('class-11', 'class-12', 'alevel', 'admission') OR class_level LIKE 'hsc%' THEN 'HSC / Admission' ELSE 'Other' END band,
              round(avg(salary_amount)) avg, count(*) n
       FROM tuitions WHERE posted_at > ? AND salary_kind = 'fixed' AND salary_amount > 0 GROUP BY band ORDER BY avg`, since,
    ),
    count(`SELECT count(DISTINCT tutor_id) n FROM applications WHERE created_at > ? AND tutor_id IS NOT NULL`, now() - 30 * 86400),
  ]);
  return { ...base, classes, sources, universities, salary, active };
}

/** The do-not-place flag (owner, 2026-11-04): a private reason, warning only. An empty reason clears it. */
export async function setFlag(kind: "tutor" | "guardian", id: number, reason: string, actorId: number | null): Promise<string | null> {
  const text = reason.trim().slice(0, 300) || null;
  const table = kind === "tutor" ? "tutors" : "guardians";
  await env.DB.batch([
    env.DB.prepare(`UPDATE ${table} SET flag_reason = ? WHERE id = ?`).bind(text, id),
    // Its own entity type: a flag must never show up as a "profile changed" update on the tutor's Home.
    audit(actorId, text ? "flag_set" : "flag_cleared", `${kind}_flag`, String(id), {}),
  ]);
  return null;
}

/**
 * The owner's check of a registration made on the site (owner, 2026-11-04): approve, so the tutor can apply, or ask
 * for a fix with a note the tutor sees on Home. Audited under its own type so it never reads as a profile change.
 */
export async function reviewTutor(id: number, op: "approve" | "fix", note: string, actorId: number | null): Promise<string | null> {
  const text = note.trim().slice(0, 300);
  if (op === "fix" && text.length < 3) return "Write what the tutor should fix.";
  await env.DB.batch([
    env.DB.prepare(`UPDATE tutors SET review_status = ?, review_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`)
      .bind(op === "approve" ? "approved" : "needs_fix", op === "approve" ? null : text, now(), now(), id),
    audit(actorId, op === "approve" ? "tutor_approved" : "tutor_fix_asked", "tutor_review", String(id), op === "fix" ? { note: text } : {}),
  ]);
  return null;
}

/**
 * Sets the Google email a tutor signs in with, for one who registered before under another account (the phone check
 * on registration sends them to HTR). Only while no account is linked; the tutor then logs in again with that email.
 */
export async function setTutorEmail(id: number, raw: string, actorId: number | null): Promise<string | null> {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Write a valid email.";
  const row = await env.DB.prepare(`SELECT user_id FROM tutors WHERE id = ?`).bind(id).first<{ user_id: number | null }>();
  if (row?.user_id) return "This tutor already signs in with a Google account.";
  if (await count(`SELECT count(*) n FROM tutors WHERE email = ? AND id <> ? AND deleted_at IS NULL`, email, id)) return "Another tutor has this email.";
  await env.DB.batch([
    env.DB.prepare(`UPDATE tutors SET email = ?, updated_at = ? WHERE id = ?`).bind(email, now(), id),
    audit(actorId, "tutor_email_set", "tutor_review", String(id), {}),
  ]);
  return null;
}

// ---------- Placements: tracking selected tutors and the check-in calls ----------

export type InProgress = {
  application_id: number; tuition_code: number; class_level: string; area: string; salary_amount: number | null; salary_kind: string;
  tutor_code: number | null; name: string | null; photo_key: string | null; phone: string | null; selected_at: number | null;
  called_at: number | null; met_at: number | null; demo_done_at: number | null; guardian_phone: string | null;
};
export type Placed = {
  id: number; tuition_code: number; class_level: string; area: string; agreed_salary: number | null; salary_amount: number | null; confirmed_at: number;
  checkin7_at: number | null; checkin30_at: number | null; first_salary_at: number | null; checkin_note: string | null;
  tutor_code: number | null; name: string | null; photo_key: string | null; guardian_phone: string | null; guardian: string | null;
};

/** Check-in calls after Confirmed (owner, 2026-11-04): day 7 and day 30, each due until it is ticked. */
export async function placementsBoard() {
  const [inProgress, placed] = await Promise.all([
    all<InProgress>(
      `SELECT a.id application_id, a.tuition_code, t.class_level, t.area, t.salary_amount, t.salary_kind, u.code tutor_code, u.full_name name, u.photo_key,
              COALESCE(a.applicant_phone, u.phone) phone, a.called_at, a.met_at, a.demo_done_at, g.phone guardian_phone,
              (SELECT max(e.created_at) FROM application_events e WHERE e.application_id = a.id AND e.to_status = 'trial_arranged') selected_at
       FROM applications a JOIN tuitions t ON t.code = a.tuition_code LEFT JOIN tutors u ON u.id = a.tutor_id
       LEFT JOIN tuition_private p ON p.tuition_code = t.code LEFT JOIN guardians g ON g.id = p.guardian_id
       WHERE a.status = 'trial_arranged' ORDER BY selected_at DESC LIMIT 100`,
    ),
    all<Placed>(
      `SELECT pl.id, pl.tuition_code, t.class_level, t.area, pl.agreed_salary, t.salary_amount, pl.confirmed_at, pl.checkin7_at, pl.checkin30_at, pl.first_salary_at, pl.checkin_note,
              u.code tutor_code, u.full_name name, u.photo_key, g.phone guardian_phone, COALESCE(p.guardian_label, g.name) guardian
       FROM placements pl JOIN tuitions t ON t.code = pl.tuition_code LEFT JOIN tutors u ON u.id = pl.tutor_id
       LEFT JOIN tuition_private p ON p.tuition_code = t.code LEFT JOIN guardians g ON g.id = p.guardian_id
       WHERE pl.status IN ('confirmed', 'joined') AND pl.confirmed_at > ? ORDER BY pl.confirmed_at DESC LIMIT 200`,
      now() - 75 * 86400,
    ),
  ]);
  const t = now();
  const due7 = placed.filter((p) => !p.checkin7_at && t - p.confirmed_at >= 7 * 86400);
  const due30 = placed.filter((p) => !p.checkin30_at && t - p.confirmed_at >= 30 * 86400);
  return { inProgress, placed, due7, due30 };
}

/** Ticks a check-in call. Day 30 with "salary paid" also records the first salary (PRD BR-SAL-001). */
export async function checkIn(id: number, day: string, salaryPaid: boolean, note: string, actorId: number | null): Promise<string | null> {
  if (day !== "7" && day !== "30") return "Unknown check-in.";
  const column = day === "7" ? "checkin7_at" : "checkin30_at";
  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE placements SET ${column} = COALESCE(${column}, ?), first_salary_at = CASE WHEN ? THEN COALESCE(first_salary_at, ?) ELSE first_salary_at END,
              checkin_note = COALESCE(NULLIF(?, ''), checkin_note), updated_at = ? WHERE id = ?`,
    ).bind(t, salaryPaid ? 1 : 0, t, note.trim().slice(0, 500), t, id),
    audit(actorId, `checkin_${day}`, "placement", String(id), { salary_paid: salaryPaid }),
  ]);
  return null;
}

// ---------- Owner notice to tutors ----------

export async function currentNotice() {
  return env.DB.prepare(`SELECT id, body, ends_at FROM notices WHERE ends_at > ? ORDER BY created_at DESC LIMIT 1`).bind(now()).first<{ id: number; body: string; ends_at: number }>();
}

/** One notice at a time: a new one ends the old. `days` = how long it shows (1–30). */
export async function setNotice(body: string, days: number, actorId: number | null): Promise<string | null> {
  const text = body.trim();
  if (!text) return "Write the notice.";
  if (text.length > 300) return "Keep it under 300 characters.";
  if (!Number.isInteger(days) || days < 1 || days > 30) return "Show it for 1 to 30 days.";
  const t = now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE notices SET ends_at = ? WHERE ends_at > ?`).bind(t, t),
    env.DB.prepare(`INSERT INTO notices (body, ends_at, created_by, created_at) VALUES (?, ?, ?, ?)`).bind(text, t + days * 86400, actorId, t),
    audit(actorId, "notice_set", "notice", "all", { days }),
  ]);
  return null;
}

export async function endNotice(actorId: number | null) {
  const t = now();
  await env.DB.batch([env.DB.prepare(`UPDATE notices SET ends_at = ? WHERE ends_at > ?`).bind(t, t), audit(actorId, "notice_ended", "notice", "all", {})]);
}
