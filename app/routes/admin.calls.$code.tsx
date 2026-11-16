// One call from the Call list (owner, 2026-11-09), phone first: who the tutor is and what they wrote, the questions
// for their levels and subjects, then the rating (1–5 per level, per subject, and three traits), a private note and
// the experience the owner hears on the call. Saving adds a new check; No answer and Call later only log the call.
import { useState } from "react";
import { Form, Link, data, redirect, useFetcher, useNavigation } from "react-router";
import { Clock, GraduationCap, MessageCircle, MessagesSquare, NotebookPen, Phone, PhoneOff, Send, Star, UserRound } from "lucide-react";
import type { Route } from "./+types/admin.calls.$code";
import { Avatar } from "~/components/Avatar";
import { SectionCard } from "~/components/SectionCard";
import { PageHead, ago, num } from "~/components/admin";
import { ChoiceChip } from "~/components/tutor";
import { requireStaff } from "~/lib/auth.server";
import { askLabel, askMessage, missingItems } from "~/lib/ask";
import { callTutor, logAsk, logCall, saveCheck } from "~/lib/calls.server";
import { creditReferral } from "~/lib/referral.server";
import { telLink, waLink } from "~/lib/contact";
import { dhakaAt } from "~/lib/dhaka";
import { BANDS, SUBJECTS, labelOf } from "~/lib/options";
import { bandShort } from "~/lib/profile";
import { type Check, RATED_SUBJECTS, TRAITS, isStale, subjectKey } from "~/lib/rating";
import { firstName } from "~/lib/whatsapp";

type Band = "junior" | "ssc" | "hsc";
const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
const bandsOrder = BANDS.map((b) => b.key as Band);

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Call T-${params.code} · Admin` }, { name: "robots", content: "noindex" }];
}

/** Back to the filtered list the owner came from, never anywhere else. */
const backOf = (request: Request) => {
  const b = new URL(request.url).searchParams.get("back") ?? "";
  return b.startsWith("/admin/calls") ? b : "/admin/calls";
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireStaff(request, "calls");
  const found = await callTutor(Number(params.code));
  if (!found) throw data("Tutor not found", { status: 404 });
  return { ...found, back: backOf(request), site: new URL(request.url).origin, now: Math.floor(Date.now() / 1000) };
}

export async function action({ request, params }: Route.ActionArgs) {
  const viewer = await requireStaff(request, "calls");
  const found = await callTutor(Number(params.code));
  if (!found) throw data("Tutor not found", { status: 404 });
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const actor = viewer?.id ?? null;
  // Logged from the Ask card's fetcher; the page stays where it is.
  if (intent === "ask") return { error: await logAsk(found.tutor.id, form.getAll("item").map(String), actor), asked: true };
  const error = intent === "check"
    ? await saveCheck(found.tutor.id, found.tutor.code, form, actor)
    : await logCall(found.tutor.id, intent, intent === "later" ? Number(form.get("at")) || 0 : 0, "Call to check (Call list)", actor);
  if (error) return { error };
  // A check can be what completes a referral (profile already at 80%).
  if (intent === "check") await creditReferral(found.tutor.id, actor);
  return redirect(backOf(request));
}

/** 1–5 as six radio segments; "–" means not rated this time. */
function Score({ name, label, value, hint }: { name: string; label: string; value?: number; hint?: string }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="flex w-full items-baseline justify-between gap-2 text-[15px] font-bold text-forest">{label}{hint && <span className="text-[13px] font-semibold text-slate-500">{hint}</span>}</legend>
      <div className="grid grid-cols-6 gap-1 rounded-xl bg-slate-100 p-1">
        {["", "1", "2", "3", "4", "5"].map((v) => (
          <label key={v} className="grid min-h-11 cursor-pointer place-items-center rounded-lg text-base font-bold text-slate-600 transition-colors select-none hover:bg-white has-checked:bg-forest has-checked:text-cream has-focus-visible:outline-2 has-focus-visible:outline-brand-600">
            <input type="radio" name={name} value={v} defaultChecked={String(value ?? "") === v} className="sr-only" />
            {v || "–"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const NoteBox = ({ name, placeholder }: { name: string; placeholder: string }) => (
  <label className="block">
    <span className="text-[15px] font-bold text-forest">Note</span>
    <textarea name={name} rows={2} maxLength={1000} placeholder={placeholder} className="mt-1.5 w-full rounded-xl bg-cream px-3 py-2 text-base outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
  </label>
);

/**
 * One level of the check (owner, 2026-11-09): comfort at the level, each subject at this level (Junior English and
 * HSC English are separate), a note for this level, and the tutor's experience here to fill in from the call.
 */
function LevelCard({ band, listed, teaches, level, check }: {
  band: Band; listed: boolean; teaches: string[]; check: Check | null;
  level: { students: number | null; years: number | null } | undefined;
}) {
  const own = teaches.filter((k) => RATED_SUBJECTS.some((s) => s.key === k));
  const before = Object.keys(check?.subjects ?? {}).filter((k) => k.startsWith(`${band}:`)).map((k) => k.split(":")[1]).filter((k) => !own.includes(k));
  const [extra, setExtra] = useState<string[]>(before);
  const rate = [...own, ...extra];
  return (
    <SectionCard icon={GraduationCap} title={bandShort(band)} hint={listed ? labelOf(BANDS, band) : `${labelOf(BANDS, band)} · not in their profile`}>
      <div className="space-y-4">
        <Score name={`band_${band}`} label="Comfort at this level" value={check?.bands[band]} />
        {rate.map((k) => <Score key={k} name={`subj_${band}_${k}`} label={`${bandShort(band)} ${labelOf(SUBJECTS, k)}`} value={check?.subjects[subjectKey(band, k)]} />)}
        <select value="" onChange={(e) => e.target.value && setExtra([...extra, e.target.value])} aria-label={`Rate another ${bandShort(band)} subject`}
          className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring">
          <option value="">+ Rate another subject</option>
          {RATED_SUBJECTS.filter((s) => !rate.includes(s.key)).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <NoteBox name={`note_${band}`} placeholder={`যেমন: ${bandShort(band)} English-এ খুব ভালো, Math-এ দুর্বল`} />
        <details className="group rounded-xl ring-1 ring-brand-100 open:ring-brand-300">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 text-[15px] font-bold text-forest [&::-webkit-details-marker]:hidden">
            Their experience here<span className="text-sm font-semibold text-brand-700 group-open:hidden">Edit</span><span className="hidden text-sm font-semibold text-brand-700 group-open:inline">Close</span>
          </summary>
          {/* Always sent; the server writes only what differs from the profile, and the tutor sees "HTR updated your profile". */}
          <div className="space-y-3 px-3 pb-3">
            <input type="hidden" name={`exp_${band}`} value="1" />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm font-semibold text-slate-700">Students taught
                <input name={`students_${band}`} inputMode="numeric" defaultValue={level?.students ?? ""} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" />
              </label>
              <label className="text-sm font-semibold text-slate-700">Years
                <input name={`years_${band}`} inputMode="decimal" defaultValue={level?.years ?? ""} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" />
              </label>
            </div>
            <p className="text-sm font-semibold text-slate-700">Subjects at this level</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.filter((s) => s.key !== "other").map((s) => <ChoiceChip key={s.key} name={`teach_${band}`} value={s.key} checked={teaches.includes(s.key)}>{s.label}</ChoiceChip>)}
            </div>
          </div>
        </details>
      </div>
    </SectionCard>
  );
}

/**
 * "Ask to update" (owner, 2026-11-09): what is missing from the tutor's profile, ticked in advance (rated levels
 * first), a message to edit, and one button that opens WhatsApp with it and logs the ask.
 */
function AskCard({ phone, name, missing, open, link }: { phone: string; name: string; missing: string[]; open: { items: string[]; at: number } | null; link: (item: string) => string }) {
  const fetcher = useFetcher<{ error: string | null; asked?: boolean }>();
  const [items, setItems] = useState<string[]>(missing.slice(0, 4));
  const [text, setText] = useState(() => askMessage(firstName(name), missing.slice(0, 4), link(missing[0] ?? "")));
  const toggle = (it: string, on: boolean) => {
    const next = on ? missing.filter((m) => m === it || items.includes(m)) : items.filter((m) => m !== it);
    setItems(next);
    setText(askMessage(firstName(name), next, link(next[0] ?? "")));
  };
  const sent = fetcher.data?.asked && !fetcher.data.error;
  return (
    <SectionCard icon={Send} title="Ask to update" hint="Instead of typing their experience yourself: they fill it in, then show up under Re-check.">
      <div className="space-y-3">
        {open && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">Asked {ago(open.at)}: {open.items.map(askLabel).join("; ")}</p>}
        {missing.length === 0 ? <p className="text-[15px] text-slate-600">Nothing missing in their profile.</p> : (
          <>
            <div className="flex flex-wrap gap-2">
              {missing.map((it) => <ChoiceChip key={it} name="item" value={it} checked={items.includes(it)} onChange={(on) => toggle(it, on)}>{askLabel(it)}</ChoiceChip>)}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} aria-label="Message" className="w-full rounded-xl bg-cream px-3 py-2 text-[15px] leading-relaxed outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
            {fetcher.data?.error && <p role="alert" className="text-sm font-semibold text-rose-800">{fetcher.data.error}</p>}
            <a href={waLink(phone, text)} target="_blank" rel="noreferrer" aria-disabled={!items.length}
              onClick={(e) => {
                if (!items.length) return e.preventDefault();
                const fd = new FormData();
                fd.set("intent", "ask");
                for (const it of items) fd.append("item", it);
                fetcher.submit(fd, { method: "post" });
              }}
              className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${items.length ? "bg-[#25D366] text-forest" : "pointer-events-none bg-slate-100 text-slate-400"}`}>
              <MessageCircle size={17} aria-hidden />{sent ? "Sent · send again" : "Send on WhatsApp"}
            </a>
          </>
        )}
      </div>
    </SectionCard>
  );
}

function LastCheck({ check, now }: { check: Check; now: number }) {
  const parts = [
    ...Object.entries(check.bands).map(([b, s]) => `${bandShort(b as Band)} ${s}`),
    ...Object.entries(check.subjects).map(([k, s]) => { const [b, subj] = k.split(":"); return `${bandShort(b as Band)} ${labelOf(SUBJECTS, subj)} ${s}`; }),
  ];
  return (
    <div className={`rounded-xl px-3 py-2.5 text-[15px] ${isStale(check, now) ? "bg-amber-50 text-amber-900" : "bg-brand-50 text-forest"}`}>
      <p className="font-bold">{isStale(check, now) ? "Checked over a year ago: re-check" : `Checked ${ago(check.at)}`}</p>
      <p className="text-sm">{parts.join(" · ")}</p>
      {[...bandsOrder.map((b) => [bandShort(b), check.notes[b]]), ["Personal", check.notes.traits], ["Overall", check.note]]
        .filter(([, n]) => n).map(([label, n]) => <p key={label} className="mt-1 text-sm text-slate-700"><b>{label}:</b> {n}</p>)}
    </div>
  );
}

export default function CallTutor({ loaderData, actionData }: Route.ComponentProps) {
  const { tutor: t, levels, subjects, calls, check, record, questions, ask, back, site, now } = loaderData;
  const busy = useNavigation().state === "submitting";
  const teaches = (b: string) => subjects.filter((s) => s.band === b).map((s) => s.subject);
  const bands = BANDS.map((b) => b.key as Band);
  const taught = bands.filter((b) => teaches(b).length || levels.some((l) => l.band === b));
  // Levels the owner rated in the last check: the Ask card asks about these first.
  const rated = bands.filter((b) => check?.bands[b] || Object.keys(check?.subjects ?? {}).some((k) => k.startsWith(`${b}:`)));
  const listed = [...new Set(subjects.map((s) => s.subject))].filter((k) => RATED_SUBJECTS.some((s) => s.key === k));
  const asked = questions.filter((q) => (q.band === "any" || taught.includes(q.band as Band)) && (!q.subject || listed.includes(q.subject)));
  const later = [
    { label: "In 2 hours", at: now + 7200 },
    { label: "Tomorrow 10 AM", at: dhakaAt(1, 10) },
    { label: "In 3 days", at: dhakaAt(3, 10) },
  ];

  return (
    <>
      <PageHead back={{ to: back, label: "Call list" }} eyebrow={`T-${t.code}`} title={t.full_name} />
      <div className="mx-auto max-w-2xl space-y-4">
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-ring">
          <div className="flex items-center gap-3">
            <Avatar code={t.code} name={t.full_name} hasPhoto={!!t.photo_key} size="lg" />
            <div className="min-w-0 text-[15px] text-slate-700">
              <p className="font-semibold text-forest">{[t.university ? UNI[t.university] : t.institution, t.department, t.session_year].filter(Boolean).join(" · ")}</p>
              <p>{[t.gender === "female" ? "Female" : t.gender === "male" ? "Male" : null, t.current_location].filter(Boolean).join(" · ")}</p>
              <p className="tabular-nums">{num(record.apps)} applied · {num(record.placed)} placed</p>
            </div>
          </div>
          {t.phone && (
            <div className="grid grid-cols-2 gap-2">
              <a href={telLink(t.phone)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest text-sm font-bold text-cream"><Phone size={17} aria-hidden />Call</a>
              <a href={waLink(t.phone, "")} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-forest"><MessageCircle size={17} aria-hidden />WhatsApp</a>
            </div>
          )}
          {check && <LastCheck check={check} now={now} />}
          {calls.length > 0 && <p className="text-sm text-slate-500">Calls: {calls.map((c) => `${c.outcome === "done" ? "Talked" : c.outcome === "no_answer" ? "No answer" : "Later"} ${ago(c.created_at)}`).join(" · ")}</p>}
          <div className="flex flex-wrap gap-2 border-t border-brand-50 pt-3">
            <Form method="post"><button name="intent" value="no_answer" disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 disabled:opacity-60"><PhoneOff size={16} aria-hidden />No answer</button></Form>
            {later.map((l) => (
              <Form key={l.label} method="post">
                <input type="hidden" name="at" value={l.at} />
                <button name="intent" value="later" disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-forest shadow-ring disabled:opacity-60"><Clock size={15} aria-hidden />{l.label}</button>
              </Form>
            ))}
          </div>
          <Link to={`/admin/tutors/${t.code}`} className="inline-block text-sm font-semibold text-brand-700 underline">Full profile</Link>
        </section>

        <SectionCard icon={UserRound} title="What they wrote" hint={taught.length ? undefined : "No levels or subjects listed yet."}>
          <ul className="space-y-3">
            {taught.map((b) => {
              const l = levels.find((x) => x.band === b);
              return (
                <li key={b} className="text-[15px]">
                  <p className="font-bold text-forest">{bandShort(b)} <span className="font-semibold text-slate-600">· {[l?.students != null && `${l.students} students`, l?.years != null && `${l.years} yr`].filter(Boolean).join(" · ") || "no numbers"}</span></p>
                  <p className="text-slate-700">{teaches(b).map((k) => labelOf(SUBJECTS, k)).join(", ") || "No subjects"}</p>
                  {l?.approach && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{l.approach}</p>}
                </li>
              );
            })}
            {t.about && <li className="text-sm text-slate-600"><b className="text-forest">About:</b> {t.about}</li>}
          </ul>
        </SectionCard>

        {t.phone && (
          <AskCard phone={t.phone} name={t.full_name} open={ask}
            missing={missingItems([...rated, ...taught.filter((b) => !rated.includes(b))], levels, subjects)}
            link={(it) => `${site}/me/profile${it ? `#exp-${it.split(":")[0]}` : ""}`} />
        )}

        <SectionCard icon={MessagesSquare} title="Questions" hint="Their levels and subjects. Edit in Call list → Questions.">
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-slate-800 marker:font-bold marker:text-brand-700">
            {asked.map((q) => <li key={q.id}>{q.body}</li>)}
          </ol>
        </SectionCard>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="check" />
          {actionData?.error && <p role="alert" className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">{actionData.error}</p>}

          {bands.map((b) => (
            <LevelCard key={b} band={b} listed={taught.includes(b)} teaches={teaches(b)} level={levels.find((x) => x.band === b)} check={check} />
          ))}

          <SectionCard icon={Star} title="Personal qualities" hint="Separate from subject skill.">
            <div className="space-y-4">
              {TRAITS.map((tr) => <Score key={tr.key} name={tr.key} label={tr.label} value={check?.[tr.key] ?? undefined} />)}
              <NoteBox name="note_traits" placeholder="যেমন: খুব ভদ্র, সময় মেনে চলে, কথা পরিষ্কার" />
            </div>
          </SectionCard>

          <SectionCard icon={NotebookPen} title="Overall note">
            <NoteBox name="note" placeholder="যেমন: Binodpur-এর HSC Physics-এর জন্য প্রথম পছন্দ" />
          </SectionCard>

          <button disabled={busy} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-forest px-5 text-base font-bold text-cream disabled:opacity-60">
            {busy ? "Saving…" : check ? "Save new check" : "Save check"}
          </button>
        </Form>
      </div>
    </>
  );
}
