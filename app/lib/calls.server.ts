// The Call list (owner, 2026-11-09): the owner phones tutors one by one, asks from a question bank, rates them and fills
// in their experience. Admin only: every caller has passed requireAdmin. Ratings are private; a check is audited under
// 'tutor_check' so it never shows on the tutor's Home, while experience the owner fills in is audited under 'tutor'
// and shows there as "HTR updated your profile".
import { env } from "cloudflare:workers";
import { ADMIN_PAGE_SIZE } from "./admin-labels";
import { createFollowup } from "./followups.server";
import { BANDS, SUBJECTS } from "./options";
import { type Check, RATED_SUBJECTS, RECHECK_AFTER, checkOf, subjectKey } from "./rating";

const now = () => Math.floor(Date.now() / 1000);
const like = (q: string) => `%${q.replace(/[%_]/g, "")}%`;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
const BAND_KEYS = BANDS.map((b) => b.key);

async function all<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  return (await env.DB.prepare(sql).bind(...args).all<T>()).results;
}

function audit(actorId: number | null, action: string, entityType: string, entityId: string, meta: unknown) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(actorId, action, entityType, entityId, JSON.stringify(meta), now());
}

export type CallFilter = { q: string; subject: string; band: string; gender: string; university: string; department: string; state: string; sort: string; limit: number };

export type CallRow = {
  id: number; code: number; full_name: string; gender: string | null; university: string | null; institution: string | null; department: string | null;
  session_year: string | null; photo_key: string | null; phone: string | null; apps90: number; placed: number; checked_at: number | null;
  call_outcome: string | null; call_at: number | null; asked_at: number | null; subjects: string | null; // "ssc:physics,hsc:physics"
};

// The newest check and call per tutor, used in both the filters and the columns.
const CHECKED = `(SELECT max(c.created_at) FROM tutor_checks c WHERE c.tutor_id = t.id)`;
const LAST_CALL = `(SELECT k.outcome FROM tutor_calls k WHERE k.tutor_id = t.id ORDER BY k.created_at DESC LIMIT 1)`;

/** Tutors to call, filtered by the owner's picks. No fixed order: the owner shortlists by subject and level. */
export async function callList(f: CallFilter) {
  const where = ["t.deleted_at IS NULL"];
  const args: unknown[] = [];
  if (f.gender) { where.push("t.gender = ?"); args.push(f.gender); }
  if (f.university) { where.push("t.university = ?"); args.push(f.university); }
  if (f.department) { where.push("t.department LIKE ?"); args.push(like(f.department)); }
  if (f.subject || f.band) {
    where.push(`EXISTS (SELECT 1 FROM tutor_subjects s WHERE s.tutor_id = t.id${f.subject ? " AND s.subject = ?" : ""}${f.band ? " AND s.band = ?" : ""})`);
    if (f.subject) args.push(f.subject);
    if (f.band) args.push(f.band);
  }
  if (f.state === "todo") where.push(`NOT EXISTS (SELECT 1 FROM tutor_checks c WHERE c.tutor_id = t.id)`);
  if (f.state === "checked") where.push(`EXISTS (SELECT 1 FROM tutor_checks c WHERE c.tutor_id = t.id)`);
  if (f.state === "recheck") {
    where.push(`(${CHECKED} < ? OR EXISTS (SELECT 1 FROM tutor_levels l WHERE l.tutor_id = t.id AND l.updated_at > ${CHECKED}))`);
    args.push(now() - RECHECK_AFTER);
  }
  if (f.state === "asked") where.push(`EXISTS (SELECT 1 FROM tutor_update_asks u WHERE u.tutor_id = t.id AND u.done_at IS NULL)`);
  if (f.state === "retry") where.push(`${LAST_CALL} IN ('no_answer', 'later') AND NOT EXISTS (SELECT 1 FROM tutor_checks c WHERE c.tutor_id = t.id)`);
  if (f.q) {
    const l = like(f.q);
    where.push(`(t.full_name LIKE ? OR t.phone LIKE ? OR t.department LIKE ? OR t.code = ?)`);
    args.push(l, l, l, Number(f.q.replace(/^T-?/i, "")) || -1);
  }
  const from = `FROM tutors t WHERE ${where.join(" AND ")}`;
  const order = f.sort === "placed" ? "placed DESC, apps90 DESC" : f.sort === "new" ? "t.code DESC" : "apps90 DESC, placed DESC";
  const limit = Math.min(Math.max(f.limit, ADMIN_PAGE_SIZE), 300);
  const [total, items] = await Promise.all([
    env.DB.prepare(`SELECT count(*) n ${from}`).bind(...args).first<{ n: number }>(),
    all<CallRow>(
      `SELECT t.id, t.code, t.full_name, t.gender, t.university, t.institution, t.department, t.session_year, t.photo_key, t.phone,
              (SELECT count(*) FROM applications a WHERE a.tutor_id = t.id AND a.created_at > unixepoch() - 90 * 86400) apps90,
              (SELECT count(*) FROM placements p WHERE p.tutor_id = t.id AND p.status IN ('confirmed', 'joined', 'ended')) placed,
              ${CHECKED} checked_at, ${LAST_CALL} call_outcome,
              (SELECT max(k.created_at) FROM tutor_calls k WHERE k.tutor_id = t.id) call_at,
              (SELECT max(u.created_at) FROM tutor_update_asks u WHERE u.tutor_id = t.id AND u.done_at IS NULL) asked_at,
              (SELECT group_concat(s.band || ':' || s.subject) FROM tutor_subjects s WHERE s.tutor_id = t.id) subjects
       ${from} ORDER BY ${order}, t.code DESC LIMIT ?`,
      ...args, limit,
    ),
  ]);
  return { total: total?.n ?? 0, items };
}

/** How many tutors have been checked, for the page head. */
export async function checkedCount() {
  return (await env.DB.prepare(`SELECT count(DISTINCT tutor_id) n FROM tutor_checks`).first<{ n: number }>())?.n ?? 0;
}

type CheckRow = { tutor_id: number; id: number; created_at: number; clarity: number | null; dedication: number | null; manner: number | null; note: string | null };

/** The newest check of each tutor in `idsSql` (a SELECT of tutor ids), as a map. */
export async function latestChecks(idsSql: string, ...args: unknown[]): Promise<Map<number, Check>> {
  const rows = await all<CheckRow>(
    `SELECT c.tutor_id, c.id, c.created_at, c.clarity, c.dedication, c.manner, c.note FROM tutor_checks c
     WHERE c.tutor_id IN (${idsSql}) AND c.created_at = (SELECT max(x.created_at) FROM tutor_checks x WHERE x.tutor_id = c.tutor_id)`,
    ...args,
  );
  if (!rows.length) return new Map();
  const marks = rows.map(() => "?").join(",");
  const [scores, notes] = await Promise.all([
    all<{ check_id: number; kind: string; key: string; score: number }>(`SELECT check_id, kind, key, score FROM tutor_check_scores WHERE check_id IN (${marks})`, ...rows.map((r) => r.id)),
    all<{ check_id: number; section: string; body: string }>(`SELECT check_id, section, body FROM tutor_check_notes WHERE check_id IN (${marks})`, ...rows.map((r) => r.id)),
  ]);
  return new Map(rows.map((r) => [r.tutor_id, checkOf(r, scores.filter((s) => s.check_id === r.id), notes.filter((n) => n.check_id === r.id))]));
}

export type Question = { id: number; band: string; subject: string; body: string; sort: number };

export async function questions(): Promise<Question[]> {
  return all<Question>(`SELECT id, band, subject, body, sort FROM call_questions WHERE removed_at IS NULL ORDER BY sort, id`);
}

/** Everything the call screen needs about one tutor. */
export async function callTutor(code: number) {
  const tutor = await env.DB.prepare(
    `SELECT id, code, full_name, gender, phone, alt_phone, university, institution, department, session_year, photo_key, current_location, about, review_status
     FROM tutors WHERE code = ? AND deleted_at IS NULL`,
  ).bind(code).first<{
    id: number; code: number; full_name: string; gender: string | null; phone: string | null; alt_phone: string | null; university: string | null;
    institution: string | null; department: string | null; session_year: string | null; photo_key: string | null; current_location: string | null;
    about: string | null; review_status: string;
  }>();
  if (!tutor) return null;
  const [levels, subjects, calls, checks, record, qs, ask] = await Promise.all([
    all<{ band: string; students: number | null; years: number | null; approach: string | null; story: string | null; updated_at: number }>(
      `SELECT band, students, years, approach, story, updated_at FROM tutor_levels WHERE tutor_id = ?`, tutor.id),
    all<{ band: string; subject: string }>(`SELECT band, subject FROM tutor_subjects WHERE tutor_id = ?`, tutor.id),
    all<{ outcome: string; created_at: number }>(`SELECT outcome, created_at FROM tutor_calls WHERE tutor_id = ? ORDER BY created_at DESC LIMIT 5`, tutor.id),
    latestChecks(`SELECT ?`, tutor.id),
    env.DB.prepare(
      `SELECT (SELECT count(*) FROM applications a WHERE a.tutor_id = ?1) apps,
              (SELECT count(*) FROM placements p WHERE p.tutor_id = ?1 AND p.status IN ('confirmed', 'joined', 'ended')) placed`,
    ).bind(tutor.id).first<{ apps: number; placed: number }>(),
    questions(),
    openAsk(tutor.id),
  ]);
  return { tutor, levels, subjects, calls, check: checks.get(tutor.id) ?? null, record: record ?? { apps: 0, placed: 0 }, questions: qs, ask };
}

const score = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

/**
 * Saves a check from the call screen: the scores, the note, a "done" call, and any experience the owner filled in
 * (students and years per level, subjects per level). A check is never edited; saving again adds a new one.
 */
export async function saveCheck(tutorId: number, code: number, form: FormData, actorId: number | null): Promise<string | null> {
  const bands = BAND_KEYS.map((b) => [b, score(form.get(`band_${b}`))] as const).filter(([, s]) => s !== null) as [string, number][];
  // Subjects are rated per level: subj_<band>_<subject>, stored as "<band>:<subject>".
  const subjects = BAND_KEYS.flatMap((b) => RATED_SUBJECTS.map((s) => [subjectKey(b, s.key), score(form.get(`subj_${b}_${s.key}`))] as const))
    .filter(([, v]) => v !== null) as [string, number][];
  const traits = { clarity: score(form.get("clarity")), dedication: score(form.get("dedication")), manner: score(form.get("manner")) };
  if (!bands.length && !subjects.length) return "Rate at least one level or subject.";
  const note = clean(form.get("note"), 1000);
  const notes = [...BAND_KEYS, "traits"].map((s) => [s, clean(form.get(`note_${s}`), 1000)] as const).filter(([, v]) => v);

  // Experience, only for the levels whose section the owner opened (exp_<band> is sent then).
  const t = now();
  const [levels, current] = await Promise.all([
    all<{ band: string; students: number | null; years: number | null }>(`SELECT band, students, years FROM tutor_levels WHERE tutor_id = ?`, tutorId),
    all<{ band: string; subject: string }>(`SELECT band, subject FROM tutor_subjects WHERE tutor_id = ?`, tutorId),
  ]);
  const writes: D1PreparedStatement[] = [];
  const changed: string[] = [];
  for (const band of BAND_KEYS) {
    if (form.get(`exp_${band}`) !== "1") continue;
    const num = (k: string, max: number, whole: boolean) => {
      const v = String(form.get(k) ?? "").trim();
      const n = Number(v);
      return v === "" ? null : (!whole || Number.isInteger(n)) && n >= 0 && n <= max ? n : NaN;
    };
    const students = num(`students_${band}`, 1000, true);
    const years = num(`years_${band}`, 40, false);
    if (Number.isNaN(students) || Number.isNaN(years)) return "Students is a whole number; years up to 40 (e.g. 1.5).";
    const old = levels.find((l) => l.band === band);
    if ((old?.students ?? null) !== students || (old?.years ?? null) !== years) {
      writes.push(env.DB.prepare(
        `INSERT INTO tutor_levels (tutor_id, band, students, years, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (tutor_id, band) DO UPDATE SET students = excluded.students, years = excluded.years, updated_at = excluded.updated_at`,
      ).bind(tutorId, band, students, years, t));
      changed.push(`${band}_numbers`);
    }
    // "Other" is not offered on the call screen, so a tutor's own Other stays as it is.
    const picked = new Set(form.getAll(`teach_${band}`).map(String).filter((s) => s !== "other" && SUBJECTS.some((x) => x.key === s)));
    const had = new Set(current.filter((c) => c.band === band && c.subject !== "other").map((c) => c.subject));
    if (picked.size !== had.size || [...picked].some((s) => !had.has(s))) {
      writes.push(env.DB.prepare(`DELETE FROM tutor_subjects WHERE tutor_id = ? AND band = ? AND subject <> 'other'`).bind(tutorId, band));
      for (const s of picked) writes.push(env.DB.prepare(`INSERT INTO tutor_subjects (tutor_id, band, subject) VALUES (?, ?, ?)`).bind(tutorId, band, s));
      changed.push(`${band}_subjects`);
    }
  }

  // One transaction: the check and its scores land together or not at all.
  const score_ = (kind: string, k: string, v: number) => env.DB.prepare(
    `INSERT INTO tutor_check_scores (check_id, kind, key, score) VALUES ((SELECT max(id) FROM tutor_checks WHERE tutor_id = ?), ?, ?, ?)`,
  ).bind(tutorId, kind, k, v);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO tutor_checks (tutor_id, clarity, dedication, manner, note, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(tutorId, traits.clarity, traits.dedication, traits.manner, note || null, t, actorId),
    ...bands.map(([k, v]) => score_("band", k, v)),
    ...subjects.map(([k, v]) => score_("subject", k, v)),
    ...notes.map(([s, body]) => env.DB.prepare(
      `INSERT INTO tutor_check_notes (check_id, section, body) VALUES ((SELECT max(id) FROM tutor_checks WHERE tutor_id = ?), ?, ?)`,
    ).bind(tutorId, s, body)),
    env.DB.prepare(`INSERT INTO tutor_calls (tutor_id, outcome, created_at, created_by) VALUES (?, 'done', ?, ?)`).bind(tutorId, t, actorId),
    audit(actorId, "tutor_checked", "tutor_check", String(code), { bands: bands.length, subjects: subjects.length }),
    ...writes,
    ...(changed.length ? [audit(actorId, "tutor_experience_by_htr", "tutor", String(code), { fields: changed })] : []),
  ]);
  return null;
}

const ASK_DAYS = 30;

/** The tutor's open "Ask to update", if any: not yet answered by a profile save, and under a month old. */
export async function openAsk(tutorId: number) {
  const row = await env.DB.prepare(
    `SELECT items, created_at FROM tutor_update_asks WHERE tutor_id = ? AND done_at IS NULL AND created_at > ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(tutorId, now() - ASK_DAYS * 86400).first<{ items: string; created_at: number }>();
  return row ? { items: row.items.split(","), at: row.created_at } : null;
}

/** Logs an "Ask to update" the owner just sent on WhatsApp. A new ask replaces an open one. */
export async function logAsk(tutorId: number, items: string[], actorId: number | null): Promise<string | null> {
  const ok = items.filter((it) => {
    const [b, p] = it.split(":");
    return BAND_KEYS.includes(b) && ["numbers", "approach", "story", "subjects"].includes(p);
  });
  if (!ok.length) return "Pick at least one thing to ask for.";
  const t = now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE tutor_update_asks SET done_at = ? WHERE tutor_id = ? AND done_at IS NULL`).bind(t, tutorId),
    env.DB.prepare(`INSERT INTO tutor_update_asks (tutor_id, items, created_at, created_by) VALUES (?, ?, ?, ?)`).bind(tutorId, ok.join(","), t, actorId),
  ]);
  return null;
}

/** No answer, or call later (which also puts a follow-up on the owner's Today list). */
export async function logCall(tutorId: number, outcome: string, dueAt: number, note: string, actorId: number | null): Promise<string | null> {
  if (outcome !== "no_answer" && outcome !== "later") return "Unknown outcome.";
  if (outcome === "later") {
    const error = await createFollowup("tutor", tutorId, dueAt, note || "Call to check (Call list)", actorId);
    if (error) return error;
  }
  await env.DB.prepare(`INSERT INTO tutor_calls (tutor_id, outcome, created_at, created_by) VALUES (?, ?, ?, ?)`).bind(tutorId, outcome, now(), actorId).run();
  return null;
}

/** Add, change or remove a question in the bank. */
export async function editQuestion(form: FormData): Promise<string | null> {
  const intent = form.get("intent");
  const id = Number(form.get("id")) || 0;
  if (intent === "q_remove") {
    await env.DB.prepare(`UPDATE call_questions SET removed_at = ? WHERE id = ?`).bind(now(), id).run();
    return null;
  }
  const body = clean(form.get("body"), 300);
  if (body.length < 3) return "Write the question.";
  if (intent === "q_edit") {
    await env.DB.prepare(`UPDATE call_questions SET body = ? WHERE id = ? AND removed_at IS NULL`).bind(body, id).run();
    return null;
  }
  const band = String(form.get("band") ?? "any");
  const subject = String(form.get("subject") ?? "");
  if (band !== "any" && !BAND_KEYS.includes(band)) return "Pick a level.";
  if (subject && !RATED_SUBJECTS.some((s) => s.key === subject)) return "Pick a subject.";
  await env.DB.prepare(
    `INSERT INTO call_questions (band, subject, body, sort, created_at) VALUES (?, ?, ?, (SELECT COALESCE(max(sort), 0) + 1 FROM call_questions), ?)`,
  ).bind(band, subject, body, now()).run();
  return null;
}
