// WhatsApp through YCloud (migration 0035; owner, 2026-11-18): webhook events in, messages out, the Inbox's data.
// The main number stays on the owner's phone (coexistence): what he sends there arrives as "echoes" and counts as a
// person replying. Keys live only in Cloudflare secrets (YCLOUD_API_KEY, YCLOUD_WEBHOOK_SECRET); never in code.
import { env } from "cloudflare:workers";
import { bdPhone } from "./lead";

type WaEnv = { YCLOUD_API_KEY?: string; YCLOUD_WEBHOOK_SECRET?: string; WA_FROM?: string };
export const waEnv = env as unknown as WaEnv;

export const now = () => Math.floor(Date.now() / 1000);
export const QUIET_SECONDS = 12 * 3600; // the AI stays quiet this long after a person replies (owner, 2026-11-18)
const WINDOW_SECONDS = 24 * 3600; // WhatsApp: free-form messages only within 24 h of their last message
const API = "https://api.ycloud.com/v2";

/** Dhaka month, e.g. "2026-11", for the AI budget. */
export const dhakaMonth = (sec = now()) => new Date((sec + 6 * 3600) * 1000).toISOString().slice(0, 7);
export const dhakaHour = (sec = now()) => new Date((sec + 6 * 3600) * 1000).getUTCHours();
/** 23:00–08:00 Dhaka: the AI says the team will call in the morning; urgent alerts go by push only (owner, 2026-11-18). */
export const isNight = (sec = now()) => { const h = dhakaHour(sec); return h >= 23 || h < 8; };

// ---------- webhook signature ----------

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * `YCloud-Signature: t={unix},s={HMAC-SHA256("{t}.{raw body}", secret)}`. YCloud doesn't say hex or base64, so either
 * is accepted. Older than 10 minutes is refused (a replayed request). `npm run dev` without the secret uses a fixed test
 * secret for scripts/wa/fake.mjs; a production build never does.
 */
export async function verifySignature(raw: string, header: string | null): Promise<boolean> {
  const secret = waEnv.YCLOUD_WEBHOOK_SECRET || (import.meta.env.DEV ? "dev-webhook-secret" : "");
  if (!secret || !header) return false;
  const parts: Record<string, string> = {};
  for (const p of header.split(",")) {
    const i = p.indexOf("=");
    if (i > 0) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
  const t = Number(parts.t);
  if (!parts.s || !Number.isFinite(t) || Math.abs(now() - t) > 600) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${parts.t}.${raw}`));
  return sameText(parts.s.toLowerCase(), hex(mac)) || sameText(parts.s, b64(mac));
}

// ---------- events ----------

type YMedia = { id?: string; link?: string; mime_type?: string; caption?: string; filename?: string };
export type YMessage = {
  id?: string; wamid?: string; from?: string; to?: string; type?: string; status?: string; externalId?: string;
  errorCode?: string; errorMessage?: string;
  text?: { body?: string }; button?: { text?: string }; reaction?: { emoji?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  location?: { name?: string; address?: string };
  image?: YMedia; video?: YMedia; audio?: YMedia; document?: YMedia; sticker?: YMedia;
  customerProfile?: { name?: string };
};
export type YEvent = { id?: string; type?: string; whatsappInboundMessage?: YMessage; whatsappMessage?: YMessage };

const digits = (s: string | undefined) => (s ?? "").replace(/\D/g, "");
const MEDIA = ["image", "video", "audio", "document", "sticker"] as const;

/** What to show for a message: its text, a button's text, a caption, or a short label. */
function bodyOf(m: YMessage): string | null {
  if (m.text?.body) return m.text.body;
  if (m.button?.text) return m.button.text;
  if (m.interactive) return m.interactive.button_reply?.title ?? m.interactive.list_reply?.title ?? null;
  if (m.reaction?.emoji) return m.reaction.emoji;
  if (m.location) return ["Location", m.location.name, m.location.address].filter(Boolean).join(": ");
  for (const k of MEDIA) if (m[k]) return m[k]!.caption ?? m[k]!.filename ?? null;
  return null;
}

const typeOf = (m: YMessage) => {
  const t = m.type ?? "text";
  return ["text", "button", "interactive"].includes(t) ? "text" : ["audio", "image", "video", "document", "sticker", "location", "reaction"].includes(t) ? t : "other";
};

const linkOf = (m: YMessage) => MEDIA.map((k) => m[k]?.link).find(Boolean) ?? null;

/** The chat for a WhatsApp number, made on first contact and matched to a known guardian or tutor by phone. */
async function chatFor(waId: string, name: string | null): Promise<number> {
  const t = now();
  const phone = bdPhone(waId) || null;
  const row = await env.DB.prepare(
    `INSERT INTO wa_chats (wa_id, phone, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (wa_id) DO UPDATE SET name = COALESCE(excluded.name, wa_chats.name), updated_at = excluded.updated_at
     RETURNING id, kind, created_at`,
  ).bind(waId, phone, name, t, t).first<{ id: number; kind: string; created_at: number }>();
  if (!row) throw new Error("chat not saved");
  if (row.created_at === t && phone) {
    await env.DB.prepare(
      `UPDATE wa_chats SET
         guardian_id = (SELECT id FROM guardians WHERE phone = ?1 OR alt_phone = ?1 LIMIT 1),
         tutor_id = (SELECT id FROM tutors WHERE (phone = ?1 OR alt_phone = ?1) AND deleted_at IS NULL LIMIT 1)
       WHERE id = ?2`,
    ).bind(phone, row.id).run();
    await env.DB.prepare(
      `UPDATE wa_chats SET kind = CASE WHEN tutor_id IS NOT NULL THEN 'tutor' WHEN guardian_id IS NOT NULL THEN 'guardian' ELSE kind END WHERE id = ?`,
    ).bind(row.id).run();
  }
  return row.id;
}

export type Inbound = { chatId: number; msgId: number; link: string | null };

/**
 * Stores one webhook event. Returns the new incoming message (the caller answers it in the background), or null.
 * A repeated event or message changes nothing. Throws on a database error, so YCloud sends it again.
 */
export async function handleEvent(ev: YEvent): Promise<Inbound | null> {
  if (!ev.id || !ev.type) return null;
  const fresh = await env.DB.prepare(`INSERT INTO wa_events (id, type, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`).bind(ev.id, ev.type, now()).run();
  if (!fresh.meta.changes) return null;
  try {
    if (ev.type === "whatsapp.inbound_message.received" && ev.whatsappInboundMessage) return await inbound(ev.whatsappInboundMessage);
    if (ev.type === "whatsapp.smb.message.echoes" && ev.whatsappMessage) await echo(ev.whatsappMessage);
    if (ev.type === "whatsapp.message.updated" && ev.whatsappMessage) await statusUpdate(ev.whatsappMessage);
    return null;
  } catch (e) {
    await env.DB.prepare(`DELETE FROM wa_events WHERE id = ?`).bind(ev.id).run();
    throw e;
  }
}

async function inbound(m: YMessage): Promise<Inbound | null> {
  const waId = digits(m.from);
  if (!waId || !m.id) return null;
  if (m.to) await setSetting("business_number", `+${digits(m.to)}`);
  const chatId = await chatFor(waId, m.customerProfile?.name?.slice(0, 80) ?? null);
  const t = now();
  const type = typeOf(m);
  const body = bodyOf(m)?.slice(0, 4000) ?? null;
  const row = await env.DB.prepare(
    `INSERT INTO wa_messages (chat_id, ycloud_id, wamid, direction, sender, type, body, created_at) VALUES (?, ?, ?, 'in', 'them', ?, ?, ?)
     ON CONFLICT (ycloud_id) DO NOTHING RETURNING id`,
  ).bind(chatId, m.id, m.wamid ?? null, type, body, t).first<{ id: number }>();
  if (!row) return null;
  if (type !== "reaction") {
    await env.DB.prepare(`UPDATE wa_chats SET last_in_at = ?, last_text = ?, unread = unread + 1, updated_at = ? WHERE id = ?`)
      .bind(t, preview(type, body), t, chatId).run();
  }
  return { chatId, msgId: row.id, link: linkOf(m) };
}

/** Sent from the owner's phone app: a person replied, so the AI goes quiet and "needs you" clears. */
async function echo(m: YMessage) {
  const waId = digits(m.to);
  if (!waId || !m.id) return;
  const chatId = await chatFor(waId, null);
  const t = now();
  const type = typeOf(m);
  const body = bodyOf(m)?.slice(0, 4000) ?? null;
  const row = await env.DB.prepare(
    `INSERT INTO wa_messages (chat_id, ycloud_id, wamid, direction, sender, type, body, status, created_at) VALUES (?, ?, ?, 'out', 'phone', ?, ?, ?, ?)
     ON CONFLICT (ycloud_id) DO NOTHING RETURNING id`,
  ).bind(chatId, m.id, m.wamid ?? null, type, body, m.status ?? "sent", t).first<{ id: number }>();
  if (!row) return;
  await humanReplied(chatId, preview(type, body));
}

async function statusUpdate(m: YMessage) {
  const status = m.status ?? null;
  const error = status === "failed" ? [m.errorCode, m.errorMessage].filter(Boolean).join(" ").slice(0, 300) || "failed" : null;
  const ext = /^m(\d+)$/.exec(m.externalId ?? "")?.[1];
  await env.DB.prepare(
    `UPDATE wa_messages SET status = ?, error = COALESCE(?, error), wamid = COALESCE(?, wamid), ycloud_id = COALESCE(ycloud_id, ?)
     WHERE ycloud_id = ? OR id = ?`,
  ).bind(status, error, m.wamid ?? null, m.id ?? null, m.id ?? "", ext ? Number(ext) : -1).run();
}

const preview = (type: string, body: string | null) =>
  (body ?? { audio: "Voice message", image: "Photo", video: "Video", document: "File", sticker: "Sticker", location: "Location" }[type] ?? "Message").slice(0, 140);

async function humanReplied(chatId: number, text: string, staffId?: number | null) {
  const t = now();
  await env.DB.prepare(
    `UPDATE wa_chats SET last_out_at = ?1, last_human_at = ?1, last_text = ?2, ai_paused_until = MAX(COALESCE(ai_paused_until, 0), ?3),
       needs_human = NULL, urgent = 0, suggestion = NULL, unread = 0, staff_id = COALESCE(staff_id, ?4), updated_at = ?1 WHERE id = ?5`,
  ).bind(t, text.slice(0, 140), t + QUIET_SECONDS, staffId ?? null, chatId).run();
}

/** Saves a voice note, photo or file to R2 (private; deleted after 90 days). Links from YCloud last 30 days with the key. */
export async function saveMedia(msgId: number, link: string) {
  const headers: Record<string, string> = waEnv.YCLOUD_API_KEY ? { "X-API-Key": waEnv.YCLOUD_API_KEY } : {};
  const res = await fetch(link, { headers });
  if (!res.ok || !res.body) return;
  const key = `wa/${msgId}`;
  await env.PHOTOS.put(key, res.body, { httpMetadata: { contentType: res.headers.get("Content-Type") ?? "application/octet-stream" } });
  await env.DB.prepare(`UPDATE wa_messages SET media_key = ? WHERE id = ?`).bind(key, msgId).run();
}

// ---------- sending ----------

async function businessNumber() {
  return waEnv.WA_FROM || (await getSettings()).business_number || "";
}

async function ycloud(path: string, body: object): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "X-API-Key": waEnv.YCLOUD_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok && json.status !== "failed", json };
}

/** One text to a chat, from the AI, a person in the Inbox, or the system. Refused outside the 24-hour window. */
export async function sendText(chatId: number, text: string, sender: "ai" | "staff" | "system", who?: { userId: number | null; staffId: number | null }): Promise<string | null> {
  const body = text.trim().slice(0, 4000);
  if (!body) return "Write a message first.";
  const chat = await env.DB.prepare(`SELECT wa_id, last_in_at FROM wa_chats WHERE id = ?`).bind(chatId).first<{ wa_id: string; last_in_at: number | null }>();
  if (!chat) return "Chat not found.";
  if (!chat.last_in_at || chat.last_in_at < now() - WINDOW_SECONDS) return "২৪ ঘণ্টা পার হয়ে গেছে: WhatsApp এখন শুধু অনুমোদিত টেমপ্লেট পাঠাতে দেয়। ফোনে কল করুন।";
  const t = now();
  const row = await env.DB.prepare(
    `INSERT INTO wa_messages (chat_id, direction, sender, user_id, type, body, status, created_at) VALUES (?, 'out', ?, ?, 'text', ?, 'sending', ?) RETURNING id`,
  ).bind(chatId, sender, who?.userId ?? null, body, t).first<{ id: number }>();
  if (!row) return "Not saved.";

  let status = "dev", error: string | null = null, ycloudId: string | null = null, wamid: string | null = null;
  if (waEnv.YCLOUD_API_KEY) {
    const from = await businessNumber();
    const r = await ycloud("/whatsapp/messages/sendDirectly", { from, to: `+${chat.wa_id}`, type: "text", text: { body }, externalId: `m${row.id}` });
    status = String(r.json.status ?? (r.ok ? "accepted" : "failed"));
    ycloudId = (r.json.id as string) ?? null;
    wamid = (r.json.wamid as string) ?? null;
    if (!r.ok) error = String(r.json.errorMessage ?? (r.json.error as { message?: string })?.message ?? "Not sent").slice(0, 300);
  } else if (!import.meta.env.DEV) {
    status = "failed";
    error = "YCloud is not set up yet.";
  }
  await env.DB.prepare(`UPDATE wa_messages SET status = ?, error = ?, ycloud_id = ?, wamid = ? WHERE id = ?`).bind(status, error, ycloudId, wamid, row.id).run();
  await env.DB.prepare(`INSERT INTO wa_usage (month, sent) VALUES (?, 1) ON CONFLICT (month) DO UPDATE SET sent = sent + 1`).bind(dhakaMonth()).run();
  if (sender === "staff") await humanReplied(chatId, body, who?.staffId);
  else await env.DB.prepare(`UPDATE wa_chats SET last_out_at = ?, last_text = ?, updated_at = ? WHERE id = ?`).bind(t, body.slice(0, 140), t, chatId).run();
  return error;
}

/** An approved template (outside the 24-hour window), e.g. the owner's alert. Returns an error text or null. */
export async function sendTemplate(toE164: string, name: string, lang: string, params: string[]): Promise<string | null> {
  if (!waEnv.YCLOUD_API_KEY) return import.meta.env.DEV ? null : "YCloud is not set up yet.";
  const from = await businessNumber();
  const r = await ycloud("/whatsapp/messages/sendDirectly", {
    from, to: toE164, type: "template",
    template: { name, language: { code: lang }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text.replace(/\s+/g, " ").slice(0, 200) })) }] },
  });
  return r.ok ? null : String(r.json.errorMessage ?? "Template not sent");
}

// ---------- settings and usage ----------

export type WaSettings = { alert_phone?: string; ai_on?: string; ai_budget_usd?: string; business_number?: string };

export async function getSettings(): Promise<WaSettings> {
  const { results } = await env.DB.prepare(`SELECT key, value FROM wa_settings`).all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

export const setSetting = (key: keyof WaSettings, value: string) =>
  env.DB.prepare(`INSERT INTO wa_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(key, value, now()).run();

export const DEFAULT_AI_BUDGET_USD = 8; // ≈ ৳1,000 of the owner's ৳1,000–1,500 a month; WhatsApp's own fees are small

export async function monthUsage(month = dhakaMonth()) {
  return (await env.DB.prepare(`SELECT ai_calls, input_tokens, output_tokens, cost_micro_usd, sent FROM wa_usage WHERE month = ?`).bind(month)
    .first<{ ai_calls: number; input_tokens: number; output_tokens: number; cost_micro_usd: number; sent: number }>())
    ?? { ai_calls: 0, input_tokens: 0, output_tokens: 0, cost_micro_usd: 0, sent: 0 };
}

// ---------- Inbox ----------

/** null = the owner (sees every chat); a moderator sees chats not yet taken and their own (owner, 2026-11-18). */
export type ChatScope = number | null;
const inScope = (scope: ChatScope, col = "c.staff_id") => (scope === null ? "" : ` AND (${col} IS NULL OR ${col} = ${Math.trunc(scope)})`);

export type ChatRow = {
  id: number; wa_id: string; phone: string | null; name: string | null; kind: string; guardian_id: number | null; tutor_id: number | null;
  lead_id: number | null; staff_id: number | null; staff_name: string | null; ai_paused_until: number | null; needs_human: string | null;
  urgent: number; suggestion: string | null; last_in_at: number | null; last_out_at: number | null; last_human_at: number | null;
  last_text: string | null; unread: number; tutor_code: number | null; past: number;
  last_dir: "in" | "out" | null; last_sender: string | null; last_status: string | null;
};

const CHAT_SELECT = `SELECT c.*, st.name AS staff_name, t.code AS tutor_code,
    (SELECT count(*) FROM tuition_private p WHERE c.guardian_id IS NOT NULL AND p.guardian_id = c.guardian_id) AS past,
    lm.direction AS last_dir, lm.sender AS last_sender, lm.status AS last_status
  FROM wa_chats c LEFT JOIN staff st ON st.id = c.staff_id LEFT JOIN tutors t ON t.id = c.tutor_id
  LEFT JOIN wa_messages lm ON lm.id = (SELECT max(id) FROM wa_messages WHERE chat_id = c.id AND type <> 'reaction')`;

export const WAITING_SQL = `(c.needs_human IS NOT NULL OR (c.unread > 0 AND c.ai_paused_until > unixepoch()))`;

export async function listChats(filter: string, scope: ChatScope, staffId: number | null) {
  const where = filter === "waiting" ? ` AND ${WAITING_SQL}` : filter === "mine" && staffId ? ` AND c.staff_id = ${Math.trunc(staffId)}` : "";
  const { results } = await env.DB.prepare(`${CHAT_SELECT} WHERE 1 = 1${inScope(scope)}${where} ORDER BY c.urgent DESC, COALESCE(c.last_in_at, c.updated_at) DESC LIMIT 100`).all<ChatRow>();
  const counts = await env.DB.prepare(
    `SELECT count(*) AS all_n, sum(CASE WHEN ${WAITING_SQL} THEN 1 ELSE 0 END) AS waiting FROM wa_chats c WHERE 1 = 1${inScope(scope)}`,
  ).first<{ all_n: number; waiting: number | null }>();
  return { chats: results, counts: { all: counts?.all_n ?? 0, waiting: counts?.waiting ?? 0 } };
}

export type MessageRow = { id: number; direction: "in" | "out"; sender: string; type: string; body: string | null; media_key: string | null; status: string | null; error: string | null; created_at: number; by_name: string | null };

export async function getChat(id: number, scope: ChatScope) {
  const chat = await env.DB.prepare(`${CHAT_SELECT} WHERE c.id = ?${inScope(scope)}`).bind(id).first<ChatRow>();
  if (!chat) return null;
  const { results } = await env.DB.prepare(
    `SELECT * FROM (SELECT m.id, m.direction, m.sender, m.type, m.body, m.media_key, m.status, m.error, m.created_at, COALESCE(st.name, u.name) AS by_name
       FROM wa_messages m LEFT JOIN users u ON u.id = m.user_id LEFT JOIN staff st ON st.email = u.email
       WHERE m.chat_id = ? ORDER BY m.id DESC LIMIT 200) ORDER BY id`,
  ).bind(id).all<MessageRow>();
  const lead = chat.lead_id
    ? await env.DB.prepare(`SELECT id, status, class_level, class_other, area, salary FROM leads WHERE id = ?`).bind(chat.lead_id)
        .first<{ id: number; status: string; class_level: string; class_other: string | null; area: string; salary: number | null }>()
    : null;
  return { chat, messages: results, lead };
}

export const markRead = (id: number) => env.DB.prepare(`UPDATE wa_chats SET unread = 0 WHERE id = ? AND unread > 0`).bind(id).run();

const FAR = 4102444800; // 2100-01-01: "paused by hand" until someone presses Resume AI

/** Inbox buttons. The chat must be in the viewer's scope; a moderator who acts on a chat not yet taken takes it. */
export async function chatAction(id: number, intent: string, scope: ChatScope, staffId: number | null, value = ""): Promise<string | null> {
  const ok = await env.DB.prepare(`SELECT 1 FROM wa_chats c WHERE c.id = ?${inScope(scope)}`).bind(id).first();
  if (!ok) return "This chat is another moderator's.";
  const t = now();
  const run = (sql: string, ...args: unknown[]) => env.DB.prepare(sql).bind(...args).run();
  switch (intent) {
    case "take": await run(`UPDATE wa_chats SET staff_id = ?, updated_at = ? WHERE id = ?`, staffId, t, id); break;
    case "release": await run(`UPDATE wa_chats SET staff_id = NULL, updated_at = ? WHERE id = ?`, t, id); break;
    case "resume": await run(`UPDATE wa_chats SET ai_paused_until = NULL, needs_human = NULL, urgent = 0, suggestion = NULL, updated_at = ? WHERE id = ?`, t, id); break;
    case "pause": await run(`UPDATE wa_chats SET ai_paused_until = ?, updated_at = ? WHERE id = ?`, FAR, t, id); break;
    case "done": await run(`UPDATE wa_chats SET needs_human = NULL, urgent = 0, unread = 0, updated_at = ? WHERE id = ?`, t, id); break;
    case "kind":
      if (!["guardian", "tutor", "other", "unknown"].includes(value)) return "Pick who this is.";
      await run(`UPDATE wa_chats SET kind = ?, updated_at = ? WHERE id = ?`, value, t, id); break;
    default: return "Unknown step.";
  }
  if (staffId && intent !== "release" && intent !== "take") await run(`UPDATE wa_chats SET staff_id = COALESCE(staff_id, ?) WHERE id = ?`, staffId, id);
  return null;
}

/** May this viewer open this chat's voice note or photo? */
export async function mediaFor(msgId: number, scope: ChatScope) {
  return env.DB.prepare(`SELECT m.media_key FROM wa_messages m JOIN wa_chats c ON c.id = m.chat_id WHERE m.id = ? AND m.media_key IS NOT NULL${inScope(scope)}`)
    .bind(msgId).first<{ media_key: string }>();
}

// ---------- retention (daily) ----------

/** Text after 12 months, voice notes and photos after 90 days, handled events after 7 days (owner, 2026-11-18). */
export async function purgeOld() {
  const t = now();
  const { results } = await env.DB.prepare(`SELECT id, media_key FROM wa_messages WHERE media_key IS NOT NULL AND created_at < ? LIMIT 500`).bind(t - 90 * 86400).all<{ id: number; media_key: string }>();
  if (results.length) {
    await env.PHOTOS.delete(results.map((r) => r.media_key));
    await env.DB.batch(results.map((r) => env.DB.prepare(`UPDATE wa_messages SET media_key = NULL WHERE id = ?`).bind(r.id)));
  }
  await env.DB.batch([
    env.DB.prepare(`UPDATE wa_messages SET body = NULL WHERE body IS NOT NULL AND created_at < ?`).bind(t - 365 * 86400),
    env.DB.prepare(`UPDATE wa_chats SET last_text = NULL WHERE last_text IS NOT NULL AND COALESCE(last_in_at, updated_at) < ?`).bind(t - 365 * 86400),
    env.DB.prepare(`DELETE FROM wa_events WHERE created_at < ?`).bind(t - 7 * 86400),
    env.DB.prepare(`DELETE FROM push_notes WHERE created_at < ?`).bind(t - 7 * 86400),
  ]);
}
