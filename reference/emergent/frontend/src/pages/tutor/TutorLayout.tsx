import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, FileText, Home, UserRound, FlaskConical, ArrowUpRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import { tutorApi } from "../../api/client";
import { setTutorId, useTutorId } from "../../lib/tutorSession";
import { useMe } from "../../lib/useSaved";

const TABS = [
  { to: "/tutor", label: "হোম", icon: Home, end: true, id: "home" },
  { to: "/tutor/saved", label: "সেভ", icon: Bookmark, id: "saved" },
  { to: "/tutor/applications", label: "আবেদন", icon: FileText, id: "applications" },
  { to: "/tutor/profile", label: "প্রোফাইল", icon: UserRound, id: "profile" },
];

function DemoPicker() {
  const { lang } = useI18n();
  const tid = useTutorId();
  const list = useQuery({ queryKey: ["tutor-demo-list"], queryFn: tutorApi.demoList });
  return (
    <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 sm:flex sm:items-center sm:justify-between gap-5" data-testid="tutor-demo-picker">
      <div className="flex items-start gap-3"><FlaskConical size={18} className="mt-1 shrink-0 text-amber-700" aria-hidden /><div><label htmlFor="demo-tutor" className="text-sm font-semibold text-amber-900">{lang === "bn" ? "ডেমো মোড — টিউটর বেছে নিন" : "Demo mode — choose a tutor"}</label><p className="text-xs text-amber-800 mt-0.5">{lang === "bn" ? "লগইন ছাড়া নমুনা প্রোফাইল দিয়ে ঘুরে দেখুন।" : "Explore with a sample profile. No login required."}</p></div></div>
      <select id="demo-tutor" value={tid || ""} onChange={(e) => setTutorId(e.target.value || null)} data-testid="tutor-demo-select" className="mt-3 sm:mt-0 w-full sm:max-w-xs min-h-12 rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold text-forest">
        <option value="">{lang === "bn" ? "— টিউটর বেছে নিন —" : "— Choose a tutor —"}</option>
        {(list.data?.items || []).map((t) => <option key={t.id} value={t.id}>{t.full_name} · {t.institution}</option>)}
      </select>
    </div>
  );
}

export function TutorLayout() {
  const { t, lang } = useI18n();
  const tid = useTutorId();
  const me = useMe();
  const label = (id: string, bn: string) => lang === "bn" ? bn : ({ home: "Overview", saved: "Saved", applications: "Applications", profile: "Profile" }[id]);
  const tab = ({ isActive }: { isActive: boolean }) => `flex-1 lg:flex-none min-h-[60px] lg:min-h-11 flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 px-3 lg:px-4 lg:rounded-xl text-xs lg:text-sm font-semibold transition-colors ${isActive ? "text-brand-700 bg-brand-50 lg:bg-forest lg:text-cream" : "text-slate-500 hover:text-forest hover:bg-brand-50"}`;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10" data-testid="tutor-panel">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div><p className="text-xs font-semibold text-brand-700">{t("nav.tutor")}</p><p className="mt-1 text-xl sm:text-2xl font-bold text-forest break-words" data-testid="tutor-current-name">{me.data?.profile.full_name || (lang === "bn" ? "আপনার শেখানোর নতুন শুরু" : "Your next teaching opportunity")}</p></div>
        <nav className="hidden lg:flex gap-1 rounded-2xl bg-white border border-brand-100 p-1.5" aria-label="tutor">{TABS.map((item) => <NavLink key={item.id} to={item.to} end={item.end} className={tab} data-testid={`tutor-tab-${item.id}`}><item.icon size={17} aria-hidden />{label(item.id, item.label)}</NavLink>)}</nav>
      </div>
      <DemoPicker />
      <div className="mt-7">{tid ? <Outlet key={tid} /> : <div className="mt-8 flex flex-col items-start rounded-2xl border border-brand-100 bg-white p-7 sm:p-10" data-testid="tutor-pick-first"><GraduationCap size={36} strokeWidth={1.5} className="text-brand-600" aria-hidden /><h1 className="mt-4 text-3xl sm:text-4xl font-bold text-forest">{lang === "bn" ? "এক প্যানেলে সবকিছু" : "Your teaching journey, in one place"}</h1><p className="mt-3 max-w-lg text-sm text-slate-600">{lang === "bn" ? "উপরে নমুনা টিউটর বেছে নিন। পছন্দের টিউশন সেভ করুন, আবেদন দেখুন ও প্রোফাইল সাজান।" : "Select a sample tutor above to explore saved tuitions, track applications and build a profile."}</p><Link to="/" className="mt-5 inline-flex items-center gap-2 min-h-12 rounded-xl bg-forest px-5 text-sm font-semibold text-white hover:bg-brand-700" data-testid="tutor-empty-board">{t("nav.board")}<ArrowUpRight size={17} aria-hidden /></Link></div>}</div>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-brand-100 flex pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(9,51,42,0.04)]" aria-label="tutor-mobile" data-testid="tutor-bottom-nav">{TABS.map((item) => <NavLink key={item.id} to={item.to} end={item.end} className={tab} data-testid={`tutor-bottom-tab-${item.id}`}><item.icon size={21} aria-hidden />{label(item.id, item.label)}</NavLink>)}</nav>
    </div>
  );
}
