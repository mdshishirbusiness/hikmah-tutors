// The admin's to-do list (owner, 2026-11-04): what to do next, most urgent first, with the counts as a small strip.
import { Link } from "react-router";
import { BadgeCheck, ChevronRight, FilePen, FileText, Inbox, ListChecks, PhoneCall, PhoneMissed } from "lucide-react";
import type { Route } from "./+types/admin.home";
import { PageHead, ago, num } from "~/components/admin";
import { dashboard, todayList } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Today · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [counts, list] = await Promise.all([dashboard(), todayList()]);
  return { counts, list };
}

type Task = { key: string; to: string; icon: typeof Inbox; tone: string; title: string; sub: string; late?: boolean };

const HOUR = 60 * 60;
const late = (sec: number, hours: number) => Date.now() / 1000 - sec > hours * HOUR;
const where = (cls: string, area: string) => [labelOf(CLASS_LEVELS, cls), labelOf(AREAS, area)].filter(Boolean).join(" · ");

function Row({ t }: { t: Task }) {
  return (
    <li>
      <Link to={t.to} className="flex min-h-16 items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 transition-[border-color,box-shadow] duration-150 hover:border-brand-200 hover:shadow-card">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.tone}`}><t.icon size={19} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold break-words text-forest">{t.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
            {t.sub}
            {t.late && <span className="rounded-full bg-rose-100 px-2 text-xs font-bold text-rose-900">Late</span>}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden />
      </Link>
    </li>
  );
}

function Section({ title, tasks }: { title: string; tasks: Task[] }) {
  if (!tasks.length) return null;
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">{title}<span className="rounded-full bg-brand-50 px-2 text-xs text-brand-700">{num(tasks.length)}</span></h2>
      <ul className="space-y-2">{tasks.map((t) => <Row key={t.key} t={t} />)}</ul>
    </section>
  );
}

export default function AdminHome({ loaderData: { counts: c, list } }: Route.ComponentProps) {
  const calls: Task[] = list.leads.filter((l) => l.status === "new").map((l) => ({
    key: `lead-${l.id}`, to: "/admin/leads", icon: PhoneCall, tone: "bg-mango text-forest",
    title: `${l.guardian_name || "New guardian"}: ${where(l.class_level, l.area)}`, sub: `New lead · ${ago(l.created_at)}`, late: late(l.created_at, 2),
  }));
  const toPost: Task[] = list.leads.filter((l) => l.status === "called").map((l) => ({
    key: `called-${l.id}`, to: "/admin/leads?status=called", icon: FilePen, tone: "bg-brand-50 text-brand-700",
    title: `${l.guardian_name || "Guardian"}: ${where(l.class_level, l.area)}`, sub: "Called, not posted yet",
  }));
  const applications: Task[] = list.applications.map((a) => ({
    key: `apps-${a.code}`, to: `/admin/tuitions/${a.code}`, icon: FileText, tone: "bg-forest text-mango",
    title: `HTR-${a.code}: ${a.waiting} new ${a.waiting === 1 ? "application" : "applications"}`, sub: `${where(a.class_level, a.area)} · first ${ago(a.oldest)}`, late: late(a.oldest, 6),
  }));
  const drafts: Task[] = list.drafts.map((d) => ({
    key: `draft-${d.code}`, to: `/admin/tuitions/${d.code}`, icon: FilePen, tone: "bg-slate-100 text-slate-700",
    title: `HTR-${d.code}: Draft`, sub: `${where(d.class_level, d.area) || "Details missing"} · not public yet`,
  }));
  const notCalled: Task[] = list.selected.filter((s) => late(s.selected_at, 3)).map((s) => ({
    key: `sel-${s.code}`, to: `/admin/tuitions/${s.code}#applicants`, icon: PhoneMissed, tone: "bg-rose-100 text-rose-900",
    title: `HTR-${s.code}: selected tutor hasn't called`, sub: `${s.tutor_code ? `T-${s.tutor_code} · ` : ""}selected ${ago(s.selected_at)}`, late: true,
  }));
  const confirmed: Task[] = list.tutorConfirmed.map((c) => ({
    key: `conf-${c.code}`, to: `/admin/tuitions/${c.code}#applicants`, icon: BadgeCheck, tone: "bg-brand-600 text-white",
    title: `HTR-${c.code}: tutor confirmed`, sub: `${c.tutor_code ? `T-${c.tutor_code} · ` : ""}${ago(c.confirmed_at)} · check with the guardian`,
  }));
  const review: Task[] = c.held > 0 ? [{ key: "review", to: "/admin/review", icon: ListChecks, tone: "bg-amber-100 text-amber-900", title: `To review: ${num(c.held)}`, sub: "Tutors, tuitions and rows from the sheet" }] : [];
  const nothing = !calls.length && !toPost.length && !applications.length && !drafts.length && !review.length && !notCalled.length && !confirmed.length;

  const strip = [
    { to: "/admin/leads", n: c.leads, label: "new leads" },
    { to: "/admin/applications?status=submitted&open=1", n: c.waiting, label: "new applications" },
    { to: "/admin/tuitions?status=available", n: c.open, label: "open" },
    { to: "/admin/tuitions?visibility=public", n: c.publicNow, label: "on board" },
  ];
  const today = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHead title="Today" sub={today} />
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {strip.map((s) => (
          <Link key={s.label} to={s.to} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-brand-100 bg-white px-4 text-sm font-semibold text-slate-600 hover:border-brand-200">
            <span className="text-base font-bold text-forest tabular-nums">{num(s.n)}</span>{s.label}
          </Link>
        ))}
      </div>
      <main className="space-y-6">
        {nothing && <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center text-slate-600">আজকের সব কাজ শেষ। নতুন কল এলে + চাপুন।</p>}
        <Section title="Call" tasks={calls} />
        <Section title="Selected tutors" tasks={[...notCalled, ...confirmed]} />
        <Section title="Check applications" tasks={applications} />
        <Section title="Post tuitions" tasks={[...toPost, ...drafts]} />
        <Section title="Review" tasks={review} />
      </main>
    </>
  );
}
