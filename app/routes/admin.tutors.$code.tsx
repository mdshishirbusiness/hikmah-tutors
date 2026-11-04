// One tutor for the admin (owner, 2026-11-04: track tutors). Photo and contact on top, their record with HTR as
// numbers, every application as a timeline, what they picked on the site, their education and statements, and a
// private do-not-place flag (warning only). This page is never public.
import { Form, Link, data, useNavigation } from "react-router";
import { Check, Flag, KeyRound, Mail, MessageCircle, Phone, UserPlus } from "lucide-react";
import type { Route } from "./+types/admin.tutors.$code";
import { Avatar } from "~/components/Avatar";
import { APPLICATION_TONE, Badge, Card, Facts, PageHead, ago, inputClass, num, safeUrl, when } from "~/components/admin";
import { APPLICATION_STATUS } from "~/lib/admin-labels";
import { getTutor, reviewTutor, setFlag, setTutorEmail } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { waLink } from "~/lib/contact";
import { AREAS, BANDS, CLASS_LEVELS, MEDIUMS, SUBJECTS, TRANSPORTS, labelOf } from "~/lib/options";
import { taka } from "~/lib/tuition";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Tutor ${params.code} · Admin` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const found = await getTutor(Number(params.code) || -1);
  if (!found) throw data("Tutor not found", { status: 404 });
  return found;
}

export async function action({ request, params }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const found = await getTutor(Number(params.code) || -1);
  if (!found) throw data("Tutor not found", { status: 404 });
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "approve" || intent === "fix") return { error: await reviewTutor(found.tutor.id, intent, String(form.get("note") ?? ""), viewer?.id ?? null) };
  if (intent === "email") return { error: await setTutorEmail(found.tutor.id, String(form.get("email") ?? ""), viewer?.id ?? null) };
  return { error: await setFlag("tutor", found.tutor.id, form.get("intent") === "clear" ? "" : String(form.get("reason") ?? ""), viewer?.id ?? null) };
}

const STATEMENTS: Record<string, string> = {
  junior_strategy: "Junior: teaching approach", junior_experience: "Junior: experience", ssc_strategy: "SSC: skills and approach", ssc_experience: "SSC: experience",
  hsc_strategy: "HSC: skills and approach", hsc_experience: "HSC: experience", english_experience: "English medium / version experience", special_skills: "Special skills",
  skills_detail: "Skills in detail", demo_video: "Demo video",
};
const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
const ghost = "inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring hover:bg-brand-50";

export default function AdminTutor({ loaderData: { tutor: t, subjects, statements, applications, placements, areas, classes }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const facebook = safeUrl(t.facebook_url);
  const reached = (s: string[]) => applications.filter((a) => s.includes(a.status)).length;
  const stats = [
    ["Applied", applications.length],
    ["Shortlisted", reached(["shortlisted", "trial_arranged", "confirmed"])],
    ["Selected", reached(["trial_arranged", "confirmed"])],
    ["Placed", placements.filter((p) => ["confirmed", "joined", "ended"].includes(p.status)).length],
  ] as const;
  const live = applications.filter((a) => ["submitted", "under_review", "shortlisted", "trial_arranged"].includes(a.status));

  return (
    <>
      <PageHead back={{ to: "/admin/tutors", label: "Tutors" }} eyebrow={`T-${t.code}`} title={t.full_name} />
      {actionData?.error && <p role="alert" className="mb-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
      {t.review_status !== "approved" && (
        // A registration made on the site (owner, 2026-11-04): check the photo and details, then approve or ask for a fix.
        <section className="mb-5 rounded-2xl bg-mango p-5 text-forest">
          <p className="flex items-center gap-2 text-lg font-extrabold"><UserPlus size={20} aria-hidden />{t.review_status === "waiting" ? "New tutor: check this registration" : "Asked to fix"}</p>
          <p className="mt-0.5 text-sm">{t.review_status === "waiting" ? `Registered on the site ${ago(t.created_at)}. They can apply once you approve.` : `You asked: “${t.review_note}”. Waiting for them to send it again.`}</p>
          <Form method="post" className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
            <button name="intent" value="approve" disabled={busy} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-forest px-5 text-sm font-bold text-cream disabled:opacity-60"><Check size={16} aria-hidden />Approve</button>
            <input name="note" maxLength={300} placeholder="Or what to fix, e.g. use a clear photo of your face" className="min-h-11 min-w-0 flex-1 rounded-xl bg-white px-4 text-sm outline-none ring-1 ring-forest/20 focus:ring-2 focus:ring-forest" />
            <button name="intent" value="fix" disabled={busy} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white/70 px-4 text-sm font-bold text-forest disabled:opacity-60">Ask to fix</button>
          </Form>
        </section>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-ring sm:p-6">
            <div className="flex flex-wrap items-start gap-5">
              <Avatar code={t.code} name={t.full_name} hasPhoto={!!t.photo_key} size="xl" className="shadow-card" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {t.flag_reason && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-900"><Flag size={12} aria-hidden />Flagged</span>}
                  <Badge tone={t.setup_done_at ? "green" : "grey"}>{t.setup_done_at ? `Signed in · set up ${when(t.setup_done_at)}` : "Not signed in yet"}</Badge>
                  {t.availability_paused === 1 && <Badge tone="amber">Paused</Badge>}
                  {t.priority === "urgent" && <Badge tone="dark">Urgent</Badge>}
                </div>
                <p className="mt-2 text-lg font-bold text-forest">{[t.university && t.university !== "other" ? UNI[t.university] : t.institution, t.department].filter(Boolean).join(" · ")}</p>
                <p className="text-sm text-slate-600">{[t.university && t.university !== "other" && t.institution !== UNI[t.university] ? t.institution : null, t.session_year && `Session ${t.session_year}`, t.gender === "female" ? "Female" : t.gender === "male" ? "Male" : null].filter(Boolean).join(" · ")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:${t.phone}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-3 text-sm font-bold text-cream hover:bg-brand-700"><Phone size={16} aria-hidden />{t.phone}</a>
                  <a href={waLink(t.phone, "")} target="_blank" rel="noreferrer" className={ghost}><MessageCircle size={16} aria-hidden />WhatsApp</a>
                  {t.alt_phone && <a href={`tel:${t.alt_phone}`} className={ghost}><Phone size={16} aria-hidden />{t.alt_phone}</a>}
                  {t.email && <a href={`mailto:${t.email}`} className={ghost}><Mail size={16} aria-hidden />Email</a>}
                  {facebook && <a href={facebook} target="_blank" rel="noreferrer" className={ghost}>Facebook</a>}
                </div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-4 gap-2 border-t border-brand-50 pt-4 text-center">
              {stats.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cream py-2"><dt className="text-xs text-slate-500">{k}</dt><dd className="text-2xl font-extrabold text-forest tabular-nums">{num(v)}</dd></div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">Applications<span className="rounded-full bg-white px-2 text-xs text-brand-700 shadow-ring">{num(applications.length)}</span>{live.length > 0 && <span className="text-xs font-semibold text-emerald-700">{live.length} open</span>}</h2>
            {applications.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-ring">No applications yet.</p> : (
              <ol className="overflow-hidden rounded-2xl bg-white shadow-ring">
                {applications.map((a) => (
                  <li key={a.id} className="border-b border-brand-50 last:border-0">
                    <Link to={`/admin/tuitions/${a.tuition_code}?a=${a.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-50/50">
                      <span className="w-20 shrink-0 text-sm font-bold text-forest">HTR-{a.tuition_code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{labelOf(CLASS_LEVELS, a.class_level)} · {labelOf(AREAS, a.area)}</span>
                        <span className="block text-xs text-slate-500">{a.salary_kind === "fixed" && a.salary_amount ? `${taka(a.salary_amount)} · ` : ""}applied {when(a.created_at)}</span>
                      </span>
                      <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {statements.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-2">
              {statements.map((s) => (
                <Card key={s.kind}>
                  <h3 className="text-sm font-bold text-forest">{STATEMENTS[s.kind]}</h3>
                  <p className="mt-1 text-sm break-words whitespace-pre-line text-slate-700">{s.body}</p>
                </Card>
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-bold text-forest">What they picked</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div><p className="text-xs text-slate-500">Areas</p><p className="font-semibold text-slate-900">{t.anywhere ? "Anywhere in Rajshahi" : areas.map((a) => labelOf(AREAS, a)).join(", ") || "Not picked yet"}</p></div>
              <div><p className="text-xs text-slate-500">Classes</p><p className="font-semibold text-slate-900">{classes.map((c) => labelOf(CLASS_LEVELS, c)).join(", ") || "Not picked yet"}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500">Lowest salary</p><p className="font-semibold text-slate-900">{t.min_salary ? taka(t.min_salary) : "—"}</p></div>
                <div><p className="text-xs text-slate-500">Transport</p><p className="font-semibold text-slate-900">{t.transport ? labelOf(TRANSPORTS, t.transport) : "—"}</p></div>
                <div><p className="text-xs text-slate-500">Demo class</p><p className="font-semibold text-slate-900">{t.demo_willing === null ? "—" : t.demo_willing ? "Willing" : "Not willing"}</p></div>
                <div><p className="text-xs text-slate-500">Medium</p><p className="font-semibold text-slate-900">{(t.mediums ?? "").split(",").filter(Boolean).map((m) => labelOf(MEDIUMS, m)).join(", ") || "—"}</p></div>
              </div>
              {t.about && <div><p className="text-xs text-slate-500">About</p><p className="whitespace-pre-line text-slate-800">{t.about}</p></div>}
            </div>
          </Card>
          <Card>
            <h2 className="text-sm font-bold text-forest">Can teach</h2>
            {BANDS.map((b) => {
              const list = subjects.filter((s) => s.band === b.key);
              return list.length > 0 && (
                <div key={b.key} className="mt-3">
                  <p className="text-xs text-slate-500">{b.label}</p>
                  <div className="mt-1 flex flex-wrap gap-1">{list.map((s) => <span key={s.subject} className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-semibold text-forest">{labelOf(SUBJECTS, s.subject)}</span>)}</div>
                </div>
              );
            })}
          </Card>
          <Card>
            <h2 className="mb-1 text-sm font-bold text-forest">Education and home</h2>
            <Facts rows={[
              ["SSC", [t.ssc_school, t.ssc_group, t.ssc_year, t.ssc_result && `GPA ${t.ssc_result}`].filter(Boolean).join(" · ")],
              ["HSC", [t.hsc_college, t.hsc_group, t.hsc_year, t.hsc_result && `GPA ${t.hsc_result}`].filter(Boolean).join(" · ")],
              ["Lives in", t.current_location], ["Home", [t.home_district, t.home_division].filter(Boolean).join(", ")],
              ["Registered", when(t.registered_at)], ["Email", t.email],
            ]} />
          </Card>
          {!t.user_id && (
            <Card>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-forest"><KeyRound size={15} aria-hidden />Sign-in email</h2>
              <p className="mt-1 text-xs text-slate-500">Not linked to a Google account yet. If they use another Gmail, put it here; they log in again with it.</p>
              <Form method="post" className="mt-3 flex gap-2">
                <input type="hidden" name="intent" value="email" />
                <input name="email" type="email" defaultValue={t.email ?? ""} placeholder="name@gmail.com" className={`${inputClass} min-h-11 text-sm`} />
                <button disabled={busy} className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-forest px-4 text-sm font-bold text-cream disabled:opacity-60">Save</button>
              </Form>
            </Card>
          )}
          <Card className={t.flag_reason ? "ring-2 ring-rose-200" : ""}>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-forest"><Flag size={15} aria-hidden />Do-not-place flag</h2>
            <p className="mt-1 text-xs text-slate-500">Private. Shows a warning on their applications; nothing is blocked.</p>
            <Form method="post" className="mt-3 space-y-2">
              <textarea name="reason" rows={2} maxLength={300} defaultValue={t.flag_reason ?? ""} placeholder="Reason, e.g. didn't show up for a demo" className={`${inputClass} py-2 text-sm`} />
              <div className="flex gap-2">
                <button disabled={busy} className="inline-flex min-h-11 items-center rounded-xl bg-forest px-4 text-sm font-bold text-cream disabled:opacity-60">{t.flag_reason ? "Update" : "Flag"}</button>
                {t.flag_reason && <button name="intent" value="clear" disabled={busy} className={ghost}>Clear flag</button>}
              </div>
            </Form>
          </Card>
          {placements.length > 0 && (
            <Card>
              <h2 className="text-sm font-bold text-forest">Placements</h2>
              <ul className="mt-2 space-y-1.5">
                {placements.map((p) => (
                  <li key={p.tuition_code + p.status} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/admin/tuitions/${p.tuition_code}`} className="font-semibold text-brand-700 hover:underline">HTR-{p.tuition_code}</Link>
                    <span className="text-xs text-slate-500">{p.confirmed_at ? ago(p.confirmed_at) : ""}</span>
                    <Badge tone={p.status === "cancelled" ? "grey" : "brand"}>{p.status[0].toUpperCase() + p.status.slice(1)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
