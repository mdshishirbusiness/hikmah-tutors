// Request fields (owner, 2026-11-04, review step 3): one set of pieces for Quick Pad, the guardian form and the
// tuition editor, so a class, subject, area, time or requirement looks and saves the same everywhere. Real radios and
// checkboxes underneath (ChoiceChip), so every page reads the values with FormData.
import { useState } from "react";
import { Search } from "lucide-react";
import { ChoiceChip } from "~/components/tutor";
import { AREAS, AREAS_TOP, CLASS_CHOICES, MEDIUMS, SESSION_MINUTES, SUBJECTS, TIMES_OF_DAY, TUTOR_FROM, TUTOR_GENDERS } from "~/lib/options";
import { REQUIREMENTS, SUBJECT_SETS, TIME_STEPS, subjectSetOf, timeLabel } from "~/lib/request";
import { sessionLength } from "~/lib/tuition";

const box = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const Chips = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap gap-2">{children}</div>;
const Sub = ({ children }: { children: React.ReactNode }) => <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">{children}</p>;

/** One class or batch from a dropdown (Play, Nursery and KG each their own), and Other with the guardian's words. */
export function ClassPicker({ value, other }: { value?: string | null; other?: string | null }) {
  const [v, setV] = useState(value ?? "");
  return (
    <div className="space-y-2">
      <select name="class_level" value={v} onChange={(e) => setV(e.target.value)} aria-label="Class" className={box}>
        <option value="">Choose class</option>
        {CLASS_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
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
      <p className="mt-1 text-xs text-slate-500">শুধু নির্বাচিত টিউটর দেখবেন, আর কেউ নয়।</p>
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

const OWN = "own";

/**
 * Subjects as one dropdown of the combinations guardians ask most ("Only English", "Math + English" …). "Choose
 * subjects" opens every subject as chips, and Other opens a box for the guardian's words.
 */
export function SubjectPicker({ picked = [], other }: { picked?: string[]; other?: string | null }) {
  const at = subjectSetOf(picked);
  const [set, setSet] = useState(at >= 0 ? String(at) : picked.length ? OWN : "");
  const [hasOther, setHasOther] = useState(picked.includes("other"));
  const chosen = set !== "" && set !== OWN ? SUBJECT_SETS[Number(set)].keys : [];
  return (
    <div className="space-y-2">
      <select value={set} onChange={(e) => { setSet(e.target.value); setHasOther(false); }} aria-label="Subjects" className={box}>
        <option value="">Choose subjects</option>
        {SUBJECT_SETS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
        <option value={OWN}>Other combination…</option>
      </select>
      {chosen.map((k) => <input key={k} type="hidden" name="subjects" value={k} />)}
      {set === OWN && (
        <div onChange={(e) => { const t = e.target as HTMLInputElement; if (t.name === "subjects" && t.value === "other") setHasOther(t.checked); }}>
          <Chips>{SUBJECTS.map((s) => <ChoiceChip key={s.key} name="subjects" value={s.key} checked={picked.includes(s.key)}>{s.label}</ChoiceChip>)}</Chips>
        </div>
      )}
      {set === OWN && hasOther && <input name="subject_other" defaultValue={other ?? ""} maxLength={60} autoFocus placeholder="Which subject? e.g. Drawing, Spoken English" aria-label="Which subject" className={box} />}
    </div>
  );
}

/**
 * The most-asked areas as chips, the rest by search in English or Bangla. With allowOther, "Other area" opens a box
 * (a lead may name a place not on the list; a tuition on the board may not).
 */
export function AreaPicker({ value, other, allowOther = false }: { value?: string | null; other?: string | null; allowOther?: boolean }) {
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
        {allowOther && <ChoiceChip type="radio" name="area" value="__other" checked={v === "__other"}>Other area…</ChoiceChip>}
      </div>
      {q && found === 0 && <p className="mt-2 text-sm text-slate-500">{allowOther ? "Not on the list. Tap Other area and type it." : "Not on the list."}</p>}
      {!q && <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-1 min-h-11 text-sm font-bold text-brand-700">{showAll ? "Show fewer" : `Show all ${AREAS.length} areas`}</button>}
      {v === "__other" && <input name="area_other" defaultValue={known ? "" : other ?? value ?? ""} maxLength={60} autoFocus placeholder="Area name" aria-label="Area name" className={`${box} mt-1`} />}
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
        <Chips>{TUTOR_FROM.map((u) => <ChoiceChip key={u.key} name="tutor_from" value={u.key} checked={from.includes(u.key)}>{u.label}</ChoiceChip>)}</Chips>
      </div>
    </div>
  );
}
