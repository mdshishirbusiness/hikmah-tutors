import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowUpRight, GraduationCap, LayoutDashboard, Menu, X } from "lucide-react";
import { useI18n } from "../i18n";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const links = [["/", "nav.board", "board"], ["/how-it-works", "hero.how", "how"], ["/fees", "hero.fees", "fees"]];
  const navClass = ({ isActive }: { isActive: boolean }) => `min-h-12 inline-flex items-center px-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? "text-brand-700 bg-brand-50" : "text-slate-600 hover:text-forest hover:bg-brand-50/60"}`;
  return (
    <header className="sticky top-0 z-30 border-b border-brand-100/70 bg-cream/95 backdrop-blur-md" data-testid="site-header">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label={t("app.name")} data-testid="header-logo-link">
          <img src="/brand/logo-square.webp" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg" />
          <span className="min-w-0"><span className="block text-lg font-bold tracking-tight leading-snug text-forest">Hikmah Tutors<span className="text-brand-600">.</span></span><span className="block truncate text-[10px] tracking-[0.12em] min-[400px]:tracking-[0.2em] uppercase font-semibold text-slate-500">Rajshahi · {t("brand.since")}</span></span>
        </Link>
        <nav className="hidden xl:flex items-center gap-1" aria-label={t("nav.main")}>
          {links.map(([to, key, id]) => <NavLink key={id} to={to} end={to === "/"} className={navClass} data-testid={`header-${id}`}>{t(key)}</NavLink>)}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link to="/request-tutor" className="hidden lg:inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-mid transition-colors" data-testid="header-request-tutor">{t("nav.request")}<ArrowUpRight size={16} aria-hidden /></Link>
          <NavLink to="/tutor" className={({ isActive }) => `hidden lg:inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${isActive ? "bg-brand-50 border-brand-200 text-brand-700" : "border-brand-100 text-forest hover:bg-brand-50"}`} data-testid="header-tutor-panel"><GraduationCap size={18} aria-hidden />{t("nav.tutor")}</NavLink>
          <NavLink to="/admin" className="hidden lg:inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-brand-50 hover:text-forest transition-colors" aria-label={t("nav.admin")} title={t("nav.admin")} data-testid="header-admin-panel"><LayoutDashboard size={19} aria-hidden /></NavLink>
          <button type="button" onClick={() => setLang(lang === "bn" ? "en" : "bn")} data-testid="lang-toggle" aria-label={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"} className="h-11 min-w-11 rounded-xl text-sm font-bold text-forest hover:bg-brand-50 transition-colors">{lang === "bn" ? "EN" : "বাং"}</button>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-site-nav" aria-label={t(open ? "nav.close" : "nav.menu")} className="lg:hidden h-11 w-11 inline-flex items-center justify-center rounded-xl border border-brand-100 text-forest" data-testid="header-menu-toggle">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && <nav id="mobile-site-nav" aria-label={t("nav.main")} className="lg:hidden grid grid-cols-2 gap-2 border-t border-brand-100 bg-cream p-4 animate-fade" data-testid="header-mobile-menu">
        {links.map(([to, key, id]) => <NavLink key={id} to={to} end={to === "/"} onClick={() => setOpen(false)} className={navClass} data-testid={`mobile-nav-${id}`}>{t(key)}</NavLink>)}
        <Link to="/request-tutor" onClick={() => setOpen(false)} className="min-h-12 flex items-center px-3 rounded-xl bg-forest text-white text-sm font-semibold" data-testid="mobile-nav-request">{t("nav.request")}</Link>
        <Link to="/tutor" onClick={() => setOpen(false)} className="min-h-12 flex items-center gap-2 px-3 text-sm font-semibold text-forest" data-testid="mobile-nav-tutor"><GraduationCap size={18} />{t("nav.tutor")}</Link>
        <Link to="/admin" onClick={() => setOpen(false)} className="min-h-12 flex items-center gap-2 px-3 text-sm font-semibold text-forest" data-testid="mobile-nav-admin"><LayoutDashboard size={18} />{t("nav.admin")}</Link>
      </nav>}
    </header>
  );
}
