// A signed-in tutor's own record. Every query is keyed on their user id, so nobody can ask for someone else's.
// Named columns only: staff notes and the sheet's review labels never reach the tutor.
import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import { moveApplication } from "./admin.server";
import { type Viewer, requireUser } from "./auth.server";
import { type Fit, bandOf, fitOf } from "./fit";
import { DIDNT_WORK_OUT } from "./admin-labels";
import { AREAS, CLASS_CHOICES } from "./options";
import type { PublicTuition } from "./tuition";
import { visibleTuition } from "./tuitions.server";

export type MyTutor = {
  id: number; code: number; full_name: string; gender: string | null; email: string | null; phone: string; alt_phone: string | null; institution: string | null; department: string | null;
  session_year: string | null; ssc_school: string | null; ssc_year: number | null; ssc_result: string | null; ssc_group: string | null; hsc_college: string | null; hsc_year: number | null;
  hsc_result: string | null; hsc_group: string | null; mediums: string | null; current_location: string | null; home_division: string | null; home_district: string | null;
  demo_willing: number | null; transport: string | null; availability_confirmed_at: number | null; photo_key: string | null;
  university: string | null; min_salary: number | null; anywhere: number; setup_done_at: number | null; terms_accepted_at: number | null;
};

const COLUMNS = `id, code, full_name, gender, email, phone, alt_phone, institution, department, session_year, ssc_school, ssc_year, ssc_result, ssc_group,
  hsc_college, hsc_year, hsc_result, hsc_group, mediums, current_location, home_division, home_district, demo_willing, transport, availability_confirmed_at, photo_key,
  university, min_salary, anywhere, setup_done_at, terms_accepted_at`;

const now = () => Math.floor(Date.now() / 1000);

function audit(actorId: number, action: string, entityType: string, entityId: string, meta: unknown) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(actorId, action, entityType, entityId, JSON.stringify(meta), now());
}

export async function myProfile(userId: number) {
  const tutor = await env.DB.prepare(`SELECT ${COLUMNS} FROM tutors WHERE user_id = ? AND deleted_at IS NULL`).bind(userId).first<MyTutor>();
  if (!tutor) return null;
  const [subjects, statements, applications] = await Promise.all([
    env.DB.prepare(`SELECT band, subject FROM tutor_subjects WHERE tutor_id = ?`).bind(tutor.id).all<{ band: string; subject: string }>(),
    env.DB.prepare(`SELECT kind, body FROM tutor_statements WHERE tutor_id = ?`).bind(tutor.id).all<{ kind: string; body: string }>(),
    env.DB.prepare(
      `SELECT a.id, a.tuition_code, a.status, a.created_at, t.class_level, t.area FROM applications a JOIN tuitions t ON t.code = a.tuition_code
       WHERE a.tutor_id = ? ORDER BY a.created_at DESC LIMIT 100`,
    ).bind(tutor.id).all<{ id: number; tuition_code: number; status: string; created_at: number; class_level: string; area: string }>(),
  ]);
  return { tutor, subjects: subjects.results, statements: statements.results, applications: applications.results };
}

export async function confirmAvailability(userId: number) {
  const t = now();
  await env.DB.prepare(`UPDATE tutors SET availability_confirmed_at = ?, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL`).bind(t, t, userId).run();
}

/**
 * Every tutor page loader and action awaits this. A signed-in user with no tutor record goes to /me, which explains;
 * one who has not finished first sign-in goes to the setup page first, then back here.
 */
export async function requireTutor(request: Request, { setupDone = true } = {}): Promise<{ viewer: Viewer; me: MyTutor }> {
  const viewer = await requireUser(request);
  const me = await env.DB.prepare(`SELECT ${COLUMNS} FROM tutors WHERE user_id = ? AND deleted_at IS NULL`).bind(viewer.id).first<MyTutor>();
  if (!me) throw redirect("/me");
  if (setupDone && !me.setup_done_at) {
    const url = new URL(request.url);
    throw redirect(`/me/setup?next=${encodeURIComponent(url.pathname.replace(/\.data$/, "") + url.search)}`);
  }
  return { viewer, me };
}

// ---------- First sign-in ----------

export async function setupChoices(tutorId: number) {
  const [areas, classes, bands] = await Promise.all([
    env.DB.prepare(`SELECT area FROM tutor_areas WHERE tutor_id = ?`).bind(tutorId).all<{ area: string }>(),
    env.DB.prepare(`SELECT class_level FROM tutor_classes WHERE tutor_id = ?`).bind(tutorId).all<{ class_level: string }>(),
    env.DB.prepare(`SELECT DISTINCT band FROM tutor_subjects WHERE tutor_id = ?`).bind(tutorId).all<{ band: string }>(),
  ]);
  const picked = classes.results.map((c) => c.class_level);
  // Before the tutor picks, offer the classes of the bands they said they teach on the sheet's form.
  const taught = bands.results.map((b) => b.band);
  return {
    areas: areas.results.map((a) => a.area),
    classes: picked.length ? picked : CLASS_CHOICES.filter((c) => taught.includes(bandOf(c.key) ?? "")).map((c) => c.key),
  };
}

export async function saveSetup(viewer: Viewer, me: MyTutor, form: FormData): Promise<string | null> {
  const anywhere = form.get("anywhere") === "1";
  const areas = [...new Set(form.getAll("areas").map(String))].filter((k) => AREAS.some((a) => a.key === k));
  const classes = [...new Set(form.getAll("classes").map(String))].filter((k) => CLASS_CHOICES.some((c) => c.key === k));
  const minSalary = Number(form.get("min_salary")) || null;
  if (!anywhere && !areas.length) return "Pick at least one area, or Anywhere in Rajshahi.";
  if (!classes.length) return "Pick the classes you want to teach.";
  if (minSalary !== null && (!Number.isInteger(minSalary) || minSalary < 0 || minSalary > 100000)) return "Minimum salary not valid.";
  if (form.get("available") !== "1") return "Tick that you still want to take tuitions.";
  if (form.get("terms") !== "1") return "Accept the terms to continue.";

  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE tutors SET anywhere = ?, min_salary = ?, availability_confirmed_at = COALESCE(availability_confirmed_at, ?),
              terms_accepted_at = COALESCE(terms_accepted_at, ?), setup_done_at = COALESCE(setup_done_at, ?), updated_at = ? WHERE id = ?`,
    ).bind(anywhere ? 1 : 0, minSalary, t, t, t, t, me.id),
    env.DB.prepare(`DELETE FROM tutor_areas WHERE tutor_id = ?`).bind(me.id),
    ...(anywhere ? [] : areas).map((a) => env.DB.prepare(`INSERT INTO tutor_areas (tutor_id, area) VALUES (?, ?)`).bind(me.id, a)),
    env.DB.prepare(`DELETE FROM tutor_classes WHERE tutor_id = ?`).bind(me.id),
    ...classes.map((c) => env.DB.prepare(`INSERT INTO tutor_classes (tutor_id, class_level) VALUES (?, ?)`).bind(me.id, c)),
    audit(viewer.id, "tutor_setup", "tutor", String(me.code), { anywhere, areas: areas.length, classes: classes.length, min_salary: minSalary }),
  ]);
  return null;
}

// ---------- Applying ----------

/** The tuition, how this tutor fits it, and whether they already have a live application. */
export async function applyView(me: MyTutor, code: number): Promise<{ t: PublicTuition; fit: Fit; applied: boolean } | null> {
  const t = await visibleTuition(code);
  if (!t) return null;
  const band = bandOf(t.class_level) ?? "";
  const row = await env.DB.prepare(
    `SELECT (SELECT group_concat(DISTINCT subject) FROM tutor_subjects WHERE tutor_id = ?1 AND (?2 = '' OR band = ?2) AND instr(',' || ?3 || ',', ',' || subject || ',') > 0) subject_fit,
            (SELECT group_concat(area) FROM tutor_areas WHERE tutor_id = ?1) areas,
            (SELECT group_concat(class_level) FROM tutor_classes WHERE tutor_id = ?1) classes,
            EXISTS (SELECT 1 FROM applications WHERE tutor_id = ?1 AND tuition_code = ?4
                    AND status IN ('submitted', 'under_review', 'shortlisted', 'trial_arranged', 'confirmed')) applied`,
  ).bind(me.id, band, t.subjects.join(","), code).first<{ subject_fit: string | null; areas: string | null; classes: string | null; applied: number }>();
  const fit = fitOf(t, { ...me, location: me.current_location, subject_fit: row?.subject_fit ?? null, areas: row?.areas ?? null, classes: row?.classes ?? null });
  return { t, fit, applied: row?.applied === 1 };
}

export async function applyTo(viewer: Viewer, me: MyTutor, code: number, note: string): Promise<string | null> {
  const view = await applyView(me, code);
  if (!view || !view.t.is_available || !view.t.accepting_applications) return "This tuition isn't taking applications now.";
  if (view.fit.gender === "mismatch") return "This tuition needs a tutor of a different gender.";
  if (view.applied) return "You've already applied to this tuition.";
  if (note.length > 300) return "Keep the note under 300 characters.";
  const t = now();
  try {
    const app = await env.DB.prepare(
      `INSERT INTO applications (tuition_code, tutor_id, note, status, source, created_at, updated_at) VALUES (?, ?, ?, 'submitted', 'site', ?, ?) RETURNING id`,
    ).bind(code, me.id, note || null, t, t).first<{ id: number }>();
    if (!app) return "Couldn't apply. Try again.";
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO application_events (application_id, from_status, to_status, actor_user_id, created_at) VALUES (?, NULL, 'submitted', ?, ?)`).bind(app.id, viewer.id, t),
      audit(viewer.id, "applied", "application", String(app.id), { tuition: code }),
    ]);
    return null;
  } catch {
    return "You've already applied to this tuition."; // the one-live-application index
  }
}

// ---------- Applied tab ----------

export type MyApplication = {
  id: number; tuition_code: number; status: string; created_at: number; updated_at: number; note: string | null;
  called_at: number | null; met_at: number | null; demo_done_at: number | null; selected_at: number | null;
  class_level: string; area: string; mode: string; subjects: string; salary_kind: string; salary_amount: number | null; salary_period: string;
  days_per_week: number; session_minutes: number | null; time_of_day: string | null; tuition_status: string;
};

export async function myApplications(tutorId: number): Promise<MyApplication[]> {
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.tuition_code, a.status, a.created_at, a.updated_at, a.note, a.called_at, a.met_at, a.demo_done_at,
            (SELECT max(e.created_at) FROM application_events e WHERE e.application_id = a.id AND e.to_status = 'trial_arranged') selected_at,
            t.class_level, t.area, t.mode, t.subjects, t.salary_kind, t.salary_amount, t.salary_period, t.days_per_week, t.session_minutes, t.time_of_day,
            t.status tuition_status
     FROM applications a JOIN tuitions t ON t.code = a.tuition_code WHERE a.tutor_id = ? ORDER BY a.updated_at DESC LIMIT 200`,
  ).bind(tutorId).all<MyApplication>();
  return results;
}

const STEP_COLUMN = { called: "called_at", met: "met_at", demo_done: "demo_done_at" } as const;
const STEP_BEFORE = { called: null, met: "called_at", demo_done: "met_at" } as const;

async function ownApplication(me: MyTutor, id: number) {
  return env.DB.prepare(`SELECT id, tuition_code, status, called_at, met_at, demo_done_at FROM applications WHERE id = ? AND tutor_id = ?`)
    .bind(id, me.id).first<{ id: number; tuition_code: number; status: string; called_at: number | null; met_at: number | null; demo_done_at: number | null }>();
}

/** One step of the selected tutor's checklist, in order: Called → Met → Demo done. */
export async function tick(viewer: Viewer, me: MyTutor, id: number, step: string): Promise<string | null> {
  if (!(step in STEP_COLUMN)) return "Unknown step.";
  const s = step as keyof typeof STEP_COLUMN;
  const app = await ownApplication(me, id);
  if (!app || (app.status !== "trial_arranged" && app.status !== "confirmed")) return "This step opens once you're selected.";
  const before = STEP_BEFORE[s];
  if (before && !app[before]) return "Tick the steps in order.";
  await env.DB.batch([
    env.DB.prepare(`UPDATE applications SET ${STEP_COLUMN[s]} = COALESCE(${STEP_COLUMN[s]}, ?), updated_at = ? WHERE id = ?`).bind(now(), now(), id),
    audit(viewer.id, "tutor_ticked", "application", String(id), { step }),
  ]);
  return null;
}

/** The tutor's own Confirmed (owner: confirming means they owe the fee). Books the tuition; the admin can undo it. */
export async function tutorConfirm(viewer: Viewer, me: MyTutor, id: number, agreed: boolean): Promise<string | null> {
  const app = await ownApplication(me, id);
  if (!app || app.status !== "trial_arranged") return "Only a selected tutor can confirm.";
  if (!app.demo_done_at) return "Tick Demo done first.";
  if (!agreed) return "Tick that you understand the media fee.";
  return moveApplication(id, "confirmed", "tutor confirmed; fee terms shown", viewer.id);
}

export async function didntWorkOut(viewer: Viewer, me: MyTutor, id: number, reason: string): Promise<string | null> {
  const app = await ownApplication(me, id);
  if (!app || (app.status !== "trial_arranged" && app.status !== "confirmed")) return "This option is for a selected tutor.";
  if (!DIDNT_WORK_OUT[reason]) return "Pick a reason.";
  return moveApplication(id, "not_selected", `didn't work out: ${reason}`, viewer.id);
}

export async function withdraw(viewer: Viewer, me: MyTutor, id: number): Promise<string | null> {
  const app = await ownApplication(me, id);
  if (!app || !["submitted", "under_review", "shortlisted"].includes(app.status)) return "This application can't be withdrawn now.";
  return moveApplication(id, "withdrawn", "tutor withdrew", viewer.id);
}

/** The guardian's phone for the Selected tutor only, never the address. Each view is logged (owner, 2026-11-04). */
export async function guardianPhone(viewer: Viewer, me: MyTutor, id: number): Promise<string | null> {
  const app = await ownApplication(me, id);
  if (!app || (app.status !== "trial_arranged" && app.status !== "confirmed")) return null;
  const row = await env.DB.prepare(
    `SELECT g.phone FROM tuition_private p JOIN guardians g ON g.id = p.guardian_id WHERE p.tuition_code = ?`,
  ).bind(app.tuition_code).first<{ phone: string }>();
  if (!row) return null;
  await env.DB.prepare(`INSERT INTO contact_views (application_id, user_id, created_at) VALUES (?, ?, ?)`).bind(id, viewer.id, now()).run();
  return row.phone;
}
