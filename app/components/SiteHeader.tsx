// The public header and footer (owner, 2026-11-04: "modern and bold, the kind of site a student tells friends about").
// A slim glass header that knows who is signed in (a tutor's photo, Admin for the owner, Log in otherwise), a full-
// screen menu on the phone, and a footer that opens with two colour bands: one for guardians, one for tutors.
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useRouteLoaderData } from "react-router";
import { ArrowUpRight, Menu, MessageCircle, Phone, UserRound, X } from "lucide-react";
import { Avatar } from "~/components/Avatar";
import { CONTACT, telLink, waLink } from "~/lib/contact";
import { firstName } from "~/lib/whatsapp";

const NAV: [string, string][] = [
  ["/", "Tuitions"],
  ["/how-it-works", "How it works"],
  ["/fees", "Fees"],
  ["/request-tutor", "For guardians"],
];
const HELLO = "আসসালামু আলাইকুম, Hikmah Tutors Rajshahi সম্পর্কে জানতে চাই।";

export type HeaderViewer = { role: "owner" | "tutor"; name: string | null; code: number | null; photo: boolean } | null;
export const useViewer = () => (useRouteLoaderData("root") as { viewer: HeaderViewer } | undefined)?.viewer ?? null;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? "text-forest after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-mango-deep" : "text-slate-600 hover:text-forest"}`;

/** The signed-in person's way back to their own pages; a log-in link otherwise. */
function Account({ viewer, compact }: { viewer: HeaderViewer; compact?: boolean }) {
  if (viewer?.role === "owner") {
    return <Link to="/admin" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-bold text-cream hover:bg-forest-mid">Admin<ArrowUpRight size={15} aria-hidden /></Link>;
  }
  if (viewer?.role === "tutor") {
    return (
      <Link to="/me" aria-label="My home" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white py-1 pr-1 pl-1 text-sm font-bold text-forest shadow-ring transition-shadow hover:shadow-lift sm:pr-3">
        <Avatar code={viewer.code} name={viewer.name} hasPhoto={viewer.photo} size="xs" />
        {!compact && <span className="hidden max-w-24 truncate sm:inline">{firstName(viewer.name)}</span>}
      </Link>
    );
  }
  return <Link to="/login" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-forest hover:bg-brand-50"><UserRound size={18} aria-hidden />Tutor log in</Link>;
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const viewer = useViewer();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <header className="sticky top-0 z-40 border-b border-brand-100/60 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="Hikmah Tutors Rajshahi, home">
          <img src="/brand/logo-square.webp" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
          <span className="min-w-0 leading-none">
            <span className="block text-[17px] font-extrabold tracking-tight text-forest">Hikmah Tutors<span className="text-brand-600">.</span></span>
            <span className="mt-1 block truncate text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Rajshahi</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={navClass} viewTransition>{label}</NavLink>)}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <Account viewer={viewer} />
            {!viewer && (
              <Link to="/request-tutor" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white transition-colors hover:bg-forest-mid">
                Find a tutor<ArrowUpRight size={16} aria-hidden />
              </Link>
            )}
          </div>
          {viewer && <span className="lg:hidden"><Account viewer={viewer} compact /></span>}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-site-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-11 items-center justify-center rounded-xl bg-white text-forest shadow-ring lg:hidden"
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-site-nav" aria-label="Main navigation" className="fixed inset-x-0 top-16 bottom-0 z-40 flex animate-fade flex-col gap-1 overflow-y-auto bg-cream px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:hidden">
          {NAV.map(([to, label], i) => (
            <NavLink key={to} to={to} end={to === "/"} style={{ animationDelay: `${i * 40}ms` }}
              className={({ isActive }) => `flex min-h-14 animate-rise items-center justify-between rounded-2xl px-4 text-xl font-extrabold tracking-tight text-forest ${isActive ? "bg-white shadow-ring" : ""}`}>
              {label}<ArrowUpRight size={20} className="text-brand-600" aria-hidden />
            </NavLink>
          ))}
          <div className="mt-auto space-y-2 pt-6">
            {viewer?.role === "tutor" ? (
              <Link to="/me" className="flex min-h-13 items-center justify-center rounded-2xl bg-forest text-base font-bold text-cream">My home</Link>
            ) : viewer?.role === "owner" ? (
              <Link to="/admin" className="flex min-h-13 items-center justify-center rounded-2xl bg-forest text-base font-bold text-cream">Admin</Link>
            ) : (
              <>
                <Link to="/request-tutor" className="flex min-h-13 items-center justify-center rounded-2xl bg-mango text-base font-extrabold text-forest">Find a tutor</Link>
                <Link to="/login" className="flex min-h-13 items-center justify-center rounded-2xl bg-white text-base font-bold text-forest shadow-ring">Tutor log in</Link>
              </>
            )}
            <a href={waLink(CONTACT.whatsapp, HELLO)} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-brand-700"><MessageCircle size={16} aria-hidden />WhatsApp us</a>
          </div>
        </nav>
      )}
    </header>
  );
}

const FOOTER_GROUPS: { title: string; links: [string, string][] }[] = [
  { title: "Explore", links: [["/", "Tuition board"], ["/how-it-works", "How it works"], ["/fees", "Fees"], ["/request-tutor", "For guardians"]] },
  { title: "For tutors", links: [["/me", "My home"], ["/login", "Log in"], ["/contact", "Contact"]] },
];

export function SiteFooter() {
  const contactClass = "inline-flex min-h-11 items-center gap-2 text-sm text-brand-100 transition-colors hover:text-mango";
  return (
    <footer className="mt-16">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        <Link to="/request-tutor" className="group rounded-3xl bg-mango p-6 text-forest sm:p-8">
          <p className="text-xs font-extrabold tracking-[0.16em] uppercase">For guardians</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">টিউটর খুঁজছেন?</p>
          <p className="mt-1 max-w-sm text-sm">ক্লাস, বিষয় আর এলাকা জানান। উপযুক্ত টিউটর নিয়ে আমরা ফোন করব।</p>
          <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-cream transition-transform duration-150 group-hover:translate-x-1">Find a tutor<ArrowUpRight size={16} aria-hidden /></span>
        </Link>
        <Link to="/" className="group rounded-3xl bg-brand-700 p-6 text-white sm:p-8">
          <p className="text-xs font-extrabold tracking-[0.16em] text-brand-100 uppercase">For tutors</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Tuitions near you, every day.</p>
          <p className="mt-1 max-w-sm text-sm text-brand-50">Salary, area and class up front. Apply in one tap and follow every step.</p>
          <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-forest transition-transform duration-150 group-hover:translate-x-1">See tuitions<ArrowUpRight size={16} aria-hidden /></span>
        </Link>
      </div>
      <div className="mt-10 bg-forest text-cream">
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
            <p className="mt-3 text-sm font-semibold text-mango">শিখি. শেখাই. এগিয়ে যাই.</p>
          </div>
          {FOOTER_GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="mb-2 text-sm font-semibold text-cream">{g.title}</h2>
              {g.links.map(([to, label]) => <Link key={to} to={to} className="flex min-h-11 items-center text-sm text-brand-200 transition-colors hover:text-mango">{label}</Link>)}
            </nav>
          ))}
          <div className="col-span-2 lg:col-span-1">
            <h2 className="mb-2 text-sm font-semibold">Talk to us</h2>
            <div className="flex flex-wrap gap-x-6 lg:flex-col lg:items-start">
              <a href={waLink(CONTACT.whatsapp, HELLO)} target="_blank" rel="noreferrer" className={contactClass}><MessageCircle size={16} aria-hidden />WhatsApp<ArrowUpRight size={13} aria-hidden /></a>
              <a href={telLink(CONTACT.call)} className={contactClass}><Phone size={16} aria-hidden />Call</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-xs text-brand-200">© 2026 Hikmah Tutors Rajshahi</p>
            <div className="flex flex-wrap items-center gap-x-5">
              <Link to="/privacy" className={contactClass}>Privacy</Link>
              <Link to="/terms" className={contactClass}>Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
