import { Link } from "react-router-dom";
import { MessageCircle, Phone, Facebook, Download, ArrowUpRight } from "lucide-react";
import { useI18n } from "../i18n";
import { useSettings } from "./SettingsContext";
import { telLink, waLink } from "../lib/format";

export function Footer() {
  const { t } = useI18n();
  const s = useSettings();
  const groups = [
    { title: "footer.explore", links: [["/", "nav.board"], ["/how-it-works", "footer.how"], ["/fees", "footer.fees"], ["/request-tutor", "footer.guardians"]] },
    { title: "footer.workspace", links: [["/tutor", "footer.tutor"], ["/admin", "footer.admin"], ["/claim", "footer.claim"], ["/contact", "footer.contact"]] },
  ];
  const contactClass = "min-h-11 inline-flex items-center gap-2 text-sm text-brand-100 hover:text-mango transition-colors";
  return (
    <footer className="on-forest bg-forest text-cream mt-16" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-8 grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="col-span-2 lg:col-span-1 lg:pr-12">
          <Link to="/" className="inline-flex items-center gap-3 rounded-lg" data-testid="footer-logo-link"><img src="/brand/logo-square.webp" alt="" width={44} height={44} className="h-11 w-11 rounded-xl" /><span className="text-lg font-bold">Hikmah Tutors<span className="text-mango">.</span><span className="block text-xs font-normal tracking-widest text-brand-200">RAJSHAHI</span></span></Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-200" data-testid="footer-description">{t("footer.description")}</p>
        </div>
        {groups.map((group) => <nav key={group.title} aria-label={t(group.title)}><h2 className="mb-2 text-sm font-semibold text-cream">{t(group.title)}</h2>{group.links.map(([to, key]) => <Link key={to} to={to} className="flex min-h-11 items-center text-sm text-brand-200 hover:text-mango transition-colors" data-testid={`footer-link-${to === "/" ? "board" : to.slice(1)}`}>{t(key)}</Link>)}</nav>)}
        <div className="col-span-2 lg:col-span-1"><h2 className="mb-2 text-sm font-semibold">{t("footer.connect")}</h2><div className="flex flex-wrap gap-x-6 lg:flex-col lg:items-start">
          {s.contact_whatsapp && <a href={waLink(s.contact_whatsapp, t("contact.whatsapp_text"))} target="_blank" rel="noreferrer" className={contactClass} data-testid="footer-whatsapp"><MessageCircle size={16} aria-hidden />{t("footer.whatsapp")}<ArrowUpRight size={13} aria-hidden /></a>}
          {s.contact_call && <a href={telLink(s.contact_call)} className={contactClass} data-testid="footer-call"><Phone size={16} aria-hidden />{t("footer.call")}</a>}
          {s.facebook_page_url && <a href={s.facebook_page_url} target="_blank" rel="noreferrer" className={contactClass} data-testid="footer-facebook"><Facebook size={16} aria-hidden />{t("footer.facebook")}<ArrowUpRight size={13} aria-hidden /></a>}
        </div></div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-xs text-brand-200" data-testid="footer-copyright">{t("footer.copyright")}</p>
        <div className="flex flex-wrap items-center gap-x-5"><Link to="/privacy" className={contactClass} data-testid="footer-link-privacy">{t("footer.privacy")}</Link><Link to="/terms" className={contactClass} data-testid="footer-link-terms">{t("footer.terms")}</Link><a href={`${process.env.REACT_APP_BACKEND_URL}/api/export/code`} className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-brand-200/30 px-3 text-xs font-semibold text-cream hover:bg-forest-mid transition-colors" data-testid="footer-code-download"><Download size={15} aria-hidden />{t("footer.code_download")}</a></div>
      </div></div>
    </footer>
  );
}
