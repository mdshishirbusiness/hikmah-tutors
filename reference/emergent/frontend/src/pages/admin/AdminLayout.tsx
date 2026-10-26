import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowUpRight, ClipboardList, FileText, Inbox, LayoutDashboard, Megaphone, Settings, ShieldAlert, Users, Zap } from "lucide-react";
import { useI18n } from "../../i18n";

const NAV = [
  { to: "/admin", label: "কাজের তালিকা", icon: LayoutDashboard, end: true, id: "queue" },
  { to: "/admin/quick", label: "Quick Pad", icon: Zap, id: "quick" },
  { to: "/admin/leads", label: "লিড", icon: Inbox, id: "leads" },
  { to: "/admin/tuitions", label: "টিউশন", icon: ClipboardList, id: "tuitions" },
  { to: "/admin/applications", label: "আবেদন", icon: FileText, id: "applications" },
  { to: "/admin/tutors", label: "টিউটর", icon: Users, id: "tutors" },
  { to: "/admin/posts", label: "পোস্ট", icon: Megaphone, id: "posts" },
  { to: "/admin/settings", label: "সেটিংস", icon: Settings, id: "settings" },
];

export function AdminLayout() {
  const { t, lang } = useI18n();
  const en: Record<string, string> = { queue: "Overview", quick: "Quick Pad", leads: "Leads", tuitions: "Tuitions", applications: "Applications", tutors: "Tutors", posts: "Post studio", settings: "Settings" };
  const link = ({ isActive }: { isActive: boolean }) => `shrink-0 min-h-12 inline-flex items-center gap-3 px-3.5 rounded-xl text-sm font-semibold transition-colors ${isActive ? "bg-forest text-cream shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-forest"}`;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 lg:grid lg:grid-cols-[216px_minmax(0,1fr)] lg:gap-8" data-testid="admin-panel">
      <aside className="lg:sticky lg:top-24 lg:self-start rounded-2xl lg:border lg:border-brand-100 lg:bg-white lg:p-3">
        <div className="mb-4 px-2 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><LayoutDashboard size={18} aria-hidden /></span><div><p className="text-sm font-bold text-forest">{t("nav.admin")}</p><p className="text-[10px] font-semibold tracking-wider text-slate-400">HIKMAH WORKSPACE</p></div></div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-3 lg:pb-0" aria-label="admin">
          {NAV.map((n) => <NavLink key={n.id} to={n.to} end={n.end} className={link} data-testid={`admin-nav-${n.id}`}><n.icon size={18} aria-hidden />{lang === "en" ? en[n.id] : n.label}</NavLink>)}
        </nav>
        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3" data-testid="admin-open-warning"><div className="flex items-center gap-2 text-xs font-semibold text-amber-900"><ShieldAlert size={15} aria-hidden />{lang === "bn" ? "পরীক্ষামূলক প্যানেল" : "Preview workspace"}</div><p className="mt-1 text-xs leading-relaxed text-amber-800">{lang === "bn" ? "লগইন ছাড়াই খোলা। শুধু নমুনা তথ্য ব্যবহার করুন।" : "Open without login. Use sample data only."}</p></div>
        <Link to="/" className="mt-2 min-h-11 flex items-center justify-between gap-2 px-3 text-xs font-semibold text-slate-500 hover:text-brand-700" data-testid="admin-back-board">{t("detail.back")}<ArrowUpRight size={16} aria-hidden /></Link>
      </aside>
      <div className="mt-7 lg:mt-0 min-w-0"><Outlet /></div>
    </div>
  );
}
