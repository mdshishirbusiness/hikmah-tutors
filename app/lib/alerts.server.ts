// Alerts for the WhatsApp Inbox (owner took the table, 2026-11-18; docs/DECISIONS.md):
// - Web Push to the admin's phone: free. The push itself carries no text; the phone asks /api/push (signed in) for it.
// - The owner's personal WhatsApp, for urgent chats and "no reply in 30 minutes": an approved utility template
//   (~$0.004 each), never at night (23:00–08:00 Dhaka: push only).
// - A nightly summary email (Cloudflare send_email, free).
// Keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (scripts/wa/vapid.mjs), set as Cloudflare secrets; never in code.
import { env } from "cloudflare:workers";
import { dhakaMonth, getSettings, isNight, monthUsage, now, purgeOld, sendTemplate } from "./wa.server";
import { bdPhone } from "./lead";

type AlertEnv = { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; OWNER_EMAILS?: string; EMAIL?: SendEmail };
const alertEnv = env as unknown as AlertEnv;

export const OWNER_ALERT_TEMPLATE = { name: "hikmah_staff_alert", lang: "bn" }; // body: "Hikmah Inbox: {{1}}। দেখুন: {{2}}"
const SITE = "https://hikmahtutor.com";

export const vapidPublicKey = () => alertEnv.VAPID_PUBLIC_KEY ?? null;

// ---------- Web Push (VAPID, no payload) ----------

const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

let signingKey: CryptoKey | null = null;
async function vapidHeader(endpoint: string): Promise<string | null> {
  const pub = alertEnv.VAPID_PUBLIC_KEY, d = alertEnv.VAPID_PRIVATE_KEY;
  if (!pub || !d) return null;
  if (!signingKey) {
    const raw = fromB64url(pub);
    signingKey = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: b64url(raw.slice(1, 33)), y: b64url(raw.slice(33, 65)), d, ext: true },
      { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  }
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: now() + 12 * 3600, sub: SITE })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${pub}`;
}

/** Who may see a note: the owner always; Inbox moderators for chats not yet taken; one moderator for their own chat. */
export type Audience = "owner" | "inbox" | `staff:${number}`;

const audienceSql = (a: Audience) =>
  a === "owner" ? "u.role = 'owner'"
    : a === "inbox" ? "(u.role = 'owner' OR (st.id IS NOT NULL AND (',' || st.perms || ',') LIKE '%,inbox,%'))"
      : `(u.role = 'owner' OR st.id = ${Number(a.slice(6))})`;

/** Saves the note and wakes the phones that may read it. */
export async function push(title: string, body: string, url: string, audience: Audience) {
  await env.DB.prepare(`INSERT INTO push_notes (title, body, url, audience, created_at) VALUES (?, ?, ?, ?, ?)`).bind(title, body.slice(0, 160), url, audience, now()).run();
  const { results } = await env.DB.prepare(
    `SELECT ps.id, ps.endpoint FROM push_subs ps JOIN users u ON u.id = ps.user_id LEFT JOIN staff st ON st.email = u.email AND st.removed_at IS NULL
     WHERE ${audienceSql(audience)}`,
  ).all<{ id: number; endpoint: string }>();
  await Promise.all(results.map(async (s) => {
    const auth = await vapidHeader(s.endpoint);
    if (!auth) return;
    const res = await fetch(s.endpoint, { method: "POST", headers: { Authorization: auth, TTL: "3600", Urgency: "high", "Content-Length": "0" } }).catch(() => null);
    if (res && (res.status === 404 || res.status === 410)) await env.DB.prepare(`DELETE FROM push_subs WHERE id = ?`).bind(s.id).run();
  }));
}

/** The newest note this signed-in person may see (the service worker shows it). */
export async function latestNote(viewer: { role: string; staffId?: number; perms: string[] } | null) {
  const owner = !viewer || viewer.role === "owner";
  const allowed = owner ? "1 = 1"
    : `(audience = 'staff:${Math.trunc(viewer!.staffId ?? -1)}'${viewer!.perms.includes("inbox") ? " OR audience = 'inbox'" : ""})`;
  return env.DB.prepare(`SELECT title, body, url FROM push_notes WHERE created_at > ? AND ${allowed} ORDER BY id DESC LIMIT 1`)
    .bind(now() - 3600).first<{ title: string; body: string; url: string }>();
}

export async function savePushSub(userId: number, endpoint: string) {
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000) return "Bad subscription.";
  await env.DB.prepare(`INSERT INTO push_subs (user_id, endpoint, created_at) VALUES (?, ?, ?) ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id`)
    .bind(userId, endpoint, now()).run();
  return null;
}
export const dropPushSub = (endpoint: string) => env.DB.prepare(`DELETE FROM push_subs WHERE endpoint = ?`).bind(endpoint).run();

// ---------- chat alerts ----------

type ChatInfo = { id: number; name: string | null; staff_id: number | null };

/** The owner's WhatsApp, at most once per 30 minutes per chat, never at night. */
async function alertOwnerWhatsApp(chat: ChatInfo, what: string) {
  if (isNight()) return;
  const phone = bdPhone((await getSettings()).alert_phone);
  if (!phone) return;
  const claimed = await env.DB.prepare(`UPDATE wa_chats SET alerted_at = ?1 WHERE id = ?2 AND (alerted_at IS NULL OR alerted_at < ?1 - 1800)`).bind(now(), chat.id).run();
  if (!claimed.meta.changes) return;
  const err = await sendTemplate(`+88${phone}`, OWNER_ALERT_TEMPLATE.name, OWNER_ALERT_TEMPLATE.lang, [what, `${SITE}/admin/inbox/${chat.id}`]);
  if (err) console.error("owner alert not sent", err);
}

/**
 * A chat needs a person. Push to whoever may take it; urgent ones (call request, complaint, anger) also go to the
 * owner's WhatsApp. Pushes for one chat are held to one per 5 minutes unless urgent.
 */
export async function chatNeedsHuman(chat: ChatInfo, reason: string, urgent: boolean) {
  const t = now();
  const fresh = await env.DB.prepare(`UPDATE wa_chats SET pushed_at = ?1 WHERE id = ?2 AND (?3 = 1 OR pushed_at IS NULL OR pushed_at < ?1 - 300)`).bind(t, chat.id, urgent ? 1 : 0).run();
  const who = chat.name ?? `Chat ${chat.id}`;
  if (fresh.meta.changes) await push(urgent ? `Urgent: ${reason}` : reason, `${who} · WhatsApp`, `/admin/inbox/${chat.id}`, chat.staff_id ? `staff:${chat.staff_id}` : "inbox");
  if (urgent) await alertOwnerWhatsApp(chat, `${reason} (${who})`);
}

export async function newLeadAlert(chat: ChatInfo, summary: string) {
  await push("New lead from WhatsApp", summary, `/admin/inbox/${chat.id}`, "inbox");
}

// ---------- cron ----------

/** Every 5 minutes: a chat waiting on a person for 30 minutes with no reply → the owner's WhatsApp (daytime only). */
export async function checkUnanswered() {
  if (isNight()) return;
  const t = now();
  const { results } = await env.DB.prepare(
    `SELECT id, name, staff_id, needs_human FROM wa_chats
     WHERE needs_human IS NOT NULL AND last_in_at < ?1 - 1800 AND last_in_at > ?1 - 86400
       AND (last_human_at IS NULL OR last_human_at < last_in_at) AND (alerted_at IS NULL OR alerted_at < last_in_at) LIMIT 20`,
  ).bind(t).all<ChatInfo & { needs_human: string }>();
  for (const c of results) await alertOwnerWhatsApp(c, `30 মিনিটে কেউ উত্তর দেয়নি: ${c.needs_human}`);
}

/** Nightly: the day's summary to the owner's email, then the retention clean-up. */
export async function nightly() {
  await purgeOld();
  const to = (alertEnv.OWNER_EMAILS ?? "").split(",")[0]?.trim();
  if (!alertEnv.EMAIL || !to) return;
  const since = now() - 86400;
  const day = await env.DB.prepare(
    `SELECT (SELECT count(DISTINCT chat_id) FROM wa_messages WHERE direction = 'in' AND created_at > ?1) AS chats,
            (SELECT count(*) FROM wa_chats WHERE created_at > ?1) AS new_chats,
            (SELECT count(*) FROM leads WHERE lead_source = 'whatsapp' AND synced_at > ?1) AS leads,
            (SELECT count(*) FROM wa_messages WHERE sender = 'ai' AND created_at > ?1) AS ai_replies,
            (SELECT count(*) FROM wa_chats WHERE needs_human IS NOT NULL) AS waiting`,
  ).bind(since).first<{ chats: number; new_chats: number; leads: number; ai_replies: number; waiting: number }>();
  const u = await monthUsage();
  const text = [
    `WhatsApp, last 24 hours`,
    `Chats: ${day?.chats ?? 0} (new: ${day?.new_chats ?? 0})`,
    `Leads from WhatsApp: ${day?.leads ?? 0}`,
    `AI replies: ${day?.ai_replies ?? 0}`,
    `Waiting for a person now: ${day?.waiting ?? 0}`,
    ``,
    `${dhakaMonth()}: AI cost $${(u.cost_micro_usd / 1e6).toFixed(2)}, messages sent ${u.sent}`,
    `${SITE}/admin/inbox`,
  ].join("\n");
  await alertEnv.EMAIL.send({ from: { name: "Hikmah Inbox", email: "alerts@hikmahtutor.com" }, to, subject: `WhatsApp: ${day?.leads ?? 0} leads, ${day?.waiting ?? 0} waiting`, text })
    .catch((e: unknown) => console.error("summary email not sent", e));
}
