// Design lab, round 3: the ticket card the owner chose, refined. It also heads the detail page; the rest of the flow
// is in Flow.tsx.
import type { CSSProperties } from "react";
import { SUBJECTS, labelOf } from "~/lib/options";
import { bnDigits, taka } from "~/lib/tuition";
import { Icon } from "./parts";
import { GENDER, area, cls, mediumEn, perClass, type LabTuition } from "./sample";

export type CardProps = { t: LabTuition; onOpen?: () => void; onApply?: () => void; applied?: boolean; hero?: boolean };

/** Female, Male or Male/Female Tutor as a solid chip, so eligibility reads before anything else. */
export function GenderChip({ t }: { t: LabTuition }) {
  const g = GENDER[t.tutor_gender_pref];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${g.tone}`}>
      <Icon name="user" className="size-3.5" />
      {g.label}
    </span>
  );
}

export const appliedText = (t: LabTuition) => (t.applied ? `${bnDigits(t.applied)} জন আবেদন করেছেন` : "এখনো কেউ আবেদন করেনি");

// One colour per subject, the same everywhere, so tutors learn "blue = গণিত". Dark text on a pale fill (contrast ≥ 7).
const TONE: Record<string, string> = {
  math: "bg-blue-50 text-blue-800 ring-blue-100",
  hmath: "bg-indigo-50 text-indigo-800 ring-indigo-100",
  physics: "bg-violet-50 text-violet-800 ring-violet-100",
  chemistry: "bg-orange-50 text-orange-800 ring-orange-100",
  biology: "bg-lime-50 text-lime-800 ring-lime-100",
  science: "bg-teal-50 text-teal-800 ring-teal-100",
  english: "bg-rose-50 text-rose-800 ring-rose-100",
  bangla: "bg-cyan-50 text-cyan-800 ring-cyan-100",
  ict: "bg-sky-50 text-sky-800 ring-sky-100",
  accounting: "bg-amber-50 text-amber-800 ring-amber-100",
  finance: "bg-amber-50 text-amber-800 ring-amber-100",
  economics: "bg-yellow-50 text-yellow-800 ring-yellow-100",
  bgs: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-100",
  quran: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  islam: "bg-emerald-50 text-emerald-800 ring-emerald-100",
};

export function SubjectChips({ t }: { t: LabTuition }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {t.subjects.map((s) => (
        <li key={s} className={`rounded-md px-2 py-0.5 text-[13px] font-semibold ring-1 ${TONE[s] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>{labelOf(SUBJECTS, s)}</li>
      ))}
    </ul>
  );
}

// The tear line: white on the left, the stub colour on the right, with half-circle holes at top and bottom.
const HOLES = "radial-gradient(circle at 50% 0, transparent 10px, #000 10.5px) top / 100% 51% no-repeat, radial-gradient(circle at 50% 100%, transparent 10px, #000 10.5px) bottom / 100% 51% no-repeat";
const tear = (stub: string): CSSProperties => ({ background: `linear-gradient(90deg, #fff 50%, ${stub} 50%)`, mask: HOLES, WebkitMask: HOLES });

/** How many have applied, as a small stack of anonymous circles (no names or photos), with when it was posted. */
function Applicants({ t }: { t: LabTuition }) {
  const dots = ["bg-brand-200", "bg-mango", "bg-brand-500"].slice(0, Math.min(t.applied, 3));
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
        <span className="block text-[12px] font-semibold whitespace-nowrap text-forest">{t.applied ? `${bnDigits(t.applied)} জন আবেদন করেছেন` : "এখনো কেউ আবেদন করেনি"}</span>
        <span className="block text-[11px] text-slate-500">{t.applied ? `${t.ago} পোস্ট` : "প্রথম আবেদন আপনার হোক"}</span>
      </span>
    </div>
  );
}

/** A sideways ticket: what the tuition is and what the guardian wants on the left; pay, schedule and Apply on the stub. */
export function TicketCard({ t, onOpen, onApply, applied }: CardProps) {
  const processing = t.status === "processing";
  const stub = processing ? "bg-slate-200 text-slate-700" : "bg-mango text-forest";
  return (
    <article className="relative [filter:drop-shadow(0_8px_14px_rgb(9_51_42/0.13))]">
      <div className="flex">
        <div className="flex min-w-0 flex-1 flex-col rounded-l-[22px] bg-white pt-4 pr-2 pb-3 pl-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-cream px-2 py-0.5 text-xs font-semibold text-forest ring-1 ring-forest/25">{cls(t)}</span>
            <GenderChip t={t} />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-[24px] leading-tight font-semibold text-forest">{area(t)}</h3>
            <span className="inline-flex items-center gap-0.5 text-xs text-slate-600"><Icon name="pin" className="size-3.5" />{t.km}</span>
          </div>
          <div className="mt-2"><SubjectChips t={t} /></div>
          <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-slate-600"><Icon name="book" className="size-3.5" />{mediumEn(t)}</p>
          {t.requirements_public && (
            <p className="mt-3 line-clamp-3 border-l-[3px] border-brand-600 pl-2.5 text-[13px] leading-snug font-semibold text-forest">
              <span className="sr-only">গার্ডিয়ান যা চান: </span>
              {t.requirements_public}
            </p>
          )}
          <div className="mt-auto pt-3"><Applicants t={t} /></div>
        </div>
        <div className="relative w-5 shrink-0" style={tear(processing ? "#e2e8f0" : "#fed262")}>
          <span className={`absolute inset-y-4 left-1/2 -translate-x-1/2 border-l-2 border-dashed ${processing ? "border-slate-400/50" : "border-forest/25"}`} />
        </div>
        <div className={`flex w-[112px] shrink-0 flex-col rounded-r-[22px] pt-4 pr-3 pb-3 pl-1 ${stub}`}>
          <p className="flex items-center justify-between gap-1 text-[11px] font-semibold tracking-wide">
            {t.code_label}
            {t.fresh && <span className="rounded bg-forest px-1.5 py-px tracking-normal text-mango">New</span>}
          </p>
          <p className="mt-2.5 text-[11px] font-semibold">বেতন / মাস</p>
          <p className="mt-0.5 leading-none font-semibold">
            <span className="text-base">৳</span>
            <span className="ml-0.5 text-[24px] tracking-tight">{taka(t.salary_amount).replace("৳ ", "")}</span>
          </p>
          <p className="mt-1 text-[11px]">ক্লাসপ্রতি ≈ {taka(perClass(t))}</p>
          <div className={`mt-2.5 border-t border-dashed pt-2.5 ${processing ? "border-slate-400/50" : "border-forest/25"}`}>
            <p className="text-[11px] font-semibold">সপ্তাহে</p>
            <p className="text-lg leading-tight font-semibold">{bnDigits(t.days_per_week)} দিন</p>
            <p className="text-[11px]">{t.hours} · {t.when}</p>
          </div>
          <div className="mt-auto pt-3">
            {processing ? (
              <span className="flex min-h-11 items-center justify-center rounded-xl bg-white/70 text-sm font-semibold">Processing</span>
            ) : applied ? (
              <span className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-white/70 text-sm font-semibold text-brand-700"><Icon name="check" className="size-4" />Applied</span>
            ) : (
              <button type="button" onClick={onApply} className="relative z-10 min-h-11 w-full rounded-xl bg-forest text-sm font-semibold text-cream transition-colors duration-150 hover:bg-brand-700">Apply</button>
            )}
          </div>
        </div>
      </div>
      {onOpen && <button type="button" onClick={onOpen} aria-label={`${t.code_label}, ${area(t)}, ${taka(t.salary_amount)}: বিস্তারিত`} className="absolute inset-0 rounded-[22px]" />}
    </article>
  );
}
