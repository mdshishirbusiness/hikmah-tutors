// Queries behind the admin screens. Private data: only routes under /admin that call requireAdmin may import this.
import { env } from "cloudflare:workers";
import { ADMIN_PAGE_SIZE, TUITION_MOVES } from "./admin-labels";
import { bandOf } from "./fit";
import { AREAS, CLASS_CHOICES, CLASS_LEVELS, MEDIUMS, SESSION_MINUTES, SUBJECTS, TIMES_OF_DAY, TUTOR_FROM } from "./options";

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
  const [leads, applications, drafts, selected, tutorConfirmed] = await Promise.all([
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
  ]);
  return { leads, applications, drafts, selected, tutorConfirmed };
}

// ---------- Leads ----------

export type AdminLead = {
  id: number; phone: string; guardian_name: string | null; class_level: string; medium: string | null; student_gender: string | null;
  tutor_gender: string | null; subjects: string | null; area: string; address: string | null; salary: number | null; days_per_week: number | null;
  notes: string | null; lead_source: string | null; status: string; created_at: number; tuitions: string | null;
};

export async function listLeads(status: string) {
  const [counts, items] = await Promise.all([
    all<{ status: string; n: number }>(`SELECT status, count(*) n FROM leads GROUP BY status`),
    all<AdminLead>(
      `SELECT l.id, l.phone, l.guardian_name, l.class_level, l.medium, l.student_gender, l.tutor_gender, l.subjects, l.area, l.address, l.salary,
              l.days_per_week, l.notes, l.lead_source, l.status, l.created_at,
              (SELECT group_concat(p.tuition_code) FROM tuition_private p WHERE p.lead_id = l.id) tuitions
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
                             student_gender, tutor_gender_pref)
       SELECT COALESCE(MAX(code), 0) + 1, 'draft', 0, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM tuitions`,
    ).bind(l.class_level, l.medium ?? "", l.subjects ?? "", areaKnown ? l.area : "", l.salary ? "fixed" : "unspecified", l.salary || null,
      l.days_per_week && l.days_per_week >= 1 && l.days_per_week <= 7 ? l.days_per_week : 3, l.student_gender, l.tutor_gender || "any"),
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
  const [total, items] = await Promise.all([
    count(`SELECT count(*) n ${from}`, ...args),
    all<AdminTuitionRow>(
      `SELECT t.code, t.status, t.is_public, t.class_level, t.subjects, t.area, t.salary_kind, t.salary_amount, t.tutor_gender_pref, t.posted_at,
              (SELECT count(*) FROM applications a WHERE a.tuition_code = t.code) applications
       ${from} ORDER BY t.code DESC LIMIT ? OFFSET ?`,
      ...args, PAGE_SIZE, pageOffset(f.page),
    ),
  ]);
  return { total, items };
}

export type TuitionFull = AdminTuitionRow & {
  medium: string; mode: string; salary_period: string; days_per_week: number; student_gender: string | null; accepting_applications: number;
  requirements_public: string; start_note: string; closed_at: number | null; session_minutes: number | null; time_of_day: string | null;
  tutor_from: string;
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
};

export async function getTuition(code: number) {
  const tuition = await env.DB.prepare(`SELECT t.*, 0 applications FROM tuitions t WHERE t.code = ?`).bind(code).first<TuitionFull>();
  if (!tuition) return null;
  const band = bandOf(tuition.class_level) ?? "";
  const [priv, applicants, placements] = await Promise.all([
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
              (SELECT body FROM tutor_statements st WHERE st.tutor_id = a.tutor_id AND st.kind = ?) experience
       FROM applications a LEFT JOIN tutors t ON t.id = a.tutor_id WHERE a.tuition_code = ? ORDER BY a.created_at`,
      band, band, tuition.subjects, band ? `${band}_experience` : "", code,
    ),
    all<{ id: number; status: string; tutor_id: number | null; tutor_name: string | null; legacy_tutor_name: string | null; legacy_tutor_phone: string | null }>(
      `SELECT p.id, p.status, p.tutor_id, t.full_name tutor_name, p.legacy_tutor_name, p.legacy_tutor_phone
       FROM placements p LEFT JOIN tutors t ON t.id = p.tutor_id WHERE p.tuition_code = ?`,
      code,
    ),
  ]);
  return { tuition, priv, applicants, placements };
}

/** Public wording must not carry contact details. Returns an error in Bangla, or null. */
function publicTextProblem(text: string): string | null {
  const digits = text.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[\s-]/g, "");
  if (/01[3-9]\d{8}/.test(digits)) return "Public text can't contain a phone number.";
  return null;
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

  if (status !== current.status && !TUITION_MOVES[current.status]?.includes(status)) return "Can't move to that status.";
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
  const problem = publicTextProblem(`${requirements} ${startNote}`);
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
              closed_at = CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(closed_at, ?) END
       WHERE code = ?`,
    ).bind(status, publish ? 1 : 0, publish && form.get("accepting") === "1" ? 1 : 0, medium, classLevel, subjects.join(","), area, days, sessionMinutes, timeOfDay, salaryKind, salaryKind === "fixed" ? amount : null,
      genderPref, tutorFrom.join(","), requirements, startNote, postedAt, closedAt, closedAt, code),
    audit(actorId, "tuition_updated", "tuition", String(code), { status, is_public: publish }),
  ]);
  return null;
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
};

export async function listTutors(f: { q: string; gender: string; subject: string; band: string; page: number }) {
  const where = ["t.deleted_at IS NULL"];
  const args: unknown[] = [];
  if (f.gender) { where.push("t.gender = ?"); args.push(f.gender); }
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
              (SELECT count(*) FROM applications a WHERE a.tutor_id = t.id) applications,
              (SELECT count(*) FROM placements p WHERE p.tutor_id = t.id) placements
       ${from} ORDER BY t.code DESC LIMIT ? OFFSET ?`,
      ...args, PAGE_SIZE, pageOffset(f.page),
    ),
  ]);
  return { total, items };
}

export type TutorFull = AdminTutorRow & {
  email: string | null; alt_phone: string | null; facebook_url: string | null; photo_source_url: string | null; photo_key: string | null; ssc_school: string | null; ssc_year: number | null; ssc_result: string | null;
  ssc_group: string | null; hsc_college: string | null; hsc_year: number | null; hsc_result: string | null; hsc_group: string | null; mediums: string | null; home_division: string | null;
  home_district: string | null; demo_willing: number | null; transport: string | null; referral_code: string | null; registered_at: number | null;
};

export async function getTutor(code: number) {
  const tutor = await env.DB.prepare(`SELECT t.*, 0 applications, 0 placements FROM tutors t WHERE t.code = ? AND t.deleted_at IS NULL`).bind(code).first<TutorFull>();
  if (!tutor) return null;
  const [subjects, statements, applications, placements] = await Promise.all([
    all<{ band: string; subject: string }>(`SELECT band, subject FROM tutor_subjects WHERE tutor_id = ?`, tutor.id),
    all<{ kind: string; body: string }>(`SELECT kind, body FROM tutor_statements WHERE tutor_id = ?`, tutor.id),
    all<{ id: number; tuition_code: number; status: string; created_at: number; class_level: string; area: string }>(
      `SELECT a.id, a.tuition_code, a.status, a.created_at, t.class_level, t.area FROM applications a JOIN tuitions t ON t.code = a.tuition_code
       WHERE a.tutor_id = ? ORDER BY a.created_at DESC LIMIT 100`, tutor.id,
    ),
    all<{ tuition_code: number; status: string }>(`SELECT tuition_code, status FROM placements WHERE tutor_id = ? ORDER BY id DESC`, tutor.id),
  ]);
  return { tutor, subjects, statements, applications, placements };
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
  const guardian = await env.DB.prepare(`SELECT id, phone, alt_phone, name, notes FROM guardians WHERE id = ?`).bind(id).first<{ id: number; phone: string; alt_phone: string | null; name: string | null; notes: string | null }>();
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
    all<{ id: number; tuition_code: number; status: string; created_at: number; name: string | null; tutor_code: number | null; class_level: string; area: string }>(
      `SELECT a.id, a.tuition_code, a.status, a.created_at, COALESCE(u.full_name, a.applicant_name) name, u.code tutor_code, t.class_level, t.area
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
