// The owner's voice clips (migration 0033). Public to hear, the owner alone uploads (the admin page calls requireAdmin
// before any function that writes). Files live in R2 under voice/.
import { env } from "cloudflare:workers";
import { VOICE_MAX_BYTES, VOICE_SLOTS, VOICE_TYPES, type VoiceClip, type VoiceSlot } from "./voice";

type Row = { slot: VoiceSlot; r2_key: string; mime: string; bytes: number; autoplay: number; updated_at: number };
const now = () => Math.floor(Date.now() / 1000);
const isSlot = (v: unknown): v is VoiceSlot => VOICE_SLOTS.some((s) => s.key === v);

const FRESH_MS = 60_000;
let loadedAt = 0;
let clips: VoiceClip[] = [];

/** For the root loader: which pages have a clip. One small query a minute per worker, as with areas. */
export async function siteVoice(): Promise<VoiceClip[]> {
  if (Date.now() - loadedAt < FRESH_MS) return clips;
  // Every page runs this, so a database that has not had migration 0033 yet must not take the site down.
  try {
    const { results } = await env.DB.prepare(`SELECT slot, autoplay, updated_at FROM site_voice`).all<Pick<Row, "slot" | "autoplay" | "updated_at">>();
    clips = results.filter((r) => isSlot(r.slot)).map((r) => ({ slot: r.slot, v: r.updated_at, auto: r.autoplay === 1 }));
  } catch {
    clips = [];
  }
  loadedAt = Date.now();
  return clips;
}

export async function voiceRows(): Promise<Row[]> {
  return (await env.DB.prepare(`SELECT slot, r2_key, mime, bytes, autoplay, updated_at FROM site_voice`).all<Row>()).results;
}

export const voiceRow = (slot: string) =>
  env.DB.prepare(`SELECT slot, r2_key, mime, bytes, autoplay, updated_at FROM site_voice WHERE slot = ?`).bind(slot).first<Row>();

function audit(actorId: number | null, action: string, slot: string, meta: unknown = {}) {
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, 'voice', ?, ?, ?)`)
    .bind(actorId, action, slot, JSON.stringify(meta), now());
}

/** Saves a slot from the admin form: a new file (optional once there is one) and the auto switch. Returns a problem or null. */
export async function saveVoice(form: FormData, actorId: number | null): Promise<string | null> {
  const slot = form.get("slot");
  if (!isSlot(slot)) return "Unknown page.";
  const autoplay = form.get("autoplay") === "1" ? 1 : 0;
  const old = await voiceRow(slot);
  const file = form.get("file");
  const t = now();
  if (!(file instanceof File) || file.size === 0) {
    if (!old) return "Choose an audio file first.";
    await env.DB.batch([
      env.DB.prepare(`UPDATE site_voice SET autoplay = ?, updated_by = ? WHERE slot = ?`).bind(autoplay, actorId, slot),
      audit(actorId, "voice_auto", slot, { autoplay }),
    ]);
    loadedAt = 0;
    return null;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = VOICE_TYPES[ext];
  if (!mime) return "Use an MP3 or M4A file. (Call-recorder files like AMR don't play in a browser.)";
  if (file.size > VOICE_MAX_BYTES) return "The file is over 3 MB. Keep the clip short (about a minute) or save it as MP3.";
  const key = `voice/${slot}-${t}.${ext}`;
  await env.PHOTOS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mime } });
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO site_voice (slot, r2_key, mime, bytes, autoplay, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (slot) DO UPDATE SET r2_key = excluded.r2_key, mime = excluded.mime, bytes = excluded.bytes, autoplay = excluded.autoplay,
         updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    ).bind(slot, key, mime, file.size, autoplay, actorId, t),
    audit(actorId, "voice_saved", slot, { bytes: file.size, autoplay }),
  ]);
  if (old && old.r2_key !== key) await env.PHOTOS.delete(old.r2_key);
  loadedAt = 0;
  return null;
}

export async function removeVoice(slot: unknown, actorId: number | null): Promise<string | null> {
  if (!isSlot(slot)) return "Unknown page.";
  const old = await voiceRow(slot);
  if (!old) return null;
  await env.DB.batch([env.DB.prepare(`DELETE FROM site_voice WHERE slot = ?`).bind(slot), audit(actorId, "voice_removed", slot)]);
  await env.PHOTOS.delete(old.r2_key);
  loadedAt = 0;
  return null;
}
