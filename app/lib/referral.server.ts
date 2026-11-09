// Tutor referral and wallet (owner, 2026-11-09; migration 0028). Rules shared with the pages are in referral.ts.
// Tutor functions take the id from requireTutor; admin functions are called only from routes that ran requireAdmin.
// The wallet is a ledger like fee_entries: never edited or deleted, only reversed.
import { env } from "cloudflare:workers";
import { myChoices, myLevels, myStudents } from "./me.server";
import { profilePercent, profileSteps } from "./profile";
import { REFERRAL_PERCENT, REF_COOKIE, type ReferralStatus, codeFrom, referralAmount } from "./referral";

const now = () => Math.floor(Date.now() / 1000);
const REF_DAYS = 30;

function audit(actorId: number | null, action: string, entityId: string, meta: unknown) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, 'referral', ?, ?, ?)`)
    .bind(actorId, action, entityId, JSON.stringify(meta), now());
}

// ---------- The link ----------

/** The code a referral link left on this phone (/r/<code>), if any. */
export function refFromCookie(request: Request): number | null {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, value] = part.trim().split("=");
    if (key === REF_COOKIE) return codeFrom(value);
  }
  return null;
}

export function refCookie(request: Request, code: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${REF_COOKIE}=${code}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REF_DAYS * 86400}${secure}`;
}

/** A tutor who can refer: on the list and not removed. Only the code and first name leave this function. */
export async function referrerByCode(code: number | null) {
  if (!code) return null;
  return env.DB.prepare(`SELECT id, code, full_name FROM tutors WHERE code = ? AND deleted_at IS NULL`).bind(code).first<{ id: number; code: number; full_name: string }>();
}

/**
 * Registration: the referrer, once. The field is optional; a code that matches nobody is an error so a typo is caught.
 * Set only while the tutor has no referrer yet, and never to themselves.
 */
export async function checkRef(input: FormDataEntryValue | null, selfCode: number | null): Promise<{ id: number | null; error?: string }> {
  const raw = String(input ?? "").trim();
  if (!raw) return { id: null };
  const code = codeFrom(raw);
  const who = await referrerByCode(code);
  if (!who) return { id: null, error: "No tutor has this code. Check it, or leave it empty." };
  if (selfCode && who.code === selfCode) return { id: null, error: "You can't use your own code." };
  return { id: who.id };
}

/** The code of whoever referred this tutor, if anyone. */
export async function referrerOf(tutorId: number): Promise<number | null> {
  return (await env.DB.prepare(`SELECT r.code FROM tutors t JOIN tutors r ON r.id = t.referred_by WHERE t.id = ?`).bind(tutorId).first<{ code: number }>())?.code ?? null;
}

export async function setReferrer(tutorId: number, referrerId: number) {
  await env.DB.prepare(`UPDATE tutors SET referred_by = ?, referred_at = ? WHERE id = ? AND referred_by IS NULL AND id <> ?`)
    .bind(referrerId, now(), tutorId, referrerId).run();
}

// ---------- Credit ----------

async function percentOf(tutorId: number) {
  const t = await env.DB.prepare(`SELECT photo_key, anywhere, min_salary, transport, demo_willing, about, free_times FROM tutors WHERE id = ?`)
    .bind(tutorId).first<{ photo_key: string | null; anywhere: number; min_salary: number | null; transport: string | null; demo_willing: number | null; about: string | null; free_times: string | null }>();
  if (!t) return 0;
  const [choices, levels, students] = await Promise.all([myChoices(tutorId), myLevels(tutorId), myStudents(tutorId)]);
  return profilePercent(profileSteps(t, choices, levels, students.length));
}

/**
 * Gives the referrer their credit once the referred tutor's profile is 80% complete and HTR has checked them by
 * phone, whichever comes last. Called after a profile save and after a check. The amount is fixed now, by the referred
 * tutor's university and gender at this moment. Safe to call again: one credit per referred tutor.
 */
export async function creditReferral(tutorId: number, actorId: number | null) {
  const t = await env.DB.prepare(
    `SELECT t.id, t.code, t.referred_by, t.university, t.gender,
            EXISTS (SELECT 1 FROM tutor_checks c WHERE c.tutor_id = t.id) checked,
            EXISTS (SELECT 1 FROM wallet_entries w WHERE w.kind = 'referral' AND w.referred_tutor_id = t.id) credited
     FROM tutors t WHERE t.id = ?`,
  ).bind(tutorId).first<{ id: number; code: number; referred_by: number | null; university: string | null; gender: string | null; checked: number; credited: number }>();
  if (!t?.referred_by || !t.checked || t.credited) return;
  if ((await percentOf(tutorId)) < REFERRAL_PERCENT) return;
  const amount = referralAmount(t.university, t.gender);
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO wallet_entries (tutor_id, kind, delta, referred_tutor_id, note, created_by, created_at) VALUES (?, 'referral', ?, ?, ?, ?, ?)`)
        .bind(t.referred_by, amount, t.id, `Referred T-${t.code}`, actorId, now()),
      audit(actorId, "referral_credited", String(t.code), { amount }),
    ]);
  } catch {
    // Two saves at once: the unique index kept it to one credit.
  }
}

// ---------- Wallet ----------

export type WalletEntry = { id: number; kind: string; delta: number; note: string | null; created_at: number; referred_code: number | null; tuition_code: number | null; reversed: number };

export async function walletBalance(tutorId: number) {
  return (await env.DB.prepare(`SELECT COALESCE(sum(delta), 0) n FROM wallet_entries WHERE tutor_id = ?`).bind(tutorId).first<{ n: number }>())?.n ?? 0;
}

export async function walletEntries(tutorId: number): Promise<WalletEntry[]> {
  const { results } = await env.DB.prepare(
    `SELECT w.id, w.kind, w.delta, w.note, w.created_at, r.code referred_code, p.tuition_code,
            EXISTS (SELECT 1 FROM wallet_entries x WHERE x.reverses_id = w.id) reversed
     FROM wallet_entries w LEFT JOIN tutors r ON r.id = w.referred_tutor_id
     LEFT JOIN fee_entries f ON f.id = w.fee_entry_id LEFT JOIN placements p ON p.id = f.placement_id
     WHERE w.tutor_id = ? ORDER BY w.created_at DESC, w.id DESC LIMIT 100`,
  ).bind(tutorId).all<WalletEntry>();
  return results;
}

export type MyReferral = { code: number; joined_at: number; status: ReferralStatus; amount: number | null };

/** The tutors this tutor referred: code only (owner: no names), and where each one stands. */
export async function myReferredTutors(tutorId: number): Promise<MyReferral[]> {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.code, COALESCE(t.referred_at, t.created_at) joined_at,
            EXISTS (SELECT 1 FROM tutor_checks c WHERE c.tutor_id = t.id) checked,
            (SELECT w.delta FROM wallet_entries w WHERE w.kind = 'referral' AND w.referred_tutor_id = t.id) amount
     FROM tutors t WHERE t.referred_by = ? AND t.deleted_at IS NULL ORDER BY joined_at DESC LIMIT 100`,
  ).bind(tutorId).all<{ id: number; code: number; joined_at: number; checked: number; amount: number | null }>();
  return results.map((r) => ({
    code: r.code, joined_at: r.joined_at, amount: r.amount,
    status: r.amount ? "credited" : r.checked ? "needs_profile" : "needs_check",
  }));
}

// ---------- Admin ----------

/** For the admin's tutor page: who referred them, whether it earned credit, whom they referred, and their wallet. */
export async function referralAdmin(tutorId: number) {
  const [by, referred, balance, entries] = await Promise.all([
    env.DB.prepare(
      `SELECT r.code, r.full_name, EXISTS (SELECT 1 FROM wallet_entries w WHERE w.kind = 'referral' AND w.referred_tutor_id = t.id) credited
       FROM tutors t JOIN tutors r ON r.id = t.referred_by WHERE t.id = ?`,
    ).bind(tutorId).first<{ code: number; full_name: string; credited: number }>(),
    myReferredTutors(tutorId),
    walletBalance(tutorId),
    walletEntries(tutorId),
  ]);
  return { by, referred, balance, entries };
}

/** The owner fixes a wrong referrer (or clears it) until the referral has earned credit. Logged. */
export async function fixReferrer(tutorId: number, tutorCode: number, input: string, actorId: number | null): Promise<string | null> {
  const raw = input.trim();
  const who = raw ? await referrerByCode(codeFrom(raw)) : null;
  if (raw && !who) return "No tutor has this code.";
  if (who?.code === tutorCode) return "A tutor can't refer themselves.";
  try {
    await env.DB.batch([
      env.DB.prepare(`UPDATE tutors SET referred_by = ?, referred_at = COALESCE(referred_at, ?) WHERE id = ?`).bind(who?.id ?? null, now(), tutorId),
      audit(actorId, "referrer_fixed", String(tutorCode), { to: who?.code ?? null }),
    ]);
  } catch {
    return "This referral has already earned credit, so it can't change.";
  }
  return null;
}
