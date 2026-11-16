// The admin's own app shell (owner, 2026-11-04: "admin workflow should be much better"). Laptop: a forest sidebar with
// what is waiting in each place, one search box for everything (Ctrl+K or /) and a New menu. Phone: a slim top bar
// with search, the bottom bar of 2026-11-04 and the + button for a new lead.
import { useEffect, useRef, useState } from "react";
import { Form, Link, NavLink, Outlet, type ShouldRevalidateFunctionArgs, useFetcher, useLocation, useNavigate } from "react-router";
import { InstallButton } from "~/components/InstallApp";
import { ScrollRide } from "~/components/ScrollRide";
import {
  ArrowUpRight, BarChart3, ShieldCheck, Crown, ClipboardList, FileText, GraduationCap, Handshake, Inbox, LayoutDashboard, ListChecks, LogOut, Menu, Mic, PhoneCall, Plus, Search, UserRound, Users, Wallet, X, Zap,
} from "lucide-react";
import type { Route } from "./+types/admin.layout";
import { Avatar } from "~/components/Avatar";
import { type SearchHit, navCounts } from "~/lib/admin.server";
import { requireStaff, scopeOf } from "~/lib/auth.server";
import { type Perm, can } from "~/lib/staff";

// Applies to every admin page below: private data must never sit in a shared cache.
export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await requireStaff(request, "any");
  // What this person may open: everything for the owner, a moderator's switches otherwise (owner, 2026-11-16).
  const allowed = [...ALL_PERMS].filter((p) => can(viewer, p));
  const owner = !viewer || viewer.role === "owner";
  const all = await navCounts(scopeOf(viewer));
  // Badges only for what this person may act on.
  const counts = owner ? all : { ...all, premium: 0, review: 0, new_tutors: can(viewer, "docs") ? all.new_tutors : 0, uploads: can(viewer, "docs") ? all.uploads : 0 };
  return { counts, name: viewer?.name ?? "Admin", owner, allowed };
}

// The sidebar counts refresh after every save and on every page change, not on filter or tab changes.
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (!formMethod && currentUrl.pathname === nextUrl.pathname) return false;
  return formMethod ? defaultShouldRevalidate : true;
}

type Counts = Awaited<ReturnType<typeof navCounts>>;
// need: the switch a moderator must have, or "owner" for the owner's own pages; none = every staff member.
type Item = { to: string; label: string; icon: typeof Inbox; end?: boolean; count?: (c: Counts) => number; hot?: boolean; need?: Perm | "owner" };
const ALL_PERMS: Perm[] = ["leads", "tuitions", "tutors", "batches", "calls", "docs", "ai"];
type Access = { owner: boolean; allowed: Perm[] };
const allows = (a: Access, need?: Perm | "owner") => !need || a.owner || (need !== "owner" && a.allowed.includes(need));

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Work",
    items: [
      { to: "/admin", label: "Today", icon: LayoutDashboard, end: true, count: (c) => c.followups, hot: true },
      { to: "/admin/leads", label: "Leads", icon: Inbox, count: (c) => c.leads, hot: true, need: "leads" },
      { to: "/admin/tuitions", label: "Tuitions", icon: ClipboardList, count: (c) => c.open, need: "tuitions" },
      { to: "/admin/applications", label: "Applications", icon: FileText, count: (c) => c.applications, hot: true, need: "tuitions" },
      { to: "/admin/placements", label: "Placements", icon: Handshake, count: (c) => c.selected, need: "tuitions" },
      { to: "/admin/money", label: "Money", icon: Wallet, need: "owner" },
    ],
  },
  {
    title: "People",
    items: [
      { to: "/admin/tutors", label: "Tutors", icon: Users, count: (c) => c.new_tutors + c.uploads, hot: true, need: "tutors" },
      { to: "/admin/calls", label: "Call list", icon: PhoneCall, need: "calls" },
      { to: "/admin/premium", label: "Premium", icon: Crown, count: (c) => c.premium, hot: true, need: "owner" },
      { to: "/admin/batches", label: "Batch teachers", icon: GraduationCap, count: (c) => c.batches, hot: true, need: "batches" },
      { to: "/admin/guardians", label: "Guardians", icon: UserRound, need: "leads" },
    ],
  },
  {
    title: "Insights",
    items: [
      { to: "/admin/insights", label: "Insights", icon: BarChart3, need: "owner" },
      { to: "/admin/review", label: "Review", icon: ListChecks, count: (c) => c.review, need: "owner" },
      { to: "/admin/voice", label: "Voice notes", icon: Mic, need: "owner" },
      { to: "/admin/team", label: "Team", icon: ShieldCheck, need: "owner" },
    ],
  },
];

// The phone's bottom bar (owner, 2026-11-04): daily work one thumb-tap away; the rest sits under More.
const TABS: Item[] = [
  { to: "/admin", label: "Today", icon: LayoutDashboard, end: true, count: (c) => c.followups, hot: true },
  { to: "/admin/leads", label: "Leads", icon: Inbox, count: (c) => c.leads, hot: true, need: "leads" },
  { to: "/admin/tuitions", label: "Tuitions", icon: ClipboardList, need: "tuitions" },
  { to: "/admin/tutors", label: "Tutors", icon: Users, count: (c) => c.new_tutors + c.uploads, hot: true, need: "tutors" },
];
const MORE: Item[] = [
  { to: "/admin/calls", label: "Call list", icon: PhoneCall, need: "calls" },
  { to: "/admin/applications", label: "Applications", icon: FileText, count: (c) => c.applications, need: "tuitions" },
  { to: "/admin/placements", label: "Placements", icon: Handshake, count: (c) => c.selected, need: "tuitions" },
  { to: "/admin/money", label: "Money", icon: Wallet, need: "owner" },
  { to: "/admin/premium", label: "Premium", icon: Crown, count: (c) => c.premium, hot: true, need: "owner" },
  { to: "/admin/batches", label: "Batch teachers", icon: GraduationCap, count: (c) => c.batches, hot: true, need: "batches" },
  { to: "/admin/guardians", label: "Guardians", icon: UserRound, need: "leads" },
  { to: "/admin/insights", label: "Insights", icon: BarChart3, need: "owner" },
  { to: "/admin/review", label: "Review", icon: ListChecks, count: (c) => c.review, need: "owner" },
  { to: "/admin/voice", label: "Voice notes", icon: Mic, need: "owner" },
  { to: "/admin/team", label: "Team", icon: ShieldCheck, need: "owner" },
];

const Count = ({ n, hot, dark }: { n: number; hot?: boolean; dark?: boolean }) =>
  n > 0 ? (
    <span className={`ml-auto min-w-6 rounded-full px-1.5 text-center text-[11px] leading-5 font-bold tabular-nums ${hot ? "bg-mango text-forest" : dark ? "bg-white/10 text-brand-100" : "bg-brand-50 text-brand-700"}`}>
      {n > 999 ? "999+" : n}
    </span>
  ) : null;

// ---------- search (command palette) ----------

const KIND_LABEL: Record<SearchHit["kind"], string> = { tuition: "Tuition", tutor: "Tutor", guardian: "Guardian", lead: "Area" };

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fetcher = useFetcher<{ hits: SearchHit[] }>();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const hits = q.trim() ? fetcher.data?.hits ?? [] : [];

  useEffect(() => {
    if (!open) return;
    setQ("");
    setAt(0);
    requestAnimationFrame(() => input.current?.focus());
  }, [open]);
  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(() => fetcher.load(`/admin/search?q=${encodeURIComponent(q.trim())}`), 140);
    return () => clearTimeout(t);
    // fetcher.load is stable for our purpose; re-running on it would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  if (!open) return null;
  const go = (h: SearchHit) => {
    onClose();
    navigate(h.to);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" aria-label="Close search" onClick={onClose} className="absolute inset-0 animate-fade bg-forest/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-xl animate-rise overflow-hidden rounded-2xl bg-white shadow-lift">
        <div className="flex items-center gap-3 border-b border-brand-50 px-4">
          <Search size={20} className="shrink-0 text-brand-600" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setAt(0); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(i + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && hits[at]) go(hits[at]);
            }}
            placeholder="Tuition code, tutor name or code, phone, area…"
            aria-label="Search everything"
            className="min-h-14 min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded-md border border-slate-200 px-1.5 text-[11px] font-semibold text-slate-400 sm:block">Esc</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2 scroll-thin" role="listbox" aria-label="Results">
          {!q.trim() && <li className="px-3 py-6 text-center text-sm text-slate-500">Try “1362”, “Nusrat”, “017…” or “Uposhohor”.</li>}
          {q.trim() && fetcher.state === "idle" && hits.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">Nothing found.</li>}
          {hits.map((h, i) => (
            <li key={h.to + h.title} role="option" aria-selected={i === at}>
              <button
                type="button"
                onMouseEnter={() => setAt(i)}
                onClick={() => go(h)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ${i === at ? "bg-brand-50" : ""}`}
              >
                {h.photo ? <Avatar code={h.photo.code} name={h.title} hasPhoto={h.photo.has} size="sm" /> : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-xs font-bold text-mango">{h.kind === "tuition" ? "HTR" : h.kind === "guardian" ? "G" : "#"}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-forest">{h.title}</span>
                  <span className="block truncate text-sm text-slate-500">{h.sub}</span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{KIND_LABEL[h.kind]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- New menu ----------

function NewMenu({ dark, access }: { dark?: boolean; access: Access }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const lead = allows(access, "leads"), tuition = allows(access, "tuitions");
  if (!lead && !tuition) return null;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${dark ? "bg-mango text-forest hover:bg-mango-deep" : "bg-forest text-cream"}`}>
        <Plus size={18} strokeWidth={2.5} aria-hidden />New
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute inset-x-0 top-full z-50 mt-2 animate-rise rounded-2xl bg-white p-1.5 text-forest shadow-lift">
            {lead && <Link to="/admin/quick" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-brand-50"><Zap size={18} className="text-brand-600" aria-hidden />New lead (call)</Link>}
            {tuition && <Link to="/admin/tuitions/new" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-brand-50"><ClipboardList size={18} className="text-brand-600" aria-hidden />New tuition</Link>}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- shell ----------

function Sidebar({ counts, onSearch, access }: { counts: Counts; onSearch: () => void; access: Access }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? "bg-white/10 text-white" : "text-brand-100/80 hover:bg-white/5 hover:text-white"}`;
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-forest text-cream lg:flex">
      <Link to="/admin" className="flex items-center gap-3 px-5 pt-5 pb-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-cream"><img src="/brand/mark.webp" alt="" width={28} height={28} className="size-7" /></span>
        <span className="leading-tight">
          <span className="block font-bold">Hikmah Admin</span>
          <span className="block text-[11px] font-semibold tracking-[0.16em] text-brand-200 uppercase">Rajshahi</span>
        </span>
      </Link>
      <div className="space-y-2 px-3">
        <button type="button" onClick={onSearch} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl bg-white/5 px-3 text-sm text-brand-100/80 ring-1 ring-white/10 transition-colors hover:bg-white/10">
          <Search size={17} aria-hidden />Search<kbd className="ml-auto rounded-md bg-white/10 px-1.5 text-[11px] font-semibold">Ctrl K</kbd>
        </button>
        <NewMenu dark access={access} />
      </div>
      <nav aria-label="Admin" className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4 scroll-thin">
        {GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => allows(access, n.need)) })).filter((g) => g.items.length).map((g) => (
          <div key={g.title}>
            <p className="mb-1 px-3 text-[11px] font-bold tracking-[0.14em] text-brand-200/70 uppercase">{g.title}</p>
            {g.items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={link} viewTransition>
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-mango" />}
                    <n.icon size={18} aria-hidden className={isActive ? "text-mango" : ""} />
                    {n.label}
                    {n.count && <Count n={n.count(counts)} hot={n.hot} dark />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link to="/" className="flex min-h-10 items-center justify-between gap-2 rounded-xl px-3 text-xs font-semibold text-brand-100/80 hover:bg-white/5 hover:text-white">View the board<ArrowUpRight size={15} aria-hidden /></Link>
        <InstallButton className="w-full justify-start px-3 text-xs text-brand-100/80 hover:bg-white/5 hover:text-white" />
        <Form method="post" action="/logout">
          <button className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-xs font-semibold text-brand-100/80 hover:bg-white/5 hover:text-white">Log out<LogOut size={15} aria-hidden /></button>
        </Form>
      </div>
    </aside>
  );
}

function PhoneBars({ counts, onSearch, access }: { counts: Counts; onSearch: () => void; access: Access }) {
  const { pathname, search } = useLocation();
  // Pages with their own sticky Save bar: the + button would sit on top of it.
  const saveBar = pathname === "/admin/tuitions/new" || (/^\/admin\/tuitions\/\d+$/.test(pathname) && new URLSearchParams(search).get("tab") === "details");
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);
  const more_ = MORE.filter((m) => allows(access, m.need));
  const tabs = TABS.filter((t) => allows(access, t.need));
  const moreActive = more_.some((m) => pathname.startsWith(m.to));
  const tab = (on: boolean) => `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${on ? "text-forest" : "text-slate-500"}`;
  const pill = (on: boolean) => `relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-brand-100" : ""}`;
  const moreCount = (allows(access, "tuitions") && counts.applications > 0 ? 1 : 0) + (access.owner && counts.review > 0 ? 1 : 0);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-brand-100/70 bg-cream/90 px-4 backdrop-blur-md lg:hidden">
        <ScrollRide />
        <Link to="/admin" className="relative z-10 flex items-center gap-2">
          <img src="/brand/mark.webp" alt="" width={32} height={32} className="size-8" />
          <span className="font-bold text-forest">Admin</span>
        </Link>
        <button type="button" onClick={onSearch} className="relative z-10 ml-auto flex min-h-11 flex-1 items-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-500 shadow-ring max-w-56">
          <Search size={16} aria-hidden />Search
        </button>
      </header>

      {more && <button type="button" aria-label="Close" onClick={() => setMore(false)} className="fixed inset-0 z-30 animate-fade bg-forest/30 lg:hidden" />}
      {more && (
        <div id="admin-more" className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 animate-sheet rounded-2xl bg-white p-2 shadow-lift lg:hidden">
          {more_.map((m) => (
            <Link key={m.to} to={m.to} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-brand-50">
              <m.icon size={18} className="text-brand-600" aria-hidden />{m.label}{m.count && <Count n={m.count(counts)} />}
            </Link>
          ))}
          <Link to="/" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-brand-50"><ArrowUpRight size={18} className="text-brand-600" aria-hidden />View the board</Link>
          <InstallButton className="w-full justify-start px-3 text-forest hover:bg-brand-50" />
          <Form method="post" action="/logout">
            <button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700"><LogOut size={18} aria-hidden />Log out</button>
          </Form>
        </div>
      )}
      {!saveBar && allows(access, "leads") && <Link to="/admin/quick" aria-label="New lead" className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-2xl bg-mango text-forest shadow-lift transition-transform duration-150 active:scale-95 lg:hidden">
        <Plus size={26} strokeWidth={2.5} aria-hidden />
      </Link>}
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => tab(isActive)}>
            {({ isActive }) => (
              <>
                <span className={pill(isActive)}>
                  <t.icon size={20} aria-hidden />
                  {t.count && t.count(counts) > 0 && <span className="absolute -top-1 right-0.5 grid min-w-4.5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] leading-4.5 text-white">{t.count(counts)}</span>}
                </span>
                {t.label}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-controls="admin-more" className={tab(more || moreActive)}>
          <span className={pill(more || moreActive)}>
            {more ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            {!more && moreCount > 0 && <span aria-hidden className="absolute top-0 right-2 size-2 rounded-full bg-rose-600" />}
          </span>
          More
        </button>
      </nav>
    </>
  );
}

export default function AdminLayout({ loaderData: { counts, owner, allowed } }: Route.ComponentProps) {
  const access: Access = { owner, allowed };
  const [search, setSearch] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="min-h-dvh bg-[#f7f8f4]">
      <Sidebar counts={counts} onSearch={() => setSearch(true)} access={access} />
      <PhoneBars counts={counts} onSearch={() => setSearch(true)} access={access} />
      {/* On a computer there is no top bar to ride, so the line runs alone along the top of the page. */}
      <div className="fixed top-0 right-0 left-64 z-30 hidden lg:block"><ScrollRide bare /></div>
      <div className="lg:pl-64">
        <div className="mx-auto max-w-[1360px] px-4 pt-5 pb-36 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16">
          <Outlet />
        </div>
      </div>
      <SearchDialog open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
