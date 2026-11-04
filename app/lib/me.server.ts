// A signed-in tutor's own record. Every query is keyed on their user id, so nobody can ask for someone else's.
// Named columns only: staff notes and the sheet's review labels never reach the tutor.
import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import { moveApplication } from "./admin.server";
import { type Viewer, getViewer, requireUser } from "./auth.server";
import { type Fit, bandOf, fitOf } from "./fit";
import { DIDNT_WORK_OUT } from "./admin-labels";
import { AREAS, BANDS, CLASS_CHOICES, SUBJECTS, TRANSPORTS } from "./options";
import type { PublicTuition } from "./tuition";
import { openTuitions, visibleTuition } from "./tuitions.server";
import { type Band, type Level, type Student, profileSteps } from "./profile";

export type MyTutor = {
  id: number; code: number; full_name: string; gender: string | null; email: string | null; phone: string; alt_phone: string | null; institution: string | null; department: string | null;
  session_year: string | null; ssc_school: string | null; ssc_year: number | null; ssc_result: string | null; ssc_group: string | null; hsc_college: string | null; hsc_year: number | null;
  hsc_result: string | null; hsc_group: string | null; mediums: string | null; current_location: string | null; home_division: string | null; home_district: string | null;
  demo_willing: number | null; transport: string | null; availability_confirmed_at: number | null; photo_key: string | null;
  university: string | null; min_salary: number | null; anywhere: number; setup_done_at: number | null; terms_accepted_at: number | null;
  availability_paused: number; about: string | null; updates_seen_at: number | null;
  review_status: "waiting" | "needs_fix" | "approved"; review_note: string | null; created_via: string;
  skills: string | null; demo_video_url: string | null;
};

const COLUMNS = `id, code, full_name, gender, email, phone, alt_phone, institution, department, session_year, ssc_school, ssc_year, ssc_result, ssc_group,
  hsc_college, hsc_year, hsc_result, hsc_group, mediums, current_location, home_division, home_district, demo_willing, transport, availability_confirmed_at, photo_key,
  university, min_salary, anywhere, setup_done_at, terms_accepted_at, availability_paused, about, updates_seen_at, review_status, review_note, created_via, skills, demo_video_url`;

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

/** The signed-in user's tutor record, or null (a Google account with no registration). */
export async function tutorForUser(userId: number) {
  return env.DB.prepare(`SELECT ${COLUMNS} FROM tutors WHERE user_id = ? AND deleted_at IS NULL`).bind(userId).first<MyTutor>();
}

export async function confirmAvailability(userId: number) {
  const t = now();
  await env.DB.prepare(`UPDATE tutors SET availability_confirmed_at = ?, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL`).bind(t, t, userId).run();
}

/**
 * Every tutor page loader and action awaits this. A signed-in user with no tutor record goes to registration;
 * one who has not finished first sign-in goes to the setup page first, then back here.
 */
export async function requireTutor(request: Request, { setupDone = true } = {}): Promise<{ viewer: Viewer; me: MyTutor }> {
  const viewer = await requireUser(request);
  const me = await env.DB.prepare(`SELECT ${COLUMNS} FROM tutors WHERE user_id = ? AND deleted_at IS NULL`).bind(viewer.id).first<MyTutor>();
  if (!me) {
    const url = new URL(request.url);
    throw redirect(`/me/join?next=${encodeURIComponent(url.pathname.replace(/\.data$/, "") + url.search)}`);
  }
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
  // New tutors apply once the owner has checked their registration (owner, 2026-11-04).
  if (me.review_status !== "approved") return "You can apply once HTR has checked your profile.";
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
      // A paused tutor may still apply; applying means they are taking tuitions again (owner, 2026-11-04).
      ...(me.availability_paused
        ? [env.DB.prepare(`UPDATE tutors SET availability_paused = 0, updated_at = ? WHERE id = ?`).bind(t, me.id), audit(viewer.id, "tutor_unpaused", "tutor", String(me.code), { by: "applying" })]
        : []),
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

/** The guardian's phone and address details for the Selected tutor only. Each view is logged (owner, 2026-11-04). */
export async function guardianPhone(viewer: Viewer, me: MyTutor, id: number): Promise<{ phone: string; address: string | null } | null> {
  const app = await ownApplication(me, id);
  if (!app || (app.status !== "trial_arranged" && app.status !== "confirmed")) return null;
  const row = await env.DB.prepare(
    `SELECT g.phone, p.exact_address address FROM tuition_private p JOIN guardians g ON g.id = p.guardian_id WHERE p.tuition_code = ?`,
  ).bind(app.tuition_code).first<{ phone: string; address: string | null }>();
  if (!row) return null;
  await env.DB.prepare(`INSERT INTO contact_views (application_id, user_id, created_at) VALUES (?, ?, ?)`).bind(id, viewer.id, now()).run();
  return row;
}

// ---------- Home and Profile (step 3) ----------

type Choices = { subjects: { band: string; subject: string }[]; areas: string[]; classes: string[] };

/** What the tutor teaches and where, as they picked it. */
export async function myChoices(tutorId: number): Promise<Choices> {
  const [subjects, areas, classes] = await Promise.all([
    env.DB.prepare(`SELECT band, subject FROM tutor_subjects WHERE tutor_id = ?`).bind(tutorId).all<{ band: string; subject: string }>(),
    env.DB.prepare(`SELECT area FROM tutor_areas WHERE tutor_id = ?`).bind(tutorId).all<{ area: string }>(),
    env.DB.prepare(`SELECT class_level FROM tutor_classes WHERE tutor_id = ?`).bind(tutorId).all<{ class_level: string }>(),
  ]);
  return { subjects: subjects.results, areas: areas.results.map((a) => a.area), classes: classes.results.map((c) => c.class_level) };
}

/**
 * For You (owner, 2026-11-04): open tuitions that pass gender, class, subject, area and university, newest first,
 * leaving out ones the tutor already applied to. Empty while the tutor is paused. The board's For You chip reuses it.
 */
export async function forYou(me: MyTutor): Promise<PublicTuition[]> {
  if (me.availability_paused) return [];
  const [choices, open, applied] = await Promise.all([
    myChoices(me.id),
    openTuitions(),
    env.DB.prepare(`SELECT tuition_code FROM applications WHERE tutor_id = ?`).bind(me.id).all<{ tuition_code: number }>(),
  ]);
  const done = new Set(applied.results.map((a) => a.tuition_code));
  const tutor = { ...me, location: me.current_location, areas: choices.areas.join(","), classes: choices.classes.join(",") };
  return open.filter((t) => {
    if (t.status !== "available" || !t.accepting_applications || done.has(t.code)) return false;
    const band = bandOf(t.class_level);
    const subjectFit = [...new Set(choices.subjects.filter((s) => (!band || s.band === band) && t.subjects.includes(s.subject)).map((s) => s.subject))];
    const fit = fitOf(t, { ...tutor, subject_fit: subjectFit.join(",") });
    return fit.gender === "ok" && fit.class !== "other" && (fit.subjects.length > 0 || !t.subjects.length)
      && (t.mode === "online" || fit.area !== "unknown") && (fit.university === null || fit.university === "ok");
  });
}

export type Update = { at: number; kind: "shortlisted" | "selected" | "not_selected" | "closed" | "profile"; tuition_code: number | null; unread: boolean };

const UPDATE_DAYS = 30;
// Steps HTR took on the tutor's applications (the tutor's own moves are not news to them), and profile edits by HTR.
const UPDATES_SQL = `
  SELECT e.created_at at, e.to_status kind, a.tuition_code FROM application_events e JOIN applications a ON a.id = e.application_id
  WHERE a.tutor_id = ?1 AND e.created_at > ?2 AND e.to_status IN ('shortlisted', 'trial_arranged', 'not_selected', 'opportunity_closed')
    AND (e.actor_user_id IS NULL OR e.actor_user_id <> ?3)
  UNION ALL
  SELECT l.created_at, 'profile', NULL FROM audit_log l JOIN users u ON u.id = l.actor_user_id
  WHERE l.entity_type = 'tutor' AND l.entity_id = ?4 AND u.role = 'owner' AND l.created_at > ?2`;
const UPDATE_KIND: Record<string, Update["kind"]> = { shortlisted: "shortlisted", trial_arranged: "selected", not_selected: "not_selected", opportunity_closed: "closed", profile: "profile" };

export type NeedsAction = { application_id: number; tuition_code: number; class_level: string; area: string; next: "call" | "meet" | "demo" | "confirm" };

/** Students the tutor has taught, newest first (owner, 2026-11-05). */
export async function myStudents(tutorId: number): Promise<Student[]> {
  const r = await env.DB.prepare(
    `SELECT id, class_level, class_other, area, subjects, started, ended, result_before, result_after, improvement, source FROM tutor_students
     WHERE tutor_id = ? ORDER BY COALESCE(ended, '9999-12') DESC, started DESC, id DESC`,
  ).bind(tutorId).all<Student>();
  return r.results;
}

const MAX_STUDENTS = 20;
const MONTH = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/;

/** Adds one student. No names are asked; only class, place, period, results and what improved. */
export async function addStudent(viewer: Viewer, me: MyTutor, form: FormData): Promise<string | null> {
  const text = (k: string, max: number) => String(form.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const classLevel = String(form.get("class_level") ?? "");
  const classOther = classLevel === "other" ? text("class_other", 60) : "";
  const areaKey = String(form.get("area") ?? "");
  const area = areaKey === "__other" ? text("area_other", 60) : AREAS.some((a) => a.key === areaKey) ? areaKey : "";
  const subjects = [...new Set(form.getAll("subjects").map(String))].filter((s) => SUBJECTS.some((o) => o.key === s));
  const started = String(form.get("started") ?? ""), endedRaw = String(form.get("ended") ?? "");
  const ongoing = form.get("ongoing") === "1";
  const improvement = String(form.get("improvement") ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();
  if (!CLASS_CHOICES.some((c) => c.key === classLevel)) return "Pick the student's class.";
  if (classLevel === "other" && !classOther) return "Write which class.";
  if (!MONTH.test(started)) return "Pick when you started.";
  if (!ongoing && !MONTH.test(endedRaw)) return "Pick when you stopped, or tick Still teaching.";
  const ended = ongoing ? null : endedRaw;
  if (ended && ended < started) return "The end must be after the start.";
  if (improvement.length > 600) return "Keep it under 600 characters.";
  const count = await env.DB.prepare(`SELECT count(*) n FROM tutor_students WHERE tutor_id = ?`).bind(me.id).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_STUDENTS) return `You can list up to ${MAX_STUDENTS} students.`;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO tutor_students (tutor_id, class_level, class_other, area, subjects, started, ended, result_before, result_after, improvement, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(me.id, classLevel, classOther || null, area || null, subjects.join(",") || null, started, ended,
      text("result_before", 20) || null, text("result_after", 20) || null, improvement || null, now()),
    audit(viewer.id, "tutor_student_added", "tutor", String(me.code), { class_level: classLevel }),
  ]);
  return null;
}

export async function deleteStudent(viewer: Viewer, me: MyTutor, id: number) {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM tutor_students WHERE id = ? AND tutor_id = ?`).bind(id, me.id),
    audit(viewer.id, "tutor_student_removed", "tutor", String(me.code), {}),
  ]);
}

/** The tutor's experience rows (part B), one per level they wrote about. */
export async function myLevels(tutorId: number): Promise<Level[]> {
  const r = await env.DB.prepare(
    `SELECT band, students, years, approach, story, makes_notes, takes_tests, gives_homework, reports_guardian FROM tutor_levels WHERE tutor_id = ?`,
  ).bind(tutorId).all<Level>();
  return r.results;
}

/** Home, top to bottom (owner, 2026-11-04): needs action now, updates, For You (3 newest), profile setup progress. */
export async function homeView(viewer: Viewer, me: MyTutor) {
  const [apps, updates, matches, choices, levels, students] = await Promise.all([
    myApplications(me.id),
    env.DB.prepare(`${UPDATES_SQL} ORDER BY at DESC LIMIT 20`).bind(me.id, now() - UPDATE_DAYS * 86400, viewer.id, String(me.code))
      .all<{ at: number; kind: string; tuition_code: number | null }>(),
    forYou(me),
    myChoices(me.id),
    myLevels(me.id),
    myStudents(me.id),
  ]);
  const needs: NeedsAction[] = apps
    .filter((a) => a.status === "trial_arranged")
    .map((a) => ({
      application_id: a.id, tuition_code: a.tuition_code, class_level: a.class_level, area: a.area,
      next: !a.called_at ? "call" : !a.met_at ? "meet" : !a.demo_done_at ? "demo" : "confirm",
    }));
  const seen = me.updates_seen_at ?? 0;
  const progress = profileSteps(me, choices, levels, students.length);
  return {
    needs,
    updates: updates.results.map((u): Update => ({ at: u.at, kind: UPDATE_KIND[u.kind] ?? "closed", tuition_code: u.tuition_code, unread: u.at > seen })),
    forYou: matches.slice(0, 3),
    forYouTotal: matches.length,
    progress,
    paused: me.availability_paused === 1,
  };
}

/** Called once Home has been drawn, so this visit still shows which updates were new. */
export async function markUpdatesSeen(me: MyTutor) {
  await env.DB.prepare(`UPDATE tutors SET updates_seen_at = ? WHERE id = ?`).bind(now(), me.id).run();
}

/** The bottom bar's marks: a red dot on Home when something needs action or is unread, a count on Applied. */
export async function tutorBadges(viewer: Viewer, me: MyTutor): Promise<{ home: boolean; applied: number }> {
  const since = Math.max(me.updates_seen_at ?? 0, now() - UPDATE_DAYS * 86400);
  const row = await env.DB.prepare(
    `SELECT (SELECT count(*) FROM applications WHERE tutor_id = ?1 AND status = 'trial_arranged') selected,
            (SELECT count(*) FROM (${UPDATES_SQL})) unread`,
  ).bind(me.id, since, viewer.id, String(me.code)).first<{ selected: number; unread: number }>();
  return { home: (row?.selected ?? 0) > 0 || (row?.unread ?? 0) > 0, applied: row?.selected ?? 0 };
}

const SUBJECT_KEYS = new Set(SUBJECTS.map((s) => s.key));
const BAND_KEYS = new Set(BANDS.map((b) => b.key));

/**
 * The tutor's own edits (owner, 2026-11-04): areas, classes, subjects, lowest salary, pause, transport, demo and About.
 * Name, phone, gender, university and results are never read from the form; they change through the admin.
 */
export async function saveProfile(viewer: Viewer, me: MyTutor, form: FormData): Promise<string | null> {
  const anywhere = form.get("anywhere") === "1";
  const areas = [...new Set(form.getAll("areas").map(String))].filter((k) => AREAS.some((a) => a.key === k));
  const classes = [...new Set(form.getAll("classes").map(String))].filter((k) => CLASS_CHOICES.some((c) => c.key === k));
  const subjects = [...new Set(form.getAll("subjects").map(String))]
    .map((v) => v.split(":"))
    .filter(([band, subject]) => BAND_KEYS.has(band) && SUBJECT_KEYS.has(subject));
  const minSalary = String(form.get("min_salary") ?? "").trim() ? Number(form.get("min_salary")) : null;
  const transport = String(form.get("transport") ?? "");
  const demo = String(form.get("demo") ?? "");
  // Line breaks are kept; other control characters are dropped.
  const about = String(form.get("about") ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();

  if (!anywhere && !areas.length) return "Pick at least one area, or Anywhere in Rajshahi.";
  if (!classes.length) return "Pick the classes you want to teach.";
  if (!subjects.length) return "Pick at least one subject.";
  if (minSalary !== null && (!Number.isInteger(minSalary) || minSalary < 0 || minSalary > 100000)) return "Lowest salary not valid.";
  if (transport && !TRANSPORTS.some((t) => t.key === transport)) return "Pick a transport option.";
  if (demo && demo !== "yes" && demo !== "no") return "Pick yes or no for the demo class.";
  if (about.length > 500) return "Keep About under 500 characters.";
  const skills = String(form.get("skills") ?? "").replace(/\s+/g, " ").trim();
  const video = String(form.get("demo_video_url") ?? "").trim();
  if (skills.length > 500) return "Keep skills under 500 characters.";
  if (video && (!/^https?:\/\/\S+$/i.test(video) || video.length > 300)) return "The demo video link must start with http:// or https://.";
  const levels: (Omit<Level, "band"> & { band: Band })[] = [];
  for (const b of ["junior", "ssc", "hsc"] as Band[]) {
    if (form.get(`lv_${b}`) !== "1") continue;
    const n = (k: string) => String(form.get(`lv_${b}_${k}`) ?? "").trim();
    const students = n("students") === "" ? null : Number(n("students"));
    const years = n("years") === "" ? null : Number(n("years"));
    if (students !== null && (!Number.isInteger(students) || students < 0 || students > 1000)) return "Students must be a whole number.";
    if (years !== null && (!Number.isFinite(years) || years < 0 || years > 40)) return "Years must be a number, e.g. 1.5.";
    const textOf = (k: string) => String(form.get(`lv_${b}_${k}`) ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();
    const approach = textOf("approach"), story = textOf("story");
    if (approach.length > 2000 || story.length > 2000) return "Keep each text under 2000 characters.";
    const tick = (k: string) => (form.get(`lv_${b}_${k}`) === "1" ? 1 : 0);
    levels.push({ band: b, students, years, approach: approach || null, story: story || null,
      makes_notes: tick("notes"), takes_tests: tick("tests"), gives_homework: tick("homework"), reports_guardian: tick("reports") });
  }
  // Results are the tutor's own until HTR checks a new registration; after that they change through HTR.
  const academic = me.review_status !== "approved" && form.has("ssc_result")
    ? (["ssc_group", "ssc_result", "hsc_group", "hsc_result"] as const).map((k) => String(form.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, 40) || null)
    : null;

  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE tutors SET anywhere = ?, min_salary = ?, availability_paused = ?, transport = ?, demo_willing = ?, about = ?, updated_at = ? WHERE id = ?`,
    ).bind(anywhere ? 1 : 0, minSalary, form.get("paused") === "1" ? 1 : 0, transport || null, demo ? (demo === "yes" ? 1 : 0) : null, about || null, t, me.id),
    env.DB.prepare(`DELETE FROM tutor_areas WHERE tutor_id = ?`).bind(me.id),
    ...(anywhere ? [] : areas).map((a) => env.DB.prepare(`INSERT INTO tutor_areas (tutor_id, area) VALUES (?, ?)`).bind(me.id, a)),
    env.DB.prepare(`DELETE FROM tutor_classes WHERE tutor_id = ?`).bind(me.id),
    ...classes.map((c) => env.DB.prepare(`INSERT INTO tutor_classes (tutor_id, class_level) VALUES (?, ?)`).bind(me.id, c)),
    env.DB.prepare(`DELETE FROM tutor_subjects WHERE tutor_id = ?`).bind(me.id),
    ...subjects.map(([band, subject]) => env.DB.prepare(`INSERT INTO tutor_subjects (tutor_id, band, subject) VALUES (?, ?, ?)`).bind(me.id, band, subject)),
    env.DB.prepare(`UPDATE tutors SET skills = ?, demo_video_url = ? WHERE id = ?`).bind(skills || null, video || null, me.id),
    ...levels.map((l) => isEmptyLevel(l) ? env.DB.prepare(`DELETE FROM tutor_levels WHERE tutor_id = ? AND band = ?`).bind(me.id, l.band) : env.DB.prepare(
      `INSERT INTO tutor_levels (tutor_id, band, students, years, approach, story, makes_notes, takes_tests, gives_homework, reports_guardian, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (tutor_id, band) DO UPDATE SET students = excluded.students, years = excluded.years, approach = excluded.approach, story = excluded.story,
         makes_notes = excluded.makes_notes, takes_tests = excluded.takes_tests, gives_homework = excluded.gives_homework,
         reports_guardian = excluded.reports_guardian, updated_at = excluded.updated_at`,
    ).bind(me.id, l.band, l.students, l.years, l.approach, l.story, l.makes_notes, l.takes_tests, l.gives_homework, l.reports_guardian, t)),
    ...(academic ? [env.DB.prepare(`UPDATE tutors SET ssc_group = ?, ssc_result = ?, hsc_group = ?, hsc_result = ? WHERE id = ?`).bind(...academic, me.id)] : []),
    audit(viewer.id, "tutor_profile_saved", "tutor", String(me.code), { areas: areas.length, anywhere, classes: classes.length, subjects: subjects.length, levels: levels.length }),
  ]);
  return null;
}

/** The Profile tab's pause switch, saved on its own so it takes one tap. */
/** A level with nothing written, counted or ticked is not stored (so an untouched block adds no empty row). */
const isEmptyLevel = (l: Omit<Level, "band">) =>
  l.students === null && l.years === null && !l.approach && !l.story && l.makes_notes + l.takes_tests + l.gives_homework + l.reports_guardian === 0;

export async function setPaused(viewer: Viewer, me: MyTutor, paused: boolean) {
  await env.DB.batch([
    env.DB.prepare(`UPDATE tutors SET availability_paused = ?, updated_at = ? WHERE id = ?`).bind(paused ? 1 : 0, now(), me.id),
    audit(viewer.id, paused ? "tutor_paused" : "tutor_unpaused", "tutor", String(me.code), {}),
  ]);
}

// ---------- Owner notice and referrals (owner, 2026-11-04, Porao comparison) ----------

/** The one live notice to all tutors, if any; it disappears by itself after its end date. */
export async function liveNotice() {
  return env.DB.prepare(`SELECT id, body, ends_at FROM notices WHERE ends_at > ? ORDER BY created_at DESC LIMIT 1`).bind(now()).first<{ id: number; body: string; ends_at: number }>();
}

export type Referral = { id: number; class_level: string; area: string; status: string; created_at: number; tuition_code: number | null };

export async function myReferrals(me: MyTutor): Promise<Referral[]> {
  const { results } = await env.DB.prepare(`SELECT id, class_level, area, status, created_at, tuition_code FROM leads WHERE referred_by = ? ORDER BY created_at DESC LIMIT 20`)
    .bind(me.id).all<Referral>();
  return results;
}

/** "Refer a tuition": a guardian the tutor knows, landing on Leads as "Referred by T-…". No reward yet (owner). */
export async function referTuition(viewer: Viewer, me: MyTutor, form: FormData): Promise<string | null> {
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const phone = text("phone").replace(/[\s-]/g, "").replace(/^\+?88/, "");
  if (!/^01[3-9]\d{8}$/.test(phone)) return "Enter the guardian's phone (01XXXXXXXXX).";
  const cls = text("class_level"), area = text("area");
  if (!CLASS_CHOICES.some((c) => c.key === cls)) return "Pick the class.";
  if (!AREAS.some((a) => a.key === area)) return "Pick the area.";
  const name = text("guardian_name").slice(0, 80), note = text("note").slice(0, 300);
  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO leads (client_id, phone, guardian_name, class_level, area, notes, lead_source, status, created_at, synced_at, referred_by)
       VALUES (?, ?, ?, ?, ?, ?, 'referral', 'new', ?, ?, ?)`,
    ).bind(`ref-${me.id}-${t}-${crypto.randomUUID().slice(0, 8)}`, phone, name || null, cls, area, note ? `Referred by T-${me.code}: ${note}` : `Referred by T-${me.code}`, t, t, me.id),
    audit(viewer.id, "tuition_referred", "tutor_referral", String(me.code), {}),
  ]);
  return null;
}

/** Who is signed in, for the site header only: role, first name, and a tutor's code and photo. No private fields. */
export async function headerViewer(request: Request): Promise<{ role: "owner" | "tutor"; name: string | null; code: number | null; photo: boolean } | null> {
  const viewer = await getViewer(request);
  if (!viewer) return null;
  if (viewer.role === "owner") return { role: "owner", name: viewer.name, code: null, photo: false };
  const t = await env.DB.prepare(`SELECT code, full_name, photo_key FROM tutors WHERE user_id = ? AND deleted_at IS NULL`).bind(viewer.id)
    .first<{ code: number; full_name: string; photo_key: string | null }>();
  return { role: "tutor", name: t?.full_name ?? viewer.name, code: t?.code ?? null, photo: !!t?.photo_key };
}
