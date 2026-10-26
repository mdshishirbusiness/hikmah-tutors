import { MessageCircle, Phone, Facebook } from "lucide-react";
import { useI18n } from "../i18n";
import { PageShell } from "../components/PageShell";
import { useSettings } from "../components/SettingsContext";
import { linkButton } from "../components/Button";
import { digits, telLink, waLink } from "../lib/format";

export default function Contact() {
  const { t, lang } = useI18n();
  const s = useSettings();
  return (
    <PageShell title={t("contact.title")} sub={t("contact.sub")} testId="contact-page">
      <div className="grid gap-3 sm:grid-cols-3">
        <a href={waLink(s.contact_whatsapp, t("contact.whatsapp_text"))} target="_blank" rel="noreferrer" className={linkButton("primary")} data-testid="contact-whatsapp">
          <MessageCircle size={18} aria-hidden /> WhatsApp
        </a>
        <a href={telLink(s.contact_call)} className={linkButton("secondary")} data-testid="contact-call">
          <Phone size={18} aria-hidden /> {s.contact_call ? digits(s.contact_call, lang) : t("footer.call")}
        </a>
        <a href={s.facebook_page_url || "https://facebook.com/"} target="_blank" rel="noreferrer" className={linkButton("secondary")} data-testid="contact-facebook">
          <Facebook size={18} aria-hidden /> Facebook
        </a>
      </div>
      <p className="text-slate-600">{t("contact.hours")}</p>
    </PageShell>
  );
}
