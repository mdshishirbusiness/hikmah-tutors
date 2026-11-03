import { useEffect, useState } from "react";
import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { ArrowUpRight, ClipboardList, FileText, Inbox, LayoutDashboard, ListChecks, LogOut, Menu, Plus, UserRound, Users, Zap } from "lucide-react";
import type { Route } from "./+types/admin.layout";
import { SiteHeader } from "~/components/site";
import { requireAdmin } from "~/lib/auth.server";

// Applies to every admin page below: private data must never sit in a shared cache.
export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

const NAV = [
  { to: "/admin", label: "Today", icon: LayoutDashboard, end: true },
  { to: "/admin/quick", label: "Quick Pad", icon: Zap },
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/tuitions", label: "Tuitions", icon: ClipboardList },
  { to: "/admin/applications", label: "Applications", icon: FileText },
  { to: "/admin/tutors", label: "Tutors", icon: Users },
  { to: "/admin/guardians", label: "Guardians", icon: UserRound },
  { to: "/admin/review", label: "Review", icon: ListChecks },
];

// The phone's bottom bar (owner, 2026-11-04): daily work one thumb-tap away; the rest sits under More.
const TABS = [
  { to: "/admin", label: "Today", icon: LayoutDashboard, end: true },
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/tuitions", label: "Tuitions", icon: ClipboardList },
  { to: "/admin/tutors", label: "Tutors", icon: Users },
];
const MORE = [
  { to: "/admin/guardians", label: "Guardians", icon: UserRound },
  { to: "/admin/review", label: "Review", icon: ListChecks },
  { to: "/admin/applications", label: "All applications", icon: FileText },
  { to: "/", label: "Back to board", icon: ArrowUpRight },
];

const link = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${isActive ? "bg-forest text-cream shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-forest"}`;

const tab = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${isActive ? "text-forest" : "text-slate-500"}`;

function BottomBar() {
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);
  const moreActive = MORE.some((m) => m.to !== "/" && pathname.startsWith(m.to));
  return (
    <>
      {more && <button type="button" aria-label="Close" onClick={() => setMore(false)} className="fixed inset-0 z-30 animate-fade bg-forest/30 lg:hidden" />}
      {more && (
        <div id="admin-more" className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 animate-sheet rounded-2xl border border-brand-100 bg-white p-2 shadow-card lg:hidden">
          {MORE.map((m) => (
            <Link key={m.to} to={m.to} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-brand-50">
              <m.icon size={18} className="text-brand-600" aria-hidden />{m.label}
            </Link>
          ))}
          <Form method="post" action="/logout">
            <button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700">
              <LogOut size={18} aria-hidden />Log out
            </button>
          </Form>
        </div>
      )}
      <Link to="/admin/quick" aria-label="New lead" className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-2xl bg-mango text-forest shadow-card transition-transform duration-150 active:scale-95 lg:hidden">
        <Plus size={26} strokeWidth={2.5} aria-hidden />
      </Link>
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={tab}>
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? "bg-brand-100" : ""}`}><t.icon size={20} aria-hidden /></span>
                {t.label}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-controls="admin-more" className={tab({ isActive: more || moreActive })}>
          <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${more || moreActive ? "bg-brand-100" : ""}`}><Menu size={20} aria-hidden /></span>
          More
        </button>
      </nav>
    </>
  );
}

export default function AdminLayout() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-36 sm:px-6 lg:grid lg:grid-cols-[216px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-10">
        <aside className="hidden rounded-2xl lg:sticky lg:top-24 lg:block lg:self-start lg:border lg:border-brand-100 lg:bg-white lg:p-3">
          <div className="mb-4 flex items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><LayoutDashboard size={18} aria-hidden /></span>
            <div>
              <p className="text-sm font-bold text-forest">Admin panel</p>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400">HIKMAH WORKSPACE</p>
            </div>
          </div>
          <nav aria-label="Admin" className="flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={link}>
                <n.icon size={18} aria-hidden />{n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 border-t border-brand-100 pt-2">
            <Link to="/" className="flex min-h-11 items-center justify-between gap-2 px-3 text-xs font-semibold text-slate-500 hover:text-brand-700">Back to board<ArrowUpRight size={16} aria-hidden /></Link>
            <Form method="post" action="/logout">
              <button className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-xs font-semibold text-slate-500 hover:text-rose-700">Log out<LogOut size={16} aria-hidden /></button>
            </Form>
          </div>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
      <BottomBar />
    </>
  );
}
