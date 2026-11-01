import { data, Link } from "react-router";
import type { Route } from "./+types/tuitions.$code";
import { SiteFooter, SiteHeader, Toast, useShare } from "~/components/site";
import { SalaryText, StatusBadges, TuitionCard, placeLabel, subjectList } from "~/components/TuitionCard";
import { CLASS_LEVELS, MEDIUMS, MODES, STUDENT_GENDERS, TUTOR_GENDERS, labelOf } from "~/lib/options";
import { GENDER_NEED, GENDER_STYLE, bnDigits, feeDisplay, formatDate, taka, type PublicTuition } from "~/lib/tuition";
import { similarTuitions, visibleTuition } from "~/lib/tuitions.server";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "টিউশন পাওয়া যায়নি · Hikmah Tutors" }];
  const { t } = loaderData;
  return [
    { title: `${labelOf(CLASS_LEVELS, t.class_level)}, ${placeLabel(t)} · ${t.code_label} · Hikmah Tutors` },
    { name: "description", content: `${labelOf(CLASS_LEVELS, t.class_level)}: ${subjectList(t)}। ${placeLabel(t)}, রাজশাহী।` },
  ];
}

// Public page: returns only public tuition fields, so no viewer check is needed.
export async function loader({ params }: Route.LoaderArgs) {
  const m = /^(?:HTR-)?(\d{1,9})$/i.exec(params.code);
  const t = m && (await visibleTuition(Number(m[1])));
  if (!t) throw data("টিউশনটি পাওয়া যায়নি", { status: 404 });
  return { t, similar: await similarTuitions(t), now: Math.floor(Date.now() / 1000) };
}

function FeeBox({ t }: { t: PublicTuition }) {
  const fees = feeDisplay(t);
  return (
    <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
      <h2 className="text-lg font-semibold text-forest">ফি-শর্ত (আবেদনের আগে জেনে নিন)</h2>
      <p className="mt-1 text-sm text-slate-700">HTR টিউটরের কাছ থেকে প্রথম মাসের বেতন থেকে এককালীন মিডিয়া ফি নেয়। দুটি অপশনের যেকোনো একটি, কখনো দুটো একসাথে নয়।</p>
      <p className="mt-3 text-sm font-semibold text-slate-700">{fees.is_example ? `উদাহরণ: বেতন ${taka(fees.basis)} হলে` : `বেতন ${taka(fees.basis)} ধরে`}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="font-semibold text-forest">স্ট্যান্ডার্ড অপশন (৬০%)</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">কনফার্মেশনের পর</dt><dd className="font-semibold">{taka(fees.first)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">প্রথম স্যালারি পেয়ে</dt><dd className="font-semibold">{taka(fees.second)}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-brand-100 pt-2"><dt className="font-semibold text-forest">মোট</dt><dd className="text-xl font-semibold text-forest">{taka(fees.standard_total)}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border-2 border-brand-600 bg-white p-4">
          <p className="font-semibold text-forest">আর্লি পেমেন্ট অপশন (৫০%)</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">জয়েনের ৭ দিনের মধ্যে</dt><dd className="font-semibold">{taka(fees.early_total)}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-brand-100 pt-2"><dt className="font-semibold text-forest">মোট</dt><dd className="text-xl font-semibold text-forest">{taka(fees.early_total)}</dd></div>
          </dl>
          <p className="mt-2 inline-block rounded-full bg-mango px-3 py-0.5 text-xs font-semibold text-forest">সাশ্রয় {taka(fees.saving)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">স্ট্যান্ডার্ড রুটে কোনো রেজিস্ট্রেশন বা আবেদন ফি নেই। দ্বিতীয় মাস থেকে পুরো বেতন আপনার।</p>
    </section>
  );
}

export default function TuitionDetail({ loaderData: { t, similar, now } }: Route.ComponentProps) {
  const { share, toast } = useShare();
  const facts: [string, string][] = [
    ["কোড", t.code_label],
    ["মাধ্যম", labelOf(MEDIUMS, t.medium)],
    ["মোড", labelOf(MODES, t.mode)],
    ["দিন", `সপ্তাহে ${bnDigits(t.days_per_week)} দিন`],
    ["কাঙ্ক্ষিত টিউটর", labelOf(TUTOR_GENDERS, t.tutor_gender_pref)],
  ];
  if (t.student_gender) facts.push(["শিক্ষার্থী", labelOf(STUDENT_GENDERS, t.student_gender)]);
  if (t.start_note) facts.push(["শুরু", t.start_note]);
  if (t.posted_at) facts.push(["পোস্ট হয়েছে", formatDate(t.posted_at)]);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-forest text-cream">
          <div className="mx-auto max-w-3xl px-4 pt-4 pb-10">
            <Link to="/" className="inline-flex min-h-11 items-center text-sm text-brand-200 hover:text-mango">← বোর্ডে ফিরুন</Link>
            {!t.is_available && (
              <div role="status" className="mt-2 rounded-2xl bg-slate-100 px-4 py-3 text-slate-800">
                <p className="font-semibold">এই টিউশনটি আর খালি নেই</p>
                <p className="text-sm">নিচে একই এলাকা বা ক্লাসের অন্য টিউশন দেখুন।</p>
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
            <h1 className="mt-4 text-2xl leading-snug font-semibold sm:text-3xl">{labelOf(CLASS_LEVELS, t.class_level)} · {subjectList(t)}</h1>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
          <div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              {/* Applying needs a tutor account, which comes with Google login. */}
              <button type="button" disabled className="min-h-12 rounded-xl bg-slate-200 text-sm font-semibold text-slate-600">
                {t.is_available ? "আবেদন শিগগিরই চালু হবে" : "আবেদন বন্ধ"}
              </button>
              <button type="button" onClick={() => share(`/tuitions/${t.code_label}`, `${t.code_label} · Hikmah Tutors`)} className="min-h-12 rounded-xl border border-brand-100 bg-white px-5 text-sm font-semibold text-forest hover:bg-brand-50">শেয়ার</button>
            </div>
          </div>

          <dl className="rounded-2xl border border-brand-100 bg-white px-5 py-2">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-brand-100 py-2 last:border-0">
                <dt className="text-slate-600">{label}</dt>
                <dd className="text-right font-semibold text-forest">{value}</dd>
              </div>
            ))}
          </dl>

          {t.requirements_public && (
            <section className="rounded-2xl border border-brand-100 bg-white p-5">
              <h2 className="text-lg font-semibold text-forest">অভিভাবকের চাওয়া</h2>
              <p className="mt-2 whitespace-pre-line">{t.requirements_public}</p>
            </section>
          )}

          <FeeBox t={t} />

          {similar.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-forest">মিল থাকা টিউশন</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {similar.map((s, i) => <TuitionCard key={s.code} t={s} now={now} index={i} onShare={(x) => share(`/tuitions/${x.code_label}`, `${x.code_label} · Hikmah Tutors`)} />)}
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
