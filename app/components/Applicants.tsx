// The applicant workspace on a tuition (owner, 2026-11-04: fifty applications must not be a long stack of cards; on a
// laptop show them in columns, with the tutor's photo). Ranked by Strength for this tuition (owner, 2026-11-05, part C):
// experience at its level first, then how much they wrote for it, then their record with HTR; fit only warns. Laptop: a ranked table on the left and the chosen tutor's
// whole picture on the right, or a board with one column per step. Phone: the same ranked list; a tap opens the
// picture as a sheet. Moves go through a fetcher, so the list keeps its place and moves on to the next applicant.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import {
  AlertTriangle, Check, ChevronRight, Columns3, Copy, Crown, Download, ExternalLink, LayoutList, MessageCircle, Phone, PhoneCall, Search, Send, Sparkles, Star, X,
} from "lucide-react";
import { Avatar } from "~/components/Avatar";
import { FollowUpButton } from "~/components/FollowUps";
import { LevelSummary } from "~/components/LevelSummary";
import { StudentTimeline } from "~/components/StudentsCard";
import { APPLICATION_TONE, Badge, ago, num } from "~/components/admin";
import { Sheet } from "~/components/tutor";
import { APPLICATION_ACTION, APPLICATION_STATUS } from "~/lib/admin-labels";
import type { Applicant, TuitionFull } from "~/lib/admin.server";
import { waLink } from "~/lib/contact";
import { type Fit, atTime, bandOf, fitOf, freeLabel, timeOfDay, tutorFromLabel } from "~/lib/fit";
import { SUBJECTS, TRANSPORTS, labelOf } from "~/lib/options";
import { bandShort } from "~/lib/profile";
import { TRAITS, isStale, ratingFor, subjectKey } from "~/lib/rating";
import { type Strength, levelOf, strengthOf, strengthWord } from "~/lib/strength";
import { taka } from "~/lib/tuition";
import { guardianSummary, tutorMessage } from "~/lib/whatsapp";

// Further along first: a selected tutor matters more than a fresh application.
const STAGE: Record<string, number> = { confirmed: 5, trial_arranged: 4, shortlisted: 3, under_review: 2, submitted: 1 };
const NEXT: Record<string, string> = { submitted: "under_review", under_review: "shortlisted", shortlisted: "trial_arranged", trial_arranged: "confirmed" };
const BACK: Record<string, string> = { trial_arranged: "shortlisted", confirmed: "trial_arranged" };
const SHARE_STEPS = new Set(["shortlisted", "trial_arranged", "confirmed"]);

export const STAGES = [
  { key: "live", label: "All open", test: (s: string) => STAGE[s] > 0 },
  { key: "new", label: "New", test: (s: string) => s === "submitted" },
  { key: "review", label: "In review", test: (s: string) => s === "under_review" },
  { key: "short", label: "Shortlisted", test: (s: string) => s === "shortlisted" },
  { key: "selected", label: "Selected", test: (s: string) => s === "trial_arranged" || s === "confirmed" },
  { key: "closed", label: "Closed", test: (s: string) => !STAGE[s] },
] as const;
const COLUMNS = STAGES.slice(1, 5);

type Row = { a: Applicant; fit: Fit; match: number; strength: Strength; rating: number | null };

/** The owner's rating for this tuition (owner, 2026-11-09), as a small mango chip. */
const RatingChip = ({ value }: { value: number | null }) =>
  value === null ? null : <span title="HTR rating from the phone check, out of 5" className="inline-flex shrink-0 items-center gap-0.5 rounded bg-mango px-1.5 text-xs font-extrabold text-forest tabular-nums"><Star size={11} aria-hidden />{value.toFixed(1)}</span>;

/** A 0–100 match from the fit (owner's order: gender, subjects, area, university, then class and salary). */
export function matchOf(fit: Fit, wantsUniversity: boolean): number {
  if (fit.gender === "mismatch") return 0;
  const subjects = fit.subjectTotal ? (2 * fit.subjects.length) / fit.subjectTotal : 2;
  const area = fit.area === "listed" ? 1 : fit.area === "nearby" ? 0.6 : 0;
  const uni = !wantsUniversity ? 0 : fit.university === "ok" ? 1 : fit.university === "unknown" ? 0.4 : 0;
  const cls = fit.class === "ok" ? 0.5 : fit.class === "unknown" ? 0.3 : 0;
  const salary = fit.salary === "low" ? -0.5 : 0;
  const max = 2 + 1 + (wantsUniversity ? 1 : 0) + 0.5;
  return Math.max(0, Math.min(100, Math.round((100 * (subjects + area + uni + cls + salary)) / max)));
}

function useDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 1024px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

function Meter({ value }: { value: number }) {
  const tone = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-slate-300";
  return (
    <span className="flex items-center gap-2" title={`Strength ${value}: ${strengthWord(value)}`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.max(value, 4)}%` }} /></span>
      <span className="w-7 text-xs font-bold text-slate-700 tabular-nums">{value}</span>
    </span>
  );
}

const Tick = ({ ok, warn }: { ok: boolean; warn?: boolean }) => (
  <span className={`grid size-5 shrink-0 place-items-center rounded-full ${ok ? "bg-emerald-100 text-emerald-800" : warn ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`}>
    {ok ? <Check size={12} strokeWidth={3} aria-hidden /> : warn ? <AlertTriangle size={11} aria-hidden /> : <X size={11} aria-hidden />}
  </span>
);

/** Experience at a glance, then only what is wrong with the fit (a quiet warning, never part of the score). */
function ExpMarks({ a, fit, strength }: { a: Applicant; fit: Fit; strength: Strength }) {
  const l = a.level;
  const warns = [
    fit.gender === "mismatch" && { tone: "bg-rose-100 text-rose-800", text: "Gender", title: "Gender doesn't match" },
    fit.subjectTotal > 0 && fit.subjects.length === 0 && { tone: "bg-amber-50 text-amber-800", text: "Subjects", title: "None of the subjects listed for this level" },
    fit.university === "other" && { tone: "bg-amber-50 text-amber-800", text: "Uni", title: "Not from the university the guardian wants" },
  ].filter(Boolean) as { tone: string; text: string; title: string }[];
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs">
      {l?.students ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 tabular-nums" title="Students taught at this level">{l.students} st</span> : null}
      {l?.years != null ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 tabular-nums" title="Years at this level">{l.years} yr</span> : null}
      {strength.atLevel > 0 && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-bold text-rose-800 tabular-nums" title="Students they listed at this level">{strength.atLevel} listed</span>}
      {!l && !strength.atLevel && <span className="text-slate-400">No experience written</span>}
      {warns.map((w) => <span key={w.text} title={w.title} className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold ${w.tone}`}><AlertTriangle size={10} aria-hidden />{w.text}</span>)}
    </span>
  );
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical" };
const who = (a: Applicant) => [a.tutor_code && `T-${a.tutor_code}`, (a.university && UNI[a.university]) || a.institution || a.shortcode, a.department].filter(Boolean).join(" · ");

/**
 * Puts the whole text on the clipboard: the Clipboard API, else a hidden textarea and execCommand (owner, 2026-11-08:
 * the old prompt() fallback cut long texts on a phone). False when neither worked.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = Object.assign(document.createElement("textarea"), { value: text, readOnly: true });
    t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(t);
    t.select();
    t.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

function CopyButton({ text, label = "Copy", count = false }: { text: string; label?: string; count?: boolean }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring transition-colors hover:bg-brand-50"
        onClick={async () => {
          setState((await copyText(text)) ? "done" : "failed");
          setTimeout(() => setState("idle"), count ? 4000 : 2000);
        }}
      >
        {state === "done" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {state === "done" ? (count ? `Copied ${num(text.length)} characters` : "Copied") : label}
      </button>
      {state === "failed" && <span role="alert" className="text-xs font-semibold text-rose-700">Couldn't copy.{count ? " Use Send file." : ""}</span>}
    </>
  );
}

/**
 * Copy for AI (owner, 2026-11-08): the tuition and every open applicant's own words and profile as one text, to paste
 * into Gemini or Claude.ai for a judged top 5. Made on tap, so the page stays light; no names or contacts in it.
 */
function AiPack({ code }: { code: number }) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher<{ text?: string; count?: number; error?: string }>();
  const seen = useFetcher();
  const pack = fetcher.data?.text;
  return (
    <>
      <button type="button" onClick={() => {
        setOpen(true);
        fetcher.load(`/admin/tuitions/${code}/ai`);
        seen.submit({ intent: "seen_all" }, { method: "post", action: `/admin/tuitions/${code}` });
      }}
        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-forest px-3 text-sm font-bold text-cream hover:bg-brand-700">
        <Sparkles size={15} aria-hidden />Copy for AI
      </button>
      <Sheet open={open} title="Copy for AI" onClose={() => setOpen(false)}>
        <p className="text-sm text-slate-600">টিউশনের তথ্য আর প্রত্যেক আবেদনকারীর লেখা ও পুরো প্রোফাইল একসাথে, সাথে প্রশ্নও দেওয়া আছে। নাম, ফোন, Gmail, NID বা ছবি নেই; কোড দিয়ে চেনা যাবে। ফোনে <b>Send file</b> চেপে Gemini বা Claude বেছে নিন, পুরোটা ফাইল হয়ে যাবে। Copy ল্যাপটপের জন্য; ফোনে লম্বা লেখা paste করলে কেটে যেতে পারে।</p>
        {fetcher.state !== "idle" || !fetcher.data ? (
          <p className="mt-4 rounded-xl bg-cream px-4 py-6 text-center text-sm font-semibold text-slate-500">Preparing…</p>
        ) : !pack ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{fetcher.data.error ?? "Couldn't prepare it."}</p>
        ) : (
          <>
            <p className="mt-3 text-xs font-semibold text-slate-500 tabular-nums">{fetcher.data.count} open applicants · {num(pack.length)} characters</p>
            <textarea readOnly value={pack} rows={9} aria-label="Text for AI" onFocus={(e) => e.currentTarget.select()}
              className="mt-1.5 w-full rounded-xl bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-200" />
            <PackFile code={code} pack={pack} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <span className="col-span-2 flex flex-col gap-1 [&>button]:w-full"><CopyButton text={pack} label="Copy all" count /></span>
              <a href="https://gemini.google.com/app" target="_blank" rel="noreferrer" className={ghost}>Open Gemini<ExternalLink size={14} aria-hidden /></a>
              <a href="https://claude.ai/new" target="_blank" rel="noreferrer" className={ghost}>Open Claude<ExternalLink size={14} aria-hidden /></a>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}

/**
 * The pack as a .txt file (owner, 2026-11-08): on a phone the share sheet hands it whole to the Gemini or Claude app,
 * where a long paste gets cut; elsewhere, or if sharing fails, it is saved. Same pattern as ShareCard.
 */
function PackFile({ code, pack }: { code: number; pack: string }) {
  const filename = `HTR-${code}-applicants.txt`;
  const file = new File([pack], filename, { type: "text/plain" });
  const canShare = typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });
  const save = () => {
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const send = async () => {
    try {
      await navigator.share({ files: [file], text: "Read the file and answer as it asks." });
    } catch (e) {
      if ((e as Error).name !== "AbortError") save();
    }
  };
  return (
    <div className="mt-3 flex gap-2">
      {canShare && (
        <button type="button" onClick={send} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-mango text-sm font-extrabold text-forest hover:bg-mango-deep">
          <Send size={16} aria-hidden />Send file
        </button>
      )}
      <button type="button" onClick={save} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold ${canShare ? "bg-white text-forest shadow-ring hover:bg-brand-50" : "bg-mango text-forest hover:bg-mango-deep"}`}>
        <Download size={16} aria-hidden />Save file
      </button>
    </div>
  );
}

const ghost = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring transition-colors hover:bg-brand-50";

// ---------- the detail pane ----------

/** The owner's phone check for this tuition's level and subjects, or a link to make one (owner, 2026-11-09). */
function CheckSummary({ row, band, code, subjects }: { row: Row; band: string | null; code: number | null; subjects: string[] }) {
  const c = row.a.check;
  if (!code) return null;
  const call = <Link to={`/admin/calls/${code}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold text-forest shadow-ring hover:bg-brand-50"><PhoneCall size={15} aria-hidden />{c ? "Re-check" : "Call and rate"}</Link>;
  if (!c) return <section aria-label="HTR check" className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Not checked by phone yet.{call}</section>;
  const parts = [
    ...(band && c.bands[band] ? [`${bandShort(band as "junior" | "ssc" | "hsc")} ${c.bands[band]}`] : []),
    ...(band ? subjects.filter((s) => c.subjects[subjectKey(band, s)]).map((s) => `${labelOf(SUBJECTS, s)} ${c.subjects[subjectKey(band, s)]}`) : []),
    ...TRAITS.filter((tr) => c[tr.key]).map((tr) => `${tr.label} ${c[tr.key]}`),
  ];
  const notes = [band && c.notes[band], c.notes.traits, c.note].filter(Boolean);
  return (
    <section aria-label="HTR check" className="rounded-2xl bg-mango/90 p-4 text-forest">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase">HTR check · {isStale(c, Math.floor(Date.now() / 1000)) ? "over a year old" : ago(c.at)}</p>
          <p className="mt-0.5 text-sm font-semibold">{parts.join(" · ") || "Not rated for this level or subjects"}</p>
        </div>
        {row.rating !== null && <p className="text-3xl leading-none font-extrabold tabular-nums">{row.rating.toFixed(1)}</p>}
      </div>
      {notes.map((n) => <p key={n as string} className="mt-2 text-sm">“{n}”</p>)}
      <div className="mt-3">{call}</div>
    </section>
  );
}

function Detail({ t, row, guardianPhone, onMoved }: { t: TuitionFull; row: Row; guardianPhone: string | null; onMoved: (to: string) => void }) {
  const { a, fit, strength } = row;
  const [allStudents, setAllStudents] = useState(false);
  const fetcher = useFetcher<{ error?: string | null }>();
  const busy = fetcher.state !== "idle";
  const pending = fetcher.formData?.get("to");
  const shares = SHARE_STEPS.has(a.status);
  const selected = a.status === "trial_arranged" || a.status === "confirmed";
  const tutorNotes = JSON.parse(a.tutor_notes || "[]") as { body: string; at: number }[];
  const next = NEXT[a.status];
  const back = BACK[a.status];
  const band = bandOf(t.class_level);
  const tutorFrom = (t.tutor_from ?? "").split(",").filter(Boolean);

  const move = (to: string) => {
    fetcher.submit({ intent: "move", id: String(a.id), to }, { method: "post" });
    onMoved(to);
  };

  const fitRows: { ok: boolean; warn?: boolean; text: string }[] = [
    ...(t.tutor_gender_pref !== "any" ? [{ ok: fit.gender === "ok", text: fit.gender === "ok" ? `${t.tutor_gender_pref === "female" ? "Female" : "Male"} tutor, as asked` : "Gender doesn't match" }] : []),
    fit.subjectTotal
      ? { ok: fit.subjects.length === fit.subjectTotal, warn: fit.subjects.length > 0, text: fit.subjects.length ? `Teaches ${fit.subjects.length === fit.subjectTotal ? "all" : `${fit.subjects.length} of ${fit.subjectTotal}`}: ${fit.subjects.map((s) => labelOf(SUBJECTS, s)).join(", ")}` : "None of the subjects listed for this level" }
      : { ok: true, text: "No subjects to match" },
    { ok: fit.area !== "unknown", text: fit.area === "listed" ? "Picked this area" : fit.area === "nearby" ? `Lives nearby (${a.location})` : `Area not in their list${a.location ? `; lives in ${a.location}` : ""}` },
    ...(fit.university ? [{ ok: fit.university === "ok", warn: fit.university === "unknown", text: fit.university === "ok" ? `From ${tutorFromLabel(tutorFrom)}, as asked` : fit.university === "other" ? `Guardian wants ${tutorFromLabel(tutorFrom)}` : "University not known" }] : []),
    ...(fit.class !== "unknown" ? [{ ok: fit.class === "ok", warn: true, text: fit.class === "ok" ? "Wants this class" : "Didn't pick this class" }] : []),
    ...(fit.salary === "low" && a.min_salary ? [{ ok: false, warn: true, text: `Wants at least ${taka(a.min_salary)}` }] : []),
    ...(fit.time ? [{ ok: fit.time === "ok", warn: true, text: fit.time === "ok" ? `Free ${atTime(timeOfDay(t))}` : `Not free ${atTime(timeOfDay(t))} (free: ${freeLabel(a.free_times)})` }] : []),
  ];

  const facts: [string, string | null][] = [
    ["SSC", [a.ssc_group, a.ssc_result && `GPA ${a.ssc_result}`, a.ssc_marks && `${a.ssc_marks} marks`].filter(Boolean).join(" · ") || null],
    ["HSC", [a.hsc_group, a.hsc_result && `GPA ${a.hsc_result}`, a.hsc_marks && `${a.hsc_marks} marks`].filter(Boolean).join(" · ") || null],
    // Their own marks in this tuition's subjects, from the exam at its level (owner, 2026-11-05).
    [`Own ${bandOf(t.class_level) === "hsc" ? "HSC" : "SSC"} marks`, (a.own_marks ?? "").split(",").filter(Boolean).map((m) => { const [k, n] = m.split(":"); return `${labelOf(SUBJECTS, k)} ${n}`; }).join(", ") || null],
    ["Admission", a.admission_result],
    ["Session", a.session_year],
    ["Lives in", a.location],
    ["Transport", a.transport ? labelOf(TRANSPORTS, a.transport) : null],
    ["Demo class", a.demo_willing === null ? null : a.demo_willing ? "Willing" : "Not willing"],
    ["Lowest salary", a.min_salary ? taka(a.min_salary) : null],
    ["With HTR", a.tutor_id ? [`${num(a.total_apps)} applications`, `${num(a.placed)} placed`, a.demos ? `${num(a.demos)} demos` : "", a.dropped ? `${num(a.dropped)} didn't work out` : ""].filter(Boolean).join(" · ") : "Not matched to a tutor"],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 scroll-thin">
        <div className="flex items-start gap-4">
          <Avatar code={a.tutor_code} name={a.name} hasPhoto={!!a.photo_key} size="xl" className="shadow-card" />
          <div className="min-w-0 flex-1 pt-1">
            <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
            <h3 className="mt-1.5 text-xl leading-tight font-extrabold break-words text-forest">{a.name || "No name"}</h3>
            {a.premium ? <Link to="/admin/premium?tab=active" className="mt-1 inline-flex items-center gap-1 rounded-md bg-mango px-2 py-0.5 text-xs font-extrabold text-forest"><Crown size={12} aria-hidden />Premium · first among equals</Link> : null}
            <p className="mt-0.5 text-sm break-words text-slate-600">{[a.institution, a.department].filter(Boolean).join(" · ")}</p>
            <p className="mt-0.5 text-xs text-slate-400">{[a.tutor_code && `T-${a.tutor_code}`, a.gender && (a.gender === "female" ? "Female" : "Male"), `applied ${ago(a.created_at)}`].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        {a.flag_reason && <p role="alert" className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-900"><b>Flagged:</b> {a.flag_reason}</p>}
        {a.paused === 1 && <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">This tutor has paused new tuitions.</p>}

        <CheckSummary row={row} band={band} code={a.tutor_code} subjects={t.subjects.split(",").filter(Boolean)} />

        <section aria-label="Strength" className="rounded-2xl bg-cream p-4 ring-1 ring-brand-100">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Strength for this tuition</p>
              <p className="text-sm font-semibold text-slate-600">{strengthWord(strength.score)}{band ? ` · ${bandShort(band)} level` : ""}</p>
            </div>
            <p className={`text-3xl leading-none font-extrabold tabular-nums ${strength.score >= 70 ? "text-emerald-700" : strength.score >= 40 ? "text-amber-700" : "text-slate-500"}`}>{strength.score}</p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {([["Experience", strength.experience, 50, "bg-rose-500"], ["Written for this level", strength.profile, 30, "bg-sky-500"], ["With HTR", strength.record, 20, "bg-brand-500"]] as const).map(([label, v, max, tone]) => (
              <li key={label} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">{label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${(100 * v) / max}%` }} /></span>
                <span className="text-right font-bold text-slate-700 tabular-nums">{v}/{max}</span>
              </li>
            ))}
          </ul>
        </section>

        {(a.level || a.students.length > 0) ? (
          <section aria-label="Experience" className="space-y-3">
            {a.level && <LevelSummary level={a.level} compact />}
            {a.students.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Students they've taught · {a.students.length}</p>
                <StudentTimeline students={allStudents ? a.students : a.students.slice(0, 2)} />
                {a.students.length > 2 && !allStudents && (
                  <button type="button" onClick={() => setAllStudents(true)} className="mt-2 min-h-10 text-sm font-bold text-brand-700">Show all {a.students.length}</button>
                )}
              </div>
            )}
          </section>
        ) : a.tutor_id ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No experience written for this level yet.</p>
        ) : null}

        <section aria-label="Fit" className="rounded-2xl bg-white p-4 shadow-ring">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Checks</p>
          <ul className="mt-2 space-y-1.5">
            {[...fitRows.filter((r) => !r.ok), ...fitRows.filter((r) => r.ok)].map((r) => <li key={r.text} className="flex items-start gap-2 text-sm text-slate-800"><Tick ok={r.ok} warn={r.warn} /><span>{r.text}</span></li>)}
          </ul>
        </section>

        {a.note && (
          <section className="rounded-2xl bg-brand-50 px-4 py-3">
            <p className="text-xs font-bold text-brand-700">Their note</p>
            <p className="mt-1 text-sm whitespace-pre-line text-slate-800">{a.note}</p>
          </section>
        )}

        {selected && (
          <section className="rounded-2xl bg-white p-4 shadow-ring">
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Tutor's progress</p>
            <ol className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {([["Called", a.called_at], ["Met", a.met_at], ["Demo done", a.demo_done_at]] as const).map(([label, at]) => (
                <li key={label} className={`rounded-xl px-2 py-2 ${at ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-400"}`}>
                  <span className="block font-bold">{label}</span>
                  <span className="block">{at ? ago(at) : "not yet"}</span>
                </li>
              ))}
            </ol>
            {tutorNotes.length > 0 && (
              <>
                <p className="mt-4 text-xs font-bold tracking-wide text-slate-500 uppercase">Tutor's notes</p>
                <ul className="mt-2 space-y-2">
                  {tutorNotes.map((n, i) => (
                    <li key={i} className="rounded-xl bg-cream px-3 py-2 text-sm ring-1 ring-brand-100">
                      <span className="block whitespace-pre-line break-words text-slate-800">{n.body}</span>
                      <span className="block text-xs text-slate-500">{ago(n.at)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="text-sm font-semibold break-words text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>

        {a.about && <section><p className="text-xs font-bold text-slate-500">About</p><p className="mt-1 text-sm whitespace-pre-line text-slate-700">{a.about}</p></section>}

        <div className="flex flex-wrap gap-2">
          {a.phone && <a href={`tel:${a.phone}`} className={ghost}><Phone size={16} aria-hidden />Call</a>}
          {a.phone && (
            <a href={waLink(a.phone, shares ? tutorMessage(t, a, selected ? "selected" : "shortlisted") : "")} target="_blank" rel="noreferrer" className={`${ghost} wa-btn`}>
              <MessageCircle size={16} aria-hidden />{shares ? "Message tutor" : "WhatsApp"}
            </a>
          )}
          {a.tutor_code && <Link to={`/admin/tutors/${a.tutor_code}`} className={ghost}><ExternalLink size={16} aria-hidden />Profile</Link>}
          {a.tutor_id && <FollowUpButton kind="tutor" refId={a.tutor_id} note={`HTR-${t.code}: `} />}
        </div>

        {shares && (
          <section className="rounded-2xl bg-forest p-4 text-cream">
            <p className="text-sm font-bold">For the guardian</p>
            <p className="text-xs text-brand-200">{selected ? "Includes the tutor's phone." : "No phone until Selected."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guardianPhone && (
                <a href={waLink(guardianPhone, guardianSummary(t, a, fit.subjects, selected))} target="_blank" rel="noreferrer" className="wa-btn inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-mango px-4 text-sm font-bold text-forest hover:bg-mango-deep">
                  <Send size={16} aria-hidden />Send to guardian
                </a>
              )}
              <CopyButton text={guardianSummary(t, a, fit.subjects, selected)} />
            </div>
          </section>
        )}
      </div>

      {(next || back || STAGE[a.status]) && (
        <div className="border-t border-brand-50 bg-white/95 p-3 backdrop-blur">
          {fetcher.data?.error && <p role="alert" className="mb-2 rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">{fetcher.data.error}</p>}
          <div className="flex gap-2">
            {next && fit.gender !== "mismatch" && (
              <button type="button" disabled={busy} onClick={() => move(next)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-bold text-cream transition-colors hover:bg-brand-700 disabled:opacity-60">
                {busy && pending === next ? "Saving…" : APPLICATION_ACTION[next]}<ChevronRight size={16} aria-hidden />
              </button>
            )}
            {STAGE[a.status] > 0 && (
              <button type="button" disabled={busy} onClick={() => move("not_selected")} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-rose-800 shadow-ring hover:bg-rose-50 disabled:opacity-60">
                Not selected
              </button>
            )}
          </div>
          {back && <button type="button" disabled={busy} onClick={() => move(back)} className="mt-1 min-h-10 w-full text-xs font-semibold text-slate-500 hover:text-forest">Back to {APPLICATION_STATUS[back].toLowerCase()}</button>}
        </div>
      )}
    </div>
  );
}

// ---------- the list ----------

function RowButton({ row, active, onPick, compact }: { row: Row; active: boolean; onPick: () => void; compact?: boolean }) {
  const { a, fit, strength } = row;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={active ? "true" : undefined}
      data-app={a.id}
      className={`group grid w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${compact ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1.6fr)_7rem_minmax(0,1fr)_5rem_6.5rem]"} ${active ? "bg-brand-50" : "hover:bg-slate-50"}`}
    >
      <Avatar code={a.tutor_code} name={a.name} hasPhoto={!!a.photo_key} size="sm" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-bold text-forest">{a.name || "No name"}</span>
          <RatingChip value={row.rating} />
          {a.premium ? <span title="Premium: first within its Strength level" className="inline-flex shrink-0 items-center gap-0.5 rounded bg-mango px-1 text-[10px] font-extrabold text-forest"><Crown size={10} aria-hidden />PREMIUM</span> : null}
          {a.priority === "urgent" && <span className="shrink-0 rounded bg-forest px-1 text-[10px] font-bold text-mango">URGENT</span>}
          {a.flag_reason && <span title={`Flagged: ${a.flag_reason}`} className="shrink-0 rounded bg-rose-600 px-1 text-[10px] font-bold text-white">FLAG</span>}
          {a.note && <span title="Wrote a note" className="size-1.5 shrink-0 rounded-full bg-brand-600" />}
          {!a.seen_at && a.status === "submitted" && a.tutor_id && <span className="shrink-0 rounded bg-sky-100 px-1 text-[10px] font-bold text-sky-800">UNOPENED</span>}
        </span>
        <span className="block truncate text-xs text-slate-500">{who(a)}</span>
        <span className="mt-1 block lg:hidden"><ExpMarks a={a} fit={fit} strength={strength} /></span>
      </span>
      {compact ? (
        <span className="flex flex-col items-end gap-1"><Meter value={strength.score} /><Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge></span>
      ) : (
        <>
          <span className="hidden lg:block"><Meter value={strength.score} /></span>
          <span className="hidden lg:block"><ExpMarks a={a} fit={fit} strength={strength} /></span>
          <span className="hidden text-xs text-slate-500 tabular-nums lg:block">{ago(a.created_at)}</span>
          <span className="flex flex-col items-end gap-1 lg:items-start">
            <span className="lg:hidden"><Meter value={strength.score} /></span>
            <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
          </span>
        </>
      )}
    </button>
  );
}

export function ApplicantWorkspace({ t, applicants, guardianPhone }: { t: TuitionFull; applicants: Applicant[]; guardianPhone: string | null }) {
  const [sp, setSp] = useSearchParams();
  const desktop = useDesktop();
  const stage = sp.get("stage") ?? "live";
  const sort = sp.get("sort") ?? "strength";
  const view = sp.get("view") === "board" ? "board" : "table";
  const picked = Number(sp.get("a")) || null;
  const [q, setQ] = useState("");

  const subjects = t.subjects.split(",").filter(Boolean);
  const tutorFrom = (t.tutor_from ?? "").split(",").filter(Boolean);
  const rows: Row[] = useMemo(() => applicants.map((a) => {
    const fit = fitOf({ ...t, subjects, tutor_from: tutorFrom }, a);
    const strength = strengthOf({ level: a.level, students: a.students, about: a.about, placed: a.placed, demos: a.demos, dropped: a.dropped }, bandOf(t.class_level));
    return { a, fit, match: matchOf(fit, tutorFrom.length > 0), strength, rating: ratingFor(a.check, bandOf(t.class_level), subjects) };
    // t and applicants change together with the loader
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [applicants, t]);

  const counts = Object.fromEntries(STAGES.map((s) => [s.key, rows.filter((r) => s.test(r.a.status)).length]));
  const test = STAGES.find((s) => s.key === stage)?.test ?? STAGES[0].test;
  const needle = q.trim().toLowerCase();
  const checkedOnly = sp.get("checked") === "1";
  const list = rows
    .filter((r) => (view === "board" ? STAGE[r.a.status] > 0 : test(r.a.status)))
    .filter((r) => !checkedOnly || r.rating !== null)
    .filter((r) => !needle || `${r.a.name} ${r.a.tutor_code} ${r.a.department} ${r.a.institution} ${r.a.location}`.toLowerCase().includes(needle))
    .sort((x, y) =>
      sort === "new" ? y.a.created_at - x.a.created_at
        : sort === "old" ? x.a.created_at - y.a.created_at
          : sort === "fit" ? STAGE[y.a.status] - STAGE[x.a.status] || y.match - x.match || x.a.created_at - y.a.created_at
            // Tutors the owner checked by phone lead, by their rating for this tuition (owner, 2026-11-09); the rest
            // follow by Strength. Premium moves a tutor to the top of their own Strength level only (part E).
            : STAGE[y.a.status] - STAGE[x.a.status] || (y.rating ?? -1) - (x.rating ?? -1)
              || levelOf(y.strength.score) - levelOf(x.strength.score) || y.a.premium - x.a.premium
              || y.strength.score - x.strength.score || y.match - x.match || x.a.created_at - y.a.created_at);

  const current = rows.find((r) => r.a.id === picked) ?? (desktop && view === "table" ? list[0] : undefined);

  // "Seen by HTR" for the tutor (owner, 2026-11-05): only an applicant the owner opened, not the first row shown on its own.
  const seen = useFetcher();
  const pickedRow = rows.find((r) => r.a.id === picked);
  useEffect(() => {
    if (pickedRow && !pickedRow.a.seen_at && pickedRow.a.tutor_id) seen.submit({ intent: "seen", id: String(pickedRow.a.id) }, { method: "post" });
    // once per opened applicant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedRow?.a.id]);

  const set = (changes: Record<string, string | null>) =>
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(changes)) if (v === null) next.delete(k); else next.set(k, v);
      return next;
    }, { replace: true, preventScrollReset: true });

  const pick = (id: number | null) => set({ a: id ? String(id) : null });

  // j/k or the arrow keys walk the list on a laptop.
  useEffect(() => {
    if (!desktop || view !== "table") return;
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const step = e.key === "j" || e.key === "ArrowDown" ? 1 : e.key === "k" || e.key === "ArrowUp" ? -1 : 0;
      if (!step || !list.length) return;
      e.preventDefault();
      const i = Math.max(0, list.findIndex((r) => r.a.id === current?.a.id));
      const nextRow = list[Math.min(list.length - 1, Math.max(0, i + step))];
      pick(nextRow.a.id);
      document.querySelector(`[data-app="${nextRow.a.id}"]`)?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  /** After a move, go on to the next applicant if this one leaves the current tab. */
  const afterMove = (to: string) => {
    if (!current || view !== "table" || test(to)) return;
    const i = list.findIndex((r) => r.a.id === current.a.id);
    const nextRow = list[i + 1] ?? list[i - 1];
    if (nextRow && desktop) pick(nextRow.a.id);
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {view === "table" && (
        <nav aria-label="Steps" className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0">
          {STAGES.map((s) => (
            <button key={s.key} type="button" onClick={() => set({ stage: s.key === "live" ? null : s.key, a: null })} aria-pressed={stage === s.key}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${stage === s.key ? "bg-forest text-cream" : "bg-white text-slate-600 shadow-ring hover:text-forest"}`}>
              {s.label}<span className={`tabular-nums ${stage === s.key ? "text-mango" : "text-slate-400"}`}>{counts[s.key]}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        {counts.live > 1 && <AiPack code={t.code} />}
        <button type="button" onClick={() => set({ checked: checkedOnly ? null : "1", a: null })} aria-pressed={checkedOnly}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${checkedOnly ? "bg-forest text-cream" : "bg-white text-forest shadow-ring hover:bg-brand-50"}`}>
          <Star size={15} aria-hidden />Checked only
        </button>
        <label className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find applicant" aria-label="Find applicant" className="min-h-10 w-full rounded-xl bg-white pr-3 pl-8 text-sm shadow-ring outline-none focus:ring-2 focus:ring-brand-200" />
        </label>
        <select value={sort} onChange={(e) => set({ sort: e.target.value === "strength" ? null : e.target.value })} aria-label="Sort" className="min-h-10 rounded-xl bg-white px-2 text-sm font-semibold text-forest shadow-ring">
          <option value="strength">Strongest</option>
          <option value="fit">Best fit</option>
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
        </select>
        <div className="hidden rounded-xl bg-white p-0.5 shadow-ring lg:flex" role="group" aria-label="View">
          {([["table", LayoutList, "Table"], ["board", Columns3, "Board"]] as const).map(([v, Icon, label]) => (
            <button key={v} type="button" onClick={() => set({ view: v === "table" ? null : v })} aria-pressed={view === v} title={label}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-semibold ${view === v ? "bg-forest text-cream" : "text-slate-500 hover:text-forest"}`}>
              <Icon size={16} aria-hidden />{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const detail = current && <Detail key={current.a.id} t={t} row={current} guardianPhone={guardianPhone} onMoved={afterMove} />;

  if (!applicants.length) {
    return <p className="rounded-2xl border border-dashed border-brand-200 bg-white/60 p-10 text-center text-slate-600">No applications yet. Share the tuition to bring tutors in.</p>;
  }

  return (
    <div className="space-y-3">
      {toolbar}
      {view === "board" && desktop ? (
        <div className="grid grid-cols-4 gap-3">
          {COLUMNS.map((c) => {
            const items = list.filter((r) => c.test(r.a.status));
            return (
              <section key={c.key} aria-label={c.label} className="flex max-h-[calc(100dvh-14rem)] min-h-40 flex-col rounded-2xl bg-slate-100/70 p-2">
                <h3 className="flex items-center justify-between px-2 py-1.5 text-sm font-bold text-forest">{c.label}<span className="rounded-full bg-white px-2 text-xs text-slate-600 tabular-nums">{items.length}</span></h3>
                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-0.5 scroll-thin">
                  {items.map((r) => (
                    <li key={r.a.id}>
                      <button type="button" onClick={() => pick(r.a.id)} className={`w-full rounded-xl bg-white p-3 text-left shadow-ring transition-shadow hover:shadow-lift ${current?.a.id === r.a.id ? "ring-2 ring-brand-500" : ""}`}>
                        <span className="flex items-center gap-2.5">
                          <Avatar code={r.a.tutor_code} name={r.a.name} hasPhoto={!!r.a.photo_key} size="sm" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1"><span className="truncate text-sm font-bold text-forest">{r.a.name}</span><RatingChip value={r.rating} />{r.a.premium ? <span title="Premium" className="grid size-4 shrink-0 place-items-center rounded bg-mango text-forest"><Crown size={10} aria-label="Premium" /></span> : null}</span>
                            <span className="block truncate text-xs text-slate-500">{who(r.a)}</span>
                          </span>
                        </span>
                        <span className="mt-2.5 flex items-center justify-between gap-2"><Meter value={r.strength.score} /><ExpMarks a={r.a} fit={r.fit} strength={r.strength} /></span>
                      </button>
                    </li>
                  ))}
                  {!items.length && <li className="px-2 py-6 text-center text-xs text-slate-400">Nobody here</li>}
                </ul>
              </section>
            );
          })}
          {current && (
            <>
              <button type="button" aria-label="Close" onClick={() => pick(null)} className="fixed inset-0 z-40 animate-fade bg-forest/20" />
              <aside className="fixed inset-y-3 right-3 z-50 flex w-[420px] animate-rise flex-col overflow-hidden rounded-3xl bg-white shadow-lift">
                <button type="button" onClick={() => pick(null)} aria-label="Close" className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-white/90 text-slate-500 shadow-ring hover:text-forest"><X size={18} aria-hidden /></button>
                {detail}
              </aside>
            </>
          )}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="overflow-hidden rounded-2xl bg-white shadow-ring">
            <div aria-hidden className="hidden grid-cols-[auto_minmax(0,1.6fr)_7rem_minmax(0,1fr)_5rem_6.5rem] gap-3 border-b border-brand-50 bg-slate-50/70 px-3 py-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase lg:grid">
              <span className="w-10" /><span>Tutor</span><span>Strength</span><span>Experience</span><span>Applied</span><span>Step</span>
            </div>
            {list.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nobody in this step.</p> : (
              <ul className="divide-y divide-brand-50">
                {list.map((r) => <li key={r.a.id}><RowButton row={r} active={current?.a.id === r.a.id} onPick={() => pick(r.a.id)} /></li>)}
              </ul>
            )}
            {desktop && list.length > 1 && <p className="border-t border-brand-50 px-3 py-2 text-[11px] text-slate-400">Tip: J / K or ↑ ↓ to move through the list.</p>}
          </div>
          <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-white shadow-ring lg:block">
            {detail ?? <p className="p-8 text-center text-sm text-slate-500">Pick an applicant.</p>}
          </aside>
        </div>
      )}
      {!desktop && current && (
        <Sheet open title="Applicant" onClose={() => pick(null)}>
          <div className="-mx-5 -mb-5 h-[76dvh]">{detail}</div>
        </Sheet>
      )}
    </div>
  );
}
