// The public site's frame: header, footer, the page shell for text pages, buttons and the guardian panel.
// Design ported from the 21 Oct Emergent export (reference/emergent/frontend/src/components).
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ArrowLeft, ArrowUpRight, BookOpen, Menu, MessageCircle, Phone, UserRound, X } from "lucide-react";
import { CONTACT, telLink, waLink } from "~/lib/contact";

const NAV: [string, string][] = [
  ["/", "টিউশন বোর্ড"],
  ["/how-it-works", "কীভাবে কাজ করে"],
  ["/fees", "ফি"],
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-brand-50/60 hover:text-forest"}`;

export function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  return (
    <header className="sticky top-0 z-30 border-b border-brand-100/70 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="Hikmah Tutors Rajshahi">
          <img src="/brand/logo-square.webp" alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg" />
          <span className="min-w-0">
            <span className="block text-lg leading-snug font-bold tracking-tight text-forest">Hikmah Tutors<span className="text-brand-600">.</span></span>
            <span className="block truncate text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase min-[400px]:tracking-[0.2em]">Rajshahi · শিখি. শেখাই. এগিয়ে যাই.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 xl:flex" aria-label="মূল নেভিগেশন">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={navClass}>{label}</NavLink>)}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link to="/request-tutor" className="hidden min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-semibold text-white transition-colors hover:bg-forest-mid lg:inline-flex">
            টিউটর খুঁজুন<ArrowUpRight size={16} aria-hidden />
          </Link>
          <NavLink to="/me" className={({ isActive }) => `hidden min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors lg:inline-flex ${isActive ? "border-brand-200 bg-brand-50 text-brand-700" : "border-brand-100 text-forest hover:bg-brand-50"}`}>
            <UserRound size={18} aria-hidden />আমার প্রোফাইল
          </NavLink>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-site-nav"
            aria-label={open ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-brand-100 text-forest lg:hidden"
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-site-nav" aria-label="মূল নেভিগেশন" className="grid animate-fade grid-cols-2 gap-2 border-t border-brand-100 bg-cream p-4 lg:hidden">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={navClass}>{label}</NavLink>)}
          <Link to="/request-tutor" className="flex min-h-12 items-center rounded-xl bg-forest px-3 text-sm font-semibold text-white">টিউটর খুঁজুন</Link>
          <Link to="/me" className="flex min-h-12 items-center gap-2 px-3 text-sm font-semibold text-forest"><UserRound size={18} aria-hidden />আমার প্রোফাইল</Link>
        </nav>
      )}
    </header>
  );
}

const FOOTER_GROUPS: { title: string; links: [string, string][] }[] = [
  { title: "ঘুরে দেখুন", links: [["/", "টিউশন বোর্ড"], ["/how-it-works", "কীভাবে কাজ করে"], ["/fees", "ফি"], ["/request-tutor", "অভিভাবকদের জন্য"]] },
  { title: "টিউটরদের জন্য", links: [["/me", "আমার প্রোফাইল"], ["/login", "লগইন"], ["/contact", "যোগাযোগ"]] },
];

export function SiteFooter() {
  const contactClass = "inline-flex min-h-11 items-center gap-2 text-sm text-brand-100 transition-colors hover:text-mango";
  return (
    <footer className="mt-16 bg-forest text-cream">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div className="col-span-2 lg:col-span-1 lg:pr-12">
          <Link to="/" className="inline-flex items-center gap-3 rounded-lg">
            <img src="/brand/logo-square.webp" alt="" width={44} height={44} className="size-11 rounded-xl" />
            <span className="text-lg font-bold">
              Hikmah Tutors<span className="text-mango">.</span>
              <span className="block text-xs font-normal tracking-widest text-brand-200">RAJSHAHI</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-200">রাজশাহীর টিউটর ও পরিবারের মাঝে শেখার নতুন সুযোগ তৈরি করতে আমাদের পথচলা।</p>
        </div>
        {FOOTER_GROUPS.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="mb-2 text-sm font-semibold text-cream">{g.title}</h2>
            {g.links.map(([to, label]) => <Link key={to} to={to} className="flex min-h-11 items-center text-sm text-brand-200 transition-colors hover:text-mango">{label}</Link>)}
          </nav>
        ))}
        <div className="col-span-2 lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold">কথা বলুন</h2>
          <div className="flex flex-wrap gap-x-6 lg:flex-col lg:items-start">
            <a href={waLink(CONTACT.whatsapp, "আসসালামু আলাইকুম, Hikmah Tutors Rajshahi সম্পর্কে জানতে চাই।")} target="_blank" rel="noreferrer" className={contactClass}><MessageCircle size={16} aria-hidden />WhatsApp<ArrowUpRight size={13} aria-hidden /></a>
            <a href={telLink(CONTACT.call)} className={contactClass}><Phone size={16} aria-hidden />কল</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-xs text-brand-200">© ২০২৬ Hikmah Tutors Rajshahi</p>
          <div className="flex flex-wrap items-center gap-x-5">
            <Link to="/privacy" className={contactClass}>গোপনীয়তা</Link>
            <Link to="/terms" className={contactClass}>শর্তাবলি</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Header, page body and footer: every public page sits in this. */
export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Text pages (how it works, fees, privacy…): a forest title band, then the content on cream. */
export function PageShell({ title, sub, draft, children }: { title: string; sub?: string; draft?: boolean; children: ReactNode }) {
  return (
    <SitePage>
      <div className="bg-forest text-cream">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-sm text-brand-200 hover:text-mango"><ArrowLeft size={16} aria-hidden /> বোর্ডে ফিরুন</Link>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{title}</h1>
          {sub && <p className="mt-3 max-w-xl text-brand-200">{sub}</p>}
          {draft && <p className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">খসড়া — আইনি পর্যালোচনা বাকি</p>}
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
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700"><span className="size-1.5 rounded-full bg-brand-600" />অভিভাবকদের জন্য</span>
        <BookOpen className="text-brand-600" size={27} strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-bold">টিউটর খুঁজছেন?</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">আপনার সন্তানের ক্লাস, বিষয় ও এলাকা জানান। উপযুক্ত টিউটর খুঁজতে আমাদের সাথে কথা বলুন।</p>
      <Link to="/request-tutor" className="group mt-5 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-mango px-4 font-semibold text-forest transition-colors hover:bg-mango-deep">
        টিউটর খুঁজুন<ArrowUpRight className="transition-transform group-hover:translate-x-0.5" size={20} aria-hidden />
      </Link>
      <div className="mt-3 flex flex-wrap gap-x-5 border-b border-brand-100 pb-3">
        <a href={waLink(CONTACT.whatsapp, GUARDIAN_WA_TEXT)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-forest"><MessageCircle size={17} aria-hidden /> WhatsApp</a>
        <a href={telLink(CONTACT.call)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:text-forest"><Phone size={16} aria-hidden />কল করুন</a>
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
    let message = `কপি করা যায়নি। লিংক: ${url}`;
    try {
      await navigator.clipboard.writeText(url);
      message = "শেয়ার লিংক কপি হয়েছে";
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
