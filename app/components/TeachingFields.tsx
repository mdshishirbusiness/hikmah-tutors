// What a tutor teaches, as tap-chips: areas (with search), classes by level, subjects by level and lowest salary.
// Registration and Profile both use these, so the choices and their keys stay the same everywhere.
import { useState } from "react";
import { Search } from "lucide-react";
import { ChoiceChip } from "~/components/tutor";
import { bandOf } from "~/lib/fit";
import { BAND_SUBJECTS, CLASS_GROUPS, SALARIES } from "~/lib/join";
import { AREAS, AREAS_TOP, BANDS, CLASS_CHOICES, SUBJECTS } from "~/lib/options";
import { taka } from "~/lib/tuition";

export function AreaField({ picked, anywhere: anywhereAtFirst }: { picked: string[]; anywhere: boolean }) {
  const [anywhere, setAnywhere] = useState(anywhereAtFirst);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();
  return (
    <>
      <ChoiceChip name="anywhere" value="1" checked={anywhere} onChange={setAnywhere}>Anywhere in Rajshahi</ChoiceChip>
      <div className={anywhere ? "pointer-events-none opacity-40" : ""} aria-disabled={anywhere}>
        <label className="relative mt-3 block">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an area (English or বাংলা)" aria-label="Find an area"
            className="min-h-11 w-full rounded-xl bg-cream pr-3 pl-9 text-base outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {AREAS.map((a, i) => {
            const on = picked.includes(a.key);
            const match = q ? `${a.label} ${a.alt ?? ""}`.toLowerCase().includes(q) : showAll || i < AREAS_TOP || on;
            return <ChoiceChip key={a.key} name="areas" value={a.key} checked={on} hidden={!match}>{a.label}</ChoiceChip>;
          })}
        </div>
        {!q && <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 min-h-11 text-sm font-bold text-brand-700">{showAll ? "Show fewer" : `Show all ${AREAS.length} areas`}</button>}
      </div>
    </>
  );
}

export function ClassField({ picked }: { picked: string[] }) {
  return (
    <div className="space-y-3">
      {CLASS_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">{g.label}</p>
          <div className="flex flex-wrap gap-2">
            {CLASS_CHOICES.filter((c) => bandOf(c.key) === g.band).map((c) => <ChoiceChip key={c.key} name="classes" value={c.key} checked={picked.includes(c.key)}>{c.label}</ChoiceChip>)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Subjects per level ("ssc:physics"), so an SSC tuition only matches the tutor's SSC subjects. */
export function SubjectField({ picked }: { picked: Set<string> }) {
  return (
    <div className="space-y-4">
      {BANDS.map((b) => (
        <div key={b.key}>
          <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">{b.label}</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.filter((s) => BAND_SUBJECTS[b.key].includes(s.key) || picked.has(`${b.key}:${s.key}`)).map((s) => (
              <ChoiceChip key={s.key} name="subjects" value={`${b.key}:${s.key}`} checked={picked.has(`${b.key}:${s.key}`)}>{s.label}</ChoiceChip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SalaryField({ value }: { value: number | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ChoiceChip type="radio" name="min_salary" value="" checked={!value}>No minimum</ChoiceChip>
      {[...new Set([...SALARIES, ...(value ? [value] : [])])].sort((a, b) => a - b).map((s) => (
        <ChoiceChip key={s} type="radio" name="min_salary" value={String(s)} checked={value === s}>{taka(s)}</ChoiceChip>
      ))}
    </div>
  );
}
