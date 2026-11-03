import { MessageCircle, Phone } from "lucide-react";
import type { Route } from "./+types/contact";
import { PageShell, buttonClass } from "~/components/site";
import { CONTACT, telLink, waLink } from "~/lib/contact";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Contact · Hikmah Tutors" }];
}

export default function Contact() {
  return (
    <PageShell title="Contact" sub="টিউটর বা অভিভাবক — যেকোনো প্রশ্নে আমাদের লিখুন বা কল করুন।">
      <div className="grid gap-3 sm:grid-cols-2">
        <a href={waLink(CONTACT.whatsapp, "আসসালামু আলাইকুম, Hikmah Tutors Rajshahi সম্পর্কে জানতে চাই।")} target="_blank" rel="noreferrer" className={buttonClass("primary")}>
          <MessageCircle size={18} aria-hidden /> WhatsApp
        </a>
        <a href={telLink(CONTACT.call)} className={buttonClass("secondary")}>
          <Phone size={18} aria-hidden /> {String(CONTACT.call)}
        </a>
      </div>
      <p className="text-slate-600">সাধারণত সকাল 10টা থেকে রাত 10টার মধ্যে উত্তর দিই।</p>
    </PageShell>
  );
}
