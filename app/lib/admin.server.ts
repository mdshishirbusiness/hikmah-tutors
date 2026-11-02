// Queries behind the admin screens. Private data: only routes under /admin that call requireAdmin may import this.
import { env } from "cloudflare:workers";
import { ADMIN_PAGE_SIZE, TUITION_MOVES } from "./admin-labels";
import { AREAS, CLASS_CHOICES, CLASS_LEVELS, MEDIUMS, SESSION_MINUTES, SUBJECTS, TIMES_OF_DAY } from "./options";

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
};
export type TuitionPrivate = {
  guardian_id: number | null; guardian_label: string | null; guardian_phone: string | null; exact_address: string | null; lead_source: string | null;
  private_notes: string | null; tutor_qualification: string | null; raw_json: string | null;
};
export type Applicant = {
  id: number; tutor_id: number | null; tutor_code: number | null; name: string | null; phone: string | null; gender: string | null; shortcode: string | null;
  location: string | null; note: string | null; fee_plan: string | null; status: string; created_at: number; subject_hits: number; priority: string | null; transport: string | null;
};

export async function getTuition(code: number) {
  const tuition = await env.DB.prepare(`SELECT t.*, 0 applications FROM tuitions t WHERE t.code = ?`).bind(code).first<TuitionFull>();
  if (!tuition) return null;
  const [priv, applicants, placements] = await Promise.all([
    env.DB.prepare(
      `SELECT p.guardian_id, p.guardian_label, g.phone guardian_phone, p.exact_address, p.lead_source, p.private_notes, p.tutor_qualification, p.raw_json
       FROM tuition_private p LEFT JOIN guardians g ON g.id = p.guardian_id WHERE p.tuition_code = ?`,
    ).bind(code).first<TuitionPrivate>(),
    all<Applicant>(
      `SELECT a.id, a.tutor_id, t.code tutor_code, COALESCE(t.full_name, a.applicant_name) name, COALESCE(a.applicant_phone, t.phone) phone,
              COALESCE(t.gender, a.applicant_gender) gender, COALESCE(a.applicant_shortcode, t.institution) shortcode, a.applicant_location location,
              a.note, a.fee_plan, a.status, a.created_at, t.priority, t.transport,
              (SELECT count(*) FROM tutor_subjects s WHERE s.tutor_id = a.tutor_id AND instr(',' || ? || ',', ',' || s.subject || ',') > 0) subject_hits
       FROM applications a LEFT JOIN tutors t ON t.id = a.tutor_id WHERE a.tuition_code = ? ORDER BY a.created_at`,
      tuition.subjects, code,
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
  if (/01[3-9]\d{8}/.test(digits)) return "সবার দেখার লেখায় ফোন নম্বর রাখা যাবে না।";
  return null;
}

export async function updateTuition(code: number, form: FormData, actorId: number | null): Promise<string | null> {
  const current = await env.DB.prepare(`SELECT status, posted_at FROM tuitions WHERE code = ?`).bind(code).first<{ status: string; posted_at: number | null }>();
  if (!current) return "টিউশনটি পাওয়া যায়নি।";

  const text = (name: string) => String(form.get(name) ?? "").trim();
  const status = text("status"), medium = text("medium"), classLevel = text("class_level"), area = text("area");
  const subjects = form.getAll("subjects").map(String).filter((s) => SUBJECTS.some((o) => o.key === s));
  const requirements = text("requirements_public"), startNote = text("start_note");
  const days = Number(text("days_per_week")), salaryKind = text("salary_kind"), amount = Number(text("salary_amount"));
  const genderPref = text("tutor_gender_pref"), publish = form.get("is_public") === "1";
  const sessionMinutes = Number(text("session_minutes")) || null, timeOfDay = text("time_of_day") || null;

  if (status !== current.status && !TUITION_MOVES[current.status]?.includes(status)) return "এই স্ট্যাটাসে নেওয়া যাবে না।";
  if (medium && !MEDIUMS.some((m) => m.key === medium)) return "মাধ্যম ঠিক নেই।";
  if (!CLASS_LEVELS.some((c) => c.key === classLevel)) return "ক্লাস বেছে নাও।";
  if (sessionMinutes !== null && !(SESSION_MINUTES as readonly number[]).includes(sessionMinutes)) return "সেশনের সময় ঠিক নেই।";
  if (timeOfDay !== null && !TIMES_OF_DAY.some((o) => o.key === timeOfDay)) return "কোন সময়ে, সেটা ঠিক নেই।";
  if (!AREAS.some((a) => a.key === area)) return "এলাকা বেছে নাও।";
  if (!Number.isInteger(days) || days < 1 || days > 7) return "সপ্তাহে দিন ১ থেকে ৭ এর মধ্যে হবে।";
  if (!["fixed", "negotiable", "unspecified"].includes(salaryKind)) return "বেতনের ধরন ঠিক নেই।";
  if (salaryKind === "fixed" && (!Number.isInteger(amount) || amount <= 0)) return "বেতনের অঙ্ক লেখো।";
  if (!["any", "male", "female"].includes(genderPref)) return "টিউটরের ধরন ঠিক নেই।";
  if (requirements.length > 500 || startNote.length > 100) return "লেখা বেশি লম্বা হয়ে গেছে।";
  const problem = publicTextProblem(`${requirements} ${startNote}`);
  if (problem) return problem;

  const open = status === "available" || status === "processing";
  if (publish && !open) return "শুধু খালি বা প্রক্রিয়াধীন টিউশন পাবলিক করা যায়।";
  if (publish && !medium) return "পাবলিক করার আগে মাধ্যম বেছে নাও।";
  if (publish && !subjects.length) return "পাবলিক করার আগে বিষয় বেছে নাও।";
  // Old range classes (৯ম–১০ম) can stay on hidden rows, but the board shows one class or one batch only.
  if (publish && !CLASS_CHOICES.some((c) => c.key === classLevel)) return "পাবলিক করার আগে নতুন তালিকা থেকে একটি ক্লাস বা ব্যাচ বেছে নাও।";

  const t = now();
  const postedAt = publish ? current.posted_at ?? t : current.posted_at;
  const closedAt = open || status === "draft" ? null : t;
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE tuitions SET status = ?, is_public = ?, accepting_applications = ?, medium = ?, class_level = ?, subjects = ?, area = ?, days_per_week = ?,
              session_minutes = ?, time_of_day = ?, salary_kind = ?, salary_amount = ?, tutor_gender_pref = ?, requirements_public = ?, start_note = ?, posted_at = ?,
              closed_at = CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(closed_at, ?) END
       WHERE code = ?`,
    ).bind(status, publish ? 1 : 0, publish && form.get("accepting") === "1" ? 1 : 0, medium, classLevel, subjects.join(","), area, days, sessionMinutes, timeOfDay, salaryKind, salaryKind === "fixed" ? amount : null,
      genderPref, requirements, startNote, postedAt, closedAt, closedAt, code),
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
  if (!app) return "আবেদনটি পাওয়া যায়নি।";
  const t = now();
  const steps = [
    env.DB.prepare(`UPDATE applications SET status = ?, updated_at = ? WHERE id = ?`).bind(to, t, id),
    env.DB.prepare(`INSERT INTO application_events (application_id, from_status, to_status, actor_user_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, app.status, to, actorId, reason || null, t),
    audit(actorId, "application_moved", "application", String(id), { from: app.status, to }),
  ];
  if (to === "confirmed") {
    if (app.tutor_id === null) return "কনফার্ম করার আগে আবেদনকারীকে একজন টিউটরের সাথে মেলাতে হবে।";
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
    return "এই ধাপে নেওয়া যাবে না।"; // the trigger refused the move
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
  if (!CLASS_CHOICES.some((c) => c.key === t.class_level)) gaps.push("ক্লাস");
  if (!AREAS.some((a) => a.key === t.area)) gaps.push("এলাকা");
  if (!t.medium) gaps.push("মাধ্যম");
  if (!t.subjects) gaps.push("বিষয়");
  if (!t.requirements_public) gaps.push("অভিভাবকের চাওয়া");
  if (!t.session_minutes) gaps.push("সময়");
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
  if (!row) return "এটি আর রিভিউ তালিকায় নেই।";
  const code = Number(row.legacy_ref);
  const steps = [];
  const fixed = email.trim().toLowerCase();
  if (fixed) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fixed)) return "ইমেইল ঠিক নেই।";
    const taken = await count(`SELECT count(*) n FROM tutors WHERE email = ? AND code <> ? AND deleted_at IS NULL`, fixed, code);
    if (taken) return "এই ইমেইল আরেকজন টিউটরের।";
    steps.push(env.DB.prepare(`UPDATE tutors SET email = ?, updated_at = ? WHERE code = ?`).bind(fixed, now(), code));
  }
  steps.push(
    env.DB.prepare(`UPDATE import_rows SET status = 'approved' WHERE id = ?`).bind(rowId),
    audit(actorId, "tutor_flag_resolved", "tutor", String(code), { email_changed: !!fixed }),
  );
  await env.DB.batch(steps);
  return null;
}
