// The tuition's own fields, shared by "New tuition" and the tuition page's Details tab. Small sets are tap-chips
// (radios and checkboxes underneath, so the form works without JavaScript); long lists stay native selects.
import { ChoiceChip } from "~/components/tutor";
import { inputClass } from "~/components/admin";
import {
  AREAS, CLASS_CHOICES, CLASS_LEVELS, DAYS_PER_WEEK, MEDIUMS, SALARY_PRESETS, SESSION_MINUTES, STUDENT_GENDERS, SUBJECTS, TIMES_OF_DAY, TUTOR_FROM, TUTOR_GENDERS, labelOf,
} from "~/lib/options";
import { sessionLength } from "~/lib/tuition";

export type TuitionDraft = {
  class_level?: string; medium?: string; subjects?: string; area?: string; days_per_week?: number; session_minutes?: number | null; time_of_day?: string | null;
  tutor_gender_pref?: string; salary_kind?: string; salary_amount?: number | null; tutor_from?: string; requirements_public?: string; start_note?: string;
  student_gender?: string | null;
};

export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-3 rounded-2xl bg-white p-4 shadow-ring sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden>
        <p className="text-sm font-bold text-forest">{title}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function Label({ text, children, hint }: { text: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{text}{hint && <span className="font-normal text-slate-400"> · {hint}</span>}</span>
      {children}
    </label>
  );
}

const Chips = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap gap-1.5">{children}</div>;

export function TuitionFields({ t = {} }: { t?: TuitionDraft }) {
  const subjects = (t.subjects ?? "").split(",").filter(Boolean);
  const from = (t.tutor_from ?? "").split(",").filter(Boolean);
  const legacy = CLASS_LEVELS.some((c) => c.key === t.class_level && c.legacy);
  const days = t.days_per_week ?? 4;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Group title="Student">
        <div className="grid grid-cols-2 gap-3">
          <Label text="Class">
            <select name="class_level" defaultValue={t.class_level && t.class_level !== "other" ? t.class_level : ""} required className={inputClass}>
              <option value="" disabled>Pick a class</option>
              {legacy && <option value={t.class_level}>{labelOf(CLASS_LEVELS, t.class_level)} (old, change it)</option>}
              {CLASS_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Label>
          <Label text="Medium">
            <select name="medium" defaultValue={t.medium ?? ""} className={inputClass}>
              <option value="">Not known</option>
              {MEDIUMS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </Label>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-600">Student</p>
          <Chips>
            {STUDENT_GENDERS.map((g) => <ChoiceChip key={g.key} type="radio" name="student_gender" value={g.key} checked={t.student_gender === g.key}>{g.label}</ChoiceChip>)}
          </Chips>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-600">Subjects</p>
          <Chips>
            {SUBJECTS.map((s) => <ChoiceChip key={s.key} name="subjects" value={s.key} checked={subjects.includes(s.key)}>{s.label}</ChoiceChip>)}
          </Chips>
        </div>
      </Group>

      <Group title="Place and time">
        <Label text="Area">
          <select name="area" defaultValue={t.area ?? ""} required className={inputClass}>
            <option value="" disabled>Pick an area</option>
            {AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </Label>
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-600">Days per week</p>
          <Chips>
            {[...new Set([...DAYS_PER_WEEK, days])].sort().map((d) => <ChoiceChip key={d} type="radio" name="days_per_week" value={String(d)} checked={days === d}>{d} days</ChoiceChip>)}
          </Chips>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Session length">
            <select name="session_minutes" defaultValue={t.session_minutes ?? ""} className={inputClass}>
              <option value="">Not known</option>
              {SESSION_MINUTES.map((m) => <option key={m} value={m}>{sessionLength(m)}</option>)}
            </select>
          </Label>
          <Label text="Time of day">
            <select name="time_of_day" defaultValue={t.time_of_day ?? ""} className={inputClass}>
              <option value="">Not known</option>
              {TIMES_OF_DAY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </Label>
        </div>
      </Group>

      <Group title="Salary">
        <Chips>
          {[["fixed", "Fixed"], ["negotiable", "Negotiable"], ["unspecified", "Not given"]].map(([k, label]) => (
            <ChoiceChip key={k} type="radio" name="salary_kind" value={k} checked={(t.salary_kind ?? "fixed") === k}>{label}</ChoiceChip>
          ))}
        </Chips>
        <Label text="Amount per month (৳)">
          <input name="salary_amount" type="number" min={0} step={100} inputMode="numeric" list="salary-presets" defaultValue={t.salary_amount ?? ""} placeholder="e.g. 5000" className={`${inputClass} text-lg font-bold`} />
          <datalist id="salary-presets">{SALARY_PRESETS.map((s) => <option key={s} value={s} />)}</datalist>
        </Label>
      </Group>

      <Group title="Tutor wanted">
        <Chips>
          {TUTOR_GENDERS.map((g) => <ChoiceChip key={g.key} type="radio" name="tutor_gender_pref" value={g.key} checked={(t.tutor_gender_pref ?? "any") === g.key}>{g.key === "any" ? "Male or female" : `${g.label} tutor`}</ChoiceChip>)}
        </Chips>
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-600">From <span className="font-normal text-slate-400">· none picked = any university</span></p>
          <Chips>
            {TUTOR_FROM.map((u) => <ChoiceChip key={u.key} name="tutor_from" value={u.key} checked={from.includes(u.key)}>{u.label}</ChoiceChip>)}
          </Chips>
        </div>
      </Group>

      <Group title="Public wording" hint="Shown on the board. No family names, address or phone numbers.">
        <Label text="Tutor requirement">
          <textarea name="requirements_public" rows={2} maxLength={500} defaultValue={t.requirements_public ?? ""} placeholder="e.g. Science background, patient with young students" className={`${inputClass} py-3`} />
        </Label>
        <Label text="Start">
          <input name="start_note" maxLength={100} defaultValue={t.start_note ?? ""} placeholder="e.g. From next week" className={inputClass} />
        </Label>
      </Group>
    </div>
  );
}
