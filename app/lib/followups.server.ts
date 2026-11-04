// Follow-ups and conversation notes (owner, 2026-11-05, part D). Admin only: every caller has passed requireAdmin.
import { env } from "cloudflare:workers";
import { endOfDhakaDay } from "./dhaka";

export type FollowKind = "guardian" | "tutor" | "lead" | "tuition";
export const FOLLOW_KINDS = new Set<FollowKind>(["guardian", "tutor", "lead", "tuition"]);

export type Followup = {
  id: number; kind: FollowKind; ref_id: number; due_at: number; note: string | null; done_at: number | null; outcome: string | null;
  // what the row is about, for its label and link
  g_name: string | null; g_phone: string | null; t_name: string | null; t_code: number | null;
  l_name: string | null; l_class: string | null; l_area: string | null; tu_class: string | null; tu_area: string | null;
};
export type ContactNote = { id: number; body: string; created_at: number; followup_id: number | null };

const now = () => Math.floor(Date.now() / 1000);
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim().slice(0, max);

function audit(actorId: number | null, action: string, entityId: string, meta: unknown) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, 'followup', ?, ?, ?)`)
    .bind(actorId, action, entityId, JSON.stringify(meta), now());
}

const SELECT = `SELECT f.id, f.kind, f.ref_id, f.due_at, f.note, f.done_at, f.outcome,
  g.name g_name, g.phone g_phone, tu.full_name t_name, tu.code t_code,
  l.guardian_name l_name, l.class_level l_class, l.area l_area, t.class_level tu_class, t.area tu_area
  FROM followups f
  LEFT JOIN guardians g ON f.kind = 'guardian' AND g.id = f.ref_id
  LEFT JOIN tutors tu ON f.kind = 'tutor' AND tu.id = f.ref_id
  LEFT JOIN leads l ON f.kind = 'lead' AND l.id = f.ref_id
  LEFT JOIN tuitions t ON f.kind = 'tuition' AND t.code = f.ref_id`;

/** Open follow-ups due by the end of today (Dhaka), oldest first; plus how many are planned later. */
export async function dueFollowups() {
  const [due, later] = await Promise.all([
    env.DB.prepare(`${SELECT} WHERE f.done_at IS NULL AND f.due_at <= ? ORDER BY f.due_at LIMIT 50`).bind(endOfDhakaDay()).all<Followup>(),
    env.DB.prepare(`SELECT count(*) n FROM followups WHERE done_at IS NULL AND due_at > ?`).bind(endOfDhakaDay()).first<{ n: number }>(),
  ]);
  return { due: due.results, later: later?.n ?? 0 };
}

/** The open follow-ups and the notes on one guardian or tutor, for their page. */
export async function followupsFor(kind: "guardian" | "tutor", refId: number) {
  const [open, notes] = await Promise.all([
    env.DB.prepare(`${SELECT} WHERE f.kind = ? AND f.ref_id = ? AND f.done_at IS NULL ORDER BY f.due_at`).bind(kind, refId).all<Followup>(),
    env.DB.prepare(`SELECT id, body, created_at, followup_id FROM contact_notes WHERE kind = ? AND ref_id = ? ORDER BY created_at DESC LIMIT 100`).bind(kind, refId).all<ContactNote>(),
  ]);
  return { open: open.results, notes: notes.results };
}

export async function createFollowup(kind: string, refId: number, dueAt: number, note: string, actorId: number | null): Promise<string | null> {
  if (!FOLLOW_KINDS.has(kind as FollowKind) || !Number.isInteger(refId) || refId <= 0) return "Follow-up target not valid.";
  if (!Number.isInteger(dueAt) || dueAt < now() - 86400 || dueAt > now() + 366 * 86400) return "Pick a time within the next year.";
  const text = clean(note, 300);
  const row = await env.DB.prepare(`INSERT INTO followups (kind, ref_id, due_at, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`)
    .bind(kind, refId, dueAt, text || null, actorId, now()).first<{ id: number }>();
  if (row) await audit(actorId, "followup_set", String(row.id), { kind, ref_id: refId }).run();
  return null;
}

/** The guardian a lead or tuition belongs to, so a follow-up's outcome lands in that guardian's notes. */
async function personOf(f: { kind: string; ref_id: number }): Promise<{ kind: "guardian" | "tutor"; id: number } | null> {
  if (f.kind === "guardian" || f.kind === "tutor") return { kind: f.kind, id: f.ref_id };
  const row = f.kind === "lead"
    ? await env.DB.prepare(`SELECT COALESCE(l.guardian_id, (SELECT g.id FROM guardians g WHERE g.phone = l.phone)) id FROM leads l WHERE l.id = ?`).bind(f.ref_id).first<{ id: number | null }>()
    : await env.DB.prepare(`SELECT guardian_id id FROM tuition_private WHERE tuition_code = ?`).bind(f.ref_id).first<{ id: number | null }>();
  return row?.id ? { kind: "guardian", id: row.id } : null;
}

/** Done, with an optional outcome that also goes into the person's notes. */
export async function finishFollowup(id: number, outcome: string, actorId: number | null) {
  const f = await env.DB.prepare(`SELECT id, kind, ref_id, note FROM followups WHERE id = ? AND done_at IS NULL`).bind(id).first<{ id: number; kind: string; ref_id: number; note: string | null }>();
  if (!f) return;
  const text = clean(outcome, 300);
  const person = text ? await personOf(f) : null;
  await env.DB.batch([
    env.DB.prepare(`UPDATE followups SET done_at = ?, outcome = ? WHERE id = ?`).bind(now(), text || null, id),
    ...(person ? [env.DB.prepare(`INSERT INTO contact_notes (kind, ref_id, body, followup_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(person.kind, person.id, f.note ? `${f.note} → ${text}` : text, id, actorId, now())] : []),
    audit(actorId, "followup_done", String(id), { outcome: !!text }),
  ]);
}

/** Later: a new time for an open follow-up. */
export async function moveFollowup(id: number, dueAt: number, actorId: number | null) {
  if (!Number.isInteger(dueAt) || dueAt < now() - 3600) return;
  await env.DB.batch([
    env.DB.prepare(`UPDATE followups SET due_at = ? WHERE id = ? AND done_at IS NULL`).bind(dueAt, id),
    audit(actorId, "followup_moved", String(id), {}),
  ]);
}

export async function addNote(kind: string, refId: number, body: string, actorId: number | null): Promise<string | null> {
  if (kind !== "guardian" && kind !== "tutor") return "Notes are for guardians and tutors.";
  const text = clean(body, 600);
  if (!text) return "Write the note first.";
  await env.DB.prepare(`INSERT INTO contact_notes (kind, ref_id, body, created_by, created_at) VALUES (?, ?, ?, ?, ?)`).bind(kind, refId, text, actorId, now()).run();
  return null;
}

/** For the Today count in the menu: follow-ups already due. */
export async function followupsDueNow() {
  return (await env.DB.prepare(`SELECT count(*) n FROM followups WHERE done_at IS NULL AND due_at <= ?`).bind(now()).first<{ n: number }>())?.n ?? 0;
}
