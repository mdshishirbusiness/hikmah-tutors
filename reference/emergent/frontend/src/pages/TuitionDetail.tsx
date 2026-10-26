import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageCircle, Share2 } from "lucide-react";
import { ApiError, getSimilarTuitions, getTuition, shareUrl } from "../api/client";
import { useI18n } from "../i18n";
import { optLabel } from "../lib/options";
import { fmtDate, fmtTaka, isNew, salaryText, waLink } from "../lib/format";
import { AreaChip, Badge } from "../components/Chip";
import { Button, linkButton } from "../components/Button";
import { FeeBox } from "../components/FeeBox";
import { TuitionCard, tutorLabel, useSalaryLabels } from "../components/TuitionCard";
import { EmptyState, ErrorState } from "../components/States";
import { Toast, shareLink, shareToastMessage, useToast } from "../components/Toast";
import { useSettings } from "../components/SettingsContext";
import { ApplyDialog } from "../components/ApplyDialog";
import { useSaved } from "../lib/useSaved";
import { genderNeedKey, gstyle } from "../lib/gender";

export default function TuitionDetail() {
  const { code = "" } = useParams();
  const { t, lang, n } = useI18n();
  const navigate = useNavigate();
  const settings = useSettings();
  const labels = useSalaryLabels();
  const [toast, showToast] = useToast();
  const [sp, setSp] = useSearchParams();
  const [applyOpen, setApplyOpen] = useState(sp.get("apply") === "1");
  const { isSaved, toggle } = useSaved();
  const closeApply = () => {
    setApplyOpen(false);
    if (sp.get("apply")) setSp({}, { replace: true });
  };

  const q = useQuery({ queryKey: ["tuition", code], queryFn: () => getTuition(code), retry: false });
  const sim = useQuery({ queryKey: ["similar", code], queryFn: () => getSimilarTuitions(code), enabled: !!q.data });

  const onShare = async (target = q.data!) => {
    const url = shareUrl(target.code_label);
    const msg = shareToastMessage(await shareLink(url, `${target.code_label} · Hikmah Tutors Rajshahi`), url, t);
    if (msg) showToast(msg);
  };

  if (q.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 animate-pulse" data-testid="detail-skeleton">
        <div className="h-5 w-32 bg-brand-50 rounded" />
        <div className="mt-6 h-9 w-3/4 bg-brand-50 rounded" />
        <div className="mt-6 h-14 w-1/2 bg-brand-100 rounded" />
        <div className="mt-8 h-40 bg-brand-50 rounded-2xl" />
      </div>
    );
  }

  if (q.isError) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16" data-testid="detail-error">
        {notFound ? (
          <EmptyState title={t("detail.not_found")} sub={t("detail.not_found_sub")} action={() => navigate("/")} actionLabel={t("detail.back")} testId="detail-not-found" />
        ) : (
          <ErrorState title={t("error.title")} sub={t("error.sub")} retry={() => q.refetch()} retryLabel={t("error.retry")} />
        )}
      </div>
    );
  }

  const tu = q.data;
  const row = (label: string, value: string, testId: string) => (
    <div className="flex justify-between gap-4 py-2 border-b border-brand-100 last:border-0">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-semibold text-forest text-right" data-testid={testId}>{value}</dd>
    </div>
  );

  return (
    <div data-testid="tuition-detail-page">
      <div className="on-forest bg-forest text-cream">
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-10">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-200 hover:text-mango min-h-[44px]" data-testid="detail-back-link">
            <ArrowLeft size={16} aria-hidden /> {t("detail.back")}
          </Link>
          {tu.not_available && (
            <div role="status" className="mt-3 rounded-2xl bg-slate-100 text-slate-800 px-4 py-3" data-testid="detail-not-available-banner">
              <p className="font-bold">{t("detail.not_available")}</p>
              <p className="text-sm">{t("detail.not_available_sub")}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${gstyle(tu.tutor_gender_pref).badge}`} data-testid="detail-gender-badge">
              <span className={`h-2 w-2 rounded-full ${gstyle(tu.tutor_gender_pref).bar}`} aria-hidden />{t(genderNeedKey(tu.tutor_gender_pref))}
            </span>
            <span className="text-sm font-semibold text-brand-200" data-testid="detail-code">{tu.code_label}</span>
            {isNew(tu.posted_at) && tu.is_available && <Badge kind="new" testId="detail-badge-new">{t("card.new")}</Badge>}
            {tu.status === "processing" && <Badge kind="processing" testId="detail-badge-processing">{t("card.processing")}</Badge>}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold leading-tight" data-testid="detail-headline">
            {optLabel("class_levels", tu.class_level, lang)} · {tu.subjects.map((s) => optLabel("subjects", s, lang)).join(", ")}
          </h1>
          <p className="text-brand-200">{optLabel("mediums", tu.medium, lang)}</p>
          <p className="mt-5 text-4xl sm:text-5xl font-bold text-mango leading-snug break-words" data-testid="detail-salary">{tu.salary_kind === "fixed" && tu.salary_amount ? <>{`৳ ${fmtTaka(tu.salary_amount, lang)}`}<span className="ml-2 text-base font-normal text-brand-200">/ {tu.salary_period === "per_month" ? labels.month : labels.course}</span></> : salaryText(tu, lang, labels)}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-brand-200">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-cream text-forest font-bold text-lg" data-testid="detail-area">{optLabel("areas", tu.area, lang)}</span>
            <span>{t("card.days", { n: n(tu.days_per_week) })}</span>
            <span>·</span>
            <span>{tutorLabel(tu.tutor_gender_pref, t)}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Button onClick={() => setApplyOpen(true)} data-testid="detail-apply-button" disabled={!tu.is_available || !tu.accepting_applications}>{t("detail.apply")}</Button>
          <Button variant="secondary" onClick={() => toggle(tu.code)} aria-pressed={isSaved(tu.code)} data-testid="detail-save-button"><Heart size={18} aria-hidden className={isSaved(tu.code) ? "fill-rose-600 text-rose-600" : ""} /> {isSaved(tu.code) ? t("card.saved") : t("detail.save")}</Button>
          <Button variant="secondary" onClick={() => onShare()} data-testid="detail-share-button"><Share2 size={18} aria-hidden /> {t("detail.share")}</Button>
        </div>
        <p className="text-sm text-slate-600 -mt-5" data-testid="detail-apply-hint">{tu.is_available ? (tu.accepting_applications ? t("detail.apply_hint") : t("detail.not_accepting")) : t("detail.not_available")}</p>

        <dl className="rounded-2xl bg-white border border-brand-100 px-5 py-2" data-testid="detail-facts">
          {row(t("detail.code"), tu.code_label, "fact-code")}
          {row(t("detail.medium"), optLabel("mediums", tu.medium, lang), "fact-medium")}
          {row(t("detail.mode"), optLabel("modes", tu.mode, lang), "fact-mode")}
          {row(t("detail.days"), t("card.days", { n: n(tu.days_per_week) }), "fact-days")}
          {row(t("detail.tutor"), tutorLabel(tu.tutor_gender_pref, t), "fact-tutor")}
          {tu.student_gender && row(t("detail.students"), optLabel("student_genders", tu.student_gender, lang), "fact-student")}
          {tu.start_note && row(t("detail.start_note"), tu.start_note, "fact-start")}
          {tu.posted_at && row(t("detail.posted"), fmtDate(tu.posted_at, lang), "fact-posted")}
        </dl>

        {tu.requirements_public && (
          <section className="rounded-2xl bg-white border border-brand-100 p-5" data-testid="detail-requirements">
            <h2 className="text-base md:text-lg font-bold text-forest">{t("detail.requirements")}</h2>
            <p className="mt-2 whitespace-pre-line">{tu.requirements_public}</p>
          </section>
        )}

        <a href={waLink(settings.contact_whatsapp, t("detail.ask_text", { code: tu.code_label }))} target="_blank" rel="noreferrer" className={linkButton("secondary", "w-full sm:w-auto")} data-testid="detail-ask-whatsapp">
          <MessageCircle size={18} aria-hidden /> {t("detail.ask")}
        </a>

        <FeeBox fees={tu.fees} />

        {sim.data && sim.data.items.length > 0 && (
          <section data-testid="detail-similar">
            <h2 className="text-base md:text-lg font-bold text-forest mb-4">{t("detail.similar")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {sim.data.items.map((s, i) => <TuitionCard key={s.code} t={s} index={i} onShare={onShare} />)}
            </div>
          </section>
        )}
      </div>
      {applyOpen && tu.is_available && <ApplyDialog tu={tu} onClose={closeApply} />}
      <Toast message={toast} />
    </div>
  );
}
