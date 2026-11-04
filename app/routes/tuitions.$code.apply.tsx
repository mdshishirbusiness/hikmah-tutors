// The apply sheet (owner, 2026-11-04): the tuition, how the tutor fits it, an optional note and Confirm. Only a gender
// mismatch blocks; the rest warn. No limit on how many tuitions a tutor applies to. Private: signed-in tutors only.
import { Form, Link, data, redirect, useNavigation } from "react-router";
import { AlertTriangle, Check, X } from "lucide-react";
import type { Route } from "./+types/tuitions.$code.apply";
import { inputClass, primaryButton } from "~/components/admin";
import { SiteHeader } from "~/components/site";
import { SalaryText, placeLabel, subjectList } from "~/components/TuitionCard";
import type { Fit } from "~/lib/fit";
import { atTime, timeOfDay, tutorFromLabel } from "~/lib/fit";
import { applyTo, applyView, requireTutor } from "~/lib/me.server";
import { CLASS_LEVELS, SUBJECTS, labelOf } from "~/lib/options";
import { type PublicTuition, needText, taka } from "~/lib/tuition";
import { classLabel } from "~/lib/request";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Apply · ${params.code} · Hikmah Tutors` }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

const codeOf = (param: string) => Number(/^(?:HTR-)?(\d{1,9})$/i.exec(param)?.[1]) || -1;

export async function loader({ request, params }: Route.LoaderArgs) {
  const { me } = await requireTutor(request);
  const view = await applyView(me, codeOf(params.code));
  if (!view) throw data("Tuition not found", { status: 404 });
  return { ...view, minSalary: me.min_salary, paused: me.availability_paused === 1, review: me.review_status };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request);
  const code = codeOf(params.code);
  const form = await request.formData();
  const error = await applyTo(viewer, me, code, String(form.get("note") ?? "").trim());
  if (error) return { error };
  throw redirect(`/applied?new=${code}`);
}

type Row = { tone: "ok" | "warn" | "bad"; text: string };

/** The fit in the tutor's words. Rows the site can't judge yet (no classes picked, no university wish) are left out. */
function fitRows(t: PublicTuition, fit: Fit, minSalary: number | null): Row[] {
  const rows: Row[] = [];
  const wanted = t.tutor_gender_pref === "female" ? "a female tutor" : "a male tutor";
  if (t.tutor_gender_pref !== "any") rows.push(fit.gender === "ok" ? { tone: "ok", text: `Wants ${wanted}: you match` } : { tone: "bad", text: `This tuition needs ${wanted}` });
  const cls = classLabel(t.class_level, t.class_other);
  if (fit.class !== "unknown") rows.push(fit.class === "ok" ? { tone: "ok", text: `${cls} is in your classes` } : { tone: "warn", text: `${cls} isn't in your classes` });
  if (fit.subjectTotal) {
    const all = fit.subjects.length === fit.subjectTotal;
    rows.push({
      tone: all ? "ok" : "warn",
      text: fit.subjects.length
        ? `You teach ${all ? "all" : `${fit.subjects.length} of ${fit.subjectTotal}`} subjects: ${fit.subjects.map((s) => labelOf(SUBJECTS, s)).join(", ")}`
        : `You haven't listed ${subjectList(t)} for this level`,
    });
  }
  if (t.mode !== "online") {
    const area = placeLabel(t);
    rows.push(fit.area === "listed" ? { tone: "ok", text: `${area} is in your areas` } : fit.area === "nearby" ? { tone: "ok", text: `${area} is near where you live` } : { tone: "warn", text: `${area} isn't in your areas` });
  }
  if (fit.university) {
    rows.push(fit.university === "ok" ? { tone: "ok", text: `Guardian wants ${tutorFromLabel(t.tutor_from)}: you match` } : { tone: "warn", text: `Guardian prefers a tutor from ${tutorFromLabel(t.tutor_from)}` });
  }
  if (fit.salary === "low" && t.salary_amount && minSalary) rows.push({ tone: "warn", text: `${taka(t.salary_amount)} is below your minimum of ${taka(minSalary)}` });
  if (fit.time) {
    const when = atTime(timeOfDay(t));
    rows.push(fit.time === "ok" ? { tone: "ok", text: `You're free ${when}` } : { tone: "warn", text: `It's ${when}, which isn't in your free times` });
  }
  return rows;
}

const ICON = {
  ok: { icon: Check, tone: "bg-emerald-100 text-emerald-800" },
  warn: { icon: AlertTriangle, tone: "bg-amber-100 text-amber-800" },
  bad: { icon: X, tone: "bg-rose-100 text-rose-800" },
};

export default function Apply({ loaderData: { t, fit, applied, minSalary, paused, review }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const rows = fitRows(t, fit, minSalary);
  const blocked = fit.gender === "mismatch";
  const open = t.is_available && t.accepting_applications;

  return (
    <>
      <SiteHeader />
      <main className="min-h-dvh bg-forest">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-10 text-cream">
          <Link to={`/tuitions/${t.code_label}`} className="inline-flex min-h-11 items-center text-sm text-brand-200 hover:text-mango">← {t.code_label}</Link>
          <p className="mt-1 text-3xl leading-tight font-semibold text-mango"><SalaryText t={t} unitClass="text-base text-brand-200" /></p>
          <p className="mt-1 text-lg font-semibold">{classLabel(t.class_level, t.class_other)} · {placeLabel(t)}</p>
          <p className="text-sm text-brand-200">{subjectList(t)} · {t.days_per_week} days/week</p>
        </div>

        {/* No transform animation here: it would pin the fixed Confirm bar to this box instead of the screen. */}
        <div className="mx-auto max-w-lg rounded-t-3xl bg-cream px-4 pt-6 pb-32 sm:px-6">
          <h1 className="text-2xl font-bold text-forest">{applied ? "You've applied" : `Apply to ${t.code_label}`}</h1>

          {applied ? (
            <div className="mt-3 space-y-4">
              <p className="text-slate-700">HTR has your application. You'll see every step in Applied.</p>
              <Link to="/applied" className={`${primaryButton} w-full`}>Go to Applied</Link>
            </div>
          ) : review !== "approved" ? (
            // New tutors apply after the owner checks their registration (owner, 2026-11-04).
            <div className="mt-3 space-y-4">
              <p className="rounded-xl bg-mango px-4 py-3 text-forest">
                <span className="block font-extrabold">{review === "needs_fix" ? "HTR asked you to fix your profile" : "HTR is checking your profile"}</span>
                <span className="text-sm">{review === "needs_fix" ? "Fix it, and you can apply once it's checked." : "You can apply as soon as it's checked, usually within a day."}</span>
              </p>
              <Link to={review === "needs_fix" ? "/me/join" : "/me"} className={`${primaryButton} w-full`}>{review === "needs_fix" ? "Fix my profile" : "Go to My home"}</Link>
            </div>
          ) : !open ? (
            <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800">This tuition isn't taking applications now.</p>
          ) : (
            <Form method="post" className="mt-4 space-y-5">
              {actionData?.error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
              {paused && !blocked && (
                <p className="flex items-start gap-3 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                  <span><span className="font-semibold">You're paused.</span> Applying turns pause off, so HTR can send you tuitions again.</span>
                </p>
              )}

              <section aria-labelledby="fit">
                <h2 id="fit" className="mb-2 text-sm font-semibold tracking-wide text-slate-500">YOUR FIT</h2>
                <ul className="divide-y divide-brand-50 rounded-2xl border border-brand-100 bg-white px-4">
                  {rows.map((r) => {
                    const I = ICON[r.tone];
                    return (
                      <li key={r.text} className="flex items-start gap-3 py-3">
                        <span className={`grid size-7 shrink-0 place-items-center rounded-full ${I.tone}`}><I.icon size={15} strokeWidth={2.5} aria-hidden /></span>
                        <span className={`pt-0.5 text-[15px] leading-snug ${r.tone === "bad" ? "font-semibold text-rose-900" : "text-slate-800"}`}>{r.text}</span>
                      </li>
                    );
                  })}
                </ul>
                {!blocked && rows.some((r) => r.tone === "warn") && <p className="mt-2 text-sm text-slate-500">Warnings don't stop you. HTR sees them too.</p>}
              </section>

              {needText(t) && (
                <p className="rounded-2xl border-l-4 border-brand-600 bg-brand-50 px-4 py-3 text-sm">
                  <span className="block text-xs font-semibold text-brand-700">Tutor requirement</span>
                  <span className="font-semibold text-forest">{needText(t)}</span>
                </p>
              )}

              {blocked ? (
                <p className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">You can't apply to this one. Find others on the board.</p>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-forest">Note for HTR <span className="font-normal text-slate-500">(optional)</span></span>
                    <textarea name="note" rows={3} maxLength={300} placeholder="e.g. I can start next week. I live 5 minutes away." className={`${inputClass} py-3`} />
                  </label>
                  <p className="text-sm text-slate-600">
                    If you get it: a one-time media fee from the first month's salary, 60% in two parts or 50% within 7 days.{" "}
                    <Link to="/fees" className="font-semibold text-brand-700 underline">Fees</Link>
                  </p>
                </>
              )}

              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
                {blocked ? (
                  <Link to="/" className={`${primaryButton} mx-auto flex w-full max-w-lg`}>See other tuitions</Link>
                ) : (
                  <button disabled={busy} className={`${primaryButton} mx-auto flex w-full max-w-lg`}>{busy ? "Applying…" : "Confirm application"}</button>
                )}
              </div>
            </Form>
          )}
        </div>
      </main>
    </>
  );
}
