import { useState } from "react";
import { Form, Link, data, useNavigation } from "react-router";
import type { Route } from "./+types/admin.tuitions.$code";
import { Badge, Card, ContactButtons, Facts, PageHead, bn, inputClass, primaryButton, when, TUITION_TONE, APPLICATION_TONE } from "~/components/admin";
import { APPLICATION_MOVES, APPLICATION_STATUS, TUITION_MOVES, TUITION_STATUS } from "~/lib/admin-labels";
import { type Applicant, getTuition, moveApplication, updateTuition } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_CHOICES, CLASS_LEVELS, MEDIUMS, SESSION_MINUTES, STUDENT_GENDERS, SUBJECTS, TIMES_OF_DAY, TUTOR_GENDERS, labelOf } from "~/lib/options";
import { sessionLength } from "~/lib/tuition";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `HTR-${params.code} · অ্যাডমিন` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const found = await getTuition(Number(params.code) || -1);
  if (!found) throw data("টিউশনটি পাওয়া যায়নি", { status: 404 });
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-forest">{label}</span>
      {children}
    </label>
  );
}

function ApplicantCard({ a, tuitionSubjects, wanted }: { a: Applicant; tuitionSubjects: number; wanted: string }) {
  const moves = APPLICATION_MOVES[a.status] ?? [];
  const wrongGender = wanted !== "any" && a.gender && a.gender !== wanted;
  return (
    <li className="rounded-2xl border border-brand-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {a.tutor_code ? (
            <Link to={`/admin/tutors/${a.tutor_code}`} className="font-semibold text-brand-700 underline underline-offset-2">{a.name || `টিউটর ${a.tutor_code}`}</Link>
          ) : <p className="font-semibold text-slate-900">{a.name || "নাম নেই"}</p>}
          <p className="text-sm break-words text-slate-600">{a.shortcode}</p>
        </div>
        <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
      </div>
      <p className="mt-2 flex flex-wrap gap-1.5">
        {!a.tutor_id && <Badge tone="red">টিউটর মেলেনি</Badge>}
        {wrongGender && <Badge tone="red">জেন্ডার মেলে না</Badge>}
        {a.tutor_id && tuitionSubjects > 0 && (a.subject_hits > 0 ? <Badge tone="green">{bn(a.subject_hits)}টি বিষয় মিলেছে</Badge> : <Badge>বিষয় মেলেনি</Badge>)}
        {a.priority === "urgent" && <Badge tone="dark">জরুরি প্রয়োজন</Badge>}
        {a.fee_plan && <Badge>{a.fee_plan === "early" ? "৫০% প্ল্যান" : "৬০% প্ল্যান"}</Badge>}
      </p>
      {a.location && <p className="mt-2 text-sm text-slate-700">থাকেন: {a.location}</p>}
      {a.note && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700">{a.note}</p>}
      <p className="mt-2 text-xs text-slate-500">{when(a.created_at)}</p>
      <div className="mt-2"><ContactButtons phone={a.phone} /></div>
      {moves.length > 0 && (
        <Form method="post" className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="intent" value="move" />
          <input type="hidden" name="id" value={a.id} />
          {moves.map((to) => (
            <button key={to} name="to" value={to} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${to === "not_selected" ? "border border-brand-100 bg-white text-slate-700" : "bg-forest text-white hover:bg-brand-700"}`}>
              {APPLICATION_STATUS[to]}
            </button>
          ))}
        </Form>
      )}
    </li>
  );
}

export default function AdminTuition({ loaderData: { tuition: t, priv, applicants, placements }, actionData }: Route.ComponentProps) {
  const pending = useNavigation().state !== "idle";
  const subjects = t.subjects.split(",").filter(Boolean);
  const raw = priv?.raw_json ? (JSON.parse(priv.raw_json) as Record<string, string>) : null;
  const [showClosed, setShowClosed] = useState(false);
  const live = applicants.filter((a) => a.status in APPLICATION_MOVES || a.status === "confirmed");
  const finished = applicants.filter((a) => !(a.status in APPLICATION_MOVES) && a.status !== "confirmed");

  return (
    <>
      <PageHead title={`HTR-${t.code}`} back={{ to: "/admin/tuitions", label: "সব টিউশন" }} action={<span className="flex flex-col items-end gap-1">{t.is_public === 1 && <Badge tone="mango">পাবলিক</Badge>}<Badge tone={TUITION_TONE[t.status]}>{TUITION_STATUS[t.status]}</Badge></span>} />
      <main className="space-y-4">
        {actionData?.error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
        {actionData?.saved && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">সেভ হয়েছে।</p>}

        <Card className="border-rose-200">
          <h2 className="mb-2 font-semibold text-forest">গোপন: শুধু অ্যাডমিন দেখবে</h2>
          <Facts rows={[
            ["গার্ডিয়ান", priv?.guardian_label],
            ["ঠিকানা", priv?.exact_address],
            ["লিডের উৎস", priv?.lead_source],
            ["টিউটরের যোগ্যতা", priv?.tutor_qualification],
          ]} />
          {priv?.private_notes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700">{priv.private_notes}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ContactButtons phone={priv?.guardian_phone ?? null} />
            {priv?.guardian_id && <Link to={`/admin/guardians/${priv.guardian_id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand-700 underline underline-offset-2">গার্ডিয়ানের সব টিউশন</Link>}
          </div>
          {raw && (
            <details className="mt-3 text-sm text-slate-700">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold text-forest">শিটে যা লেখা ছিল</summary>
              <Facts rows={[["স্ট্যাটাস", raw.status], ["ক্লাস", raw.class], ["বিষয়", raw.subjects], ["দিন", raw.days], ["বেতন", raw.salary], ["এলাকা", raw.location]]} />
            </details>
          )}
        </Card>

        {placements.length > 0 && (
          <Card>
            <h2 className="mb-2 font-semibold text-forest">বাছাই করা টিউটর</h2>
            {placements.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{p.tutor_name || p.legacy_tutor_name || p.legacy_tutor_phone}</p>
                <Badge tone="green">{p.status === "selected" ? "বাছাই (শিট থেকে)" : p.status === "confirmed" ? "কনফার্ম" : p.status}</Badge>
              </div>
            ))}
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-semibold text-forest">টিউশনের তথ্য ও পাবলিক করা</h2>
          <Form method="post" className="space-y-3" key={`${t.status}-${t.is_public}`}>
            <input type="hidden" name="intent" value="edit" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="স্ট্যাটাস">
                <select name="status" defaultValue={t.status} className={inputClass}>
                  {[t.status, ...(TUITION_MOVES[t.status] ?? [])].map((s) => <option key={s} value={s}>{TUITION_STATUS[s]}</option>)}
                </select>
              </Field>
              <Field label="মাধ্যম">
                <select name="medium" defaultValue={t.medium} className={inputClass}>
                  <option value="">জানা নেই</option>
                  {MEDIUMS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="ক্লাস">
                <select name="class_level" defaultValue={t.class_level} className={inputClass}>
                  {CLASS_LEVELS.some((c) => c.key === t.class_level && c.legacy) && (
                    <option value={t.class_level}>{labelOf(CLASS_LEVELS, t.class_level)} (পুরোনো, বদলাও)</option>
                  )}
                  {CLASS_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="এলাকা">
                <select name="area" defaultValue={t.area} className={inputClass}>
                  {AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </Field>
              <Field label="সপ্তাহে দিন">
                <input name="days_per_week" type="number" min={1} max={7} inputMode="numeric" defaultValue={t.days_per_week} className={inputClass} />
              </Field>
              <Field label="প্রতিদিন কতক্ষণ">
                <select name="session_minutes" defaultValue={t.session_minutes ?? ""} className={inputClass}>
                  <option value="">জানা নেই</option>
                  {SESSION_MINUTES.map((m) => <option key={m} value={m}>{sessionLength(m)}</option>)}
                </select>
              </Field>
              <Field label="কোন সময়ে">
                <select name="time_of_day" defaultValue={t.time_of_day ?? ""} className={inputClass}>
                  <option value="">জানা নেই</option>
                  {TIMES_OF_DAY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="টিউটর">
                <select name="tutor_gender_pref" defaultValue={t.tutor_gender_pref} className={inputClass}>
                  {TUTOR_GENDERS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                </select>
              </Field>
              <Field label="বেতনের ধরন">
                <select name="salary_kind" defaultValue={t.salary_kind} className={inputClass}>
                  <option value="fixed">নির্দিষ্ট</option>
                  <option value="negotiable">আলোচনা সাপেক্ষে</option>
                  <option value="unspecified">উল্লেখ নেই</option>
                </select>
              </Field>
              <Field label="বেতন (৳)">
                <input name="salary_amount" type="number" min={0} inputMode="numeric" defaultValue={t.salary_amount ?? ""} className={inputClass} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-semibold text-forest">বিষয়</legend>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <label key={s.key} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-100 bg-white px-3 text-sm has-checked:border-forest has-checked:bg-brand-50">
                    <input type="checkbox" name="subjects" value={s.key} defaultChecked={subjects.includes(s.key)} className="size-4 accent-forest" />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="অভিভাবকের চাওয়া (সবাই দেখবে: পরিবারের তথ্য, ঠিকানা বা ফোন লিখবে না)">
              <textarea name="requirements_public" rows={3} maxLength={500} defaultValue={t.requirements_public} className={`${inputClass} py-2`} />
            </Field>
            <Field label="কবে শুরু (সবাই দেখবে)">
              <input name="start_note" maxLength={100} defaultValue={t.start_note} className={inputClass} />
            </Field>
            <label className="flex min-h-11 items-center gap-3 font-semibold text-forest">
              <input type="checkbox" name="is_public" value="1" defaultChecked={t.is_public === 1} className="size-5 accent-forest" />
              বোর্ডে পাবলিক করো
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" name="accepting" value="1" defaultChecked={t.accepting_applications === 1} className="size-5 accent-forest" />
              আবেদন নেওয়া হচ্ছে
            </label>
            <button disabled={pending} className={`${primaryButton} w-full`}>সেভ করো</button>
          </Form>
          <p className="mt-3 text-xs text-slate-500">
            {t.student_gender && `শিক্ষার্থী: ${labelOf(STUDENT_GENDERS, t.student_gender)} · `}এলাকা: {labelOf(AREAS, t.area)}
          </p>
        </Card>

        <section aria-labelledby="applicants">
          <h2 id="applicants" className="mb-2 font-semibold text-forest">আবেদন ({bn(applicants.length)})</h2>
          {live.length > 0 ? (
            <ul className="space-y-3">{live.map((a) => <ApplicantCard key={a.id} a={a} tuitionSubjects={subjects.length} wanted={t.tutor_gender_pref} />)}</ul>
          ) : <p className="text-sm text-slate-600">চলমান কোনো আবেদন নেই।</p>}
          {finished.length > 0 && (
            <>
              <button type="button" aria-expanded={showClosed} onClick={() => setShowClosed((v) => !v)} className="mt-3 min-h-11 text-sm font-semibold text-brand-700">
                {showClosed ? "শেষ হওয়া আবেদন লুকাও" : `শেষ হওয়া ${bn(finished.length)}টি আবেদন দেখাও`}
              </button>
              {showClosed && <ul className="mt-2 space-y-3">{finished.map((a) => <ApplicantCard key={a.id} a={a} tuitionSubjects={subjects.length} wanted={t.tutor_gender_pref} />)}</ul>}
            </>
          )}
        </section>
      </main>
    </>
  );
}
