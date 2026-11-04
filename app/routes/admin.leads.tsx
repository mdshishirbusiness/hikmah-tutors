// Guardian calls and website requests, newest first. Each lead goes New → Called → Posted / Not now (owner, 2026-11-04);
// "Post as tuition" makes a hidden draft filled in from the lead, and a lead can make more than one.
import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { ArrowUpRight, MapPin, Plus } from "lucide-react";
import type { Route } from "./+types/admin.leads";
import { Badge, ContactButtons, Empty, FilterPill, PageHead, ago, num, primaryButton, type Tone } from "~/components/admin";
import { listLeads, moveLead, postLeadAsTuition } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { usePendingCount } from "~/lib/lead-queue";
import { AREAS, LEAD_SOURCES, MEDIUMS, STATUSES, STUDENT_GENDERS, TIMES_OF_DAY, TUTOR_GENDERS, labelOf } from "~/lib/options";
import { tutorFromLabel } from "~/lib/fit";
import { FollowUpButton } from "~/components/FollowUps";
import { classLabel, requirementKeys, requirementLabels, subjectLabel, windowLabel } from "~/lib/request";
import { sessionLength } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Leads · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const status = sp.get("status") ?? "new";
  return { status, ...(await listLeads(status === "all" ? "" : status)) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  const id = Number(form.get("id"));
  if (form.get("intent") === "post") {
    const code = await postLeadAsTuition(id, viewer?.id ?? null);
    if (!code) return { error: "Lead not found." };
    throw redirect(`/admin/tuitions/${code}`);
  }
  return { error: await moveLead(id, String(form.get("to")), viewer?.id ?? null) };
}

const TONE: Record<string, Tone> = { new: "mango", called: "sky", posted: "green", not_now: "grey" };
const FILTERS = [...STATUSES.map((s) => ({ key: s.key, label: s.label })), { key: "all", label: "All" }];
const ghost = "inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-100 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-50 disabled:opacity-60";

export default function Leads({ loaderData: { status, counts, items }, actionData }: Route.ComponentProps) {
  const pending = usePendingCount();
  const busy = useNavigation().state !== "idle";
  const [sp] = useSearchParams();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHead
        title="Leads"
        sub="কল করুন, তারপর টিউশন হিসেবে পোস্ট করুন। পোস্ট করলে গোপন ড্রাফট তৈরি হয়, পাবলিক করেন আপনি।"
        action={<Link to="/admin/quick" className="hidden min-h-12 items-center gap-1.5 rounded-xl bg-mango px-5 text-sm font-semibold text-forest transition-colors hover:bg-mango-deep lg:inline-flex"><Plus size={18} aria-hidden />New lead</Link>}
      />
      <main className="space-y-4">
        <nav aria-label="Lead steps" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const n = f.key === "all" ? total : counts[f.key] ?? 0;
            const next = new URLSearchParams(sp);
            next.set("status", f.key);
            return <FilterPill key={f.key} to={`?${next}`} active={status === f.key}>{f.label} <span className="ml-1.5 tabular-nums opacity-70">{num(n)}</span></FilterPill>;
          })}
        </nav>

        {pending > 0 && (
          <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
            এই ফোনে {num(pending)}টি লিড এখনো সার্ভারে যায়নি। নেট এলে Quick Pad খুললেই চলে যাবে।
          </p>
        )}
        {actionData?.error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}

        {items.length === 0 ? <Empty>No leads in this step.</Empty> : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {items.map((l) => {
              const subjects = (l.subjects ?? "").split(",").filter(Boolean).map((s) => subjectLabel(s, l.subject_other)).join(", ");
              const when = [l.time_from != null ? windowLabel(l.time_from, l.time_to) : l.time_of_day && labelOf(TIMES_OF_DAY, l.time_of_day), l.session_minutes && sessionLength(l.session_minutes)].filter(Boolean).join(" · ");
              const asks = [tutorFromLabel((l.tutor_from ?? "").split(",").filter(Boolean)), ...requirementLabels(requirementKeys(l.requirement_keys))].filter(Boolean);
              const details = [l.student_gender && labelOf(STUDENT_GENDERS, l.student_gender), l.medium && labelOf(MEDIUMS, l.medium), subjects,
                l.tutor_gender && l.tutor_gender !== "any" && `${labelOf(TUTOR_GENDERS, l.tutor_gender)} tutor`].filter(Boolean).join(" · ");
              const tuitions = (l.tuitions ?? "").split(",").filter(Boolean);
              return (
                <li key={l.id} className="rounded-2xl bg-white p-4 shadow-ring sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg leading-snug font-bold text-forest">{classLabel(l.class_level, l.class_other)} · {labelOf(AREAS, l.area)}</p>
                      {details && <p className="mt-0.5 text-sm text-slate-600">{details}</p>}
                    </div>
                    <Badge tone={TONE[l.status]}>{labelOf(STATUSES, l.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {l.salary ? `৳${num(l.salary)}/month` : "Salary not given"}
                    {l.days_per_week ? ` · ${l.days_per_week} days/week` : ""}
                    {when ? ` · ${when}` : ""}
                  </p>
                  {asks.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1.5">{asks.map((a) => <span key={a} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-forest">{a}</span>)}</p>
                  )}
                  {l.address && <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0" aria-hidden />{l.address}</p>}
                  {l.flag_reason && <p role="alert" className="mt-2 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-900"><b>Flagged guardian:</b> {l.flag_reason}</p>}
                  {(l.referred_code || l.past > 0) && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {l.referred_code && <Link to={`/admin/tutors/${l.referred_code}`} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-900">Referred by T-{l.referred_code}</Link>}
                      {l.past > 0 && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">Known guardian · {l.past} {l.past === 1 ? "tuition" : "tuitions"}</span>}
                    </p>
                  )}
                  {l.notes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700">{l.notes}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    {l.guardian_name && <span className="font-semibold text-slate-700">{l.guardian_name} · </span>}
                    {ago(l.created_at)}{l.lead_source && ` · ${labelOf(LEAD_SOURCES, l.lead_source)}`}
                  </p>
                  <div className="mt-3"><ContactButtons phone={l.phone} /></div>

                  {tuitions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tuitions.map((code) => (
                        <Link key={code} to={`/admin/tuitions/${code}`} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-50 px-3 text-sm font-bold text-forest hover:bg-brand-100">HTR-{code}<ArrowUpRight size={15} aria-hidden /></Link>
                      ))}
                    </div>
                  )}

                  <Form method="post" className="mt-3 flex flex-wrap gap-2 border-t border-brand-50 pt-3">
                    <input type="hidden" name="id" value={l.id} />
                    {l.status !== "not_now" && (
                      <button name="intent" value="post" disabled={busy} className={`${primaryButton} flex-1 sm:flex-none`}>{l.status === "posted" ? "Another tuition" : "Post"}</button>
                    )}
                    {l.status === "new" && <button name="to" value="called" disabled={busy} className={ghost}>Called</button>}
                    {(l.status === "new" || l.status === "called") && <button name="to" value="not_now" disabled={busy} className={ghost}>Not now</button>}
                    {l.status === "not_now" && <button name="to" value="new" disabled={busy} className={ghost}>Reopen</button>}
                    <FollowUpButton kind="lead" refId={l.id} className="ml-auto" />
                  </Form>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
