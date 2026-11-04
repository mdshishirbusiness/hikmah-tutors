import { data, Link } from "react-router";
import type { Route } from "./+types/tuitions.$code";
import { FeeBox } from "~/components/FeeBox";
import { Icon } from "~/components/Icon";
import { SiteFooter, SiteHeader, Toast, useShare } from "~/components/site";
import { SalaryText, StatusBadges, TuitionCard, placeLabel, subjectList } from "~/components/TuitionCard";
import { MEDIUMS, MODES, STUDENT_GENDERS, labelOf } from "~/lib/options";
import { GENDER_NEED, GENDER_STYLE, feeDisplay, formatDate, scheduleNote } from "~/lib/tuition";
import { classLabel, requirementLabels } from "~/lib/request";
import { tutorFromLabel } from "~/lib/fit";
import { similarTuitions, visibleTuition } from "~/lib/tuitions.server";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Tuition not found · Hikmah Tutors" }];
  const { t } = loaderData;
  return [
    { title: `${classLabel(t.class_level, t.class_other)}, ${placeLabel(t)} · ${t.code_label} · Hikmah Tutors` },
    { name: "description", content: `${classLabel(t.class_level, t.class_other)}: ${subjectList(t)}. ${placeLabel(t)}, Rajshahi.` },
  ];
}

// Public page: returns only public tuition fields, so no viewer check is needed.
export async function loader({ params }: Route.LoaderArgs) {
  const m = /^(?:HTR-)?(\d{1,9})$/i.exec(params.code);
  const t = m && (await visibleTuition(Number(m[1])));
  if (!t) throw data("Tuition not found", { status: 404 });
  return { t, similar: await similarTuitions(t), now: Math.floor(Date.now() / 1000) };
}

type Row = { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string };

/** One fact as an icon circle, a bold label and the value below (owner's inspiration, 2026-11-04). */
function Fact({ icon, label, value }: Row) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon name={icon} className="size-5" /></span>
      <div className="min-w-0">
        <dt className="font-semibold text-forest">{label}</dt>
        <dd className="break-words text-slate-600">{value}</dd>
      </div>
    </div>
  );
}

export default function TuitionDetail({ loaderData: { t, similar, now } }: Route.ComponentProps) {
  const { share, toast } = useShare();
  const rows: Row[] = [
    { icon: "tag", label: "Subjects", value: subjectList(t) },
    { icon: "pin", label: "Location", value: t.mode === "online" ? "Online" : `${placeLabel(t)}, Rajshahi · ${labelOf(MODES, t.mode)}` },
    { icon: "calendar", label: "Days", value: `${t.days_per_week} days/week` },
    { icon: "clock", label: "Time", value: scheduleNote(t) || "To be discussed" },
  ];
  if (t.student_gender) rows.push({ icon: "user", label: "Student", value: labelOf(STUDENT_GENDERS, t.student_gender) });
  if (t.medium) rows.push({ icon: "book", label: "Medium", value: labelOf(MEDIUMS, t.medium) });
  if (t.tutor_from.length) rows.push({ icon: "cap", label: "Tutor from", value: tutorFromLabel(t.tutor_from) });
  if (t.start_note) rows.push({ icon: "arrow", label: "Start", value: t.start_note });

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-forest text-cream">
          <div className="mx-auto max-w-3xl px-4 pt-4 pb-10">
            <Link to="/" className="inline-flex min-h-11 items-center text-sm text-brand-200 hover:text-mango">← Back to board</Link>
            {!t.is_available && (
              <div role="status" className="mt-2 rounded-2xl bg-slate-100 px-4 py-3 text-slate-800">
                <p className="font-semibold">This tuition is no longer open</p>
                <p className="text-sm">See similar tuitions below.</p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${GENDER_STYLE[t.tutor_gender_pref].badge}`}>
                <span aria-hidden className={`size-2 rounded-full ${GENDER_STYLE[t.tutor_gender_pref].bar}`} />
                {GENDER_NEED[t.tutor_gender_pref]}
              </span>
              <span className="text-sm font-semibold text-brand-200">{t.code_label}</span>
              <StatusBadges t={t} now={now} />
            </div>
            <p className="mt-5 text-4xl leading-snug font-semibold break-words text-mango sm:text-5xl">
              <SalaryText t={t} unitClass="text-base text-brand-200" />
            </p>
            <p className="mt-3 inline-flex rounded-full bg-cream px-4 py-1.5 text-lg font-semibold text-forest">{placeLabel(t)}</p>
            <h1 className="mt-4 text-2xl leading-snug font-semibold sm:text-3xl">{classLabel(t.class_level, t.class_other)} · {subjectList(t)}</h1>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            {t.is_available && t.accepting_applications ? (
              <Link to={`/tuitions/${t.code_label}/apply`} className="flex min-h-12 items-center justify-center rounded-xl bg-forest text-sm font-semibold text-cream transition-colors duration-150 hover:bg-brand-700">Apply</Link>
            ) : (
              <span className="flex min-h-12 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-600">Applications closed</span>
            )}
            <button type="button" onClick={() => share(`/tuitions/${t.code_label}`, `${t.code_label} · Hikmah Tutors`)} className="min-h-12 rounded-xl border border-brand-100 bg-white px-5 text-sm font-semibold text-forest hover:bg-brand-50">Share</button>
          </div>

          {/* The guardian's tutor requirement leads the details, since it decides who should apply (owner, 2026-11-04). */}
          {(t.requirements_public || t.requirement_keys.length > 0) && (
            <section className="rounded-2xl border-l-4 border-brand-600 bg-brand-50 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-700"><Icon name="cap" className="size-4" />Tutor requirement</h2>
              {t.requirement_keys.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {requirementLabels(t.requirement_keys).map((r) => <li key={r} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-forest ring-1 ring-brand-100">{r}</li>)}
                </ul>
              )}
              {t.requirements_public && <p className="mt-2 text-lg leading-snug font-semibold whitespace-pre-line text-forest">{t.requirements_public}</p>}
            </section>
          )}

          <dl className="rounded-2xl border border-brand-100 bg-white px-5 py-2">
            {rows.map((r) => <Fact key={r.label} {...r} />)}
          </dl>
          {t.posted_at && <p className="-mt-3 px-1 text-xs text-slate-500">Posted {formatDate(t.posted_at)}</p>}

          <FeeBox fees={feeDisplay(t)} />

          {similar.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-forest">Similar tuitions</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {similar.map((s, i) => <TuitionCard key={s.code} t={s} now={now} index={i} />)}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
      <Toast message={toast} />
    </>
  );
}
