// Areas the owner adds while posting a tuition (owner, 2026-11-09, migration 0030). They join AREAS in options.ts, so
// the tuition form, board filters, tutors' area choices and every label pick them up with no other change.
import { env } from "cloudflare:workers";
import { AREAS, addAreas, type Option } from "./options";

const FRESH_MS = 60_000;
let loadedAt = 0;
let added: Option[] = [];

/** Runs before every loader and action (root middleware). One small query a minute per worker; an area added on this
 * worker is in at once, one added on another worker within the minute. */
export async function loadAreas(): Promise<void> {
  if (Date.now() - loadedAt < FRESH_MS) return;
  const { results } = await env.DB.prepare(`SELECT key, label, alt FROM areas ORDER BY created_at, key`).all<{ key: string; label: string; alt: string | null }>();
  added = results.map((r) => ({ key: r.key, label: r.label, ...(r.alt ? { alt: r.alt } : {}) }));
  addAreas(added);
  loadedAt = Date.now();
}

/** For the root loader, so the browser's AREAS matches the server's. */
export const addedAreas = () => added;

const same = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

/** The words checked before a new area is saved. Returns a problem, or null. */
export function newAreaProblem(form: FormData): string | null {
  const name = String(form.get("area_other") ?? "").trim(), alt = String(form.get("area_alt") ?? "").trim();
  if (name.length < 2) return "Write the new area's name.";
  if (name.length > 40 || alt.length > 80) return "Area name is too long.";
  if (/\d{5,}/.test(`${name}${alt}`.replace(/[\s-]/g, ""))) return "Area name can't contain a phone number.";
  return null;
}

/**
 * Turns "New area…" into a key on the list. A name already on it (English or Bangla spelling) is reused, so typing
 * "uposhohor" again gives the old key; otherwise the area is saved and joins the list at once.
 */
export async function areaKeyFromForm(form: FormData, actorId: number | null): Promise<string> {
  const name = String(form.get("area_other") ?? "").trim().replace(/\s+/g, " ");
  const alt = String(form.get("area_alt") ?? "").trim().replace(/\s+/g, " ");
  const spellings = (a: Option) => [a.label, a.alt ?? "", ...(a.alt ?? "").split(" ")].filter(Boolean);
  const found = AREAS.find((a) => spellings(a).some((w) => same(w, name) || (alt !== "" && same(w, alt))));
  if (found) return found.key;
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "area";
  let key = base;
  for (let n = 2; AREAS.some((a) => a.key === key); n++) key = `${base}-${n}`;
  const label = name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO areas (key, label, alt, created_by, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(key, label, alt || null, actorId, Math.floor(Date.now() / 1000)),
    env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, 'area_added', 'area', ?, ?, ?)`)
      .bind(actorId, key, JSON.stringify({ label }), Math.floor(Date.now() / 1000)),
  ]);
  const area = { key, label, ...(alt ? { alt } : {}) };
  added = [...added, area];
  addAreas([area]);
  return key;
}
