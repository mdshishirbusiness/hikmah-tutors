// The media fee ledger (owner, 2026-11-09; migration 0027). Every taka is an entry in fee_entries; entries are never
// edited or deleted, only reversed (SQLite triggers hold this). Admin functions are called only from routes that ran
// requireAdmin; myFees only with the tutor id from requireTutor. Rules shared with the pages are in fee.ts.
import { env } from "cloudflare:workers";
import { type FeeBalance, type FeeTerms, FEE_METHODS, chargeFor, dueNow } from "./fee";
import { taka } from "./tuition";

const now = () => Math.floor(Date.now() / 1000);

function audit(actorId: number | null, action: string, entityId: number, reason: string | null, meta: unknown) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, reason, meta_json, created_at) VALUES (?, ?, 'placement', ?, ?, ?, ?)`)
    .bind(actorId, action, String(entityId), reason, JSON.stringify(meta), now());
}

/** Entries not undone by a reversal. A reversal is the exact opposite of its entry, so the two drop out together. */
const LIVE = `fee_entries e WHERE e.kind <> 'reversal' AND NOT EXISTS (SELECT 1 FROM fee_entries r WHERE r.reverses_id = e.id)`;

/** One row per placement: the live sums behind FeeBalance. */
const SUMS = `SELECT e.placement_id,
    COALESCE(sum(CASE WHEN e.kind = 'charge' THEN e.delta END), 0) charged,
    COALESCE(-sum(CASE WHEN e.kind = 'reduction' THEN e.delta END), 0) reduced,
    COALESCE(-sum(CASE WHEN e.kind = 'payment' THEN e.delta END), 0) paid,
    COALESCE(-sum(CASE WHEN e.kind = 'credit' THEN e.delta END), 0) credited,
    COALESCE(max(CASE WHEN e.kind = 'charge' THEN e.later END), 0) later,
    max(CASE WHEN e.kind = 'charge' THEN e.terms END) terms,
    max(CASE WHEN e.kind = 'charge' THEN e.basis END) basis
  FROM ${LIVE} GROUP BY e.placement_id`;

type Sums = { charged: number; reduced: number; paid: number; credited: number; later: number; terms: string | null; basis: number | null };

const balanceOf = (s: Sums, firstSalary: number | null) =>
  dueNow({ charged: s.charged, reduced: s.reduced, paid: s.paid, credited: s.credited, later: s.later }, firstSalary);

// ---------- Confirm and undo (called from moveApplication's batch) ----------

/**
 * The statements that fix the fee when a tutor confirms, to run in the same batch, after the placement row is written.
 * With no salary to take a percent of, the placement is marked as waiting for the owner instead.
 */
export async function chargeOnConfirm(applicationId: number, actorId: number | null): Promise<D1PreparedStatement[]> {
  const row = await env.DB.prepare(
    `SELECT a.tutor_id, t.code, t.fee_kind, t.fee_value, t.salary_kind, t.salary_amount, p.agreed_salary, p.fee_plan
     FROM applications a JOIN tuitions t ON t.code = a.tuition_code LEFT JOIN placements p ON p.application_id = a.id WHERE a.id = ?`,
  ).bind(applicationId).first<{
    tutor_id: number; code: number; fee_kind: FeeTerms["kind"]; fee_value: number | null; salary_kind: string; salary_amount: number | null;
    agreed_salary: number | null; fee_plan: "standard" | "early" | null;
  }>();
  if (!row) return [];
  const basis = row.agreed_salary ?? (row.salary_kind === "fixed" ? row.salary_amount : null);
  const charge = chargeFor({ kind: row.fee_kind, value: row.fee_value }, basis, row.fee_plan);
  const placement = `(SELECT id FROM placements WHERE application_id = ?)`;
  const t = now();
  if (!charge) {
    return [env.DB.prepare(`UPDATE placements SET fee_waiting_at = ? WHERE application_id = ?`).bind(t, applicationId)];
  }
  return [
    env.DB.prepare(
      `INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, terms, basis, later, created_by, created_at)
       VALUES (${placement}, ?, 'charge', ?, ?, ?, ?, ?, ?)`,
    ).bind(applicationId, row.tutor_id, charge.total, charge.terms, charge.basis, charge.later, actorId, t),
    env.DB.prepare(`UPDATE placements SET fee_waiting_at = NULL, agreed_salary = COALESCE(agreed_salary, ?) WHERE application_id = ?`).bind(charge.basis, applicationId),
  ];
}

/** An undone confirm takes its fee back: the live charge is reversed. Payments stay and show as overpaid. */
export function reverseChargeOnUndo(applicationId: number, reason: string, actorId: number | null): D1PreparedStatement[] {
  const t = now();
  return [
    env.DB.prepare(
      `INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, reverses_id, note, created_by, created_at)
       SELECT e.placement_id, e.tutor_id, 'reversal', -e.delta, e.id, ?, ?, ? FROM ${LIVE} AND e.kind = 'charge'
         AND e.placement_id = (SELECT id FROM placements WHERE application_id = ?)`,
    ).bind(reason, actorId, t, applicationId),
    env.DB.prepare(`UPDATE placements SET fee_waiting_at = NULL WHERE application_id = ?`).bind(applicationId),
  ];
}

// ---------- Admin: Money ----------

export type MoneyRow = FeeBalance & {
  id: number; tuition_code: number; status: string; confirmed_at: number | null; first_salary_at: number | null; fee_waiting_at: number | null;
  agreed_salary: number | null; terms: string | null; basis: number | null; tutor_code: number; name: string; phone: string | null; photo_key: string | null;
  class_level: string; area: string; fee_kind: FeeTerms["kind"]; fee_value: number | null;
};

export type FeeEntry = {
  id: number; kind: string; delta: number; method: string | null; txn_ref: string | null; paid_at: number | null; terms: string | null;
  note: string | null; created_at: number; reverses_id: number | null; reversed: number;
};

const dhakaMonth = (sec: number) => new Date((sec + 6 * 3600) * 1000).toISOString().slice(0, 7);

/** Totals, income by month (Dhaka time) and one row per placement in the ledger, owing first. */
export async function moneyBoard(months = 12) {
  const { results } = await env.DB.prepare(
    `WITH s AS (${SUMS})
     SELECT p.id, p.tuition_code, p.status, p.confirmed_at, p.first_salary_at, p.fee_waiting_at, p.agreed_salary,
            COALESCE(s.charged, 0) charged, COALESCE(s.reduced, 0) reduced, COALESCE(s.paid, 0) paid, COALESCE(s.credited, 0) credited,
            COALESCE(s.later, 0) later, s.terms, s.basis, u.code tutor_code, u.full_name name, u.phone, u.photo_key,
            t.class_level, t.area, t.fee_kind, t.fee_value
     FROM placements p JOIN tutors u ON u.id = p.tutor_id JOIN tuitions t ON t.code = p.tuition_code LEFT JOIN s ON s.placement_id = p.id
     WHERE s.placement_id IS NOT NULL OR p.fee_waiting_at IS NOT NULL OR EXISTS (SELECT 1 FROM fee_entries x WHERE x.placement_id = p.id)
     ORDER BY p.confirmed_at DESC LIMIT 500`,
  ).all<Omit<MoneyRow, "owed" | "due_now">>();
  const rows: MoneyRow[] = results.map((r) => ({ ...r, ...balanceOf(r, r.first_salary_at) }));

  // Income by the month the money came; fees by the month they were fixed (charge less its reductions).
  const since = now() - months * 31 * 86400;
  const [paid, fixed] = await Promise.all([
    env.DB.prepare(`SELECT e.paid_at at, -e.delta amount FROM ${LIVE} AND e.kind = 'payment' AND e.paid_at > ?`).bind(since).all<{ at: number; amount: number }>(),
    env.DB.prepare(`SELECT e.created_at at, e.delta amount FROM ${LIVE} AND e.kind IN ('charge', 'reduction') AND e.created_at > ?`).bind(since).all<{ at: number; amount: number }>(),
  ]);
  const keys: string[] = [];
  const d = new Date((now() + 6 * 3600) * 1000);
  for (let i = months - 1; i >= 0; i--) keys.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  const byMonth = keys.map((k) => ({
    key: k,
    collected: paid.results.filter((p) => dhakaMonth(p.at) === k).reduce((s, p) => s + p.amount, 0),
    fees: fixed.results.filter((p) => dhakaMonth(p.at) === k).reduce((s, p) => s + p.amount, 0),
  }));

  const totals = rows.reduce(
    (t, r) => ({
      fees: t.fees + r.charged - r.reduced,
      collected: t.collected + r.paid,
      due_now: t.due_now + r.due_now,
      later: t.later + Math.max(r.owed - r.due_now, 0),
      overpaid: t.overpaid + Math.max(-r.owed, 0),
      waiting: t.waiting + (r.fee_waiting_at ? 1 : 0),
    }),
    { fees: 0, collected: 0, due_now: 0, later: 0, overpaid: 0, waiting: 0 },
  );
  return { rows, byMonth, totals };
}

/** Every entry of one placement, oldest first, with whether it was reversed. */
export async function placementEntries(placementId: number): Promise<FeeEntry[]> {
  const { results } = await env.DB.prepare(
    `SELECT e.id, e.kind, e.delta, e.method, e.txn_ref, e.paid_at, e.terms, e.note, e.created_at, e.reverses_id,
            EXISTS (SELECT 1 FROM fee_entries r WHERE r.reverses_id = e.id) reversed
     FROM fee_entries e WHERE e.placement_id = ? ORDER BY e.id`,
  ).bind(placementId).all<FeeEntry>();
  return results;
}

async function placementBalance(placementId: number) {
  const p = await env.DB.prepare(
    `WITH s AS (${SUMS}) SELECT p.id, p.tutor_id, p.status, p.first_salary_at, p.fee_waiting_at, p.tuition_code, p.fee_plan,
       COALESCE(s.charged, 0) charged, COALESCE(s.reduced, 0) reduced, COALESCE(s.paid, 0) paid, COALESCE(s.credited, 0) credited,
       COALESCE(s.later, 0) later, s.terms, s.basis
     FROM placements p LEFT JOIN s ON s.placement_id = p.id WHERE p.id = ?`,
  ).bind(placementId).first<Sums & { id: number; tutor_id: number; status: string; first_salary_at: number | null; fee_waiting_at: number | null; tuition_code: number; fee_plan: string | null }>();
  return p ? { ...p, balance: balanceOf(p, p.first_salary_at) } : null;
}

/** Reads a yyyy-mm-dd date as midday in Dhaka; no date is today. Never later than now. */
function paidAt(date: string): number | null {
  if (!date) return now();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const sec = Math.floor(Date.parse(`${date}T12:00:00+06:00`) / 1000);
  if (!Number.isFinite(sec) || sec > now() + 86400 || sec < now() - 400 * 86400) return null;
  return Math.min(sec, now());
}

/** The owner records money received. Partial is fine; more than is owed is refused (wallet credit comes later). */
export async function recordPayment(placementId: number, form: FormData, actorId: number | null): Promise<string | null> {
  const p = await placementBalance(placementId);
  if (!p) return "Placement not found.";
  if (!p.charged) return "This placement has no fee yet.";
  const amount = Number(String(form.get("amount") ?? "").trim());
  const method = String(form.get("method") ?? "");
  const ref = String(form.get("txn_ref") ?? "").trim().slice(0, 40) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  const at = paidAt(String(form.get("paid_on") ?? "").trim());
  if (!Number.isInteger(amount) || amount <= 0) return "Enter the amount in whole taka.";
  if (!FEE_METHODS[method]) return "Pick how it was paid.";
  if (at === null) return "Payment date not valid.";
  if (amount > p.balance.owed) return p.balance.owed > 0 ? `Only ${taka(p.balance.owed)} is owed.` : "Nothing is owed on this placement.";
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, method, txn_ref, paid_at, note, created_by, created_at) VALUES (?, ?, 'payment', ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(p.id, p.tutor_id, -amount, method, ref, at, note, actorId, now()),
    audit(actorId, "fee_payment", p.id, null, { amount, method }),
  ]);
  return null;
}

/** After confirm the fee only goes down, by hand, with a reason; never below what is already paid. */
export async function reduceFee(placementId: number, form: FormData, actorId: number | null): Promise<string | null> {
  const p = await placementBalance(placementId);
  if (!p) return "Placement not found.";
  if (!p.charged) return "This placement has no fee yet.";
  const amount = Number(String(form.get("amount") ?? "").trim());
  const reason = String(form.get("reason") ?? "").trim().slice(0, 300);
  if (!Number.isInteger(amount) || amount <= 0) return "Enter the amount in whole taka.";
  if (!reason) return "Write why the fee is reduced.";
  if (amount > p.balance.owed) return p.balance.owed > 0 ? `It can come down by ${taka(p.balance.owed)} at most (what is still owed).` : "Nothing is owed on this placement.";
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, note, created_by, created_at) VALUES (?, ?, 'reduction', ?, ?, ?, ?)`)
      .bind(p.id, p.tutor_id, -amount, reason, actorId, now()),
    audit(actorId, "fee_reduced", p.id, reason, { amount }),
  ]);
  return null;
}

/** The tutor paid early: the Standard 60% charge is swapped for the 50% one, written as a reversal and a new charge. */
export async function switchToEarly(placementId: number, actorId: number | null): Promise<string | null> {
  const p = await placementBalance(placementId);
  if (!p) return "Placement not found.";
  if (p.terms !== "standard" || !p.basis) return "Only a Standard fee can switch to Early.";
  const early = chargeFor({ kind: "standard", value: null }, p.basis, "early")!;
  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, reverses_id, note, created_by, created_at)
       SELECT e.placement_id, e.tutor_id, 'reversal', -e.delta, e.id, 'Switched to Early 50%', ?, ? FROM ${LIVE} AND e.kind = 'charge' AND e.placement_id = ?`,
    ).bind(actorId, t, p.id),
    env.DB.prepare(`INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, terms, basis, later, note, created_by, created_at) VALUES (?, ?, 'charge', ?, 'early', ?, 0, 'Paid early', ?, ?)`)
      .bind(p.id, p.tutor_id, early.total, p.basis, actorId, t),
    env.DB.prepare(`UPDATE placements SET fee_plan = 'early', updated_at = ? WHERE id = ?`).bind(t, p.id),
    audit(actorId, "fee_early", p.id, "Switched to Early 50%", { from: p.charged, to: early.total }),
  ]);
  return null;
}

/** Undoes a payment or a reduction by adding its opposite. A charge is undone only by undoing the confirm. */
export async function reverseEntry(entryId: number, reason: string, actorId: number | null): Promise<string | null> {
  const why = reason.trim().slice(0, 300);
  if (!why) return "Write why it is reversed.";
  const e = await env.DB.prepare(`SELECT id, placement_id, tutor_id, kind, delta FROM fee_entries WHERE id = ?`)
    .bind(entryId).first<{ id: number; placement_id: number; tutor_id: number; kind: string; delta: number }>();
  if (!e) return "Entry not found.";
  if (e.kind !== "payment" && e.kind !== "reduction") return "Only a payment or a reduction can be reversed here.";
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, reverses_id, note, created_by, created_at) VALUES (?, ?, 'reversal', ?, ?, ?, ?, ?)`)
        .bind(e.placement_id, e.tutor_id, -e.delta, e.id, why, actorId, now()),
      audit(actorId, "fee_reversed", e.placement_id, why, { entry: e.id, kind: e.kind, amount: -e.delta }),
    ]);
  } catch {
    return "Already reversed.";
  }
  return null;
}

/** A confirm with no salary to work from: the owner enters the agreed salary and the fee is fixed from the tuition's terms. */
export async function setAgreedSalary(placementId: number, form: FormData, actorId: number | null): Promise<string | null> {
  const p = await env.DB.prepare(
    `SELECT p.id, p.tutor_id, p.application_id, p.fee_waiting_at, p.fee_plan, t.fee_kind, t.fee_value FROM placements p JOIN tuitions t ON t.code = p.tuition_code WHERE p.id = ?`,
  ).bind(placementId).first<{ id: number; tutor_id: number; application_id: number; fee_waiting_at: number | null; fee_plan: "standard" | "early" | null; fee_kind: FeeTerms["kind"]; fee_value: number | null }>();
  if (!p?.fee_waiting_at) return "This placement's fee is already set.";
  const salary = Number(String(form.get("salary") ?? "").trim());
  if (!Number.isInteger(salary) || salary <= 0 || salary > 200000) return "Enter the agreed monthly salary.";
  const charge = chargeFor({ kind: p.fee_kind, value: p.fee_value }, salary, p.fee_plan)!;
  const t = now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO fee_entries (placement_id, tutor_id, kind, delta, terms, basis, later, created_by, created_at) VALUES (?, ?, 'charge', ?, ?, ?, ?, ?, ?)`)
      .bind(p.id, p.tutor_id, charge.total, charge.terms, salary, charge.later, actorId, t),
    env.DB.prepare(`UPDATE placements SET agreed_salary = ?, fee_waiting_at = NULL, updated_at = ? WHERE id = ?`).bind(salary, t, p.id),
    audit(actorId, "fee_set", p.id, null, { salary, total: charge.total }),
  ]);
  return null;
}

// ---------- Tutor: what I owe ----------

export type MyFee = FeeBalance & {
  placement_id: number; tuition_code: number; class_level: string; area: string; terms: string | null; first_salary_at: number | null; waiting: boolean;
  payments: { amount: number; method: string; paid_at: number }[];
};

/** The tutor's own fees: placements with a fee still owed or paid in the last 90 days, and any waiting to be set. */
export async function myFees(tutorId: number): Promise<MyFee[]> {
  const { results } = await env.DB.prepare(
    `WITH s AS (${SUMS})
     SELECT p.id placement_id, p.tuition_code, p.first_salary_at, p.fee_waiting_at, t.class_level, t.area,
            COALESCE(s.charged, 0) charged, COALESCE(s.reduced, 0) reduced, COALESCE(s.paid, 0) paid, COALESCE(s.credited, 0) credited,
            COALESCE(s.later, 0) later, s.terms, s.basis
     FROM placements p JOIN tuitions t ON t.code = p.tuition_code LEFT JOIN s ON s.placement_id = p.id
     WHERE p.tutor_id = ? AND (s.placement_id IS NOT NULL OR p.fee_waiting_at IS NOT NULL) ORDER BY p.confirmed_at DESC LIMIT 20`,
  ).bind(tutorId).all<Sums & { placement_id: number; tuition_code: number; first_salary_at: number | null; fee_waiting_at: number | null; class_level: string; area: string }>();
  if (!results.length) return [];
  const pays = await env.DB.prepare(
    `SELECT e.placement_id, -e.delta amount, e.method, e.paid_at FROM ${LIVE} AND e.kind = 'payment' AND e.tutor_id = ? ORDER BY e.paid_at DESC`,
  ).bind(tutorId).all<{ placement_id: number; amount: number; method: string; paid_at: number }>();
  const recent = now() - 90 * 86400;
  return results
    .map((r) => ({
      placement_id: r.placement_id, tuition_code: r.tuition_code, class_level: r.class_level, area: r.area, terms: r.terms, first_salary_at: r.first_salary_at,
      waiting: !!r.fee_waiting_at, ...balanceOf(r, r.first_salary_at),
      payments: pays.results.filter((p) => p.placement_id === r.placement_id).map(({ placement_id: _, ...p }) => p),
    }))
    .filter((f) => f.waiting || f.owed > 0 || f.payments.some((p) => p.paid_at > recent));
}
