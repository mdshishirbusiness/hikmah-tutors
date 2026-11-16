// Moderators (migration 0034): add, change switches, remove, and what they did. Owner only: every caller has passed
// requireAdmin. Each change is in the audit log (Gmail and switch keys only).
import { env } from "cloudflare:workers";
import { type Perm, PERMS, parsePerms } from "./staff";

const now = () => Math.floor(Date.now() / 1000);
const GMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type StaffRow = { id: number; email: string; name: string | null; perms: Perm[]; created_at: number; last_login_at: number | null; open: number; codes: string | null };

export async function listStaff(): Promise<StaffRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT st.id, st.email, st.name, st.perms, st.created_at, u.last_login_at,
            (SELECT count(*) FROM tuition_private p JOIN tuitions t ON t.code = p.tuition_code
              WHERE p.staff_id = st.id AND t.status IN ('draft', 'available', 'processing')) open,
            (SELECT group_concat(code, ',') FROM (SELECT t.code FROM tuition_private p JOIN tuitions t ON t.code = p.tuition_code
              WHERE p.staff_id = st.id AND t.status IN ('draft', 'available', 'processing') ORDER BY t.code DESC LIMIT 30)) codes
     FROM staff st LEFT JOIN users u ON u.email = st.email WHERE st.removed_at IS NULL ORDER BY st.created_at`,
  ).all<Omit<StaffRow, "perms"> & { perms: string }>();
  return results.map((r) => ({ ...r, perms: parsePerms(r.perms) }));
}

const permsFrom = (form: FormData) => PERMS.map((p) => p.key).filter((k) => form.get(`perm_${k}`) === "1");

const audit = (actorId: number | null, action: string, staffId: number, meta: object) =>
  env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, 'staff', ?, ?, ?)`)
    .bind(actorId, action, String(staffId), JSON.stringify(meta), now());

export async function addStaff(form: FormData, actorId: number | null): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || null;
  if (!GMAIL.test(email)) return "Write the moderator's full Gmail, e.g. name@gmail.com.";
  const taken = await env.DB.prepare(
    `SELECT (SELECT role FROM users WHERE email = ?1) AS role,
            (SELECT code FROM tutors WHERE deleted_at IS NULL AND (email = ?1 OR user_id = (SELECT id FROM users WHERE email = ?1)) LIMIT 1) AS tutor,
            (SELECT id FROM staff WHERE email = ?1 AND removed_at IS NULL) AS staff`,
  ).bind(email).first<{ role: string | null; tutor: number | null; staff: number | null }>();
  if (taken?.role === "owner") return "This is the owner's Gmail.";
  if (taken?.staff) return "This Gmail is already a moderator.";
  // A tutor can't be a moderator, so nobody selects themself (owner, 2026-11-16).
  if (taken?.tutor) return `This Gmail belongs to tutor T-${taken.tutor}. Ask them for a different Gmail for moderator work.`;
  const perms = permsFrom(form);
  const t = now();
  const row = await env.DB.prepare(
    `INSERT INTO staff (email, name, perms, added_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (email) DO UPDATE SET name = excluded.name, perms = excluded.perms, added_by = excluded.added_by, updated_at = excluded.updated_at, removed_at = NULL
     RETURNING id`,
  ).bind(email, name, perms.join(","), actorId, t, t).first<{ id: number }>();
  if (row) await audit(actorId, "staff_added", row.id, { perms }).run();
  return null;
}

export async function setStaffPerms(id: number, form: FormData, actorId: number | null): Promise<string | null> {
  const perms = permsFrom(form);
  const done = await env.DB.prepare(`UPDATE staff SET perms = ?, updated_at = ? WHERE id = ? AND removed_at IS NULL`).bind(perms.join(","), now(), id).run();
  if (!done.meta.changes) return "Moderator not found.";
  await audit(actorId, "staff_updated", id, { perms }).run();
  return null;
}

/** "1362, HTR-1370 1401" → [1362, 1370, 1401]. */
export const codesFrom = (text: string) => (text.match(/\d{1,6}/g) ?? []).map(Number);

/** Ends their access at once (their tuitions go back to the owner alone): the row is closed and every session of that Gmail is signed out. */
export async function removeStaff(id: number, actorId: number | null): Promise<string | null> {
  const st = await env.DB.prepare(`SELECT email FROM staff WHERE id = ? AND removed_at IS NULL`).bind(id).first<{ email: string }>();
  if (!st) return "Moderator not found.";
  const t = now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE staff SET removed_at = ?, updated_at = ? WHERE id = ?`).bind(t, t, id),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)`).bind(st.email),
    env.DB.prepare(`UPDATE tuition_private SET staff_id = NULL, updated_at = ? WHERE staff_id = ?`).bind(t, id),
    audit(actorId, "staff_removed", id, {}),
  ]);
  return null;
}

/** Is this Gmail a moderator? The tutor account form refuses one (owner, 2026-11-16). */
export const isStaffEmail = async (email: string) =>
  !!(await env.DB.prepare(`SELECT 1 FROM staff WHERE email = ? AND removed_at IS NULL`).bind(email.trim().toLowerCase()).first());

export type StaffActivity = { id: number; who: string; action: string; entity_type: string; entity_id: string | null; created_at: number };

/** The latest things moderators did or opened, newest first. Includes removed moderators' past actions. */
export async function staffActivity(limit = 60): Promise<StaffActivity[]> {
  const { results } = await env.DB.prepare(
    `SELECT l.id, COALESCE(st.name, u.name, u.email) AS who, l.action, l.entity_type, l.entity_id, l.created_at
     FROM audit_log l JOIN users u ON u.id = l.actor_user_id JOIN staff st ON st.email = u.email
     WHERE u.role <> 'owner' AND l.created_at >= st.created_at
     ORDER BY l.id DESC LIMIT ?`,
  ).bind(limit).all<StaffActivity>();
  return results;
}
