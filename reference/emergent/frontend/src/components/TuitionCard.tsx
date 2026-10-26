import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Clock, Heart, MapPin, Monitor, Share2 } from "lucide-react";
import type { Tuition } from "../types";
import { useI18n } from "../i18n";
import { optLabel } from "../lib/options";
import { fmtTaka, isNew, salaryText, timeAgo } from "../lib/format";
import { genderNeedKey, gstyle } from "../lib/gender";
import { useSaved } from "../lib/useSaved";
import { Badge } from "./Chip";

export function tutorLabel(pref: Tuition["tutor_gender_pref"], t: (k: string) => string): string {
  return pref === "male" ? t("card.tutor_male") : pref === "female" ? t("card.tutor_female") : t("card.tutor_any");
}

export function useSalaryLabels() {
  const { t } = useI18n();
  return { month: t("card.month"), course: t("card.course"), negotiable: t("card.negotiable"), unspecified: t("card.unspecified") };
}

export function GenderStrip({ pref, code, children }: { pref: string; code: number; children?: React.ReactNode }) {
  const { t } = useI18n();
  const g = gstyle(pref);
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${g.strip}`} data-testid={`card-gender-${code}`} data-gender={pref}>
      <span className="inline-flex items-center gap-2 text-xs font-semibold"><span className={`h-2 w-2 rounded-full ${g.bar}`} aria-hidden />{t(genderNeedKey(pref))}</span>
      <span className="flex gap-1.5">{children}</span>
    </div>
  );
}

export function TuitionCard({ t: tu, index = 0, onShare }: { t: Tuition; index?: number; onShare: (t: Tuition) => void }) {
  const { t, lang, n } = useI18n();
  const navigate = useNavigate();
  const labels = useSalaryLabels();
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(tu.code);
  const href = `/tuitions/${tu.code_label}`;
  const g = gstyle(tu.tutor_gender_pref);
  const canApply = tu.is_available && tu.accepting_applications;
  const iconBtn = "h-12 w-12 shrink-0 inline-flex items-center justify-center rounded-xl border border-brand-100 text-slate-500 hover:bg-brand-50 hover:text-forest transition-colors duration-150";
  return (
    <article className={`group relative flex flex-col rounded-[20px] bg-white border ${g.border} shadow-card overflow-hidden transition-[border-color,box-shadow] duration-200 hover:shadow-lg animate-rise`} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }} data-testid={`tuition-card-${tu.code}`}>
      <GenderStrip pref={tu.tutor_gender_pref} code={tu.code}>
        {isNew(tu.posted_at) && tu.is_available && <Badge kind="new" testId={`badge-new-${tu.code}`}>{t("card.new")}</Badge>}
        {tu.status === "processing" && <Badge kind="processing" testId={`badge-processing-${tu.code}`}>{t("card.processing")}</Badge>}
        {!canApply && <Badge kind="closed" testId={`badge-closed-${tu.code}`}>{t("card.closed")}</Badge>}
      </GenderStrip>
      <Link to={href} className="flex-1 block px-5 pt-5 pb-4" data-testid={`tuition-card-link-${tu.code}`}>
        <div className="flex items-start justify-between gap-2"><h3 className="text-xl font-bold text-forest leading-snug" data-testid={`card-class-${tu.code}`}>{optLabel("class_levels", tu.class_level, lang)}</h3><ArrowUpRight size={18} className="mt-1 shrink-0 text-slate-300 group-hover:text-brand-600 transition-colors" aria-hidden /></div>
        <p className="mt-2 min-h-[1.75rem] text-sm text-slate-700 clamp-2" data-testid={`card-subjects-${tu.code}`}>{tu.subjects.map((s) => optLabel("subjects", s, lang)).join(", ")}</p>
        <span className="mt-2 inline-flex rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500" data-testid={`card-medium-${tu.code}`}>{optLabel("mediums", tu.medium, lang)}</span>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5" data-testid={`card-area-${tu.code}`}>{tu.mode === "online" ? <Monitor size={15} className="text-brand-600" aria-hidden /> : <MapPin size={15} className="text-brand-600" aria-hidden />}{tu.mode === "online" ? t("card.online") : optLabel("areas", tu.area, lang)}</span>
          <span className="inline-flex items-center gap-1.5" data-testid={`card-days-${tu.code}`}><CalendarDays size={15} className="text-brand-600" aria-hidden />{t("card.days", { n: n(tu.days_per_week) })}</span>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-semibold tracking-wider text-slate-500">{t("card.salary_label")}</p>
          <p className="mt-1 text-[1.75rem] font-bold text-forest leading-snug" data-testid={`card-salary-${tu.code}`}>
            {tu.salary_kind === "fixed" && tu.salary_amount ? <>{`৳ ${fmtTaka(tu.salary_amount, lang)}`}<span className="ml-1.5 text-xs font-normal text-slate-500">/ {tu.salary_period === "per_month" ? labels.month : labels.course}</span></> : <span className="text-lg">{salaryText(tu, lang, labels)}</span>}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span className="font-semibold tracking-wide" data-testid={`card-code-${tu.code}`}>{tu.code_label}</span><span className="inline-flex items-center gap-1" data-testid={`card-time-${tu.code}`}><Clock size={12} aria-hidden />{timeAgo(tu.posted_at, lang, t)}</span></div>
      </Link>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-5 pb-5">
        <button type="button" onClick={() => navigate(canApply ? `${href}?apply=1` : href)} data-testid={`card-apply-${tu.code}`} className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-forest text-white font-semibold text-sm hover:bg-brand-700 active:scale-[0.98] transition-[background-color,transform] duration-150">{t(canApply ? "detail.apply" : "card.open")}<ArrowUpRight size={16} aria-hidden /></button>
        <button type="button" aria-label={saved ? t("card.saved") : t("card.save")} aria-pressed={saved} onClick={() => toggle(tu.code)} data-testid={`card-save-${tu.code}`} className={`${iconBtn} ${saved ? "bg-rose-50 border-rose-200" : ""}`}><Heart size={18} aria-hidden className={saved ? "fill-rose-600 text-rose-600" : ""} /></button>
        <button type="button" aria-label={t("card.share")} onClick={() => onShare(tu)} data-testid={`card-share-${tu.code}`} className={iconBtn}><Share2 size={18} aria-hidden /></button>
      </div>
    </article>
  );
}
