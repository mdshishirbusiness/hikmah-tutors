// The tuition's own fields, shared by "New tuition" and the tuition page's Details tab. They use the same pickers as the
// Quick Pad and the guardian form (owner, 2026-11-04, review step 3): class by level with Other, subjects with Other, an
// area search, a time window, requirement quick picks and the universities wanted. Radios and checkboxes underneath.
import { GraduationCap, ListChecks, type LucideIcon, MapPin, Megaphone, UserRound, Wallet } from "lucide-react";
import { inputClass } from "~/components/admin";
import { SECTION_TONES, SectionHead, type SectionTone } from "~/components/SectionCard";
import { AddressDetails, AreaPicker, ClassPicker, MediumPicker, RequirementPicker, SessionPicker, SubjectPicker, TimePicker, TutorPicker } from "~/components/RequestFields";
import { ChoiceChip } from "~/components/tutor";
import { CLASS_LEVELS, DAYS_PER_WEEK, SALARY_PRESETS, STUDENT_GENDERS } from "~/lib/options";
import { requirementKeys } from "~/lib/request";

export type TuitionDraft = {
  class_level?: string; medium?: string; subjects?: string; area?: string; days_per_week?: number; session_minutes?: number | null; time_of_day?: string | null;
  tutor_gender_pref?: string; salary_kind?: string; salary_amount?: number | null; tutor_from?: string; requirements_public?: string; start_note?: string;
  student_gender?: string | null; class_other?: string | null; subject_other?: string | null; time_from?: number | null; time_to?: number | null;
  requirement_keys?: string | null;
};

export function Group({ title, hint, icon = ListChecks, tone, children }: { title: string; hint?: string; icon?: LucideIcon; tone?: SectionTone; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-ring">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden className={`h-1 ${SECTION_TONES[tone ?? "brand"].line}`} />
      <div className="space-y-3 p-4 sm:p-5">
        <div aria-hidden><SectionHead icon={icon} tone={tone} title={title} hint={hint} /></div>
        {children}
      </div>
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
const Sub = ({ children }: { children: React.ReactNode }) => <p className="mb-1 text-xs font-semibold text-slate-600">{children}</p>;

export function TuitionFields({ t = {}, address }: { t?: TuitionDraft; address?: string | null }) {
  const legacy = CLASS_LEVELS.find((c) => c.key === t.class_level && c.legacy);
  const days = t.days_per_week ?? 4;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Group icon={UserRound} tone="sky" title="Student">
        {legacy && <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900">Old class “{legacy.label}”. Pick one class or batch below before it goes on the board.</p>}
        <ClassPicker value={legacy ? "" : t.class_level} other={t.class_other} />
        {legacy && <input type="hidden" name="class_level" value={t.class_level} />}
        <div>
          <Sub>Medium</Sub>
          <MediumPicker value={t.medium} />
        </div>
        <div>
          <Sub>Student</Sub>
          <Chips>{STUDENT_GENDERS.map((g) => <ChoiceChip key={g.key} type="radio" name="student_gender" value={g.key} checked={t.student_gender === g.key}>{g.label}</ChoiceChip>)}</Chips>
        </div>
        <div>
          <Sub>Subjects</Sub>
          <SubjectPicker picked={(t.subjects ?? "").split(",").filter(Boolean)} other={t.subject_other} />
        </div>
      </Group>

      <Group icon={MapPin} tone="amber" title="Place and time">
        <div>
          <Sub>Area</Sub>
          <AreaPicker value={t.area} />
          <AddressDetails name="exact_address" value={address} />
        </div>
        <div>
          <Sub>Days per week</Sub>
          <Chips>
            {[...new Set([...DAYS_PER_WEEK, days])].sort().map((d) => <ChoiceChip key={d} type="radio" name="days_per_week" value={String(d)} checked={days === d}>{d} days</ChoiceChip>)}
          </Chips>
        </div>
        <div>
          <Sub>Time</Sub>
          <TimePicker timeOfDay={t.time_of_day} from={t.time_from} to={t.time_to} />
        </div>
        <div>
          <Sub>Each session</Sub>
          <SessionPicker value={t.session_minutes} />
        </div>
      </Group>

      <Group icon={Wallet} tone="brand" title="Salary">
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

      <Group icon={GraduationCap} tone="violet" title="Tutor wanted">
        <TutorPicker genderName="tutor_gender_pref" gender={t.tutor_gender_pref} from={(t.tutor_from ?? "").split(",").filter(Boolean)} />
      </Group>

      <Group icon={Megaphone} tone="slate" title="Public wording" hint="Shown on the board. No family names, address or phone numbers.">
        <div>
          <Sub>Guardian asks (quick picks)</Sub>
          <RequirementPicker picked={requirementKeys(t.requirement_keys)} />
        </div>
        <Label text="Tutor requirement" hint="anything else, in the guardian's words">
          <textarea name="requirements_public" rows={2} maxLength={500} defaultValue={t.requirements_public ?? ""} placeholder="e.g. Science background, patient with young students" className={`${inputClass} py-3`} />
        </Label>
        <Label text="Start">
          <input name="start_note" maxLength={100} defaultValue={t.start_note ?? ""} placeholder="e.g. From next week" className={inputClass} />
        </Label>
      </Group>
    </div>
  );
}
