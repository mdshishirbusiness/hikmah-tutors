// The public site's frame: header, footer, the page shell for text pages, buttons and the guardian panel.
// Design ported from the 21 Oct Emergent export (reference/emergent/frontend/src/components).
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowUpRight, BookOpen, MessageCircle, Phone } from "lucide-react";
import { SiteFooter, SiteHeader } from "~/components/SiteHeader";
import { CONTACT, telLink, waLink } from "~/lib/contact";

export { SiteFooter, SiteHeader };

/** Header, page body and footer: every public page sits in this. `app` pages (the tutor's tabs) drop the footer. */
export function SitePage({ children, app = false }: { children: ReactNode; app?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {!app && <SiteFooter />}
    </div>
  );
}

/** Text pages (how it works, fees, privacy…): a forest title band, then the content on cream. */
export function PageShell({ title, sub, draft, children }: { title: string; sub?: string; draft?: boolean; children: ReactNode }) {
  return (
    <SitePage>
      <div className="bg-forest text-cream">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-sm text-brand-200 hover:text-mango"><ArrowLeft size={16} aria-hidden /> Back to board</Link>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{title}</h1>
          {sub && <p className="mt-3 max-w-xl text-brand-200">{sub}</p>}
          {draft && <p className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">Draft: legal review pending</p>}
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-12">{children}</div>
    </SitePage>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-slate-800 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-forest">{children}</div>;
}

const BUTTON = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-brand-50 text-forest hover:bg-brand-100",
  mango: "bg-mango text-forest hover:bg-mango-deep",
  forest: "bg-forest text-white hover:bg-forest-mid",
};

/** Classes for a pill button or a link styled as one. */
export const buttonClass = (variant: keyof typeof BUTTON = "primary", extra = "") =>
  `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON[variant]} ${extra}`;

export function GuardianPanel() {
  return (
    <section className="rounded-3xl border border-brand-100 bg-cream p-6 text-forest sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700"><span className="size-1.5 rounded-full bg-brand-600" />For guardians</span>
        <BookOpen className="text-brand-600" size={27} strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-bold">টিউটর খুঁজছেন?</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">আপনার সন্তানের ক্লাস, বিষয় ও এলাকা জানান। উপযুক্ত টিউটর খুঁজতে আমাদের সাথে কথা বলুন।</p>
      <Link to="/request-tutor" className="group mt-5 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-mango px-4 font-semibold text-forest transition-colors hover:bg-mango-deep">
        Find a tutor<ArrowUpRight className="transition-transform group-hover:translate-x-0.5" size={20} aria-hidden />
      </Link>
      <div className="mt-3 flex flex-wrap gap-x-5 border-b border-brand-100 pb-3">
        <a href={waLink(CONTACT.whatsapp, GUARDIAN_WA_TEXT)} target="_blank" rel="noreferrer" className="wa-btn inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-forest"><MessageCircle size={17} aria-hidden /> WhatsApp</a>
        <a href={telLink(CONTACT.call)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-forest"><Phone size={16} aria-hidden />Call us</a>
      </div>
      <p className="mt-3 text-xs text-slate-500">আপনার চাহিদা জানান। উপযুক্ত টিউটর নিয়ে আমরা ফোনে কথা বলব।</p>
    </section>
  );
}

export const GUARDIAN_WA_TEXT = "আমি একজন টিউটর খুঁজছি। ক্লাস: __, বিষয়: __, এলাকা: __।";

/** Opens the phone's share sheet, or copies the link where there is none. */
export function useShare() {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const share = useCallback(async (path: string, title: string) => {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title });
      } catch {
        // the person closed the share sheet
      }
      return;
    }
    let message = `Couldn't copy. Link: ${url}`;
    try {
      await navigator.clipboard.writeText(url);
      message = "Link copied";
    } catch {
      // keeps the message that shows the link
    }
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3000);
  }, []);

  return { share, toast };
}

export function Toast({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
      {message && <p className="animate-rise rounded-xl bg-forest px-4 py-3 text-sm font-semibold break-all text-cream shadow-lg">{message}</p>}
    </div>
  );
}
