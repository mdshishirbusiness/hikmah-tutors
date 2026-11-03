import { Form, Link, NavLink, Outlet } from "react-router";
import { ArrowUpRight, ClipboardList, FileText, Inbox, LayoutDashboard, ListChecks, LogOut, UserRound, Users, Zap } from "lucide-react";
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
  { to: "/admin", label: "কাজের তালিকা", icon: LayoutDashboard, end: true },
  { to: "/admin/quick", label: "Quick Pad", icon: Zap },
  { to: "/admin/leads", label: "লিড", icon: Inbox },
  { to: "/admin/tuitions", label: "টিউশন", icon: ClipboardList },
  { to: "/admin/applications", label: "আবেদন", icon: FileText },
  { to: "/admin/tutors", label: "টিউটর", icon: Users },
  { to: "/admin/guardians", label: "গার্ডিয়ান", icon: UserRound },
  { to: "/admin/review", label: "রিভিউ", icon: ListChecks },
];

const link = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${isActive ? "bg-forest text-cream shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-forest"}`;

export default function AdminLayout() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[216px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-10">
        <aside className="rounded-2xl lg:sticky lg:top-24 lg:self-start lg:border lg:border-brand-100 lg:bg-white lg:p-3">
          <div className="mb-4 hidden items-center gap-3 px-2 lg:flex">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><LayoutDashboard size={18} aria-hidden /></span>
            <div>
              <p className="text-sm font-bold text-forest">অ্যাডমিন প্যানেল</p>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400">HIKMAH WORKSPACE</p>
            </div>
          </div>
          <nav aria-label="অ্যাডমিন" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] pb-3 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={link}>
                <n.icon size={18} aria-hidden />{n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 hidden border-t border-brand-100 pt-2 lg:block">
            <Link to="/" className="flex min-h-11 items-center justify-between gap-2 px-3 text-xs font-semibold text-slate-500 hover:text-brand-700">বোর্ডে ফিরুন<ArrowUpRight size={16} aria-hidden /></Link>
            <Form method="post" action="/logout">
              <button className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-xs font-semibold text-slate-500 hover:text-rose-700">লগআউট<LogOut size={16} aria-hidden /></button>
            </Form>
          </div>
        </aside>
        <div className="mt-4 min-w-0 lg:mt-0">
          <Outlet />
        </div>
      </div>
    </>
  );
}
