import type { CSSProperties } from "react";
import { Link } from "react-router";
import { Icon } from "~/components/Icon";
import { AREAS, CLASS_LEVELS, SUBJECTS, labelOf } from "~/lib/options";
import {
  GENDER_CHIP, MEDIUM_EN, SUBJECT_TONE, SUBJECT_TONE_OTHER, bnDigits, isNew, perClass, scheduleNote, taka, timeAgo,
  type PublicTuition,
} from "~/lib/tuition";

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
      {t.is_available && isNew(t.posted_at, now) && <span className="rounded-full bg-mango px-2.5 py-0.5 text-xs font-semibold text-forest">New</span>}
      {t.status === "processing" && <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-white">Processing</span>}
    </>
  );
}

/** Female, Male or Male/Female Tutor as a solid chip, so eligibility reads before anything else. */
export function GenderChip({ t }: { t: Pick<PublicTuition, "tutor_gender_pref"> }) {
  const g = GENDER_CHIP[t.tutor_gender_pref];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${g.tone}`}>
      <Icon name="user" className="size-3.5" />
      {g.label}
    </span>
  );
}

export function SubjectChips({ t }: { t: Pick<PublicTuition, "subjects"> }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {t.subjects.map((s) => (
        <li key={s} className={`rounded-md px-2 py-0.5 text-[13px] font-semibold ring-1 ${SUBJECT_TONE[s] ?? SUBJECT_TONE_OTHER}`}>{labelOf(SUBJECTS, s)}</li>
      ))}
    </ul>
  );
}

// The tear line: white on the left, the stub colour on the right, with half-circle holes at top and bottom.
const HOLES = "radial-gradient(circle at 50% 0, transparent 10px, #000 10.5px) top / 100% 51% no-repeat, radial-gradient(circle at 50% 100%, transparent 10px, #000 10.5px) bottom / 100% 51% no-repeat";
const tear = (stub: string): CSSProperties => ({ background: `linear-gradient(90deg, #fff 50%, ${stub} 50%)`, mask: HOLES, WebkitMask: HOLES });

/** How many have applied, as a small stack of anonymous circles (no names or photos), with when it was posted. */
function Applicants({ t, now }: { t: PublicTuition; now: number }) {
  const dots = ["bg-brand-200", "bg-mango", "bg-brand-500"].slice(0, Math.min(t.applicants, 3));
  const ago = timeAgo(t.posted_at, now);
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="flex shrink-0">
        {dots.length ? (
          dots.map((c, i) => <span key={c} className={`grid size-5 place-items-center rounded-full text-forest ring-2 ring-white ${c} ${i ? "-ml-1.5" : ""}`}><Icon name="user" className="size-3" /></span>)
        ) : (
          <span className="size-5 rounded-full border-2 border-dashed border-slate-300" />
        )}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[12px] font-semibold text-forest">{t.applicants ? `${bnDigits(t.applicants)} জন আবেদন করেছেন` : "এখনো কেউ আবেদন করেনি"}</span>
        {ago && <span className="block text-[11px] text-slate-500">{ago} পোস্ট</span>}
      </span>
    </div>
  );
}

/** Pay on the stub: big for a fixed salary, smaller words when it is negotiable or not given. */
function StubPay({ t }: { t: PublicTuition }) {
  if (t.salary_kind === "fixed" && t.salary_amount) {
    const rate = perClass(t);
    return (
      <>
        <p className="mt-2.5 text-[11px] font-semibold">বেতন / {t.salary_period === "per_month" ? "মাস" : "কোর্স"}</p>
        <p className="mt-0.5 leading-none font-semibold">
          <span className="text-base">৳</span>
          <span className="ml-0.5 text-[24px] tracking-tight">{taka(t.salary_amount).replace("৳ ", "")}</span>
        </p>
        {rate && <p className="mt-1 text-[11px]">ক্লাসপ্রতি ≈ {taka(rate)}</p>}
      </>
    );
  }
  return (
    <>
      <p className="mt-2.5 text-[11px] font-semibold">বেতন</p>
      <p className="mt-0.5 text-base leading-tight font-semibold">{t.salary_kind === "negotiable" ? "আলোচনা সাপেক্ষে" : "উল্লেখ নেই"}</p>
    </>
  );
}

/**
 * The board's ticket card (owner, 2026-11-02): what the tuition is and what the guardian wants on the left; pay,
 * schedule and Apply on the stub. The whole card opens the detail page; Apply sits above that link.
 */
export function TuitionCard({ t, now, index = 0 }: { t: PublicTuition; now: number; index?: number }) {
  const open = t.status === "available" && t.accepting_applications;
  const stubColour = open ? "#fed262" : "#e2e8f0";
  const line = open ? "border-forest/25" : "border-slate-400/50";
  const schedule = scheduleNote(t);
  const href = `/tuitions/${t.code_label}`;
  return (
    <article className="animate-rise relative [filter:drop-shadow(0_8px_14px_rgb(9_51_42/0.13))]" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <div className="flex h-full">
        <div className="flex min-w-0 flex-1 flex-col rounded-l-[22px] bg-white pt-4 pr-2 pb-3 pl-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-cream px-2 py-0.5 text-xs font-semibold text-forest ring-1 ring-forest/25">{labelOf(CLASS_LEVELS, t.class_level)}</span>
            <GenderChip t={t} />
          </div>
          <h3 className="mt-2 text-[24px] leading-tight font-semibold text-forest">{placeLabel(t)}</h3>
          <div className="mt-2"><SubjectChips t={t} /></div>
          {MEDIUM_EN[t.medium] && (
            <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-slate-600"><Icon name="book" className="size-3.5" />{MEDIUM_EN[t.medium]}</p>
          )}
          {t.requirements_public && (
            <p className="mt-3 line-clamp-3 border-l-[3px] border-brand-600 pl-2.5 text-[13px] leading-snug font-semibold text-forest">
              <span className="sr-only">গার্ডিয়ান যা চান: </span>
              {t.requirements_public}
            </p>
          )}
          <div className="mt-auto pt-3"><Applicants t={t} now={now} /></div>
        </div>
        <div className="relative w-5 shrink-0" style={tear(stubColour)}>
          <span className={`absolute inset-y-4 left-1/2 -translate-x-1/2 border-l-2 border-dashed ${line}`} />
        </div>
        <div className={`flex w-[112px] shrink-0 flex-col rounded-r-[22px] pt-4 pr-3 pb-3 pl-1 ${open ? "bg-mango text-forest" : "bg-slate-200 text-slate-700"}`}>
          <p className="flex items-center justify-between gap-1 text-[11px] font-semibold tracking-wide">
            {t.code_label}
            {t.is_available && isNew(t.posted_at, now) && <span className="rounded bg-forest px-1.5 py-px tracking-normal text-mango">New</span>}
          </p>
          <StubPay t={t} />
          <div className={`mt-2.5 border-t border-dashed pt-2.5 ${line}`}>
            <p className="text-[11px] font-semibold">সপ্তাহে</p>
            <p className="text-lg leading-tight font-semibold">{bnDigits(t.days_per_week)} দিন</p>
            {schedule && <p className="text-[11px]">{schedule}</p>}
          </div>
          <div className="mt-auto pt-3">
            {open ? (
              // The apply sheet comes with sign-in for tutors; until then Apply opens the detail page.
              <Link to={href} className="relative z-10 flex min-h-11 w-full items-center justify-center rounded-xl bg-forest text-sm font-semibold text-cream transition-colors duration-150 hover:bg-brand-700">Apply</Link>
            ) : (
              <span className="flex min-h-11 items-center justify-center rounded-xl bg-white/70 text-sm font-semibold">{t.status === "processing" ? "Processing" : "Paused"}</span>
            )}
          </div>
        </div>
      </div>
      <Link to={href} aria-label={`${t.code_label}, ${placeLabel(t)}: বিস্তারিত`} className="absolute inset-0 rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />
    </article>
  );
}
