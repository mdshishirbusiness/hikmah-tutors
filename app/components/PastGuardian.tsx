// Find a guardian who came before (owner, 2026-11-08): type their phone or an HTR code, see their last tuitions, and
// one tap starts the new one from those details (area, address, class, subjects, time, salary, tutor wanted). Plain
// fetch, not a fetcher, so Quick Pad keeps working with no internet; the box simply finds nothing then.
import { useEffect, useState } from "react";
import { History, Search } from "lucide-react";
import type { PastGuardian, PastTuition } from "~/lib/admin.server";
import { bdPhone } from "~/lib/lead";
import { AREAS, labelOf } from "~/lib/options";
import { classLabel } from "~/lib/request";
import { taka } from "~/lib/tuition";
import { TUITION_STATUS } from "~/lib/admin-labels";

const looksLikeCode = (q: string) => /^\s*(htr[\s-]*)?\d{3,6}\s*$/i.test(q);

export function PastGuardianFind({ onUse, onNewPhone }: { onUse: (g: PastGuardian, t: PastTuition | null) => void; onNewPhone?: (phone: string) => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<PastGuardian | null | undefined>(undefined); // undefined = not asked yet
  const [used, setUsed] = useState<number | null>(null);
  const ready = !!bdPhone(q) || looksLikeCode(q);

  useEffect(() => {
    if (!ready) return setFound(undefined);
    const ask = new AbortController();
    const wait = setTimeout(async () => {
      try {
        const res = await fetch(`/admin/guardian-lookup?q=${encodeURIComponent(q.trim())}`, { signal: ask.signal });
        const g = ((await res.json()) as { guardian: PastGuardian | null }).guardian;
        setFound(g);
        if (!g && bdPhone(q)) onNewPhone?.(bdPhone(q));
      } catch { /* offline or typed on: nothing to show */ }
    }, 300);
    return () => { clearTimeout(wait); ask.abort(); };
    // onNewPhone is a fresh function each render; the query is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ready]);

  return (
    <div className="rounded-xl bg-cream p-3 ring-1 ring-brand-100">
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="text" autoComplete="off" placeholder="Past guardian? Phone or HTR code"
          aria-label="Find a past guardian by phone or HTR code"
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-9 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
      </label>
      {found === null && <p className="mt-2 text-sm text-slate-500">{bdPhone(q) ? "New guardian. Phone filled in below." : "No tuition with this code."}</p>}
      {found && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-forest"><History size={15} aria-hidden />{found.name || "Guardian"} · {found.phone}</p>
          <p className="text-xs text-slate-500">আগের কোনটা থেকে শুরু করবেন, বেছে নিন। সব তথ্য বসে যাবে, দরকার হলে বদলাবেন।</p>
          <ul className="mt-2 space-y-1.5">
            {found.tuitions.map((t) => (
              <li key={t.code}>
                <button type="button" onClick={() => { onUse(found, t); setUsed(t.code); }} aria-pressed={used === t.code}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left shadow-ring transition-colors ${used === t.code ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white hover:bg-brand-50"}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-forest">{classLabel(t.class_level, t.class_other) || "No class"} · {labelOf(AREAS, t.area) || "No area"}</span>
                    <span className="block truncate text-xs text-slate-500">HTR-{t.code} · {t.salary_amount ? taka(t.salary_amount) : "No salary"} · {TUITION_STATUS[t.status] ?? t.status}</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-forest px-2.5 py-1.5 text-xs font-bold text-cream">{used === t.code ? "Filled ✓" : "Use"}</span>
                </button>
              </li>
            ))}
            {!found.tuitions.length && (
              <li><button type="button" onClick={() => onUse(found, null)} className="min-h-11 rounded-xl bg-white px-3 text-sm font-bold text-forest shadow-ring hover:bg-brand-50">No tuitions yet · Use phone and name</button></li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The parts of an old tuition a new one starts from. Not the start note, status or anything about tutors. */
export function draftFrom(t: PastTuition) {
  return {
    class_level: t.class_level, class_other: t.class_other, medium: t.medium, student_gender: t.student_gender, subjects: t.subjects,
    subject_other: t.subject_other, area: t.area, days_per_week: t.days_per_week, session_minutes: t.session_minutes, time_of_day: t.time_of_day,
    time_from: t.time_from, time_to: t.time_to, salary_kind: t.salary_kind, salary_amount: t.salary_amount, tutor_gender_pref: t.tutor_gender_pref,
    tutor_from: t.tutor_from, requirement_keys: t.requirement_keys, requirements_public: t.requirements_public,
  };
}
