// Insights: the longer view behind Today (26 weeks of flow, what guardians ask for, what it pays, where leads come
// from, and the tutor supply). Every chart has a table view or labelled values.
import type { Route } from "./+types/admin.insights";
import { PageHead, num } from "~/components/admin";
import { BarList, CHART, ColumnChart, StatTile } from "~/components/charts";
import { insights } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, LEAD_SOURCES, labelOf } from "~/lib/options";
import { taka } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Insights · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { d: await insights(), now: Math.floor(Date.now() / 1000) };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <section className={`min-w-0 rounded-2xl bg-white p-5 shadow-ring ${className}`}>{children}</section>;

export default function Insights({ loaderData: { d, now } }: Route.ComponentProps) {
  const label = (i: number) => new Date((now - (d.weeks - i) * 7 * 86400 + 86400) * 1000).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
  const weeks = d.posted.map((n, i) => ({ label: label(i), full: `Week from ${label(i)}`, posted: n, booked: d.booked[i], applications: d.applications[i], tutors: d.tutors[i] }));
  const last13 = (xs: number[]) => sum(xs.slice(-13));
  const prev13 = (xs: number[]) => sum(xs.slice(-26, -13));
  const rate = last13(d.posted) ? Math.round((100 * last13(d.booked)) / last13(d.posted)) : 0;
  const totalTutors = sum(d.universities.map((u) => u.n));
  return (
    <>
      <PageHead title="Insights" sub="Last 26 weeks. Week = 7 days back from today." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Posted, last 13 weeks" value={num(last13(d.posted))} delta={last13(d.posted) - prev13(d.posted)} deltaLabel="vs the 13 before" trend={d.posted.slice(-12)} />
        <StatTile label="Booked, last 13 weeks" value={num(last13(d.booked))} delta={last13(d.booked) - prev13(d.booked)} deltaLabel="vs the 13 before" trend={d.booked.slice(-12)} />
        <StatTile label="Booked of posted" value={`${rate}%`} note="last 13 weeks" />
        <StatTile label="Tutors active, 30 days" value={num(d.active)} note={`of ${num(totalTutors)} registered`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel className="lg:col-span-2">
          <ColumnChart title="Tuitions posted and booked, by week" height={220} data={weeks} series={[{ key: "posted", label: "Posted", color: CHART.one }, { key: "booked", label: "Booked", color: CHART.two }]} />
        </Panel>
        <Panel><ColumnChart title="Applications, by week" data={weeks} series={[{ key: "applications", label: "Applications", color: CHART.one }]} /></Panel>
        <Panel><ColumnChart title="New tutors, by week" data={weeks} series={[{ key: "tutors", label: "New tutors", color: CHART.one }]} /></Panel>
        <Panel><BarList title="Classes asked for, last 90 days" items={d.classes.map((c) => ({ label: labelOf(CLASS_LEVELS, c.class_level) || "Other", value: c.n }))} total={sum(d.classes.map((c) => c.n))} /></Panel>
        <Panel><BarList title="Areas, last 30 days" items={d.areas.map((a) => ({ label: labelOf(AREAS, a.area) || "Unknown", value: a.n, note: `${a.booked} booked` }))} /></Panel>
        <Panel><BarList title="Average salary by level, 90 days" items={d.salary.map((s) => ({ label: s.band, value: s.avg, note: `${s.n} tuitions` }))} empty="No fixed salaries yet." /><p className="mt-3 text-xs text-slate-500">In taka per month: {d.salary.map((s) => `${s.band} ${taka(s.avg)}`).join(" · ")}</p></Panel>
        <Panel><BarList title="Where guardians came from, 90 days" items={d.sources.map((s) => ({ label: labelOf(LEAD_SOURCES, s.lead_source) || "Not recorded", value: s.n }))} total={sum(d.sources.map((s) => s.n))} /></Panel>
        <Panel className="lg:col-span-2"><BarList title="Tutors by university (signed in on the site)" items={d.universities.map((u) => ({ label: UNI[u.university ?? ""] ?? "Not known", value: u.n, note: `${u.setup} signed in` }))} /></Panel>
      </div>
    </>
  );
}
