// Premium Tutor (owner, 2026-11-05, part E). Tutor functions are keyed on the signed-in tutor; admin functions are
// only called after requireAdmin. The database triggers (migration 0019) hold the status order and fix a verified
// receipt, so a page cannot skip a step or change money already recorded.
import { env } from "cloudflare:workers";
import type { Viewer } from "./auth.server";
import { type MyTutor, myChoices, myLevels, myStudents } from "./me.server";
import { profileSteps } from "./profile";
import {
  MIN_SALARY_FLOOR, PREMIUM_DAYS, PREMIUM_TERMS_VERSION, PROBLEMS, PROBLEM_LIMIT, type PremiumMember, type PremiumProblem, type ProblemKind,
  feeLeft, premiumMissing, premiumPrice, problemPoints,
} from "./premium";

const now = () => Math.floor(Date.now() / 1000);
const DAY = 86400;
const OPEN = `('applied', 'accepted', 'paid', 'active')`;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);

function audit(actorId: number | null, action: string, memberId: number, meta: unknown = {}) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, 'premium', ?, ?, ?)`)
    .bind(actorId, action, String(memberId), JSON.stringify(meta), now());
}

/** A trigger refusal comes back as an error; the page shows a plain sentence instead. */
async function run(statements: D1PreparedStatement[]): Promise<string | null> {
  try {
    await env.DB.batch(statements);
    return null;
  } catch (e) {
    const msg = String(e);
    if (msg.includes("premium_pay_trx")) return "This TrxID is already used. Check it and try again.";
    if (msg.includes("premium_one_open")) return "There is already an open Premium term.";
    if (msg.includes("not allowed") || msg.includes("cannot change")) return "This step was already done. Reload the page.";
    throw e;
  }
}

async function snapshot(tutorId: number, anywhere: number) {
  const c = await myChoices(tutorId);
  return { areas: c.areas.join(","), anywhere, classes: c.classes.join(","), subjects: c.subjects.map((s) => `${s.band}:${s.subject}`).join(",") };
}

const member = (id: number) => env.DB.prepare(`SELECT * FROM premium_members WHERE id = ?`).bind(id).first<PremiumMember>();
const problemsOf = async (memberId: number) =>
  (await env.DB.prepare(`SELECT id, kind, points, note, created_at FROM premium_problems WHERE member_id = ? AND removed_at IS NULL ORDER BY created_at`)
    .bind(memberId).all<PremiumProblem>()).results;

// ---------- The tutor's side ----------

/** The tutor's current (or last) term, its problems, what Profile still needs, and their past terms. */
export async function myPremium(me: MyTutor) {
  const [terms, choices, levels, students, members] = await Promise.all([
    env.DB.prepare(`SELECT * FROM premium_members WHERE tutor_id = ? ORDER BY id DESC LIMIT 10`).bind(me.id).all<PremiumMember>(),
    myChoices(me.id), myLevels(me.id), myStudents(me.id),
    env.DB.prepare(`SELECT count(*) n FROM premium_members WHERE status = 'active'`).first<{ n: number }>(),
  ]);
  const current = terms.results[0] ?? null;
  const steps = profileSteps(me, choices, levels, students.length);
  return {
    current,
    past: terms.results.slice(1),
    problems: current ? await problemsOf(current.id) : [],
    missing: premiumMissing(steps),
    choices,
    levels,
    students: students.length,
    // How many are Premium now: a count only, never who (shown once there are a few).
    members: members?.n ?? 0,
  };
}

export async function applyPremium(viewer: Viewer, me: MyTutor, form: FormData): Promise<string | null> {
  if (me.review_status !== "approved") return "HTR is still checking your registration. You can apply once it's approved.";
  const { missing } = await myPremium(me);
  if (missing.length) return `Finish these in Profile first: ${missing.map((s) => s.label).join(", ")}.`;
  const min = Number(String(form.get("min_salary") ?? "").replace(/[^\d]/g, ""));
  if (!Number.isInteger(min) || min < MIN_SALARY_FLOOR || min > 100000) return `Minimum salary must be at least ৳${MIN_SALARY_FLOOR.toLocaleString("en-IN")}.`;
  if (form.get("confirm") !== "1") return "Confirm that your areas, classes and subjects are right.";
  if (form.get("terms") !== "1") return "Read and accept the terms.";
  const s = await snapshot(me.id, me.anywhere);
  const t = now();
  const row = await env.DB.prepare(`SELECT id FROM premium_members WHERE tutor_id = ? AND status IN ${OPEN}`).bind(me.id).first();
  if (row) return "You already have an open Premium application.";
  const err = await run([
    env.DB.prepare(
      `INSERT INTO premium_members (tutor_id, min_salary, price, areas, anywhere, classes, subjects, terms_version, applied_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(me.id, min, premiumPrice(min), s.areas, s.anywhere, s.classes, s.subjects, PREMIUM_TERMS_VERSION, t, t, t),
    // The minimum salary is one fact: Premium's price and the Profile's lowest salary agree.
    env.DB.prepare(`UPDATE tutors SET min_salary = ?, updated_at = ? WHERE id = ?`).bind(min, t, me.id),
  ]);
  if (err) return err;
  await audit(viewer.id, "premium_applied", me.id, { min_salary: min }).run();
  return null;
}

/** The tutor may cancel before paying. */
export async function cancelPremium(viewer: Viewer, me: MyTutor): Promise<string | null> {
  const t = now();
  const row = await env.DB.prepare(`SELECT id FROM premium_members WHERE tutor_id = ? AND status IN ('applied', 'accepted')`).bind(me.id).first<{ id: number }>();
  if (!row) return "Nothing to cancel.";
  return run([
    env.DB.prepare(`UPDATE premium_members SET status = 'cancelled', ended_at = ?, updated_at = ? WHERE id = ?`).bind(t, t, row.id),
    audit(viewer.id, "premium_cancelled_by_tutor", row.id),
  ]);
}

/** After HTR accepts: the tutor tells HTR which number they paid from and the TrxID. */
export async function submitPayment(viewer: Viewer, me: MyTutor, form: FormData): Promise<string | null> {
  const m = await env.DB.prepare(`SELECT * FROM premium_members WHERE tutor_id = ? AND status = 'accepted'`).bind(me.id).first<PremiumMember>();
  if (!m) return "HTR hasn't accepted an application to pay for.";
  const method = String(form.get("method") ?? "");
  if (method !== "bkash" && method !== "nagad") return "Pick bKash or Nagad.";
  const from = String(form.get("from") ?? "").replace(/\D/g, "").replace(/^88/, "");
  if (!/^01[3-9]\d{8}$/.test(from)) return "Write the 11-digit number you sent from.";
  const trx = String(form.get("trx") ?? "").replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6,20}$/.test(trx)) return "The TrxID is letters and numbers, like 9AB7C6D5E4.";
  const amount = Number(String(form.get("amount") ?? "").replace(/[^\d]/g, ""));
  if (amount !== m.price) return `Send exactly ৳${m.price.toLocaleString("en-IN")} and write that amount.`;
  const t = now();
  return run([
    env.DB.prepare(
      `UPDATE premium_members SET status = 'paid', pay_method = ?, pay_from = ?, pay_trx = ?, pay_amount = ?, paid_at = ?, updated_at = ? WHERE id = ?`,
    ).bind(method, from, trx, amount, t, t, m.id),
    audit(viewer.id, "premium_payment_sent", m.id, { method }),
  ]);
}

// ---------- The admin's side ----------

export type AdminPremium = PremiumMember & {
  code: number; name: string; phone: string; photo_key: string | null; gender: string | null; university: string | null; department: string | null;
  points: number; placements: number;
};

/** Every term the admin works with, plus each one's problem points and the tuitions confirmed since it started. */
export async function premiumBoard() {
  const rows = (await env.DB.prepare(
    `SELECT m.*, t.code, t.full_name name, t.phone, t.photo_key, t.gender, t.university, t.department,
            (SELECT COALESCE(sum(points), 0) FROM premium_problems p WHERE p.member_id = m.id AND p.removed_at IS NULL) points,
            (SELECT count(*) FROM placements pl WHERE pl.tutor_id = m.tutor_id AND pl.status IN ('confirmed', 'joined', 'ended')
               AND m.starts_at IS NOT NULL AND pl.confirmed_at >= m.starts_at) placements
     FROM premium_members m JOIN tutors t ON t.id = m.tutor_id
     WHERE m.status IN ${OPEN} OR m.updated_at > ? OR (m.refund_due_at IS NOT NULL AND m.refund_sent_at IS NULL)
     ORDER BY m.updated_at DESC LIMIT 300`,
  ).bind(now() - 120 * DAY).all<AdminPremium>()).results;
  return rows;
}

/** One term with its problems and the tutor's tuitions since it started, for the detail sheet. */
export async function premiumDetail(id: number) {
  const m = await member(id);
  if (!m) return null;
  const [problems, placements] = await Promise.all([
    problemsOf(id),
    env.DB.prepare(
      `SELECT pl.id, pl.tuition_code, pl.agreed_salary, pl.confirmed_at, pl.first_salary_at, t.class_level, t.area, t.salary_amount
       FROM placements pl JOIN tuitions t ON t.code = pl.tuition_code
       WHERE pl.tutor_id = ? AND pl.status IN ('confirmed', 'joined', 'ended') AND pl.confirmed_at >= ? ORDER BY pl.confirmed_at DESC`,
    ).bind(m.tutor_id, m.starts_at ?? now()).all<{
      id: number; tuition_code: number; agreed_salary: number | null; confirmed_at: number; first_salary_at: number | null;
      class_level: string; area: string; salary_amount: number | null;
    }>(),
  ]);
  return { problems, placements: placements.results };
}

/** What waits on the admin: for the menu badge and Today. */
export async function premiumWaiting() {
  const t = now();
  const row = await env.DB.prepare(
    `SELECT (SELECT count(*) FROM premium_members WHERE status = 'applied') applied,
            (SELECT count(*) FROM premium_members WHERE status = 'paid') paid,
            (SELECT count(*) FROM premium_members WHERE refund_due_at IS NOT NULL AND refund_sent_at IS NULL) refunds,
            (SELECT count(*) FROM premium_members WHERE refund_due_at IS NOT NULL AND refund_sent_at IS NULL AND refund_due_at < ?) refunds_late,
            (SELECT count(*) FROM premium_members WHERE status = 'active' AND ends_at < ?) ending`,
  ).bind(t, t + 5 * DAY).first<{ applied: number; paid: number; refunds: number; refunds_late: number; ending: number }>();
  return row ?? { applied: 0, paid: 0, refunds: 0, refunds_late: 0, ending: 0 };
}

/** A day-85 follow-up on the tutor: "refund or renew". */
function followup(tutorId: number, dueAt: number, note: string, actorId: number | null) {
  return env.DB.prepare(`INSERT INTO followups (kind, ref_id, due_at, note, created_by, created_at) VALUES ('tutor', ?, ?, ?, ?, ?)`)
    .bind(tutorId, dueAt, note, actorId, now());
}

/** Every admin step on a term, by intent. Returns an error sentence or null. */
export async function premiumAction(intent: string, id: number, form: FormData, actorId: number | null): Promise<string | null> {
  const m = await member(id);
  if (!m) return "Premium term not found.";
  const t = now();
  const set = (sql: string, ...args: unknown[]) => env.DB.prepare(`UPDATE premium_members SET ${sql}, updated_at = ? WHERE id = ?`).bind(...args, t, id);

  switch (intent) {
    case "accept": {
      if (m.status !== "applied") return "Only a new application can be accepted.";
      const anywhere = (await env.DB.prepare(`SELECT anywhere FROM tutors WHERE id = ?`).bind(m.tutor_id).first<{ anywhere: number }>())?.anywhere ?? 0;
      const s = await snapshot(m.tutor_id, anywhere);
      return run([
        set(`status = 'accepted', decided_at = ?, areas = ?, anywhere = ?, classes = ?, subjects = ?`, t, s.areas, s.anywhere, s.classes, s.subjects),
        audit(actorId, "premium_accepted", id),
      ]);
    }
    case "decline": {
      if (m.status !== "applied") return "Only a new application can be declined.";
      return run([set(`status = 'declined', decided_at = ?, ended_at = ?, decline_note = ?`, t, t, clean(form.get("note"), 300) || null), audit(actorId, "premium_declined", id)]);
    }
    case "cancel": {
      if (!["applied", "accepted", "paid"].includes(m.status)) return "Only an unpaid term can be cancelled.";
      return run([set(`status = 'cancelled', ended_at = ?`, t), audit(actorId, "premium_cancelled", id)]);
    }
    case "verify": {
      if (m.status !== "paid") return "No payment to verify.";
      const ends = t + PREMIUM_DAYS * DAY;
      return run([
        set(`status = 'active', verified_at = ?, starts_at = ?, ends_at = ?`, t, t, ends),
        followup(m.tutor_id, ends - 5 * DAY, "Premium ends in 5 days: ask refund or renew. Premium 5 দিনে শেষ: রিফান্ড না আরও 90 দিন?", actorId),
        audit(actorId, "premium_verified", id, { amount: m.pay_amount }),
      ]);
    }
    case "reject_payment": {
      if (m.status !== "paid") return "No payment to send back.";
      return run([set(`status = 'accepted', pay_method = NULL, pay_from = NULL, pay_trx = NULL, pay_amount = NULL, paid_at = NULL`), audit(actorId, "premium_payment_rejected", id)]);
    }
    case "problem": {
      if (m.status !== "active") return "Problems are only recorded during an active term.";
      const kind = String(form.get("kind") ?? "") as ProblemKind;
      if (!(kind in PROBLEMS)) return "Pick what happened.";
      const before = problemPoints(await problemsOf(id));
      const after = before + PROBLEMS[kind].points;
      const statements = [
        env.DB.prepare(`INSERT INTO premium_problems (member_id, kind, points, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(id, kind, PROBLEMS[kind].points, clean(form.get("note"), 300) || null, actorId, t),
        audit(actorId, "premium_problem", id, { kind }),
      ];
      // The third problem ends Premium with half the deposit back.
      if (after >= PROBLEM_LIMIT) statements.push(set(`status = 'ended', ended_at = ?, end_reason = 'problems', refund_amount = ?, refund_due_at = ?`, t, Math.round(m.price / 2), t + 7 * DAY));
      return run(statements);
    }
    case "remove_problem": {
      const pid = Number(form.get("problem"));
      if (m.status !== "active") return "This term has ended; its problems stay as they were.";
      return run([
        env.DB.prepare(`UPDATE premium_problems SET removed_at = ?, removed_by = ? WHERE id = ? AND member_id = ? AND removed_at IS NULL`).bind(t, actorId, pid, id),
        audit(actorId, "premium_problem_removed", id, { problem: pid }),
      ]);
    }
    case "renew": {
      if (m.status !== "active" || !m.ends_at) return "Only an active term can be renewed.";
      const ends = Math.max(m.ends_at, t) + PREMIUM_DAYS * DAY;
      return run([
        set(`ends_at = ?, renewals = renewals + 1`, ends),
        followup(m.tutor_id, ends - 5 * DAY, "Premium ends in 5 days: ask refund or renew. Premium 5 দিনে শেষ: রিফান্ড না আরও 90 দিন?", actorId),
        audit(actorId, "premium_renewed", id),
      ]);
    }
    case "end": {
      if (m.status !== "active") return "Only an active term can be ended.";
      const reason = String(form.get("reason") ?? "");
      const refund = reason === "day90_refund" || reason === "htr_stopped" ? m.price : reason === "misconduct" ? 0 : -1;
      if (refund < 0) return "Pick why it ends.";
      if (reason === "day90_refund" && m.ends_at && t < m.ends_at - DAY) return "A refund can be asked for only when the 90 days end.";
      return run([
        set(`status = 'ended', ended_at = ?, end_reason = ?, refund_amount = ?, refund_due_at = ?`, t, reason, refund, refund ? t + 7 * DAY : null),
        audit(actorId, "premium_ended", id, { reason }),
      ]);
    }
    case "first_salary": {
      if (m.status !== "active") return "Only an active term can be delivered.";
      const placement = Number(form.get("placement"));
      const salary = Number(String(form.get("salary") ?? "").replace(/[^\d]/g, ""));
      if (!Number.isInteger(salary) || salary < 500) return "Write the real monthly salary.";
      const ok = await env.DB.prepare(`SELECT id FROM placements WHERE id = ? AND tutor_id = ?`).bind(placement, m.tutor_id).first();
      if (!ok) return "Pick the tuition HTR gave.";
      const f = feeLeft(salary, m.price);
      const statements = [
        set(`placement_id = ?, real_salary = ?, first_salary_at = ?, fee_left = ?`, placement, salary, t, f.left),
        env.DB.prepare(`UPDATE placements SET first_salary_at = COALESCE(first_salary_at, ?), agreed_salary = COALESCE(agreed_salary, ?), updated_at = ? WHERE id = ?`)
          .bind(t, salary, t, placement),
        audit(actorId, "premium_first_salary", id, { salary }),
      ];
      // Nothing left to pay: delivered now. A deposit above the fee comes back (a tuition below the minimum).
      if (f.left === 0) statements.push(set(`status = 'delivered', ended_at = ?, end_reason = 'delivered', refund_amount = ?, refund_due_at = ?`, t, f.refund || null, f.refund ? t + 7 * DAY : null));
      return run(statements);
    }
    case "fee_paid": {
      if (m.status !== "active" || m.fee_left === null) return "Record the first salary first.";
      const trx = String(form.get("trx") ?? "").replace(/\s/g, "").toUpperCase();
      if (!/^[A-Z0-9]{6,20}$/.test(trx)) return "Write the TrxID of the fee payment.";
      return run([
        set(`status = 'delivered', fee_paid_at = ?, fee_trx = ?, ended_at = ?, end_reason = 'delivered'`, t, trx, t),
        audit(actorId, "premium_delivered", id),
      ]);
    }
    case "refund_sent": {
      if (!m.refund_due_at || m.refund_sent_at) return "No refund waiting.";
      const trx = String(form.get("trx") ?? "").replace(/\s/g, "").toUpperCase();
      if (!/^[A-Z0-9]{6,20}$/.test(trx)) return "Write the TrxID of the refund.";
      return run([set(`refund_sent_at = ?, refund_trx = ?`, t, trx), audit(actorId, "premium_refund_sent", id, { amount: m.refund_amount })]);
    }
  }
  return "Unknown step.";
}


/** The tutor's open term in one line, for Home. */
export async function premiumStatus(tutorId: number) {
  return env.DB.prepare(`SELECT id, status, ends_at, price FROM premium_members WHERE tutor_id = ? AND status IN ${OPEN} ORDER BY id DESC LIMIT 1`)
    .bind(tutorId).first<{ id: number; status: "applied" | "accepted" | "paid" | "active"; ends_at: number | null; price: number }>();
}
