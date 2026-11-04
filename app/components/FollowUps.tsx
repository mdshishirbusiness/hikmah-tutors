// Follow-ups and notes in admin (owner, 2026-11-05, part D): a "Follow up" button wherever a guardian, tutor, lead or
// tuition is open, rows that show on Today when due (Done, with an outcome, or Later), and a notes timeline on guardian
// and tutor pages. Everything posts to /admin/followups through a fetcher, so the page keeps its place.
import { useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { BellPlus, Check, Clock, MessagesSquare, X } from "lucide-react";
import { SectionCard } from "~/components/SectionCard";
import { agoBn, dhakaAt, dueLabel, lateBn } from "~/lib/dhaka";
import type { ContactNote, FollowKind, Followup } from "~/lib/followups.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";

const ACTION = "/admin/followups";
const box = "w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
// Notes the owner writes most, in Bangla, one tap each.
const NOTE_HINTS = ["আবার কল করবেন", "ডেমোর পর খবর নেবেন", "পরীক্ষার পর কল", "বেতন নিয়ে কথা", "টিউটর ঠিক আছে কি না জানবেন"];

function choices(now = Math.floor(Date.now() / 1000)) {
  const evening = dhakaAt(0, 19);
  return [
    evening - now > 1800 ? { key: "evening", label: "Today evening", at: evening } : { key: "hour", label: "In 1 hour", at: now + 3600 },
    { key: "tomorrow", label: "Tomorrow", at: dhakaAt(1, 10) },
    { key: "three", label: "In 3 days", at: dhakaAt(3, 10) },
    { key: "week", label: "Next week", at: dhakaAt(7, 10) },
  ];
}

/** Datetime-local value (Dhaka) to unix seconds; the owner's phone and laptop are on Dhaka time. */
const fromLocal = (v: string) => (v ? Math.floor(new Date(v).getTime() / 1000) : 0);

export function FollowUpButton({ kind, refId, note = "", className = "" }: { kind: FollowKind; refId: number; note?: string; className?: string }) {
  const fetcher = useFetcher<{ error: string | null; done: string | null }>();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("tomorrow");
  const [custom, setCustom] = useState("");
  const [text, setText] = useState(note);
  const [saved, setSaved] = useState<string | null>(null);
  const sentAt = useRef(0);
  const wrap = useRef<HTMLDivElement>(null);
  const opts = choices();
  const at = pick === "custom" ? fromLocal(custom) : opts.find((o) => o.key === pick)?.at ?? 0;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  useEffect(() => {
    if (fetcher.state !== "idle" || fetcher.data?.done !== "set" || fetcher.data.error) return;
    setOpen(false);
    setSaved(dueLabel(sentAt.current));
    const t = setTimeout(() => setSaved(null), 4000);
    return () => clearTimeout(t);
    // only when a save finishes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  return (
    <div ref={wrap} className={`relative inline-block ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring transition-colors hover:bg-sky-50">
        {saved ? <Check size={16} className="text-emerald-600" aria-hidden /> : <BellPlus size={16} aria-hidden />}{saved ? `Set · ${saved}` : "Follow up"}
      </button>
      {open && (
        <div role="dialog" aria-label="Follow up" className="fixed inset-x-3 bottom-3 z-50 animate-rise rounded-2xl bg-white p-4 shadow-lift ring-1 ring-sky-100 sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between">
            <p className="font-extrabold text-forest">Follow up</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><X size={16} aria-hidden /></button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {opts.map((o) => (
              <button key={o.key} type="button" onClick={() => setPick(o.key)} aria-pressed={pick === o.key}
                className={`min-h-11 rounded-xl px-2 text-left text-sm font-semibold ring-1 transition-colors ${pick === o.key ? "bg-sky-600 text-white ring-sky-600" : "bg-white text-forest ring-slate-200 hover:ring-sky-300"}`}>
                {o.label}<span className={`block text-[11px] font-normal ${pick === o.key ? "text-sky-100" : "text-slate-500"}`}>{dueLabel(o.at)}</span>
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="radio" checked={pick === "custom"} onChange={() => setPick("custom")} className="size-4 accent-sky-600" />
            <input type="datetime-local" value={custom} onChange={(e) => { setCustom(e.target.value); setPick("custom"); }} aria-label="Pick a date and time" className={`${box} min-h-11`} />
          </label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={300} placeholder="কী করবেন? যেমন: ডেমোর পর খবর নেবেন" aria-label="Note" className={`${box} mt-3 py-2`} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {NOTE_HINTS.map((h) => <button key={h} type="button" onClick={() => setText(h)} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900 hover:bg-sky-100">{h}</button>)}
          </div>
          {fetcher.data?.error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{fetcher.data.error}</p>}
          <button type="button" disabled={!at || fetcher.state !== "idle"}
            onClick={() => { sentAt.current = at; fetcher.submit({ intent: "create", kind, ref_id: String(refId), due_at: String(at), note: text }, { method: "post", action: ACTION }); }}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-forest text-sm font-extrabold text-cream disabled:opacity-50">
            {fetcher.state !== "idle" ? "Saving…" : at ? `Remind me · ${dueLabel(at)}` : "Pick a time"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Who or what a follow-up is about, and where to open it. */
export function followTarget(f: Followup): { title: string; href: string } {
  const where = (cls: string | null, area: string | null) => [cls && labelOf(CLASS_LEVELS, cls), area && labelOf(AREAS, area)].filter(Boolean).join(" · ");
  switch (f.kind) {
    case "guardian": return { title: f.g_name || f.g_phone || "Guardian", href: `/admin/guardians/${f.ref_id}` };
    case "tutor": return { title: `${f.t_name ?? "Tutor"}${f.t_code ? ` · T-${f.t_code}` : ""}`, href: f.t_code ? `/admin/tutors/${f.t_code}` : "/admin/tutors" };
    case "lead": return { title: [f.l_name || "Lead", where(f.l_class, f.l_area)].filter(Boolean).join(" · "), href: "/admin/leads" };
    default: return { title: `HTR-${f.ref_id}${where(f.tu_class, f.tu_area) ? ` · ${where(f.tu_class, f.tu_area)}` : ""}`, href: `/admin/tuitions/${f.ref_id}` };
  }
}

const KIND_LABEL: Record<FollowKind, string> = { guardian: "Guardian", tutor: "Tutor", lead: "Lead", tuition: "Tuition" };

/** One open follow-up: what, when (late in rose), then Done with an outcome, or Later (tomorrow 10 AM). */
export function FollowupRow({ f, showTarget = true }: { f: Followup; showTarget?: boolean }) {
  const fetcher = useFetcher();
  const [closing, setClosing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const now = Math.floor(Date.now() / 1000);
  const late = f.due_at < now;
  const target = followTarget(f);
  if (fetcher.state !== "idle" || fetcher.data) return null; // gone once handled; the loaders refresh behind it
  return (
    <li className={`rounded-2xl bg-white p-3.5 shadow-ring ${late ? "ring-1 ring-rose-200" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${late ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}><Clock size={18} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          {showTarget && <Link to={target.href} className="block font-bold break-words text-forest hover:underline">{target.title}</Link>}
          {f.note && <p className={`${showTarget ? "mt-0.5" : ""} text-sm break-words text-slate-700`}>{f.note}</p>}
          <p className={`mt-0.5 text-xs font-semibold ${late ? "text-rose-700" : "text-slate-500"}`}>
            {showTarget && <span className="text-slate-400">{KIND_LABEL[f.kind]} · </span>}{dueLabel(f.due_at)}{late && ` · ${lateBn(f.due_at)}`}
          </p>
        </div>
      </div>
      {closing ? (
        <div className="mt-3 flex gap-2">
          <input value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={300} autoFocus placeholder="কী হলো? (ঐচ্ছিক)" aria-label="Outcome" className={`${box} min-h-11 flex-1`} />
          <button type="button" onClick={() => fetcher.submit({ intent: "done", id: String(f.id), outcome }, { method: "post", action: ACTION })}
            className="min-h-11 shrink-0 rounded-xl bg-forest px-4 text-sm font-bold text-cream">Save</button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setClosing(true)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-forest text-sm font-bold text-cream"><Check size={15} aria-hidden />Done</button>
          <button type="button" onClick={() => fetcher.submit({ intent: "later", id: String(f.id), due_at: String(dhakaAt(1, 10)) }, { method: "post", action: ACTION })}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring">Tomorrow</button>
        </div>
      )}
    </li>
  );
}

/** Notes and open follow-ups on a guardian or tutor page. */
export function NotesPanel({ kind, refId, notes, open }: { kind: "guardian" | "tutor"; refId: number; notes: ContactNote[]; open: Followup[] }) {
  const fetcher = useFetcher<{ error: string | null }>();
  const [body, setBody] = useState("");
  useEffect(() => { if (fetcher.state === "idle" && fetcher.data && !fetcher.data.error) setBody(""); }, [fetcher.state, fetcher.data]);
  return (
    <SectionCard icon={MessagesSquare} tone="sky" title="Notes and follow-ups" hint="কী কথা হলো, পরে কী করবেন।"
      aside={<FollowUpButton kind={kind} refId={refId} />}>
      {open.length > 0 && <ul className="mb-4 space-y-2">{open.map((f) => <FollowupRow key={f.id} f={f} showTarget={false} />)}</ul>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={600} placeholder="যেমন: মেয়ের জন্য RU-র ছাত্রী চান, বেতন 5000 পর্যন্ত" aria-label="New note" className={`${box} flex-1 py-2`} />
        <button type="button" disabled={!body.trim() || fetcher.state !== "idle"} onClick={() => fetcher.submit({ intent: "note", kind, ref_id: String(refId), body }, { method: "post", action: ACTION })}
          className="min-h-11 shrink-0 rounded-xl bg-forest px-4 text-sm font-bold text-cream disabled:opacity-50">{fetcher.state !== "idle" ? "Saving…" : "Add note"}</button>
      </div>
      {fetcher.data?.error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{fetcher.data.error}</p>}
      {notes.length > 0 ? (
        <ol className="mt-4 space-y-3 border-l-2 border-sky-100 pl-4">
          {notes.map((n) => (
            <li key={n.id} className="relative">
              <span aria-hidden className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-4 ring-white ${n.followup_id ? "bg-emerald-500" : "bg-sky-500"}`} />
              <p className="text-xs font-semibold text-slate-500">{dueLabel(n.created_at)} · {agoBn(n.created_at)}{n.followup_id ? " · follow-up done" : ""}</p>
              <p className="mt-0.5 text-sm break-words whitespace-pre-line text-slate-800">{n.body}</p>
            </li>
          ))}
        </ol>
      ) : <p className="mt-3 text-sm text-slate-500">এখনো কোনো নোট নেই।</p>}
    </SectionCard>
  );
}
