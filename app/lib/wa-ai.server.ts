// The WhatsApp assistant (owner, 2026-11-18; docs/DECISIONS.md): Claude Haiku 5.5 reads the last ~20 messages with
// phone numbers and house/road details cut out, answers in the Hikmah style, saves a guardian's request as a lead, and
// hands the chat to a person when it should. It never claims to be a person; asked sincerely, it says it is Hikmah's
// assistant and hands over. Key: ANTHROPIC_API_KEY (Cloudflare secret). The paid API does not train on this data.
import Anthropic from "@anthropic-ai/sdk";
import { env } from "cloudflare:workers";
import { chatNeedsHuman, newLeadAlert } from "./alerts.server";
import { parseLead } from "./lead";
import { insertLead } from "./leads.server";
import { AREAS, CLASS_CHOICES, DAYS_PER_WEEK, MEDIUMS, STUDENT_GENDERS, SUBJECTS, TIMES_OF_DAY, TUTOR_GENDERS, labelOf } from "./options";
import { cutPhones } from "./redact";
import { classLabel } from "./request";
import { DEFAULT_AI_BUDGET_USD, QUIET_SECONDS, dhakaMonth, getSettings, isNight, monthUsage, now, saveMedia, sendText, type Inbound } from "./wa.server";
import { FILE_NOTE, GUARDIAN_FACTS, STYLE, TUTOR_FACTS, VOICE_ASK } from "./wa-style";

const aiEnv = env as unknown as { ANTHROPIC_API_KEY?: string };
const MODEL = "claude-haiku-5-5";
const HISTORY = 20; // messages sent per request: keeps every request far under Haiku's 100K price step
const WAIT_MS = 6000; // people send several short messages in a row; answer them together

// Haiku 5.5, per token in micro-dollars: $0.10 / $0.50 per 1M up to 100K tokens; cache write 1.25x, read 0.1x of input.
const COST = { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 };

/** House, road, flat or holding numbers → "[address]"; the area name stays (it is needed for the lead). */
export const cutAddress = (s: string) =>
  s.replace(/(house|home|road|flat|holding|plot|বাসা|বাড়ি|বাড়ী|রোড|রাস্তা|ফ্ল্যাট|হোল্ডিং|প্লট)\s*(no\.?|নং|নম্বর|#)?\s*[:.\-]?\s*[0-9০-৯][0-9০-৯\/\-a-zA-Z]*/gi, "[address]");
const clean = (s: string) => cutAddress(cutPhones(s));

const list = (opts: { key: string; label: string; alt?: string }[]) => opts.map((o) => `${o.key}=${o.label}${o.alt ? ` (${o.alt})` : ""}`).join("; ");

const SYSTEM = `You write WhatsApp replies for Hikmah Tutors (HTR), a home-tutor service in Rajshahi, Bangladesh. You write as part of the
Hikmah team ("আমরা"). Reply in the person's language: Bangla (চলিত) by default, simple English if they write English.

${STYLE}

Facts for guardians (say nothing beyond these):
${GUARDIAN_FACTS.map((f) => `- ${f}`).join("\n")}

Facts for tutors:
${TUTOR_FACTS.map((f) => `- ${f}`).join("\n")}

Rules:
- Talk only about Hikmah's work (home tutors, tuitions, joining as a tutor). Steer anything else back politely.
- Never set, suggest or estimate a salary or any fee. Never name, describe or promise a tutor. Never share anyone's phone,
  address or other contact. Never promise a guarantee or a time. Never decide about payments or refunds.
- Never say you are a bot or AI on your own, and never claim to be a human. If the person sincerely asks whether they are
  talking to a person, a bot or AI, answer honestly in one line that this is Hikmah's assistant (সহকারী) and that a team
  member will talk to them now; set handoff true with reason "Asked if a person".
- Hand off (handoff true) with a short reason in English when: they want a call or ask us to call (urgent), they complain,
  are angry or have a problem with a tutor (urgent), they bargain about salary or fees, ask about payment or refund, ask
  something the facts above don't cover, or a tutor asks anything beyond how to register. When handing off, your reply is
  one short line that a team member will contact them soon (at night: in the morning). Do not keep asking questions.
- Guardians: collect the class (required), the area in Rajshahi (required), subjects, medium, the student's gender,
  whether they want a male or female tutor, days per week, the time of day, and the salary THEY have in mind (ask, never
  suggest). Ask at most two things per message. Do not ask for a phone number (we have their WhatsApp number) or a house
  or road number. Once class and area are known and they have told you what they want, set lead.ready true and say the
  team will call them to settle the details (at night: in the morning). If they add details later, keep lead.ready true
  with all fields.
- Tutors: explain how to register at hikmahtutor.com in one or two lines; anything else, hand off.
- Text marked [phone] or [address] was removed for privacy; never ask them to repeat it.

Lead fields (use the keys; "" or null when unknown):
- class_level, one of: ${list(CLASS_CHOICES)}. If none fits use "other" and write it in class_other.
- area: an area key if one matches, else their words. Areas: ${list(AREAS)}.
- subjects, keys from: ${list(SUBJECTS)}. If none fits include "other" and write it in subject_other.
- medium: ${list(MEDIUMS)}. student_gender: ${list(STUDENT_GENDERS)}. tutor_gender: ${list(TUTOR_GENDERS)}.
- time_of_day: ${list(TIMES_OF_DAY)}. days_per_week: one of ${DAYS_PER_WEEK.join(", ")}. salary: taka per month as they said.
- notes: anything else useful in one short English line (no phone numbers or house numbers).

kind: who this is (guardian, tutor, other, or unknown if not clear yet).
reply: the exact WhatsApp message to send, or "" to send nothing (e.g. they only said thanks after we finished).`;

const keysOf = (opts: { key: string }[]) => ["", ...opts.map((o) => o.key)];
const str = { type: "string" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "kind", "handoff", "urgent", "handoff_reason", "lead"],
  properties: {
    reply: str,
    kind: { type: "string", enum: ["guardian", "tutor", "other", "unknown"] },
    handoff: { type: "boolean" },
    urgent: { type: "boolean" },
    handoff_reason: str,
    lead: {
      type: "object",
      additionalProperties: false,
      required: ["ready", "class_level", "class_other", "area", "subjects", "subject_other", "medium", "student_gender", "tutor_gender", "salary", "days_per_week", "time_of_day", "guardian_name", "notes"],
      properties: {
        ready: { type: "boolean" },
        class_level: { type: "string", enum: keysOf(CLASS_CHOICES) },
        class_other: str,
        area: str,
        subjects: { type: "array", items: { type: "string", enum: SUBJECTS.map((s) => s.key) } },
        subject_other: str,
        medium: { type: "string", enum: keysOf(MEDIUMS) },
        student_gender: { type: "string", enum: keysOf(STUDENT_GENDERS) },
        tutor_gender: { type: "string", enum: keysOf(TUTOR_GENDERS) },
        salary: { anyOf: [{ type: "integer" }, { type: "null" }] },
        days_per_week: { anyOf: [{ type: "integer" }, { type: "null" }] },
        time_of_day: { type: "string", enum: keysOf(TIMES_OF_DAY) },
        guardian_name: str,
        notes: str,
      },
    },
  },
} as const;

type LeadOut = { ready: boolean; class_level: string; class_other: string; area: string; subjects: string[]; subject_other: string; medium: string;
  student_gender: string; tutor_gender: string; salary: number | null; days_per_week: number | null; time_of_day: string; guardian_name: string; notes: string };
type AiOut = { reply: string; kind: "guardian" | "tutor" | "other" | "unknown"; handoff: boolean; urgent: boolean; handoff_reason: string; lead: LeadOut };

type Chat = { id: number; phone: string | null; name: string | null; kind: string; lead_id: number | null; staff_id: number | null; ai_paused_until: number | null; guardian_id: number | null; past: number };

async function chatRow(id: number) {
  return env.DB.prepare(
    `SELECT c.id, c.phone, c.name, c.kind, c.lead_id, c.staff_id, c.ai_paused_until, c.guardian_id,
       (SELECT count(*) FROM tuition_private p WHERE c.guardian_id IS NOT NULL AND p.guardian_id = c.guardian_id) AS past
     FROM wa_chats c WHERE c.id = ?`,
  ).bind(id).first<Chat>();
}

/** Marks the chat for a person and alerts. `quiet`: the AI stops writing in it for 12 hours. */
async function handOver(chat: Chat, reason: string, urgent: boolean, quiet: boolean) {
  await env.DB.prepare(
    `UPDATE wa_chats SET needs_human = ?, urgent = MAX(urgent, ?), ai_paused_until = CASE WHEN ? THEN MAX(COALESCE(ai_paused_until, 0), ?) ELSE ai_paused_until END, updated_at = ? WHERE id = ?`,
  ).bind(reason.slice(0, 120), urgent ? 1 : 0, quiet ? 1 : 0, now() + QUIET_SECONDS, now(), chat.id).run();
  await chatNeedsHuman(chat, reason, urgent);
}

/** Answers a new incoming message, in the background after the webhook has said OK. */
export async function respond({ chatId, msgId, link }: Inbound) {
  if (link) await saveMedia(msgId, link).catch((e) => console.error("media not saved", e));
  await new Promise((r) => setTimeout(r, WAIT_MS));
  const latest = await env.DB.prepare(`SELECT max(id) AS id FROM wa_messages WHERE chat_id = ? AND direction = 'in' AND type <> 'reaction'`).bind(chatId).first<{ id: number }>();
  if (latest?.id !== msgId) return; // a newer message came in; its turn answers both

  const chat = await chatRow(chatId);
  const msg = await env.DB.prepare(`SELECT type FROM wa_messages WHERE id = ?`).bind(msgId).first<{ type: string }>();
  if (!chat || !msg) return;
  const paused = (chat.ai_paused_until ?? 0) > now();
  const settings = await getSettings();
  const aiOn = settings.ai_on !== "0";

  // Voice notes and files: the AI asks for text once and a person listens (owner chose (a), 2026-11-18).
  if (msg.type !== "text" && msg.type !== "location") {
    const voice = msg.type === "audio" || msg.type === "video";
    if (!paused && aiOn) {
      const said = await env.DB.prepare(`SELECT 1 FROM wa_messages WHERE chat_id = ? AND sender = 'ai' AND body = ? AND created_at > ?`)
        .bind(chatId, voice ? VOICE_ASK : FILE_NOTE, now() - QUIET_SECONDS).first();
      if (!said) await sendText(chatId, voice ? VOICE_ASK : FILE_NOTE, "ai");
    }
    await handOver(chat, voice ? "Voice message" : "Photo or file", false, false);
    return;
  }
  if (!aiOn) return handOver(chat, "AI is off", false, false);
  const budget = Number(settings.ai_budget_usd) || DEFAULT_AI_BUDGET_USD;
  if ((await monthUsage()).cost_micro_usd >= budget * 1e6) return handOver(chat, "AI budget used up", false, false);

  let out: AiOut | null;
  try {
    out = await think(chat);
  } catch (e) {
    console.error("AI failed", e);
    out = null;
  }
  if (!out) return handOver(chat, "AI could not answer", false, false);

  if (out.kind !== "unknown" && chat.kind === "unknown") await env.DB.prepare(`UPDATE wa_chats SET kind = ? WHERE id = ? AND kind = 'unknown'`).bind(out.kind, chatId).run();

  // While a person is handling the chat, the AI only suggests (owner, 2026-11-18).
  if (paused) {
    await env.DB.prepare(`UPDATE wa_chats SET suggestion = ? WHERE id = ?`).bind(out.reply.slice(0, 2000) || null, chatId).run();
    await chatNeedsHuman(chat, "New message", false);
    return;
  }

  if (out.lead.ready) await saveLead(chat, out.lead);
  if (out.reply.trim()) await sendText(chatId, out.reply, "ai");
  if (out.handoff) await handOver(chat, out.handoff_reason || "Needs a person", out.urgent, true);
}

/** One request to Haiku; null when it refused or returned nothing usable. */
async function think(chat: Chat): Promise<AiOut | null> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM (SELECT id, sender, type, body FROM wa_messages WHERE chat_id = ? AND type <> 'reaction' ORDER BY id DESC LIMIT ?) ORDER BY id`,
  ).bind(chat.id, HISTORY).all<{ id: number; sender: string; type: string; body: string | null }>();
  const messages: Anthropic.MessageParam[] = [];
  for (const m of results) {
    const text = m.body ? clean(m.body) : `[${m.type}]`;
    const role = m.sender === "them" ? "user" : "assistant";
    if (!messages.length && role === "assistant") continue; // must start with them
    messages.push({ role, content: m.sender === "staff" || m.sender === "phone" ? `(team member) ${text}` : text });
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") return null;

  const lead = chat.lead_id ? await env.DB.prepare(`SELECT status FROM leads WHERE id = ?`).bind(chat.lead_id).first<{ status: string }>() : null;
  const context = [
    isNight() ? "It is night in Rajshahi now (23:00–08:00): the team calls in the morning." : "It is daytime in Rajshahi: the team calls today.",
    chat.past ? `This is a known guardian (${chat.past} past tuition(s) with us).` : "",
    lead ? `A lead from this chat is already saved (status: ${lead.status}).` : "",
  ].filter(Boolean).join(" ");
  messages.push({ role: "system", content: context } as unknown as Anthropic.MessageParam);

  if (!aiEnv.ANTHROPIC_API_KEY) {
    if (!import.meta.env.DEV) throw new Error("ANTHROPIC_API_KEY is not set");
    return devAnswer(results.filter((m) => m.sender === "them").map((m) => m.body ?? "").join(" "));
  }

  const client = new Anthropic({ apiKey: aiEnv.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
  });
  const u = res.usage;
  const cost = Math.ceil(u.input_tokens * COST.input + u.output_tokens * COST.output + (u.cache_creation_input_tokens ?? 0) * COST.cacheWrite + (u.cache_read_input_tokens ?? 0) * COST.cacheRead);
  await env.DB.prepare(
    `INSERT INTO wa_usage (month, ai_calls, input_tokens, output_tokens, cost_micro_usd) VALUES (?1, 1, ?2, ?3, ?4)
     ON CONFLICT (month) DO UPDATE SET ai_calls = ai_calls + 1, input_tokens = input_tokens + ?2, output_tokens = output_tokens + ?3, cost_micro_usd = cost_micro_usd + ?4`,
  ).bind(dhakaMonth(), u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), u.output_tokens, cost).run();
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  try {
    return text ? (JSON.parse(text) as AiOut) : null;
  } catch {
    return null;
  }
}

/** `npm run dev` without a key: a fixed answer so the Inbox can be tried on synthetic chats. Never in production. */
function devAnswer(said: string): AiOut {
  const call = /call|কল|ফোন/i.test(said);
  const lead: LeadOut = { ready: /class|ক্লাস/i.test(said), class_level: "class-8", class_other: "", area: "uposhohor", subjects: ["math"], subject_other: "",
    medium: "", student_gender: "", tutor_gender: "", salary: null, days_per_week: null, time_of_day: "", guardian_name: "", notes: "dev answer" };
  return {
    reply: call ? "[dev] আমাদের টিমের একজন শীঘ্রই আপনাকে ফোন করবেন।" : "[dev] ওয়ালাইকুম আসসালাম। কোন ক্লাসের জন্য, কোন এলাকায় টিউটর লাগবে?",
    kind: "guardian", handoff: call, urgent: call, handoff_reason: call ? "Wants a call" : "", lead,
  };
}

/** Area key from what the AI wrote: a key, a label or a Bangla name; else their own words. */
function areaKey(a: string) {
  const s = a.trim().toLowerCase();
  if (!s) return "";
  const hit = AREAS.find((o) => o.key === s || o.label.toLowerCase() === s || (o.alt ?? "").toLowerCase().split(/\s+/).includes(s));
  return hit?.key ?? a.trim();
}

/** The guardian's request as a lead (source WhatsApp, phone = their WhatsApp number). While it is still New, it is kept up to date. */
async function saveLead(chat: Chat, l: LeadOut) {
  if (!chat.phone) return;
  const existing = chat.lead_id ? await env.DB.prepare(`SELECT status, client_id FROM leads WHERE id = ?`).bind(chat.lead_id).first<{ status: string; client_id: string }>() : null;
  if (existing && existing.status !== "new") return;
  const { lead } = parseLead({
    ...l, area: areaKey(l.area), salary: l.salary ?? "", phone: chat.phone, lead_source: "whatsapp",
    client_id: existing?.client_id ?? crypto.randomUUID(), created_at: now(), notes: clean(l.notes ?? ""),
    guardian_name: l.guardian_name || chat.name || "",
  });
  if (!lead) return; // not enough yet; the AI keeps asking
  if (existing && chat.lead_id) {
    await env.DB.prepare(
      `UPDATE leads SET guardian_name = ?, class_level = ?, class_other = ?, medium = ?, student_gender = ?, tutor_gender = ?, subjects = ?, subject_other = ?,
         area = ?, salary = ?, days_per_week = ?, time_of_day = ?, notes = ? WHERE id = ? AND status = 'new'`,
    ).bind(lead.guardian_name || null, lead.class_level, lead.class_other || null, lead.medium || null, lead.student_gender || null, lead.tutor_gender || null,
      lead.subjects.join(",") || null, lead.subject_other || null, lead.area, lead.salary, lead.days_per_week, lead.time_of_day || null, lead.notes || null, chat.lead_id).run();
    return;
  }
  await insertLead(lead);
  const row = await env.DB.prepare(`SELECT id FROM leads WHERE client_id = ?`).bind(lead.client_id).first<{ id: number }>();
  if (!row) return;
  await env.DB.prepare(`UPDATE wa_chats SET lead_id = ?, kind = 'guardian' WHERE id = ?`).bind(row.id, chat.id).run();
  await newLeadAlert(chat, `${classLabel(lead.class_level, lead.class_other)} · ${labelOf(AREAS, lead.area)}`);
}

/** Inbox "Save as lead": the same reading on demand, without sending anything. */
export async function leadFromChat(chatId: number): Promise<string | null> {
  const chat = await chatRow(chatId);
  if (!chat) return "Chat not found.";
  if (!chat.phone) return "This number is not a Bangladesh mobile; add the lead from Quick Pad.";
  const out = await think(chat);
  if (!out) return "The AI could not read this chat. Add the lead from Quick Pad.";
  const before = chat.lead_id;
  await saveLead(chat, { ...out.lead, ready: true });
  const after = await chatRow(chatId);
  return after?.lead_id || before ? null : "Class or area is still missing in the chat.";
}
