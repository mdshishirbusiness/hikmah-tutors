import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "../i18n";
import { useSettings } from "./SettingsContext";
import { telLink, waLink } from "../lib/format";

export function GuardianPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const s = useSettings();
  return (
    <section className={`relative rounded-[24px] border border-brand-100 bg-cream text-forest p-6 sm:p-7 ${compact ? "" : "shadow-[0_20px_60px_-25px_rgba(0,0,0,0.3)]"}`} data-testid="guardian-panel">
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700"><span className="h-1.5 w-1.5 rounded-full bg-brand-600" />{t("guardian.eyebrow")}</span>
        <BookOpen className="text-brand-600" size={27} strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="mt-4 text-base md:text-lg font-bold" data-testid="guardian-heading">{t("guardian.title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600" data-testid="guardian-description">{t("guardian.sub")}</p>
      <Link to="/request-tutor" className="group mt-5 min-h-12 flex items-center justify-between gap-3 rounded-xl bg-mango px-4 font-semibold text-forest hover:bg-mango-deep transition-colors" data-testid="guardian-request">{t("nav.request")}<ArrowUpRight className="group-hover:translate-x-0.5 transition-transform" size={20} aria-hidden /></Link>
      <div className="mt-3 flex flex-wrap gap-x-5 border-b border-brand-100 pb-3">
        <a href={waLink(s.contact_whatsapp, t("guardian.wa_text"))} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-forest" data-testid="guardian-whatsapp"><MessageCircle size={17} aria-hidden /> WhatsApp</a>
        <a href={telLink(s.contact_call)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-forest" data-testid="guardian-call"><Phone size={16} aria-hidden />{t("guardian.call")}</a>
      </div>
      <p className="mt-3 text-xs text-slate-500" data-testid="guardian-next-step">{t("guardian.next_step")}</p>
    </section>
  );
}
