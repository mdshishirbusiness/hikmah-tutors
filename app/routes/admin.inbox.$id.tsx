// One WhatsApp chat, looking like WhatsApp (owner, 2026-11-18 / 2026-11-19): header with the person and Call, bubbles
// with ticks, the AI's suggested reply while it is quiet, the round send button, and the ⋮ menu (Take, Resume AI /
// Pause AI, Done, Save as lead, who this is). Replying here or from the phone app quiets the AI for 12 hours.
import { useEffect, useRef, useState } from "react";
import { Link, redirect, useFetcher, useRevalidator, useSearchParams } from "react-router";
import { ArrowLeft, ArrowUpRight, Bot, EllipsisVertical, Lock, Phone, SendHorizontal, X } from "lucide-react";
import type { Route } from "./+types/admin.inbox.$id";
import { Ticks, WA, WaAvatar, bubbleTime, dayLabel, sameDay, wallpaper } from "~/components/wa-ui";
import { requireStaff } from "~/lib/auth.server";
import { AREAS, labelOf } from "~/lib/options";
import { classLabel } from "~/lib/request";
import { leadFromChat } from "~/lib/wa-ai.server";
import { chatAction, getChat, markRead, now, sendText, type MessageRow } from "~/lib/wa.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.chat.name ?? "Chat"} · WhatsApp` }, { name: "robots", content: "noindex" }];
}

const scopeFor = (viewer: Awaited<ReturnType<typeof requireStaff>>) => (viewer?.role === "moderator" ? viewer.staffId ?? -1 : null);

export async function loader({ request, params }: Route.LoaderArgs) {
  const viewer = await requireStaff(request, "inbox");
  const found = await getChat(Number(params.id), scopeFor(viewer));
  if (!found) throw new Response("This chat is not one of yours.", { status: 404 });
  if (found.chat.unread) await markRead(found.chat.id);
  return { ...found, now: now() };
}

export async function action({ request, params }: Route.ActionArgs) {
  const viewer = await requireStaff(request, "inbox");
  const scope = scopeFor(viewer);
  const staffId = viewer?.role === "moderator" ? viewer.staffId ?? null : null;
  const id = Number(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  if (intent === "send" || intent === "lead") {
    if (!(await getChat(id, scope))) return { error: "This chat is another moderator's." };
    const error = intent === "send"
      ? await sendText(id, String(form.get("text") ?? ""), "staff", { userId: viewer?.id ?? null, staffId })
      : await leadFromChat(id);
    return error ? { error } : { ok: intent };
  }
  const error = await chatAction(id, intent, scope, staffId, String(form.get("value") ?? ""));
  if (error) return { error };
  if (intent === "release" && staffId) throw redirect("/admin/inbox");
  return { ok: intent };
}

const WHO: Record<string, { label: string; color: string }> = {
  ai: { label: "AI", color: "#00a884" },
  staff: { label: "Team", color: "#d1680a" },
  phone: { label: "From phone", color: "#7f66ff" },
  system: { label: "System", color: "#667781" },
};
const KIND: Record<string, string> = { guardian: "Guardian", tutor: "Tutor", other: "Other", unknown: "New chat" };

/** One bubble. `first`: first of a run from the same side, so it gets the tail (and, for ours, who sent it). */
function Bubble({ m, first }: { m: Pick<MessageRow, "id" | "direction" | "sender" | "type" | "body" | "media_key" | "status" | "error" | "created_at" | "by_name">; first: boolean }) {
  const out = m.direction === "out";
  const who = out ? WHO[m.sender] : null;
  const media = m.media_key ? `/admin/inbox/media/${m.id}` : null;
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"} ${first ? "mt-2" : "mt-0.5"}`}>
      <div className={`relative max-w-[82%] rounded-lg px-2 pt-1.5 pb-1 text-[15px] leading-[1.35] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] lg:max-w-[65%] ${first ? (out ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
        style={{ background: out ? WA.bubbleOut : "#fff" }}>
        {first && (
          <svg aria-hidden viewBox="0 0 8 13" width="8" height="13" className={`absolute top-0 ${out ? "-right-2" : "-left-2 -scale-x-100"}`}>
            <path d="M0 0h8L1.5 9.5C1 10.3 0 10 0 9V0z" fill={out ? WA.bubbleOut : "#fff"} />
          </svg>
        )}
        {first && who && <p className="px-0.5 text-[12.5px] font-semibold" style={{ color: who.color }}>{m.sender === "staff" && m.by_name ? m.by_name : who.label}</p>}
        {m.type === "audio" && (media ? <audio controls preload="none" src={media} className="my-1 h-11 w-64 max-w-full" /> : <p className="px-0.5 italic text-[#667781]">Voice message</p>)}
        {m.type === "image" && (media ? <img src={media} alt="Photo from the chat" loading="lazy" className="my-0.5 max-h-80 rounded-md" /> : <p className="px-0.5 italic text-[#667781]">Photo</p>)}
        {(m.type === "video" || m.type === "document") && (media ? <a href={media} className="block px-0.5 underline" style={{ color: WA.teal }}>Open {m.type}</a> : <p className="px-0.5 italic text-[#667781]">{m.type === "video" ? "Video" : "File"}</p>)}
        <p className="px-0.5 whitespace-pre-wrap break-words">
          {m.body ?? (m.type === "text" ? <span className="italic text-[#667781]">Text removed after 12 months</span> : null)}
          <span className="float-right ml-2 inline-flex translate-y-1.5 items-center gap-0.5 text-[11px] text-[#667781]">
            {bubbleTime(m.created_at)}{out && <Ticks status={m.status} size={15} />}
          </span>
        </p>
        {m.error && <p className="mt-1 rounded bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700">{m.error}</p>}
      </div>
    </div>
  );
}

export default function ChatPage({ loaderData: d }: Route.ComponentProps) {
  const { chat, messages, lead } = d;
  const { revalidate } = useRevalidator();
  const send = useFetcher<typeof action>();
  const act = useFetcher<typeof action>();
  const [sp] = useSearchParams();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const quiet = (chat.ai_paused_until ?? 0) > d.now;
  const byHand = (chat.ai_paused_until ?? 0) > d.now + 30 * 86400;
  const windowOpen = !!chat.last_in_at && chat.last_in_at > d.now - 24 * 3600;
  const name = chat.name ?? chat.phone ?? `+${chat.wa_id}`;
  const back = `/admin/inbox${sp.toString() ? `?${sp}` : ""}`;
  const error = (send.data && "error" in send.data && send.data.error) || (act.data && "error" in act.data && act.data.error) || null;

  // The message being sent shows at once with a clock, like WhatsApp.
  const pending = send.state !== "idle" && send.formData?.get("intent") === "send" ? String(send.formData.get("text") ?? "") : null;
  const shown = pending ? [...messages, { id: -1, direction: "out" as const, sender: "staff", type: "text", body: pending, media_key: null, status: "sending", error: null, created_at: d.now, by_name: null }] : messages;

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && revalidate(), 10000);
    return () => clearInterval(id);
  }, [revalidate]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [shown.length, chat.id]); // newer Chrome returns a Promise here
  useEffect(() => { if (send.state === "idle" && send.data && "ok" in send.data) setText(""); }, [send.state, send.data]);
  useEffect(() => { setMenu(false); }, [act.state === "submitting"]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // the box grows with the text, up to six lines
    const t = box.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 144)}px`;
  }, [text]);

  const submitText = (value: string) => {
    if (!value.trim() || send.state !== "idle") return;
    send.submit({ intent: "send", text: value }, { method: "post" });
  };
  const doAct = (intent: string, value = "") => act.submit({ intent, value }, { method: "post" });

  const subtitle = [KIND[chat.kind], chat.phone, chat.staff_name && `Taken by ${chat.staff_name}`].filter(Boolean).join(" · ");
  const menuItem = "flex min-h-12 w-full items-center px-5 text-left text-[15px] text-[#111b21] hover:bg-[#f5f6f6]";

  return (
    <section aria-label={`Chat with ${name}`} className="fixed inset-0 z-50 flex flex-col lg:static lg:z-auto lg:min-h-0" style={wallpaper}>
      {/* Header */}
      <header className="relative z-20 flex min-h-[60px] shrink-0 items-center gap-1 px-1.5 shadow-[0_1px_0_rgba(11,20,26,0.08)]" style={{ background: WA.bar }}>
        <Link to={back} aria-label="Back to chats" className="grid size-11 place-items-center rounded-full text-[#54656f] hover:bg-black/5 lg:hidden"><ArrowLeft size={22} /></Link>
        <span className="ml-1 lg:ml-2"><WaAvatar id={chat.id} name={name} size={40} urgent={!!chat.urgent} /></span>
        <div className="ml-2 min-w-0 flex-1">
          <h1 className="truncate text-[16.5px] font-medium text-[#111b21]">{name}</h1>
          <p className="truncate text-[13px] text-[#667781]">{subtitle}</p>
        </div>
        {chat.phone && <a href={`tel:${chat.phone}`} aria-label={`Call ${chat.phone}`} className="grid size-11 place-items-center rounded-full text-[#54656f] hover:bg-black/5"><Phone size={21} /></a>}
        <button type="button" onClick={() => setMenu(!menu)} aria-label="More" aria-expanded={menu} className="grid size-11 place-items-center rounded-full text-[#54656f] hover:bg-black/5">
          {menu ? <X size={22} /> : <EllipsisVertical size={22} />}
        </button>
        {menu && (
          <>
            <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className="fixed inset-0 z-10 cursor-default" />
            <div role="menu" className="absolute top-14 right-2 z-20 w-64 animate-fade rounded-lg bg-white py-2 shadow-lift">
              {quiet ? <button role="menuitem" onClick={() => doAct("resume")} className={menuItem}>Resume AI</button>
                : <button role="menuitem" onClick={() => doAct("pause")} className={menuItem}>Pause AI for this chat</button>}
              {chat.needs_human && <button role="menuitem" onClick={() => doAct("done")} className={menuItem}>Mark done</button>}
              {!chat.staff_id ? <button role="menuitem" onClick={() => doAct("take")} className={menuItem}>Take this chat</button>
                : <button role="menuitem" onClick={() => doAct("release")} className={menuItem}>Release this chat</button>}
              {chat.phone && (!lead || lead.status === "new") && <button role="menuitem" onClick={() => doAct("lead")} className={menuItem}>{lead ? "Update lead from chat" : "Save as lead"}</button>}
              {chat.guardian_id && <Link role="menuitem" to={`/admin/guardians/${chat.guardian_id}`} className={menuItem}>Guardian's past tuitions</Link>}
              {chat.tutor_code && <Link role="menuitem" to={`/admin/tutors/${chat.tutor_code}`} className={menuItem}>Tutor T-{chat.tutor_code}</Link>}
              <p className="mt-1 border-t border-[#e9edef] px-5 pt-2.5 pb-1 text-xs font-semibold text-[#667781]">Who is this?</p>
              <div className="flex flex-wrap gap-1.5 px-4 pb-1">
                {(["guardian", "tutor", "other"] as const).map((k) => (
                  <button key={k} role="menuitemradio" aria-checked={chat.kind === k} onClick={() => doAct("kind", k)}
                    className="min-h-9 rounded-full px-3 text-sm font-semibold" style={chat.kind === k ? { background: WA.chipOn, color: WA.chipOnText } : { background: WA.bar, color: "#54656f" }}>
                    {KIND[k]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </header>

      {/* What needs doing, in thin bars under the header */}
      {(chat.needs_human || quiet || lead) && (
        <div className="z-10 shrink-0 space-y-px text-[13.5px] shadow-sm">
          {chat.needs_human && (
            <div className={`flex min-h-11 items-center gap-2 px-4 ${chat.urgent ? "bg-rose-600 text-white" : "bg-[#ffeecd] text-[#54420a]"}`}>
              <span className="min-w-0 flex-1 font-semibold">{chat.urgent ? "Urgent" : "Needs you"}: {chat.needs_human}</span>
              <button type="button" onClick={() => doAct("done")} className={`min-h-9 shrink-0 rounded-full px-3 font-semibold ${chat.urgent ? "bg-white/20" : "bg-white/70"}`}>Done</button>
            </div>
          )}
          {quiet && (
            <div className="flex min-h-11 items-center gap-2 bg-white px-4 text-[#54656f]">
              <Bot size={16} className="shrink-0" style={{ color: WA.teal }} aria-hidden />
              <span className="min-w-0 flex-1">{byHand ? "AI paused for this chat" : `AI quiet until ${bubbleTime(chat.ai_paused_until!)}`}</span>
              <button type="button" onClick={() => doAct("resume")} className="min-h-9 shrink-0 rounded-full px-3 font-semibold" style={{ background: WA.chipOn, color: WA.chipOnText }}>Resume AI</button>
            </div>
          )}
          {lead && (
            <Link to={`/admin/leads?status=${lead.status === "new" ? "new" : "all"}`} className="flex min-h-11 items-center gap-2 bg-white px-4 text-[#111b21] hover:bg-[#f5f6f6]">
              <span className="rounded px-1.5 text-xs font-bold" style={{ background: WA.chipOn, color: WA.chipOnText }}>Lead</span>
              <span className="min-w-0 flex-1 truncate">{classLabel(lead.class_level, lead.class_other)} · {labelOf(AREAS, lead.area)}{lead.salary ? ` · ৳${lead.salary.toLocaleString("en-IN")}` : ""}</span>
              <ArrowUpRight size={16} className="shrink-0 text-[#667781]" aria-hidden />
            </Link>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-[6%]">
        <p className="mx-auto my-2 flex max-w-sm items-start gap-1.5 rounded-lg bg-[#ffeecd] px-3 py-1.5 text-center text-[12.5px] leading-snug text-[#54656f]">
          <Lock size={12} className="mt-0.5 shrink-0" aria-hidden />AI replies here as Hikmah's assistant. Only Hikmah staff can see this chat.
        </p>
        {shown.map((m, i) => {
          const prev = shown[i - 1];
          const newDay = !prev || !sameDay(prev.created_at, m.created_at);
          const first = newDay || prev.direction !== m.direction || prev.sender !== m.sender;
          return (
            <div key={m.id}>
              {newDay && <p className="mx-auto my-3 w-fit rounded-lg bg-white/95 px-3 py-1 text-[12.5px] text-[#54656f] shadow-sm">{dayLabel(m.created_at, d.now)}</p>}
              <Bubble m={m} first={first} />
            </div>
          );
        })}
        <div ref={end} className="h-2" />
      </div>

      {error && <p role="alert" className="shrink-0 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800">{error}</p>}
      {act.data && "ok" in act.data && act.data.ok === "lead" && act.state === "idle" && (
        <p className="shrink-0 px-4 py-2 text-sm font-semibold" style={{ background: WA.chipOn, color: WA.chipOnText }}>Lead saved. It is in Leads → New.</p>
      )}

      {/* The AI's suggestion while it is quiet */}
      {chat.suggestion && windowOpen && !pending && (
        <div className="shrink-0 border-t border-[#e9edef] bg-white px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: WA.teal }}><Bot size={14} aria-hidden />Suggested reply</p>
          <p className="mt-0.5 line-clamp-3 text-[14.5px] text-[#111b21]">{chat.suggestion}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => submitText(chat.suggestion!)} className="min-h-10 rounded-full px-4 text-sm font-semibold text-white" style={{ background: WA.teal }}>Send</button>
            <button type="button" onClick={() => { setText(chat.suggestion!); box.current?.focus(); }} className="min-h-10 rounded-full px-4 text-sm font-semibold text-[#54656f]" style={{ background: WA.bar }}>Edit</button>
          </div>
        </div>
      )}

      {/* Composer */}
      {windowOpen ? (
        <form onSubmit={(e) => { e.preventDefault(); submitText(text); }} className="flex shrink-0 items-end gap-2 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" style={{ background: WA.bar }}>
          <label htmlFor="reply" className="sr-only">Message</label>
          <textarea id="reply" ref={box} value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="Message"
            onKeyDown={(e) => { // Enter sends on a computer, like WhatsApp Web; on a phone Enter is a new line
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); submitText(text); }
            }}
            className="max-h-36 min-h-12 flex-1 resize-none rounded-3xl bg-white px-4 py-3 text-[16px] leading-6 text-[#111b21] outline-none placeholder:text-[#667781]" />
          <button type="submit" aria-label="Send" disabled={!text.trim() || send.state !== "idle"}
            className="grid size-12 shrink-0 place-items-center rounded-full text-white transition-opacity disabled:opacity-50" style={{ background: WA.teal }}>
            <SendHorizontal size={21} />
          </button>
        </form>
      ) : (
        <div className="flex shrink-0 items-center gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[13.5px] text-[#54656f]" style={{ background: WA.bar }}>
          <span className="flex-1">শেষ মেসেজের পর ২৪ ঘণ্টা পার হয়েছে, তাই WhatsApp এখন সাধারণ মেসেজ পাঠাতে দেয় না। কল করুন, বা উনি আবার লিখলে উত্তর দিন।</span>
          {chat.phone && <a href={`tel:${chat.phone}`} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 font-semibold text-white" style={{ background: WA.teal }}><Phone size={16} aria-hidden />Call</a>}
        </div>
      )}
    </section>
  );
}
