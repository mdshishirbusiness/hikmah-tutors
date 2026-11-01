import { Link } from "react-router";
import { AREAS, CLASS_LEVELS, MEDIUMS, SUBJECTS, labelOf } from "~/lib/options";
import { GENDER_NEED, GENDER_STYLE, bnDigits, isNew, taka, timeAgo, type PublicTuition } from "~/lib/tuition";

export function SalaryText({ t, unitClass }: { t: PublicTuition; unitClass: string }) {
  if (t.salary_kind === "fixed" && t.salary_amount) {
    return (
      <>
        {taka(t.salary_amount)}
        <span className={`ml-1.5 font-normal ${unitClass}`}>/ {t.salary_period === "per_month" ? "মাস" : "কোর্স"}</span>
      </>
    );
  }
  return <>{t.salary_kind === "negotiable" ? "৳ আলোচনা সাপেক্ষে" : "বেতন উল্লেখ নেই"}</>;
}

export const subjectList = (t: PublicTuition) => t.subjects.map((s) => labelOf(SUBJECTS, s)).join(", ");
export const placeLabel = (t: PublicTuition) => (t.mode === "online" ? "অনলাইন" : labelOf(AREAS, t.area));

export function StatusBadges({ t, now }: { t: PublicTuition; now: number }) {
  return (
    <>
      {t.is_available && isNew(t.posted_at, now) && <span className="rounded-full bg-mango px-2.5 py-0.5 text-xs font-semibold text-forest">নতুন</span>}
      {t.status === "processing" && <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">প্রক্রিয়াধীন</span>}
    </>
  );
}

export function TuitionCard({ t, now, index = 0, onShare }: { t: PublicTuition; now: number; index?: number; onShare: (t: PublicTuition) => void }) {
  const g = GENDER_STYLE[t.tutor_gender_pref];
  const fixed = t.salary_kind === "fixed" && !!t.salary_amount;
  return (
    <article
      className={`animate-rise flex flex-col overflow-hidden rounded-2xl border bg-white shadow-card transition-shadow duration-200 hover:shadow-lg ${g.border}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className={`flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-2 ${g.strip}`}>
        <span className="inline-flex items-center gap-2 text-xs font-semibold">
          <span aria-hidden className={`size-2 rounded-full ${g.bar}`} />
          {GENDER_NEED[t.tutor_gender_pref]}
        </span>
        <span className="flex gap-1.5">
          <StatusBadges t={t} now={now} />
        </span>
      </div>
      <Link to={`/tuitions/${t.code_label}`} className="flex-1 px-4 pt-4 pb-3">
        <p className={`font-semibold text-forest ${fixed ? "text-3xl" : "text-xl"}`}>
          <SalaryText t={t} unitClass="text-sm text-slate-500" />
        </p>
        <h3 className="mt-3 text-xl font-semibold text-brand-700">{placeLabel(t)}</h3>
        <p className="mt-1 font-semibold text-slate-900">{labelOf(CLASS_LEVELS, t.class_level)}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{subjectList(t)}</p>
        <p className="mt-3 flex flex-wrap gap-x-3 text-sm text-slate-600">
          <span>{labelOf(MEDIUMS, t.medium)}</span>
          <span>সপ্তাহে {bnDigits(t.days_per_week)} দিন</span>
        </p>
        <p className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-semibold">{t.code_label}</span>
          <span>{timeAgo(t.posted_at, now)}</span>
        </p>
      </Link>
      <div className="grid grid-cols-[1fr_auto] gap-2 px-4 pb-4">
        <Link
          to={`/tuitions/${t.code_label}`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-forest text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700"
        >
          বিস্তারিত দেখুন
        </Link>
        <button
          type="button"
          onClick={() => onShare(t)}
          className="min-h-12 rounded-xl border border-brand-100 px-4 text-sm font-semibold text-forest transition-colors duration-150 hover:bg-brand-50"
        >
          শেয়ার
        </button>
      </div>
    </article>
  );
}
