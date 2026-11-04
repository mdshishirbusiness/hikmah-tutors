// The tutor's Applied tab (owner, 2026-11-04). A selected tuition comes first: the guardian's number (each view
// logged) and the tutor's own checklist Called → Met → Demo done → Confirmed, with a way out if it didn't work out.
import { useState } from "react";
import { Form, Link, useFetcher, useNavigation, useSearchParams } from "react-router";
import { Check, CheckCheck, MessageCircle, Phone } from "lucide-react";
import type { Route } from "./+types/applied";
import { APPLICATION_TONE, Badge, ago, primaryButton, when } from "~/components/admin";
import { SiteHeader } from "~/components/site";
import { Sheet, TutorBar } from "~/components/tutor";
import { APPLICATION_STATUS, DIDNT_WORK_OUT } from "~/lib/admin-labels";
import { waLink } from "~/lib/contact";
import { type MyApplication, didntWorkOut, guardianPhone, myApplications, requireTutor, tick, tutorBadges, tutorConfirm, withdraw } from "~/lib/me.server";
import { AREAS, CLASS_LEVELS, SUBJECTS, labelOf } from "~/lib/options";
import { feeDisplay, taka } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Applied · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { viewer, me } = await requireTutor(request);
  const [applications, badges] = await Promise.all([myApplications(me.id), tutorBadges(viewer, me)]);
  return { applications, name: me.full_name, dot: badges.home };
}

export async function action({ request }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request);
  const form = await request.formData();
  const id = Number(form.get("id"));
  switch (form.get("intent")) {
    case "phone": {
      const found = await guardianPhone(viewer, me, id);
      return found ? { id, phone: found.phone, address: found.address } : { id, error: "The number isn't available." };
    }
    case "tick": return { id, error: await tick(viewer, me, id, String(form.get("step"))) };
    case "confirm": return { id, error: await tutorConfirm(viewer, me, id, form.get("agree") === "1") };
    case "didnt": return { id, error: await didntWorkOut(viewer, me, id, String(form.get("reason") ?? "")) };
    case "withdraw": return { id, error: await withdraw(viewer, me, id) };
  }
  return { id, error: "Unknown request." };
}

const SELECTED = ["trial_arranged", "confirmed"];
const ACTIVE = ["submitted", "under_review", "shortlisted"];
const LADDER = ["submitted", "under_review", "shortlisted", "trial_arranged"];
const NEXT: Record<string, string> = {
  submitted: "HTR will look at your application.",
  under_review: "HTR is talking to the guardian.",
  shortlisted: "You're on the shortlist. HTR picks one tutor next.",
};

const what = (a: MyApplication) => [labelOf(CLASS_LEVELS, a.class_level), a.mode === "online" ? "Online" : labelOf(AREAS, a.area)].join(" · ");
const pay = (a: MyApplication) => (a.salary_kind === "fixed" && a.salary_amount ? `${taka(a.salary_amount)}/month` : a.salary_kind === "negotiable" ? "Negotiable" : "Salary not given");
const subjects = (a: MyApplication) => a.subjects.split(",").filter(Boolean).map((s) => labelOf(SUBJECTS, s)).join(", ");

function GuardianNumber({ a }: { a: MyApplication }) {
  const f = useFetcher<typeof action>();
  const phone = f.data && "phone" in f.data ? f.data.phone : null;
  const address = f.data && "address" in f.data ? f.data.address : null;
  return (
    <div className="rounded-2xl bg-white p-4 text-forest">
      <p className="text-xs font-semibold tracking-wide text-slate-500">GUARDIAN'S NUMBER</p>
      {phone ? (
        <>
          <p className="mt-1 text-2xl font-bold tracking-wide tabular-nums">{phone}</p>
          {address && <p className="mt-1 text-sm font-semibold break-words text-slate-700">{address}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={`tel:${phone}`} className={`${primaryButton} min-h-11`}><Phone size={16} aria-hidden />Call</a>
            <a href={waLink(phone, `Assalamu alaikum. I'm the tutor from Hikmah Tutors for ${what(a)} (HTR-${a.tuition_code}).`)} target="_blank" rel="noreferrer"
              className="wa-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-100 bg-white text-sm font-semibold text-forest hover:bg-brand-50">
              <MessageCircle size={16} aria-hidden />WhatsApp
            </a>
          </div>
        </>
      ) : (
        <f.Form method="post" className="mt-2">
          <input type="hidden" name="intent" value="phone" />
          <input type="hidden" name="id" value={a.id} />
          <button disabled={f.state !== "idle"} className={`${primaryButton} min-h-11 w-full`}>{f.state !== "idle" ? "Opening…" : "Show number"}</button>
          {f.data && "error" in f.data && f.data.error && <p className="mt-2 text-sm font-semibold text-rose-800">{f.data.error}</p>}
        </f.Form>
      )}
      <p className="mt-2 text-xs text-slate-500">For you only, while you're selected. HTR sees when it's opened.</p>
    </div>
  );
}

function Checklist({ a, onConfirm, busy }: { a: MyApplication; onConfirm: () => void; busy: boolean }) {
  const confirmed = a.status === "confirmed";
  const steps = [
    { key: "called", label: "Called the guardian", at: a.called_at },
    { key: "met", label: "Met the guardian", at: a.met_at },
    { key: "demo_done", label: "Demo done", at: a.demo_done_at },
  ];
  const next = steps.find((s) => !s.at)?.key ?? (confirmed ? null : "confirm");
  return (
    <ol className="space-y-2">
      {[...steps, { key: "confirm", label: "Confirmed", at: confirmed ? a.updated_at : null }].map((s, i) => {
        const done = !!s.at;
        return (
          <li key={s.key} className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 ${done ? "bg-white/10" : s.key === next ? "bg-white text-forest" : "bg-white/5 text-brand-200"}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-mango text-forest" : s.key === next ? "bg-forest text-cream" : "border border-white/25"}`}>
              {done ? <Check size={16} strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{s.label}</span>
              {done && <span className="block text-xs text-brand-200">{ago(s.at)}</span>}
            </span>
            {s.key === next && s.key !== "confirm" && (
              <Form method="post">
                <input type="hidden" name="intent" value="tick" />
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="step" value={s.key} />
                <button disabled={busy} className="min-h-11 rounded-xl bg-mango px-4 text-sm font-bold text-forest">Done</button>
              </Form>
            )}
            {s.key === next && s.key === "confirm" && (
              <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-mango px-4 text-sm font-bold text-forest">Confirm</button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SelectedCard({ a, busy, error }: { a: MyApplication; busy: boolean; error: string | null }) {
  const [sheet, setSheet] = useState<"confirm" | "didnt" | null>(null);
  const fees = feeDisplay({ salary_kind: a.salary_kind as "fixed", salary_amount: a.salary_amount, salary_period: a.salary_period as "per_month" });
  const confirmed = a.status === "confirmed";
  return (
    <li className="overflow-hidden rounded-3xl bg-forest text-cream shadow-card">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-mango px-3 py-0.5 text-xs font-bold text-forest">{confirmed ? "Confirmed" : "You're selected"}</span>
          <Link to={`/tuitions/HTR-${a.tuition_code}`} className="text-xs font-semibold text-brand-200">HTR-{a.tuition_code}</Link>
        </div>
        <p className="mt-3 text-2xl leading-tight font-semibold">{what(a)}</p>
        <p className="mt-1 text-sm text-brand-200">{pay(a)} · {a.days_per_week} days/week · {subjects(a)}</p>
        {!confirmed && a.selected_at && !a.called_at && <p className="mt-2 text-sm font-semibold text-mango">Call the guardian within 3 hours of selection · selected {ago(a.selected_at)}</p>}
      </div>
      <div className="space-y-3 px-3 pb-3">
        <GuardianNumber a={a} />
        {error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{error}</p>}
        <Checklist a={a} onConfirm={() => setSheet("confirm")} busy={busy} />
        <button type="button" onClick={() => setSheet("didnt")} className="min-h-11 w-full text-sm font-semibold text-brand-200 underline-offset-2 hover:underline">হয়নি? HTR-কে জানান</button>
      </div>

      <Sheet open={sheet === "confirm"} onClose={() => setSheet(null)} title="Confirm this tuition?">
        <p className="text-slate-700">Confirm only once the guardian has said yes. Confirming books HTR-{a.tuition_code} for you, and the media fee becomes due under the terms:</p>
        <dl className="mt-3 space-y-2 text-sm text-slate-800">
          <div className="rounded-xl border border-brand-100 p-3">
            <dt className="font-semibold text-forest">Standard: 60%{fees.is_example && " (example on ৳4,000)"}</dt>
            <dd>{taka(fees.first)} after confirming + {taka(fees.second)} after the first salary = <b>{taka(fees.standard_total)}</b></dd>
          </div>
          <div className="rounded-xl border border-brand-100 p-3">
            <dt className="font-semibold text-forest">Early: 50% within 7 days of joining</dt>
            <dd><b>{taka(fees.early_total)}</b> · you save {taka(fees.saving)}</dd>
          </div>
        </dl>
        <Form method="post" className="mt-4 space-y-3" onSubmit={() => setSheet(null)}>
          <input type="hidden" name="intent" value="confirm" />
          <input type="hidden" name="id" value={a.id} />
          <label className="flex items-start gap-3 text-slate-800">
            <input type="checkbox" name="agree" value="1" required className="mt-0.5 size-5 shrink-0 accent-forest" />
            I understand the media fee is due once I confirm.
          </label>
          <button disabled={busy} className={`${primaryButton} w-full`}>Confirm tuition</button>
        </Form>
      </Sheet>

      <Sheet open={sheet === "didnt"} onClose={() => setSheet(null)} title="টিউশনটা হয়নি?">
        <p className="text-slate-700">কেন হয়নি জানান। HTR এই টিউশনের জন্য পরের টিউটর খুঁজবে।</p>
        <Form method="post" className="mt-3 space-y-2" onSubmit={() => setSheet(null)}>
          <input type="hidden" name="intent" value="didnt" />
          <input type="hidden" name="id" value={a.id} />
          {Object.entries(DIDNT_WORK_OUT).map(([key, label]) => (
            <label key={key} className="flex min-h-12 items-center gap-3 rounded-xl border border-brand-100 px-3 text-slate-800 has-checked:border-forest has-checked:bg-brand-50">
              <input type="radio" name="reason" value={key} required className="size-5 accent-forest" />{label}
            </label>
          ))}
          <button disabled={busy} className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-rose-700 text-sm font-semibold text-white hover:bg-rose-800">HTR-কে পাঠান</button>
        </Form>
      </Sheet>
    </li>
  );
}

function Ladder({ status }: { status: string }) {
  const at = LADDER.indexOf(status);
  return (
    <ol className="mt-3 flex items-center gap-1" aria-label={`Step ${at + 1} of 4`}>
      {LADDER.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= at ? "bg-brand-600" : "bg-slate-200"}`} />)}
    </ol>
  );
}

function ActiveCard({ a, busy }: { a: MyApplication; busy: boolean }) {
  return (
    <li className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/tuitions/HTR-${a.tuition_code}`} className="text-lg leading-tight font-bold text-forest hover:underline">{what(a)}</Link>
          <p className="text-sm text-slate-600">HTR-{a.tuition_code} · {pay(a)}</p>
        </div>
        <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
      </div>
      <Ladder status={a.status} />
      <p className="mt-2 text-sm text-slate-700">{NEXT[a.status]}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          Applied {when(a.created_at)}
          {/* Seen by HTR (owner, 2026-11-05): opened by the owner, or already moved on from New. */}
          {a.seen_at || a.status !== "submitted"
            ? <span className="inline-flex items-center gap-0.5 font-bold text-sky-700"><CheckCheck size={14} aria-hidden />Seen by HTR{a.seen_at ? ` ${ago(a.seen_at)}` : ""}</span>
            : <span className="inline-flex items-center gap-0.5 font-semibold text-slate-400"><Check size={14} aria-hidden />Sent</span>}
        </p>
        <Form method="post" onSubmit={(e) => { if (!window.confirm(`Withdraw from HTR-${a.tuition_code}?`)) e.preventDefault(); }}>
          <input type="hidden" name="intent" value="withdraw" />
          <input type="hidden" name="id" value={a.id} />
          <button disabled={busy} className="min-h-11 px-2 text-sm font-semibold text-slate-500 hover:text-rose-700">Withdraw</button>
        </Form>
      </div>
    </li>
  );
}

export default function Applied({ loaderData: { applications, dot }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [sp] = useSearchParams();
  const [showClosed, setShowClosed] = useState(false);
  const selected = applications.filter((a) => SELECTED.includes(a.status));
  const active = applications.filter((a) => ACTIVE.includes(a.status));
  const closed = applications.filter((a) => !SELECTED.includes(a.status) && !ACTIVE.includes(a.status));
  const justApplied = sp.get("new");
  const errorFor = (id: number) => (actionData && "error" in actionData && actionData.id === id ? actionData.error ?? null : null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-28 sm:px-6">
        <h1 className="text-3xl font-bold text-forest">Applied</h1>
        <p className="mt-1 text-slate-600">{selected.length + active.length} active · {closed.length} closed</p>

        {justApplied && <p role="status" className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">Applied to HTR-{justApplied}. HTR will let you know.</p>}

        {selected.length > 0 && (
          <section className="mt-6" aria-labelledby="selected">
            <h2 id="selected" className="mb-2 text-sm font-semibold tracking-wide text-slate-500">NEEDS YOU</h2>
            <ul className="space-y-4">{selected.map((a) => <SelectedCard key={a.id} a={a} busy={busy} error={errorFor(a.id)} />)}</ul>
          </section>
        )}

        <section className="mt-6" aria-labelledby="active">
          <h2 id="active" className="mb-2 text-sm font-semibold tracking-wide text-slate-500">IN PROGRESS</h2>
          {active.length ? (
            <ul className="space-y-3">{active.map((a) => <ActiveCard key={a.id} a={a} busy={busy} />)}</ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-6 text-center text-slate-600">
              Nothing waiting. <Link to="/" className="font-semibold text-brand-700 underline">Find tuitions</Link>
            </p>
          )}
        </section>

        {closed.length > 0 && (
          <section className="mt-6">
            <button type="button" aria-expanded={showClosed} onClick={() => setShowClosed((v) => !v)} className="min-h-11 text-sm font-semibold text-brand-700">
              {showClosed ? "Hide closed" : `Show ${closed.length} closed`}
            </button>
            {showClosed && (
              <ul className="mt-2 space-y-2">
                {closed.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-forest">{what(a)}</span>
                      <span className="block text-xs text-slate-500">HTR-{a.tuition_code} · {when(a.updated_at)}</span>
                    </span>
                    <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <TutorBar active="applied" count={selected.filter((a) => a.status !== "confirmed").length} dot={dot} />
    </>
  );
}
