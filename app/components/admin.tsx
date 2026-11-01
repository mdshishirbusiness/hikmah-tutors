// Shared pieces of the admin screens. Phone first: cards, big tap targets, a bottom bar.
import { Link, NavLink, useSearchParams } from "react-router";

export const bn = (n: number) => n.toLocaleString("bn-BD");

export function when(sec: number | null) {
  if (!sec) return "";
  return new Date(sec * 1000).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" });
}

/** Sheet data can hold anything, so only web links become clickable. */
export const safeUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

const TABS = [
  { to: "/admin", label: "হোম", end: true },
  { to: "/admin/tuitions", label: "টিউশন" },
  { to: "/admin/tutors", label: "টিউটর" },
  { to: "/admin/guardians", label: "গার্ডিয়ান" },
  { to: "/admin/applications", label: "আবেদন" },
];

export function AdminNav() {
  return (
    <nav aria-label="অ্যাডমিন" className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-100 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) => `flex min-h-14 items-center justify-center px-1 text-sm font-semibold transition-colors duration-150 ${isActive ? "bg-forest text-cream" : "text-forest hover:bg-brand-50"}`}
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHead({ title, back, action }: { title: string; back?: { to: string; label: string }; action?: React.ReactNode }) {
  return (
    <header className="bg-forest text-cream">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          {back && <Link to={back.to} className="inline-flex min-h-11 items-center text-sm text-brand-200 hover:text-mango">← {back.label}</Link>}
          <h1 className="text-xl leading-snug font-semibold break-words">{title}</h1>
        </div>
        {action}
      </div>
    </header>
  );
}

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-brand-100 bg-white p-4 ${className}`}>{children}</section>
);

const TONES = {
  green: "bg-brand-50 text-brand-700",
  mango: "bg-mango text-forest",
  grey: "bg-slate-100 text-slate-700",
  red: "bg-rose-100 text-rose-900",
  dark: "bg-forest text-cream",
};
export const Badge = ({ tone = "grey", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
);

export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  return (
    <dl>
      {shown.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-brand-50 py-2 last:border-0">
          <dt className="shrink-0 text-sm text-slate-600">{label}</dt>
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
      <a href={`tel:${phone}`} className="inline-flex min-h-11 items-center rounded-xl border border-brand-100 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">কল {phone}</a>
      <a href={`https://wa.me/88${phone}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-brand-100 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">WhatsApp</a>
    </div>
  );
}

export const inputClass = "min-h-11 w-full rounded-xl border border-brand-100 bg-white px-3 text-base text-slate-900 outline-none focus:border-brand-500";
export const primaryButton = "min-h-12 rounded-xl bg-forest px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60";

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
  const link = "inline-flex min-h-11 items-center rounded-xl border border-brand-100 bg-white px-4 text-sm font-semibold text-forest";
  return (
    <nav aria-label="পাতা" className="flex items-center justify-between gap-2 pt-2">
      {page > 1 ? <Link to={href(page - 1)} className={link}>← আগের</Link> : <span />}
      <span className="text-sm text-slate-600">{bn(page)} / {bn(pages)}</span>
      {page < pages ? <Link to={href(page + 1)} className={link}>পরের →</Link> : <span />}
    </nav>
  );
}

export const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl border border-brand-100 bg-white px-5 py-10 text-center font-semibold text-forest">{children}</p>
);
