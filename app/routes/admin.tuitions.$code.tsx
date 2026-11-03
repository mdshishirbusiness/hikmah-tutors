// One tuition for the admin (owner, 2026-11-04): what it is and who the guardian is on top, then the applicants with the
// best fit first, then the edit form, closed unless the tuition is still a draft.
import { useState } from "react";
import { Form, Link, data, useNavigation } from "react-router";
import { ArrowUpRight, Check, ChevronDown, Copy, MessageCircle, Phone, Send } from "lucide-react";
import type { Route } from "./+types/admin.tuitions.$code";
import { Badge, Card, Facts, PageHead, num, inputClass, primaryButton, when, TUITION_TONE, APPLICATION_TONE } from "~/components/admin";
import { APPLICATION_ACTION, APPLICATION_MOVES, APPLICATION_STATUS, TUITION_MOVES, TUITION_STATUS } from "~/lib/admin-labels";
import { type Applicant, type TuitionFull, getTuition, moveApplication, updateTuition } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { waLink } from "~/lib/contact";
import { type Fit, fitOf, tutorFromLabel } from "~/lib/fit";
import {
  AREAS, CLASS_CHOICES, CLASS_LEVELS, LEAD_SOURCES, MEDIUMS, SESSION_MINUTES, STUDENT_GENDERS, SUBJECTS, TIMES_OF_DAY, TUTOR_FROM, TUTOR_GENDERS, labelOf,
} from "~/lib/options";
import { GENDER_CHIP, SUBJECT_TONE, SUBJECT_TONE_OTHER, scheduleNote, sessionLength, taka } from "~/lib/tuition";
import { guardianSummary, tutorMessage } from "~/lib/whatsapp";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `HTR-${params.code} · Admin` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const found = await getTuition(Number(params.code) || -1);
  if (!found) throw data("Tuition not found", { status: 404 });
  return found;
}

export async function action({ request, params }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  if (form.get("intent") === "move") {
    const error = await moveApplication(Number(form.get("id")), String(form.get("to")), String(form.get("reason") ?? ""), viewer?.id ?? null);
    return { error, saved: !error };
  }
  const error = await updateTuition(Number(params.code) || -1, form, viewer?.id ?? null);
  return { error, saved: !error };
}

// Further along first: a selected tutor matters more than a fresh application.
const STAGE: Record<string, number> = { confirmed: 5, trial_arranged: 4, shortlisted: 3, under_review: 2, submitted: 1 };
const SHARE_STEPS = ["shortlisted", "trial_arranged", "confirmed"];
const ghost = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-brand-100 bg-white px-3 text-sm font-semibold text-forest transition-colors hover:bg-brand-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-forest">{label}</span>
      {children}
    </label>
  );
}

const Chip = ({ tone, children }: { tone: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>
);

function Summary({ t, subjects, tutorFrom }: { t: TuitionFull; subjects: string[]; tutorFrom: string[] }) {
  const gender = GENDER_CHIP[t.tutor_gender_pref as keyof typeof GENDER_CHIP] ?? GENDER_CHIP.any;
  const pay = t.salary_kind === "fixed" && t.salary_amount ? `${taka(t.salary_amount)}/month` : t.salary_kind === "negotiable" ? "Salary negotiable" : "Salary not given";
  return (
    <>
      <h2 className="text-2xl leading-tight font-bold break-words text-forest">
        {labelOf(CLASS_LEVELS, t.class_level) || "No class"} · {t.mode === "online" ? "Online" : labelOf(AREAS, t.area) || "No area"}
      </h2>
      <p className="mt-1 text-lg font-semibold text-slate-900">
        {pay}<span className="font-normal text-slate-500"> · {t.days_per_week} days/week{scheduleNote(t) && ` · ${scheduleNote(t)}`}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone={gender.tone}>{gender.label}</Chip>
        {tutorFrom.length > 0 && <Chip tone="bg-brand-50 text-brand-700 ring-1 ring-brand-100">From {tutorFromLabel(tutorFrom)}</Chip>}
        {subjects.map((s) => <Chip key={s} tone={`ring-1 ${SUBJECT_TONE[s] ?? SUBJECT_TONE_OTHER}`}>{labelOf(SUBJECTS, s)}</Chip>)}
        {t.student_gender && <Chip tone="bg-slate-50 text-slate-700 ring-1 ring-slate-200">{labelOf(STUDENT_GENDERS, t.student_gender)}</Chip>}
        {t.medium && <Chip tone="bg-slate-50 text-slate-700 ring-1 ring-slate-200">{labelOf(MEDIUMS, t.medium)}</Chip>}
      </div>
      {t.requirements_public && <p className="mt-3 border-l-[3px] border-brand-600 pl-2.5 text-sm font-semibold text-forest">{t.requirements_public}</p>}
      <p className="mt-3 text-sm text-slate-600">
        {t.is_public === 1 ? (
          <Link to={`/tuitions/HTR-${t.code}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700">On the board{t.accepting_applications ? "" : " (not taking applications)"}<ArrowUpRight size={15} aria-hidden /></Link>
        ) : "Hidden from the board"}
        {t.posted_at ? ` · posted ${when(t.posted_at)}` : ""}
      </p>
    </>
  );
}

/** Green when it fits, amber when it only warns, red for the one blocker (gender). */
function FitChips({ fit, a }: { fit: Fit; a: Applicant }) {
  const ok = "bg-emerald-100 text-emerald-900", warn = "bg-amber-100 text-amber-900", bad = "bg-rose-100 text-rose-900", none = "bg-slate-100 text-slate-600";
  const all = fit.subjectTotal > 0 && fit.subjects.length === fit.subjectTotal;
  return (
    <p className="mt-2 flex flex-wrap gap-1.5">
      {!a.tutor_id && <Chip tone={bad}>No tutor match</Chip>}
      {fit.gender === "mismatch" && <Chip tone={bad}>Gender mismatch</Chip>}
      {a.tutor_id && fit.subjectTotal > 0 && (
        <Chip tone={all ? ok : fit.subjects.length ? warn : none}>
          {all && <Check size={13} aria-hidden />}{fit.subjects.length}/{fit.subjectTotal} subjects
        </Chip>
      )}
      <Chip tone={fit.area === "listed" ? ok : fit.area === "nearby" ? ok : none}>
        {fit.area === "listed" ? "Picked this area" : fit.area === "nearby" ? "Lives nearby" : "Area not known"}
      </Chip>
      {fit.university && (
        <Chip tone={fit.university === "ok" ? ok : fit.university === "other" ? warn : none}>
          {fit.university === "ok" ? "University fits" : fit.university === "other" ? "Other university" : "University not known"}
        </Chip>
      )}
      {a.priority === "urgent" && <Chip tone="bg-forest text-cream">Urgent</Chip>}
      {a.fee_plan && <Chip tone={none}>{a.fee_plan === "early" ? "50% plan" : "60% plan"}</Chip>}
    </p>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={ghost}
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
      {done ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{done ? "Copied" : "Copy"}
    </button>
  );
}

function ApplicantCard({ t, a, fit, guardianPhone, busy }: { t: TuitionFull; a: Applicant; fit: Fit; guardianPhone: string | null; busy: boolean }) {
  const moves = APPLICATION_MOVES[a.status] ?? [];
  const shares = SHARE_STEPS.includes(a.status);
  const selected = a.status === "trial_arranged" || a.status === "confirmed";
  const summary = shares ? guardianSummary(t, a, fit.subjects, selected) : "";
  const toTutor = shares ? tutorMessage(t, a, selected ? "selected" : "shortlisted") : "";
  return (
    <li className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {a.tutor_code ? (
            <Link to={`/admin/tutors/${a.tutor_code}`} className="font-bold break-words text-forest underline-offset-2 hover:underline">{a.name || `Tutor ${a.tutor_code}`}</Link>
          ) : <p className="font-bold break-words text-forest">{a.name || "No name"}</p>}
          <p className="text-sm break-words text-slate-600">
            {[a.tutor_code && `T-${a.tutor_code}`, a.shortcode, a.department].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
      </div>
      <FitChips fit={fit} a={a} />
      {a.location && <p className="mt-2 text-sm text-slate-700">Lives in: {a.location}</p>}
      {a.note && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700">{a.note}</p>}
      <p className="mt-2 text-xs text-slate-500">Applied {when(a.created_at)}</p>

      {a.phone && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`tel:${a.phone}`} className={ghost}><Phone size={16} aria-hidden />Call</a>
          <a href={waLink(a.phone, toTutor)} target="_blank" rel="noreferrer" className={ghost}>
            <MessageCircle size={16} aria-hidden />{shares ? "Message tutor" : "WhatsApp"}
          </a>
        </div>
      )}

      {shares && (
        <div className="mt-3 rounded-xl bg-brand-50 p-3">
          <p className="text-xs font-semibold text-brand-700">For the guardian{selected ? " · includes the tutor's phone" : " · no phone until Selected"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {guardianPhone && (
              <a href={waLink(guardianPhone, summary)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-semibold text-cream hover:bg-brand-700">
                <Send size={16} aria-hidden />Send to guardian
              </a>
            )}
            <CopyButton text={summary} />
          </div>
        </div>
      )}

      {moves.length > 0 && (
        <Form method="post" className="mt-3 flex flex-wrap gap-2 border-t border-brand-50 pt-3">
          <input type="hidden" name="intent" value="move" />
          <input type="hidden" name="id" value={a.id} />
          {moves.map((to) => (
            <button key={to} name="to" value={to} disabled={busy} className={to === "not_selected" || STAGE[to] < STAGE[a.status] ? ghost : `${primaryButton} min-h-11`}>
              {STAGE[to] < STAGE[a.status] ? `Back to ${APPLICATION_STATUS[to].toLowerCase()}` : APPLICATION_ACTION[to]}
            </button>
          ))}
        </Form>
      )}
    </li>
  );
}

function Editor({ t, subjects, tutorFrom, busy }: { t: TuitionFull; subjects: string[]; tutorFrom: string[]; busy: boolean }) {
  return (
    <Form method="post" className="space-y-3" key={`${t.status}-${t.is_public}`}>
      <input type="hidden" name="intent" value="edit" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select name="status" defaultValue={t.status} className={inputClass}>
            {[t.status, ...(TUITION_MOVES[t.status] ?? [])].map((s) => <option key={s} value={s}>{TUITION_STATUS[s]}</option>)}
          </select>
        </Field>
        <Field label="Medium">
          <select name="medium" defaultValue={t.medium} className={inputClass}>
            <option value="">Not known</option>
            {MEDIUMS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Class">
          <select name="class_level" defaultValue={t.class_level} className={inputClass}>
            {CLASS_LEVELS.some((c) => c.key === t.class_level && c.legacy) && (
              <option value={t.class_level}>{labelOf(CLASS_LEVELS, t.class_level)} (old, change it)</option>
            )}
            {CLASS_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Area">
          <select name="area" defaultValue={t.area} className={inputClass}>
            {AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Days per week">
          <input name="days_per_week" type="number" min={1} max={7} inputMode="numeric" defaultValue={t.days_per_week} className={inputClass} />
        </Field>
        <Field label="Session length">
          <select name="session_minutes" defaultValue={t.session_minutes ?? ""} className={inputClass}>
            <option value="">Not known</option>
            {SESSION_MINUTES.map((m) => <option key={m} value={m}>{sessionLength(m)}</option>)}
          </select>
        </Field>
        <Field label="Time of day">
          <select name="time_of_day" defaultValue={t.time_of_day ?? ""} className={inputClass}>
            <option value="">Not known</option>
            {TIMES_OF_DAY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Tutor">
          <select name="tutor_gender_pref" defaultValue={t.tutor_gender_pref} className={inputClass}>
            {TUTOR_GENDERS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Salary type">
          <select name="salary_kind" defaultValue={t.salary_kind} className={inputClass}>
            <option value="fixed">Fixed</option>
            <option value="negotiable">Negotiable</option>
            <option value="unspecified">Not given</option>
          </select>
        </Field>
        <Field label="Salary (৳)">
          <input name="salary_amount" type="number" min={0} inputMode="numeric" defaultValue={t.salary_amount ?? ""} className={inputClass} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-forest">Tutor from <span className="font-normal text-slate-500">(none = any university)</span></legend>
        <div className="flex flex-wrap gap-2">
          {TUTOR_FROM.map((u) => (
            <label key={u.key} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-100 bg-white px-3 text-sm has-checked:border-forest has-checked:bg-brand-50">
              <input type="checkbox" name="tutor_from" value={u.key} defaultChecked={tutorFrom.includes(u.key)} className="size-4 accent-forest" />
              {u.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-forest">Subjects</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <label key={s.key} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-100 bg-white px-3 text-sm has-checked:border-forest has-checked:bg-brand-50">
              <input type="checkbox" name="subjects" value={s.key} defaultChecked={subjects.includes(s.key)} className="size-4 accent-forest" />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Tutor requirement (public: no family details, address or phone)">
        <textarea name="requirements_public" rows={3} maxLength={500} defaultValue={t.requirements_public} className={`${inputClass} py-2`} />
      </Field>
      <Field label="Start (public)">
        <input name="start_note" maxLength={100} defaultValue={t.start_note} className={inputClass} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 font-semibold text-forest">
        <input type="checkbox" name="is_public" value="1" defaultChecked={t.is_public === 1} className="size-5 accent-forest" />
        Show on the board
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
        <input type="checkbox" name="accepting" value="1" defaultChecked={t.accepting_applications === 1} className="size-5 accent-forest" />
        Taking applications
      </label>
      <button disabled={busy} className={`${primaryButton} w-full`}>Save</button>
    </Form>
  );
}

export default function AdminTuition({ loaderData: { tuition: t, priv, applicants, placements }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const subjects = t.subjects.split(",").filter(Boolean);
  const tutorFrom = (t.tutor_from ?? "").split(",").filter(Boolean);
  const raw = priv?.raw_json ? (JSON.parse(priv.raw_json) as Record<string, string>) : null;
  const [showClosed, setShowClosed] = useState(false);

  const ranked = applicants.map((a) => ({ a, fit: fitOf({ tutor_gender_pref: t.tutor_gender_pref, subjects, area: t.area, tutor_from: tutorFrom }, a) }));
  const live = ranked.filter(({ a }) => STAGE[a.status])
    .sort((x, y) => STAGE[y.a.status] - STAGE[x.a.status] || y.fit.score - x.fit.score || x.a.created_at - y.a.created_at);
  const finished = ranked.filter(({ a }) => !STAGE[a.status]);
  const guardianPhone = priv?.guardian_phone ?? null;

  return (
    <>
      <PageHead
        title={`HTR-${t.code}`}
        back={{ to: "/admin/tuitions", label: "All tuitions" }}
        action={<span className="flex flex-col items-end gap-1">{t.is_public === 1 && <Badge tone="mango">Public</Badge>}<Badge tone={TUITION_TONE[t.status]}>{TUITION_STATUS[t.status]}</Badge></span>}
      />
      <main className="space-y-5">
        {actionData?.error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
        {actionData?.saved && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">Saved.</p>}

        <Card>
          <Summary t={t} subjects={subjects} tutorFrom={tutorFrom} />

          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
            <p className="text-xs font-semibold tracking-wide text-rose-800">GUARDIAN · PRIVATE</p>
            <Facts rows={[
              ["Name", priv?.guardian_label],
              ["Address", priv?.exact_address],
              ["Source", labelOf(LEAD_SOURCES, priv?.lead_source)],
              ["Tutor qualification", priv?.tutor_qualification],
            ]} />
            {priv?.private_notes && <p className="mt-1 rounded-lg bg-white px-3 py-2 text-sm whitespace-pre-line text-slate-700">{priv.private_notes}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {guardianPhone && (
                <>
                  <a href={`tel:${guardianPhone}`} className={ghost}><Phone size={16} aria-hidden />Call {guardianPhone}</a>
                  <a href={waLink(guardianPhone, "")} target="_blank" rel="noreferrer" className={ghost}><MessageCircle size={16} aria-hidden />WhatsApp</a>
                </>
              )}
              {priv?.guardian_id && <Link to={`/admin/guardians/${priv.guardian_id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand-700">Their tuitions →</Link>}
            </div>
            {raw && (
              <details className="mt-1 text-sm text-slate-700">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold text-forest">As written in the sheet</summary>
                <Facts rows={[["Status", raw.status], ["Class", raw.class], ["Subjects", raw.subjects], ["Days", raw.days], ["Salary", raw.salary], ["Area", raw.location]]} />
              </details>
            )}
          </div>

          {placements.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500">SELECTED TUTOR</p>
              {placements.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{p.tutor_name || p.legacy_tutor_name || p.legacy_tutor_phone}</p>
                  <Badge tone="green">{p.status === "selected" ? "Selected (from sheet)" : p.status === "confirmed" ? "Confirmed" : p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <section aria-labelledby="applicants">
          <h2 id="applicants" className="mb-1 flex items-center gap-2 text-lg font-bold text-forest">
            Applicants<span className="rounded-full bg-brand-50 px-2 text-sm text-brand-700">{num(live.length)}</span>
          </h2>
          <p className="mb-3 text-sm text-slate-500">Furthest along first, then best fit: gender, subjects, area, university.</p>
          {live.length > 0 ? (
            <ul className="space-y-3">{live.map(({ a, fit }) => <ApplicantCard key={a.id} t={t} a={a} fit={fit} guardianPhone={guardianPhone} busy={busy} />)}</ul>
          ) : <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-6 text-center text-sm text-slate-600">No open applications yet.</p>}
          {finished.length > 0 && (
            <>
              <button type="button" aria-expanded={showClosed} onClick={() => setShowClosed((v) => !v)} className="mt-3 min-h-11 text-sm font-semibold text-brand-700">
                {showClosed ? "Hide closed applications" : `Show ${finished.length} closed applications`}
              </button>
              {showClosed && <ul className="mt-2 space-y-3">{finished.map(({ a, fit }) => <ApplicantCard key={a.id} t={t} a={a} fit={fit} guardianPhone={guardianPhone} busy={busy} />)}</ul>}
            </>
          )}
        </section>

        <details open={t.status === "draft"} className="group rounded-2xl border border-brand-100 bg-white shadow-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 px-5 font-bold text-forest [&::-webkit-details-marker]:hidden">
            Edit tuition
            <ChevronDown size={20} className="text-slate-500 transition-transform duration-150 group-open:rotate-180" aria-hidden />
          </summary>
          <div className="border-t border-brand-50 px-5 pt-4 pb-5">
            <Editor t={t} subjects={subjects} tutorFrom={tutorFrom} busy={busy} />
          </div>
        </details>
      </main>
    </>
  );
}
