// The admin's Today (owner, 2026-11-04): what to do next, most urgent first, beside the week's pulse — four numbers
// with their trend, posted against booked by week, the funnel and where demand is. Phone: numbers, then the to-do
// list, then the charts.
import { Link } from "react-router";
import { BadgeCheck, ChevronRight, ClipboardList, FilePen, FileText, Inbox, ListChecks, PhoneCall, PhoneMissed, Plus } from "lucide-react";
import type { Route } from "./+types/admin.home";
import { PageHead, ago, num } from "~/components/admin";
import { BarList, CHART, ColumnChart, StatTile } from "~/components/charts";
import { pulse, todayList, dashboard } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Today · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [counts, list, p] = await Promise.all([dashboard(), todayList(), pulse(12)]);
  return { counts, list, p, now: Math.floor(Date.now() / 1000) };
}

type Task = { key: string; to: string; icon: typeof Inbox; tone: string; title: string; sub: string; late?: boolean };

const HOUR = 60 * 60;
const late = (sec: number, hours: number) => Date.now() / 1000 - sec > hours * HOUR;
const where = (cls: string, area: string) => [labelOf(CLASS_LEVELS, cls), labelOf(AREAS, area)].filter(Boolean).join(" · ");

function Row({ t }: { t: Task }) {
  return (
    <li>
      <Link to={t.to} className="group flex min-h-16 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-ring transition-shadow duration-150 hover:shadow-lift">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.tone}`}><t.icon size={19} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold break-words text-forest">{t.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
            {t.sub}
            {t.late && <span className="rounded-full bg-rose-100 px-2 text-xs font-bold text-rose-900">Late</span>}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden />
      </Link>
    </li>
  );
}

function Section({ title, tasks, more }: { title: string; tasks: Task[]; more?: { to: string; label: string } }) {
  if (!tasks.length) return null;
  const shown = tasks.slice(0, 6);
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">
        {title}<span className="rounded-full bg-white px-2 text-xs text-brand-700 shadow-ring tabular-nums">{num(tasks.length)}</span>
        {tasks.length > shown.length && more && <Link to={more.to} className="ml-auto text-xs font-semibold text-brand-700 hover:underline">{more.label} →</Link>}
      </h2>
      <ul className="space-y-2">{shown.map((t) => <Row key={t.key} t={t} />)}</ul>
    </section>
  );
}

const thisWeek = (xs: number[]) => xs.at(-1) ?? 0;
const delta = (xs: number[]) => (xs.at(-1) ?? 0) - (xs.at(-2) ?? 0);

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function AdminHome({ loaderData: { counts: c, list, p, now } }: Route.ComponentProps) {
  const calls: Task[] = list.leads.filter((l) => l.status === "new").map((l) => ({
    key: `lead-${l.id}`, to: "/admin/leads", icon: PhoneCall, tone: "bg-mango text-forest",
    title: `${l.guardian_name || "New guardian"}: ${where(l.class_level, l.area)}`, sub: `New lead · ${ago(l.created_at)}`, late: late(l.created_at, 2),
  }));
  const toPost: Task[] = list.leads.filter((l) => l.status === "called").map((l) => ({
    key: `called-${l.id}`, to: "/admin/leads?status=called", icon: FilePen, tone: "bg-brand-50 text-brand-700",
    title: `${l.guardian_name || "Guardian"}: ${where(l.class_level, l.area)}`, sub: "Called, not posted yet",
  }));
  const applications: Task[] = list.applications.map((a) => ({
    key: `apps-${a.code}`, to: `/admin/tuitions/${a.code}?stage=new`, icon: FileText, tone: "bg-forest text-mango",
    title: `HTR-${a.code}: ${a.waiting} new ${a.waiting === 1 ? "application" : "applications"}`, sub: `${where(a.class_level, a.area)} · first ${ago(a.oldest)}`, late: late(a.oldest, 6),
  }));
  const drafts: Task[] = list.drafts.map((d) => ({
    key: `draft-${d.code}`, to: `/admin/tuitions/${d.code}`, icon: FilePen, tone: "bg-slate-100 text-slate-700",
    title: `HTR-${d.code}: Draft`, sub: `${where(d.class_level, d.area) || "Details missing"} · not public yet`,
  }));
  const notCalled: Task[] = list.selected.filter((s) => late(s.selected_at, 3)).map((s) => ({
    key: `sel-${s.code}`, to: `/admin/tuitions/${s.code}?stage=selected`, icon: PhoneMissed, tone: "bg-rose-100 text-rose-900",
    title: `HTR-${s.code}: selected tutor hasn't called`, sub: `${s.tutor_code ? `T-${s.tutor_code} · ` : ""}selected ${ago(s.selected_at)}`, late: true,
  }));
  const confirmed: Task[] = list.tutorConfirmed.map((x) => ({
    key: `conf-${x.code}`, to: `/admin/tuitions/${x.code}?stage=selected`, icon: BadgeCheck, tone: "bg-brand-600 text-white",
    title: `HTR-${x.code}: tutor confirmed`, sub: `${x.tutor_code ? `T-${x.tutor_code} · ` : ""}${ago(x.confirmed_at)} · check with the guardian`,
  }));
  const checkins: Task[] = list.checkins.map((x) => ({
    key: `chk-${x.id}-${x.day}`, to: "/admin/placements", icon: PhoneCall, tone: "bg-sky-100 text-sky-900",
    title: `HTR-${x.code}: day ${x.day} check-in call`, sub: `${where(x.class_level, x.area)} · confirmed ${ago(x.confirmed_at)}`,
  }));
  const review: Task[] = c.held > 0 ? [{ key: "review", to: "/admin/review", icon: ListChecks, tone: "bg-amber-100 text-amber-900", title: `To review: ${num(c.held)}`, sub: "Tutors, tuitions and rows from the sheet" }] : [];
  const nothing = !calls.length && !toPost.length && !applications.length && !drafts.length && !review.length && !notCalled.length && !confirmed.length && !checkins.length;

  const date = new Date(now * 1000).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", weekday: "long", day: "numeric", month: "long" });
  const weekLabel = (i: number) => new Date((now - (p.weeks - i) * 7 * 86400 + 86400) * 1000).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
  const flow = p.posted.map((n, i) => ({ label: weekLabel(i), full: `Week from ${weekLabel(i)}`, posted: n, booked: p.booked[i] }));
  const f = p.funnel ?? { posted: 0, applied: 0, shortlisted: 0, selected: 0, booked: 0 };

  return (
    <>
      <PageHead
        eyebrow={date}
        title={greeting()}
        sub="আজকের কাজ উপরে, সপ্তাহের হিসাব পাশে।"
        action={
          <>
            <Link to="/admin/quick" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring hover:bg-brand-50"><Plus size={16} aria-hidden />Lead</Link>
            <Link to="/admin/tuitions/new" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-bold text-cream hover:bg-brand-700"><ClipboardList size={16} aria-hidden />New tuition</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="New leads this week" value={num(thisWeek(p.leads))} delta={delta(p.leads)} deltaLabel="vs last week" trend={p.leads} to="/admin/leads" />
        <StatTile label="Applications this week" value={num(thisWeek(p.applications))} delta={delta(p.applications)} deltaLabel="vs last week" trend={p.applications} to="/admin/applications" />
        <StatTile label="Booked this week" value={num(thisWeek(p.booked))} delta={delta(p.booked)} deltaLabel="vs last week" trend={p.booked} to="/admin/placements" />
        <StatTile label="Open on the board" value={num(p.open)} note={p.bookHours !== null ? `Typical time to book: ${p.bookHours < 48 ? `${p.bookHours} h` : `${Math.round(p.bookHours / 24)} days`}` : undefined} to="/admin/tuitions?status=available" />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <main className="space-y-6">
          {nothing && <p className="rounded-2xl border border-dashed border-brand-200 bg-white/60 p-8 text-center text-slate-600">আজকের সব কাজ শেষ। নতুন কল এলে + চাপুন।</p>}
          <Section title="Call" tasks={calls} more={{ to: "/admin/leads", label: "All leads" }} />
          <Section title="Selected tutors" tasks={[...confirmed, ...notCalled]} more={{ to: "/admin/placements", label: "Placements" }} />
          <Section title="Check-in calls" tasks={checkins} more={{ to: "/admin/placements", label: "Placements" }} />
          <Section title="Check applications" tasks={applications} more={{ to: "/admin/applications?status=submitted&open=1", label: "All new" }} />
          <Section title="Post tuitions" tasks={[...toPost, ...drafts]} more={{ to: "/admin/leads?status=called", label: "Called leads" }} />
          <Section title="Review" tasks={review} />
        </main>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <ColumnChart title="Posted and booked, by week" data={flow} series={[{ key: "posted", label: "Posted", color: CHART.one }, { key: "booked", label: "Booked", color: CHART.two }]} />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <BarList
              title="Last 30 days: from posted to booked"
              total={f.posted}
              items={[
                { label: "Posted", value: f.posted, note: "100%" },
                { label: "Got applicants", value: f.applied },
                { label: "Shortlisted", value: f.shortlisted },
                { label: "Tutor selected", value: f.selected },
                { label: "Booked", value: f.booked },
              ]}
            />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <BarList title="Most asked areas, last 30 days" items={p.areas.map((a) => ({ label: labelOf(AREAS, a.area) || "Unknown", value: a.n, note: `${a.booked} booked` }))} />
            <Link to="/admin/insights" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-brand-700 hover:underline">More in Insights →</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
