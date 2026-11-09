// Request fields (owner, 2026-11-04, review step 3): one set of pieces for Quick Pad, the guardian form and the
// tuition editor, so a class, subject, area, time or requirement looks and saves the same everywhere. Real radios and
// checkboxes underneath (ChoiceChip), so every page reads the values with FormData.
import { useState } from "react";
import { Search } from "lucide-react";
import { MultiSelect } from "~/components/MultiSelect";
import { ChoiceChip } from "~/components/tutor";
import { AREAS, AREAS_TOP, CLASS_GROUPS, GROUPED_CLASSES, MEDIUMS, SESSION_MINUTES, SUBJECTS, TIMES_OF_DAY, TUTOR_FROM, TUTOR_GENDERS } from "~/lib/options";
import { REQUIREMENTS, TIME_STEPS, timeLabel } from "~/lib/request";
import { sessionLength } from "~/lib/tuition";

const box = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const Chips = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap gap-2">{children}</div>;
const Sub = ({ children }: { children: React.ReactNode }) => <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">{children}</p>;

/** The class `<option>`s under the eight level headings (owner, 2026-11-05); a group of one needs no heading. */
export function ClassOptions() {
  return CLASS_GROUPS.map((g) => {
    const opts = GROUPED_CLASSES.filter((c) => c.group === g.label).map((c) => <option key={c.key} value={c.key}>{c.label}</option>);
    return g.keys.length > 1 ? <optgroup key={g.label} label={g.label}>{opts}</optgroup> : opts;
  });
}

/** One class or batch from a dropdown (Play, Nursery and KG each their own), and Other with the guardian's words. */
export function ClassPicker({ value, other }: { value?: string | null; other?: string | null }) {
  const [v, setV] = useState(value ?? "");
  return (
    <div className="space-y-2">
      <select name="class_level" value={v} onChange={(e) => setV(e.target.value)} aria-label="Class" className={box}>
        <option value="">Choose class</option>
        <ClassOptions />
      </select>
      {v === "other" && <input name="class_other" defaultValue={other ?? ""} maxLength={60} autoFocus placeholder="Which class? e.g. Hifz, IELTS, Honours 1st year" aria-label="Which class" className={box} />}
    </div>
  );
}

export function MediumPicker({ value }: { value?: string | null }) {
  return (
    <select name="medium" defaultValue={value ?? ""} aria-label="Medium" className={box}>
      <option value="">Choose medium</option>
      {MEDIUMS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
    </select>
  );
}

/** House, road and landmark. Private: only the tutor marked Selected sees it, with the phone, each view logged
 * (owner, 2026-11-04). Leads call it address, tuitions exact_address. */
export function AddressDetails({ name, value }: { name: "address" | "exact_address"; value?: string | null }) {
  return (
    <div className="mt-3">
      <input name={name} defaultValue={value ?? ""} maxLength={200} placeholder="Details: house, road, landmark" aria-label="Address details" className={box} />
      <p className="mt-1 text-sm text-slate-500">শুধু নির্বাচিত টিউটর দেখবেন, আর কেউ নয়।</p>
    </div>
  );
}

/** How long each class is, in 15-minute steps. */
export function SessionPicker({ value }: { value?: number | null }) {
  return (
    <select name="session_minutes" defaultValue={value ?? ""} aria-label="Each class" className={box}>
      <option value="">Not decided</option>
      {SESSION_MINUTES.map((m) => <option key={m} value={m}>{sessionLength(m)}</option>)}
    </select>
  );
}

/** Every subject to tick (several allowed), and Other with a box for the guardian's words (owner, 2026-11-05: a plain
 * list is easier than a list of combinations; one dropdown box, not a wall of chips). */
export function SubjectPicker({ picked = [], other }: { picked?: string[]; other?: string | null }) {
  const [hasOther, setHasOther] = useState(picked.includes("other"));
  return (
    <div className="space-y-2">
      <MultiSelect name="subjects" options={SUBJECTS} picked={picked} title="Subjects" placeholder="Choose subjects" onChange={(p) => setHasOther(p.includes("other"))} />
      {hasOther && <input name="subject_other" defaultValue={other ?? ""} maxLength={60} autoFocus placeholder="Which subject? e.g. Drawing, Spoken English" aria-label="Which subject" className={box} />}
    </div>
  );
}

/**
 * The most-asked areas as chips, the rest by search in English or Bangla. With allowOther, "Other area" opens a box
 * (a lead may name a place not on the list). With addNew (the tuition form), "New area" saves the place to the list
 * for every later tuition (owner, 2026-11-09; app/lib/areas.server.ts).
 */
export function AreaPicker({ value, other, allowOther = false, addNew = false }: { value?: string | null; other?: string | null; allowOther?: boolean; addNew?: boolean }) {
  if (addNew) allowOther = true;
  const known = AREAS.some((a) => a.key === value);
  const [v, setV] = useState(value ? (known ? value : allowOther ? "__other" : "") : "");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();
  const matches = (i: number, key: string, label: string, alt = "") => (q ? `${label} ${alt}`.toLowerCase().includes(q) : showAll || i < AREAS_TOP) || key === v;
  const found = q ? AREAS.filter((a) => `${a.label} ${a.alt ?? ""}`.toLowerCase().includes(q)).length : 1;
  return (
    <div onChange={(e) => { const t = e.target as HTMLInputElement; if (t.name === "area") setV(t.value); }}>
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an area (English or বাংলা)" aria-label="Find an area"
          className="min-h-11 w-full rounded-xl bg-cream pr-3 pl-9 text-base outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {AREAS.map((a, i) => <ChoiceChip key={a.key} type="radio" name="area" value={a.key} checked={v === a.key} hidden={!matches(i, a.key, a.label, a.alt)}>{a.label}</ChoiceChip>)}
        {allowOther && <ChoiceChip type="radio" name="area" value="__other" checked={v === "__other"}>{addNew ? "+ New area" : "Other area…"}</ChoiceChip>}
      </div>
      {q && found === 0 && <p className="mt-2 text-sm text-slate-500">{allowOther ? `Not on the list. Tap ${addNew ? "New area" : "Other area"} and type it.` : "Not on the list."}</p>}
      {!q && <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-1 min-h-11 text-sm font-bold text-brand-700">{showAll ? "Show fewer" : `Show all ${AREAS.length} areas`}</button>}
      {v === "__other" && !addNew && <input name="area_other" defaultValue={known ? "" : other ?? value ?? ""} maxLength={60} autoFocus placeholder="Area name" aria-label="Area name" className={`${box} mt-1`} />}
      {v === "__other" && addNew && (
        <div className="mt-1 space-y-2 rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-100">
          <input name="area_other" defaultValue={known ? "" : other ?? value ?? ""} maxLength={40} autoFocus required placeholder="Area name in English, e.g. Mohonpur" aria-label="New area name" className={box} />
          <input name="area_alt" maxLength={80} placeholder="বাংলা নাম (optional), e.g. মোহনপুর" aria-label="Bangla name" className={box} />
          <p className="text-sm text-forest">সেভ করলে এলাকাটি লিস্টে যোগ হবে, পরের টিউশন আর টিউটরদের এলাকা বাছাইয়েও দেখাবে।</p>
        </div>
      )}
    </div>
  );
}

/** When in the day, and a window such as 2:00–6:00 PM. Picking a start suggests an end two hours later. */
export function TimePicker({ timeOfDay, from, to }: { timeOfDay?: string | null; from?: number | null; to?: number | null }) {
  const [start, setStart] = useState(from == null ? "" : String(from));
  const [end, setEnd] = useState(to == null ? "" : String(to));
  const last = TIME_STEPS[TIME_STEPS.length - 1];
  return (
    <div className="space-y-3">
      <Chips>{TIMES_OF_DAY.map((o) => <ChoiceChip key={o.key} type="radio" name="time_of_day" value={o.key} checked={timeOfDay === o.key}>{o.label}</ChoiceChip>)}</Chips>
      <div>
        <Sub>Between (optional)</Sub>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select name="time_from" value={start} aria-label="From" className={box}
            onChange={(e) => {
              const s = e.target.value;
              setStart(s);
              if (s && (!end || Number(end) <= Number(s))) setEnd(String(Math.min(Number(s) + 120, last)));
            }}>
            <option value="">From</option>
            {TIME_STEPS.slice(0, -1).map((m) => <option key={m} value={m}>{timeLabel(m)}</option>)}
          </select>
          <span className="text-sm font-semibold text-slate-500">to</span>
          <select name="time_to" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="To" className={box}>
            <option value="">To</option>
            {TIME_STEPS.filter((m) => !start || m > Number(start)).map((m) => <option key={m} value={m}>{timeLabel(m)}</option>)}
          </select>
        </div>
        {(start || end) && <button type="button" onClick={() => { setStart(""); setEnd(""); }} className="mt-1 min-h-11 text-sm font-bold text-brand-700">Clear time</button>}
      </div>
    </div>
  );
}

/** The usual asks as taps; anything else goes in the note beside it. */
export function RequirementPicker({ picked = [] }: { picked?: string[] }) {
  return <Chips>{REQUIREMENTS.map((r) => <ChoiceChip key={r.key} name="requirements" value={r.key} checked={picked.includes(r.key)}>{r.label}</ChoiceChip>)}</Chips>;
}

/** Male or female tutor, and the universities wanted (none = any). */
export function TutorPicker({ genderName, gender, from = [] }: { genderName: "tutor_gender" | "tutor_gender_pref"; gender?: string | null; from?: string[] }) {
  return (
    <div className="space-y-3">
      <Chips>
        {TUTOR_GENDERS.map((g) => <ChoiceChip key={g.key} type="radio" name={genderName} value={g.key} checked={(gender || "any") === g.key}>{g.key === "any" ? "Male or female" : `${g.label} tutor`}</ChoiceChip>)}
      </Chips>
      <div>
        <Sub>From <span className="font-normal normal-case">· none picked = any</span></Sub>
        <MultiSelect name="tutor_from" options={TUTOR_FROM} picked={from} title="Tutor from" placeholder="Any university" />
      </div>
    </div>
  );
}
