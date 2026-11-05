// What a tutor teaches: areas, classes and subjects (per level) as dropdowns (owner, 2026-11-05), lowest salary as
// chips. Registration and Profile both use these, so the choices and their keys stay the same everywhere.
import { useState } from "react";
import { type MultiOption, MultiSelect } from "~/components/MultiSelect";
import { ChoiceChip } from "~/components/tutor";
import { bandOf } from "~/lib/fit";
import { BAND_SUBJECTS, SALARIES } from "~/lib/join";
import { AREAS, CLASS_GROUPS, GROUPED_CLASSES, SUBJECTS, labelOf } from "~/lib/options";
import { type Band, markable } from "~/lib/profile";
import { taka } from "~/lib/tuition";

/** Anywhere, or the areas picked in one dropdown (most-asked first, search in English or Bangla). */
export function AreaField({ picked, anywhere: anywhereAtFirst }: { picked: string[]; anywhere: boolean }) {
  const [anywhere, setAnywhere] = useState(anywhereAtFirst);
  return (
    <div className="space-y-3">
      <ChoiceChip name="anywhere" value="1" checked={anywhere} onChange={setAnywhere}>Anywhere in Rajshahi</ChoiceChip>
      <MultiSelect name="areas" options={AREAS} picked={picked} title="Areas" placeholder={anywhere ? "Anywhere in Rajshahi" : "Choose areas"} disabled={anywhere} />
    </div>
  );
}

/** Classes in one dropdown: one tick per level (Play–5, Class 6–8, SSC…), and each level opens to single classes. */
export function ClassField({ value, onChange }: { value: string[]; onChange: (classes: string[]) => void }) {
  return <MultiSelect name="classes" options={GROUPED_CLASSES} value={value} onChange={onChange} groupTicks title="Classes" placeholder="Choose classes" />;
}

// The three subject levels. "Yes" picks the level's main classes, "No" drops every class at that level, so Classes and
// Subjects never disagree. Admission and O/A Level sit inside HSC and SSC, as the matching does (bandOf).
const LEVELS: { band: Band; label: string; hint: string; adds: string[] }[] = [
  { band: "junior", label: "Junior", hint: "Play – Class 8", adds: [...CLASS_GROUPS[0].keys, ...CLASS_GROUPS[1].keys] },
  { band: "ssc", label: "SSC", hint: "Class 9 – 10", adds: CLASS_GROUPS[2].keys },
  { band: "hsc", label: "HSC", hint: "Class 11 – 12 and admission", adds: CLASS_GROUPS[3].keys },
];
const subjectOptions = (band: Band): MultiOption[] => {
  const usual = BAND_SUBJECTS[band];
  const row = (s: (typeof SUBJECTS)[number], group: string) => ({ key: `${band}:${s.key}`, label: s.label, alt: s.alt, group });
  return [
    ...usual.map((k) => SUBJECTS.find((s) => s.key === k)!).filter(Boolean).map((s) => row(s, `Usual at ${LEVELS.find((l) => l.band === band)!.label}`)),
    ...SUBJECTS.filter((s) => !usual.includes(s.key) && s.key !== "other").map((s) => row(s, "More subjects")),
  ];
};

/** Classes the page holds, shared by ClassField and SubjectField so a level's Yes/No and the class picks agree. */
export const useClasses = (initial: string[]) => useState(initial);

/**
 * Subjects per level ("ssc:physics"), so an SSC tuition only matches the tutor's SSC subjects (owner, 2026-11-05): a
 * Yes/No per level, then the level's subjects in one dropdown. With `marks`, SSC and HSC also offer the tutor's own marks
 * in those subjects (optional), because the owner reads "SSC Physics 95" beside an SSC Physics applicant.
 */
export function SubjectField({ picked, classes, onClasses, marks }: {
  picked: Set<string>; classes: string[]; onClasses: (classes: string[]) => void; marks?: Record<string, number>;
}) {
  const [picks, setPicks] = useState(picked);
  const setBand = (band: Band, keys: string[]) => setPicks((prev) => new Set([...[...prev].filter((k) => !k.startsWith(`${band}:`)), ...keys]));
  return (
    <div className="space-y-3">
      {LEVELS.map((l) => {
        const teaches = classes.some((c) => bandOf(c) === l.band);
        const mine = [...picks].filter((k) => k.startsWith(`${l.band}:`));
        const yes = () => onClasses([...new Set([...classes, ...l.adds])]);
        const no = () => onClasses(classes.filter((c) => bandOf(c) !== l.band));
        return (
          <div key={l.band} className={`rounded-2xl p-3 ring-1 transition-colors duration-200 ${teaches ? "bg-white ring-brand-200" : "bg-slate-50 ring-slate-200"}`}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-forest">{l.label}</p>
                <p className="text-sm text-slate-500">{l.hint}</p>
              </div>
              <div role="radiogroup" aria-label={`Teach ${l.label}?`} className="grid shrink-0 grid-cols-2 rounded-xl bg-slate-100 p-1">
                {([[true, "Yes", yes], [false, "No", no]] as const).map(([v, label, pick]) => (
                  <label key={label} className={`grid min-h-10 min-w-14 cursor-pointer place-items-center rounded-lg px-3 text-sm font-bold transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-brand-600 ${teaches === v ? (v ? "bg-forest text-cream shadow-sm" : "bg-white text-forest shadow-sm") : "text-slate-500"}`}>
                    <input type="radio" checked={teaches === v} onChange={pick} className="sr-only" />{label}
                  </label>
                ))}
              </div>
            </div>
            {teaches && (
              <div className="mt-3 animate-rise motion-reduce:animate-none">
                <MultiSelect name="subjects" options={subjectOptions(l.band)} picked={mine} onChange={(keys) => setBand(l.band, keys)} title={`${l.label} subjects`} placeholder={`Choose ${l.label} subjects`} />
                {marks && l.band !== "junior" && <SubjectMarks exam={l.band} subjects={markable(mine.map((k) => k.split(":")[1]))} marks={marks} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The tutor's own marks in the subjects they teach at this level, out of 100. Folded until asked for. */
function SubjectMarks({ exam, subjects, marks }: { exam: "ssc" | "hsc"; subjects: string[]; marks: Record<string, number> }) {
  const has = subjects.some((s) => marks[`${exam}:${s}`] !== undefined);
  const [open, setOpen] = useState(has);
  if (!subjects.length) return null;
  const name = exam.toUpperCase();
  return (
    <div className="mt-3">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm font-bold text-brand-700">+ Your own {name} marks in these <span className="font-normal text-slate-500">(optional)</span></button>
      ) : (
        <div className="rounded-xl bg-brand-50/60 p-3">
          <p className="text-sm font-bold text-forest">Your {name} marks <span className="font-normal text-slate-500">· out of 100, optional</span></p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {subjects.map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-300">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{labelOf(SUBJECTS, s)}</span>
                <input name={`mk_${exam}_${s}`} type="number" inputMode="numeric" min={0} max={100} defaultValue={marks[`${exam}:${s}`] ?? ""} placeholder="–"
                  aria-label={`${name} ${labelOf(SUBJECTS, s)} marks`} className="w-12 bg-transparent text-right text-base font-extrabold text-forest tabular-nums outline-none" />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">HTR এগুলো গার্ডিয়ানকে দেখাতে পারে, তাই সঠিক নম্বর দিন। HTR মার্কশিট দেখতে চাইতে পারে।</p>
        </div>
      )}
    </div>
  );
}

/** Quick amounts, or any amount typed in the box (owner, 2026-11-05). One number goes to the server as min_salary. */
export function SalaryField({ value }: { value: number | null }) {
  const quick = value === null || SALARIES.includes(value);
  const [pick, setPick] = useState(quick ? String(value ?? "") : "");
  const [typed, setTyped] = useState(quick ? "" : String(value));
  const choose = (v: string) => { setPick(v); setTyped(""); };
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <ChoiceChip type="radio" name="min_salary_pick" value="" checked={!typed && pick === ""} onChange={() => choose("")}>No minimum</ChoiceChip>
        {SALARIES.map((s) => (
          <ChoiceChip key={s} type="radio" name="min_salary_pick" value={String(s)} checked={!typed && pick === String(s)} onChange={() => choose(String(s))}>{taka(s)}</ChoiceChip>
        ))}
      </div>
      <label className="mt-3 flex max-w-xs items-center gap-2 rounded-xl bg-cream px-3 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-200">
        <span className="text-sm font-bold text-slate-500">৳</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value.replace(/[^\d০-৯]/g, ""))} inputMode="numeric" placeholder="Or type an amount, e.g. 3500" aria-label="Lowest salary, typed"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none" />
      </label>
      <input type="hidden" name="min_salary" value={(typed || pick).replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))} />
    </>
  );
}
