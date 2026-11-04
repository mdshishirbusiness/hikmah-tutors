// Shared pieces of the admin and tutor panels. Design ported from the 21 Oct Emergent export
// (reference/emergent/frontend/src/components/panel/ui.tsx): big titles on cream, white cards, toned status pills.
import { Link, NavLink, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";

// Numbers and dates use English digits (owner, 2026-11-04).
export const num = (n: number) => n.toLocaleString("en-IN");

export function when(sec: number | null) {
  if (!sec) return "";
  return new Date(sec * 1000).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" });
}

/** "5 min ago", "2 h ago", "3 days ago". */
export function ago(sec: number | null) {
  if (!sec) return "";
  const m = Math.max(Math.floor((Date.now() / 1000 - sec) / 60), 0);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.floor(m / 60)} h ago`;
  return `${Math.floor(m / 1440)} days ago`;
}

/** Sheet data can hold anything, so only web links become clickable. */
export const safeUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

export function PageHead({ title, sub, back, action, eyebrow }: { title: React.ReactNode; sub?: React.ReactNode; back?: { to: string; label: string }; action?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-slate-500 hover:text-brand-700">
          <ArrowLeft size={16} aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-bold tracking-[0.12em] text-brand-700 uppercase">{eyebrow}</p>}
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight break-words text-forest sm:text-4xl">{title}</h1>
          {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{sub}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`min-w-0 rounded-2xl bg-white p-5 shadow-ring sm:p-6 ${className}`}>{children}</section>
);

const TONES = {
  green: "bg-emerald-100 text-emerald-900",
  mango: "bg-mango text-forest",
  grey: "bg-slate-100 text-slate-700",
  red: "bg-rose-100 text-rose-900",
  dark: "bg-forest text-cream",
  amber: "bg-amber-100 text-amber-900",
  sky: "bg-sky-100 text-sky-900",
  teal: "bg-teal-100 text-teal-900",
  brand: "bg-brand-600 text-white",
};
export type Tone = keyof typeof TONES;

export const Badge = ({ tone = "grey", children }: { tone?: Tone; children: React.ReactNode }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${TONES[tone]}`}>{children}</span>
);

export const APPLICATION_TONE: Record<string, Tone> = {
  submitted: "grey", under_review: "amber", shortlisted: "sky", trial_arranged: "teal", confirmed: "brand",
  not_selected: "grey", withdrawn: "grey", opportunity_closed: "grey",
};
export const TUITION_TONE: Record<string, Tone> = {
  draft: "grey", available: "green", processing: "amber", booked: "brand", cancelled: "red", closed: "grey",
};

export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  return (
    <dl>
      {shown.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-brand-50 py-2.5 last:border-0">
          <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
          <dd className="min-w-0 text-right text-sm font-semibold break-words text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ContactButtons({ phone }: { phone: string | null }) {
  if (!phone) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${phone}`} className={secondaryButton}>Call {phone}</a>
      <a href={`https://wa.me/88${phone}`} target="_blank" rel="noreferrer" className={secondaryButton}>WhatsApp</a>
    </div>
  );
}

export const inputClass = "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
export const primaryButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60";
export const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-semibold text-forest transition-colors duration-150 hover:bg-brand-100";

/** A pill that links to a filter; the current one is filled. */
export function FilterPill({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <NavLink to={to} className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-bold transition-colors ${active ? "border-forest bg-forest text-cream" : "border-brand-100 bg-white text-forest hover:border-brand-500"}`}>
      {children}
    </NavLink>
  );
}

export function Pager({ total, pageSize }: { total: number; pageSize: number }) {
  const [sp] = useSearchParams();
  const page = Math.max(Number(sp.get("page")) || 1, 1);
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => {
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    return `?${next}`;
  };
  const link = "inline-flex min-h-11 items-center rounded-xl border border-brand-100 bg-white px-4 text-sm font-semibold text-forest hover:bg-brand-50";
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-2 pt-2">
      {page > 1 ? <Link to={href(page - 1)} className={link}>← Previous</Link> : <span />}
      <span className="text-sm text-slate-600">{num(page)} / {num(pages)}</span>
      {page < pages ? <Link to={href(page + 1)} className={link}>Next →</Link> : <span />}
    </nav>
  );
}

export const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl border border-dashed border-brand-200 bg-white/60 p-8 text-center text-slate-600">{children}</p>
);

/** Pills that filter a list by a search parameter, each with its count. */
export function StageTabs({ tabs, active, param = "stage" }: { tabs: { key: string; label: string; n?: number }[]; active: string; param?: string }) {
  const [sp] = useSearchParams();
  return (
    <nav aria-label="Filter" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const next = new URLSearchParams(sp);
        if (t.key) next.set(param, t.key); else next.delete(param);
        next.delete("page");
        const on = active === t.key;
        return (
          <Link key={t.key || "all"} to={`?${next}`} preventScrollReset aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${on ? "bg-forest text-cream" : "bg-white text-slate-600 shadow-ring hover:text-forest"}`}>
            {t.label}{t.n !== undefined && <span className={`tabular-nums ${on ? "text-mango" : "text-slate-400"}`}>{num(t.n)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** "৳4,500" in the big confident style of the board (owner, 2026-10-16). */
export const Money = ({ amount, kind, className = "" }: { amount: number | null; kind: string; className?: string }) => (
  <span className={`font-extrabold tracking-tight text-forest ${className}`}>
    {kind === "fixed" && amount ? `৳${num(amount)}` : kind === "negotiable" ? "Negotiable" : "No salary"}
  </span>
);
