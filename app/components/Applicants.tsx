// The applicant workspace on a tuition (owner, 2026-11-04: fifty applications must not be a long stack of cards; on a
// laptop show them in columns, with the tutor's photo). Laptop: a ranked table on the left and the chosen tutor's
// whole picture on the right, or a board with one column per step. Phone: the same ranked list; a tap opens the
// picture as a sheet. Moves go through a fetcher, so the list keeps its place and moves on to the next applicant.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import {
  AlertTriangle, Check, ChevronRight, Columns3, Copy, ExternalLink, LayoutList, MessageCircle, Phone, Search, Send, X,
} from "lucide-react";
import { Avatar } from "~/components/Avatar";
import { APPLICATION_TONE, Badge, ago, num } from "~/components/admin";
import { Sheet } from "~/components/tutor";
import { APPLICATION_ACTION, APPLICATION_STATUS } from "~/lib/admin-labels";
import type { Applicant, TuitionFull } from "~/lib/admin.server";
import { waLink } from "~/lib/contact";
import { type Fit, bandOf, fitOf, tutorFromLabel } from "~/lib/fit";
import { SUBJECTS, TRANSPORTS, labelOf } from "~/lib/options";
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

type Row = { a: Applicant; fit: Fit; match: number };

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
  const tone = value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-slate-300";
  return (
    <span className="flex items-center gap-2" title={`${value}% match`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.max(value, 4)}%` }} /></span>
      <span className="w-9 text-xs font-bold text-slate-700 tabular-nums">{value}%</span>
    </span>
  );
}

const Tick = ({ ok, warn }: { ok: boolean; warn?: boolean }) => (
  <span className={`grid size-5 shrink-0 place-items-center rounded-full ${ok ? "bg-emerald-100 text-emerald-800" : warn ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`}>
    {ok ? <Check size={12} strokeWidth={3} aria-hidden /> : warn ? <AlertTriangle size={11} aria-hidden /> : <X size={11} aria-hidden />}
  </span>
);

/** Three tiny marks a row can carry: subjects, area, university. Words in the title for hover and screen readers. */
function FitMarks({ fit }: { fit: Fit }) {
  const all = fit.subjectTotal > 0 && fit.subjects.length === fit.subjectTotal;
  return (
    <span className="flex items-center gap-1 text-xs text-slate-600">
      {fit.gender === "mismatch" ? <Badge tone="red">Gender</Badge> : (
        <>
          <span title={`Teaches ${fit.subjects.length} of ${fit.subjectTotal} subjects`} className={`rounded-md px-1.5 py-0.5 font-bold tabular-nums ${all ? "bg-emerald-50 text-emerald-800" : fit.subjects.length ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
            {fit.subjects.length}/{fit.subjectTotal || "–"}
          </span>
          <span title={fit.area === "listed" ? "Picked this area" : fit.area === "nearby" ? "Lives nearby" : "Area not known"} className={`rounded-md px-1.5 py-0.5 font-semibold ${fit.area === "unknown" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-800"}`}>
            {fit.area === "listed" ? "Area" : fit.area === "nearby" ? "Near" : "Area?"}
          </span>
          {fit.university && (
            <span title="University" className={`rounded-md px-1.5 py-0.5 font-semibold ${fit.university === "ok" ? "bg-emerald-50 text-emerald-800" : fit.university === "other" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-500"}`}>Uni</span>
          )}
        </>
      )}
    </span>
  );
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical" };
const who = (a: Applicant) => [a.tutor_code && `T-${a.tutor_code}`, (a.university && UNI[a.university]) || a.institution || a.shortcode, a.department].filter(Boolean).join(" · ");

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring transition-colors hover:bg-brand-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {done ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{done ? "Copied" : label}
    </button>
  );
}

const ghost = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring transition-colors hover:bg-brand-50";

// ---------- the detail pane ----------

function Detail({ t, row, guardianPhone, onMoved }: { t: TuitionFull; row: Row; guardianPhone: string | null; onMoved: (to: string) => void }) {
  const { a, fit, match } = row;
  const fetcher = useFetcher<{ error?: string | null }>();
  const busy = fetcher.state !== "idle";
  const pending = fetcher.formData?.get("to");
  const shares = SHARE_STEPS.has(a.status);
  const selected = a.status === "trial_arranged" || a.status === "confirmed";
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
  ];

  const facts: [string, string | null][] = [
    ["SSC", [a.ssc_group, a.ssc_result && `GPA ${a.ssc_result}`].filter(Boolean).join(" · ") || null],
    ["HSC", [a.hsc_group, a.hsc_result && `GPA ${a.hsc_result}`].filter(Boolean).join(" · ") || null],
    ["Session", a.session_year],
    ["Lives in", a.location],
    ["Transport", a.transport ? labelOf(TRANSPORTS, a.transport) : null],
    ["Demo class", a.demo_willing === null ? null : a.demo_willing ? "Willing" : "Not willing"],
    ["Lowest salary", a.min_salary ? taka(a.min_salary) : null],
    ["With HTR", a.tutor_id ? `${num(a.total_apps)} applications · ${num(a.placed)} placed` : "Not matched to a tutor"],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 scroll-thin">
        <div className="flex items-start gap-4">
          <Avatar code={a.tutor_code} name={a.name} hasPhoto={!!a.photo_key} size="xl" className="shadow-card" />
          <div className="min-w-0 flex-1 pt-1">
            <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
            <h3 className="mt-1.5 text-xl leading-tight font-extrabold break-words text-forest">{a.name || "No name"}</h3>
            <p className="mt-0.5 text-sm break-words text-slate-600">{[a.institution, a.department].filter(Boolean).join(" · ")}</p>
            <p className="mt-0.5 text-xs text-slate-400">{[a.tutor_code && `T-${a.tutor_code}`, a.gender && (a.gender === "female" ? "Female" : "Male"), `applied ${ago(a.created_at)}`].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        {a.flag_reason && <p role="alert" className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-900"><b>Flagged:</b> {a.flag_reason}</p>}
        {a.paused === 1 && <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">This tutor has paused new tuitions.</p>}

        <section aria-label="Fit" className="rounded-2xl bg-cream p-4 ring-1 ring-brand-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Match</p>
            <p className={`text-2xl font-extrabold tabular-nums ${match >= 75 ? "text-emerald-700" : match >= 50 ? "text-amber-700" : "text-slate-500"}`}>{match}%</p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {fitRows.map((r) => <li key={r.text} className="flex items-start gap-2 text-sm text-slate-800"><Tick ok={r.ok} warn={r.warn} /><span>{r.text}</span></li>)}
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

        {(a.experience || a.about) && (
          <section className="space-y-3">
            {a.experience && <div><p className="text-xs font-bold text-slate-500">Experience{band ? ` (${band === "junior" ? "Class 1–8" : band === "ssc" ? "SSC" : "HSC"})` : ""}</p><p className="mt-1 text-sm whitespace-pre-line text-slate-700">{a.experience}</p></div>}
            {a.about && <div><p className="text-xs font-bold text-slate-500">About</p><p className="mt-1 text-sm whitespace-pre-line text-slate-700">{a.about}</p></div>}
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          {a.phone && <a href={`tel:${a.phone}`} className={ghost}><Phone size={16} aria-hidden />Call</a>}
          {a.phone && (
            <a href={waLink(a.phone, shares ? tutorMessage(t, a, selected ? "selected" : "shortlisted") : "")} target="_blank" rel="noreferrer" className={ghost}>
              <MessageCircle size={16} aria-hidden />{shares ? "Message tutor" : "WhatsApp"}
            </a>
          )}
          {a.tutor_code && <Link to={`/admin/tutors/${a.tutor_code}`} className={ghost}><ExternalLink size={16} aria-hidden />Profile</Link>}
        </div>

        {shares && (
          <section className="rounded-2xl bg-forest p-4 text-cream">
            <p className="text-sm font-bold">For the guardian</p>
            <p className="text-xs text-brand-200">{selected ? "Includes the tutor's phone." : "No phone until Selected."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guardianPhone && (
                <a href={waLink(guardianPhone, guardianSummary(t, a, fit.subjects, selected))} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-mango px-4 text-sm font-bold text-forest hover:bg-mango-deep">
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
  const { a, fit, match } = row;
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
          {a.priority === "urgent" && <span className="shrink-0 rounded bg-forest px-1 text-[10px] font-bold text-mango">URGENT</span>}
          {a.flag_reason && <span title={`Flagged: ${a.flag_reason}`} className="shrink-0 rounded bg-rose-600 px-1 text-[10px] font-bold text-white">FLAG</span>}
          {a.note && <span title="Wrote a note" className="size-1.5 shrink-0 rounded-full bg-brand-600" />}
        </span>
        <span className="block truncate text-xs text-slate-500">{who(a)}</span>
      </span>
      {compact ? (
        <span className="flex flex-col items-end gap-1"><Meter value={match} /><Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge></span>
      ) : (
        <>
          <span className="hidden lg:block"><Meter value={match} /></span>
          <span className="hidden lg:block"><FitMarks fit={fit} /></span>
          <span className="hidden text-xs text-slate-500 tabular-nums lg:block">{ago(a.created_at)}</span>
          <span className="flex flex-col items-end gap-1 lg:items-start">
            <span className="lg:hidden"><Meter value={match} /></span>
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
  const sort = sp.get("sort") ?? "fit";
  const view = sp.get("view") === "board" ? "board" : "table";
  const picked = Number(sp.get("a")) || null;
  const [q, setQ] = useState("");

  const subjects = t.subjects.split(",").filter(Boolean);
  const tutorFrom = (t.tutor_from ?? "").split(",").filter(Boolean);
  const rows: Row[] = useMemo(() => applicants.map((a) => {
    const fit = fitOf({ ...t, subjects, tutor_from: tutorFrom }, a);
    return { a, fit, match: matchOf(fit, tutorFrom.length > 0) };
    // t and applicants change together with the loader
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [applicants, t]);

  const counts = Object.fromEntries(STAGES.map((s) => [s.key, rows.filter((r) => s.test(r.a.status)).length]));
  const test = STAGES.find((s) => s.key === stage)?.test ?? STAGES[0].test;
  const needle = q.trim().toLowerCase();
  const list = rows
    .filter((r) => (view === "board" ? STAGE[r.a.status] > 0 : test(r.a.status)))
    .filter((r) => !needle || `${r.a.name} ${r.a.tutor_code} ${r.a.department} ${r.a.institution} ${r.a.location}`.toLowerCase().includes(needle))
    .sort((x, y) =>
      sort === "new" ? y.a.created_at - x.a.created_at
        : sort === "old" ? x.a.created_at - y.a.created_at
          : STAGE[y.a.status] - STAGE[x.a.status] || y.match - x.match || x.a.created_at - y.a.created_at);

  const current = rows.find((r) => r.a.id === picked) ?? (desktop && view === "table" ? list[0] : undefined);

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
      <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
        <label className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find applicant" aria-label="Find applicant" className="min-h-10 w-full rounded-xl bg-white pr-3 pl-8 text-sm shadow-ring outline-none focus:ring-2 focus:ring-brand-200" />
        </label>
        <select value={sort} onChange={(e) => set({ sort: e.target.value === "fit" ? null : e.target.value })} aria-label="Sort" className="min-h-10 rounded-xl bg-white px-2 text-sm font-semibold text-forest shadow-ring">
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
                            <span className="block truncate text-sm font-bold text-forest">{r.a.name}</span>
                            <span className="block truncate text-xs text-slate-500">{who(r.a)}</span>
                          </span>
                        </span>
                        <span className="mt-2.5 flex items-center justify-between gap-2"><Meter value={r.match} /><FitMarks fit={r.fit} /></span>
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
              <span className="w-10" /><span>Tutor</span><span>Match</span><span>Fit</span><span>Applied</span><span>Step</span>
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
