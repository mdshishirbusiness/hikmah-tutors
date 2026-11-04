// Placements (owner, 2026-11-04: track tutors after the match). Three things: selected tutors and how far they have
// got (Called → Met → Demo done), the check-in calls to guardians on day 7 and day 30 after Confirmed, and the
// tuitions confirmed recently.
import { Form, Link, useNavigation } from "react-router";
import { Check, MessageCircle, Phone, PhoneCall } from "lucide-react";
import type { Route } from "./+types/admin.placements";
import { Avatar } from "~/components/Avatar";
import { PageHead, ago, num, when } from "~/components/admin";
import { StatTile } from "~/components/charts";
import { type Placed, checkIn, placementsBoard } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { waLink } from "~/lib/contact";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";
import { taka } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Placements · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { ...(await placementsBoard()), now: Math.floor(Date.now() / 1000) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  return { error: await checkIn(Number(form.get("id")), String(form.get("day")), form.get("paid") === "1", String(form.get("note") ?? ""), viewer?.id ?? null) };
}

const where = (c: string, a: string) => `${labelOf(CLASS_LEVELS, c)} · ${labelOf(AREAS, a)}`;
const H = 3600;

function Steps({ at }: { at: (number | null)[] }) {
  return (
    <ol className="flex items-center gap-1" aria-label="Progress">
      {["Called", "Met", "Demo"].map((label, i) => (
        <li key={label} title={at[i] ? `${label} ${ago(at[i])}` : `${label}: not yet`} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${at[i] ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-400"}`}>
          {at[i] ? <Check size={12} strokeWidth={3} aria-hidden /> : null}{label}
        </li>
      ))}
    </ol>
  );
}

function CheckInRow({ p, day, busy }: { p: Placed; day: 7 | 30; busy: boolean }) {
  return (
    <li className="rounded-2xl bg-white p-4 shadow-ring">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mango text-sm font-extrabold text-forest">D{day}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-forest"><Link to={`/admin/tuitions/${p.tuition_code}`} className="hover:underline">HTR-{p.tuition_code}</Link> · {p.guardian || "Guardian"}</p>
          <p className="text-sm text-slate-600">{where(p.class_level, p.area)} · tutor {p.name ?? "—"} · confirmed {when(p.confirmed_at)}</p>
        </div>
        {p.guardian_phone && <a href={`tel:${p.guardian_phone}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-3 text-sm font-bold text-cream"><Phone size={16} aria-hidden />Call guardian</a>}
      </div>
      <Form method="post" className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-50 pt-3">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="day" value={day} />
        <input name="note" maxLength={500} placeholder={day === 7 ? "How is it going? (optional note)" : "Anything to note (optional)"} aria-label="Note" className="min-h-11 min-w-0 flex-1 rounded-xl bg-cream px-3 text-sm outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
        {day === 30 && <button name="paid" value="1" disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white disabled:opacity-60"><Check size={16} aria-hidden />Called · salary paid</button>}
        <button disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring disabled:opacity-60">{day === 7 ? "Called · all fine" : "Called · not paid yet"}</button>
      </Form>
    </li>
  );
}

export default function Placements({ loaderData: { inProgress, placed, due7, due30, now }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const month = placed.filter((p) => now - p.confirmed_at < 30 * 86400);
  const notCalled = inProgress.filter((a) => !a.called_at && a.selected_at && now - a.selected_at > 3 * H);
  return (
    <>
      <PageHead title="Placements" sub="Selected tutors, check-in calls and confirmed tuitions." />
      {actionData?.error && <p role="alert" className="mb-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Selected, in progress" value={num(inProgress.length)} note={notCalled.length ? `${notCalled.length} haven't called after 3 h` : "All have called"} />
        <StatTile label="Check-ins due" value={num(due7.length + due30.length)} note={`${due7.length} on day 7 · ${due30.length} on day 30`} />
        <StatTile label="Confirmed, 30 days" value={num(month.length)} note={month.length ? `${taka(Math.round(month.reduce((s, p) => s + (p.agreed_salary ?? p.salary_amount ?? 0), 0) / month.length))} average salary` : undefined} />
        <StatTile label="First salary reported" value={num(placed.filter((p) => p.first_salary_at).length)} note="of the last 75 days" />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">Selected tutors<span className="rounded-full bg-white px-2 text-xs text-brand-700 shadow-ring">{num(inProgress.length)}</span></h2>
          {inProgress.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-ring">Nobody selected right now.</p> : (
            <ul className="space-y-2">
              {inProgress.map((a) => {
                const late = !a.called_at && a.selected_at !== null && now - a.selected_at > 3 * H;
                return (
                  <li key={a.application_id} className={`rounded-2xl bg-white p-4 shadow-ring ${late ? "ring-2 ring-rose-200" : ""}`}>
                    <div className="flex items-center gap-3">
                      <Avatar code={a.tutor_code} name={a.name} hasPhoto={!!a.photo_key} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-forest">{a.name ?? "Applicant"}</p>
                        <p className="truncate text-sm text-slate-600"><Link to={`/admin/tuitions/${a.tuition_code}?stage=selected&a=${a.application_id}`} className="font-semibold text-brand-700 hover:underline">HTR-{a.tuition_code}</Link> · {where(a.class_level, a.area)}</p>
                      </div>
                      <span className="text-right text-xs text-slate-500">selected<br />{a.selected_at ? ago(a.selected_at) : "—"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <Steps at={[a.called_at, a.met_at, a.demo_done_at]} />
                      <span className="flex gap-1.5">
                        {late && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-900">Hasn't called</span>}
                        {a.phone && <a href={waLink(a.phone, "")} target="_blank" rel="noreferrer" aria-label="WhatsApp the tutor" className="wa-btn grid size-10 place-items-center rounded-xl bg-white text-forest shadow-ring"><MessageCircle size={16} aria-hidden /></a>}
                        {a.phone && <a href={`tel:${a.phone}`} aria-label="Call the tutor" className="grid size-10 place-items-center rounded-xl bg-white text-forest shadow-ring"><PhoneCall size={16} aria-hidden /></a>}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-500">Check-in calls due<span className="rounded-full bg-white px-2 text-xs text-brand-700 shadow-ring">{num(due7.length + due30.length)}</span></h2>
            {due7.length + due30.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-ring">No calls due. Day 7 and day 30 calls appear here.</p> : (
              <ul className="space-y-2">
                {due30.map((p) => <CheckInRow key={`30-${p.id}`} p={p} day={30} busy={busy} />)}
                {due7.map((p) => <CheckInRow key={`7-${p.id}`} p={p} day={7} busy={busy} />)}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-bold text-slate-500">Confirmed recently</h2>
            <ul className="overflow-hidden rounded-2xl bg-white shadow-ring">
              {placed.slice(0, 15).map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-brand-50 px-4 py-2.5 last:border-0">
                  <Avatar code={p.tutor_code} name={p.name} hasPhoto={!!p.photo_key} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{p.name ?? "—"}</span>
                    <Link to={`/admin/tuitions/${p.tuition_code}`} className="block truncate text-xs text-slate-500 hover:underline">HTR-{p.tuition_code} · {where(p.class_level, p.area)}</Link>
                  </span>
                  <span className="text-right text-xs text-slate-500">{taka(p.agreed_salary ?? p.salary_amount ?? 0)}<br />{ago(p.confirmed_at)}</span>
                  <span className="flex gap-1">
                    <span title="Day 7 call" className={`rounded px-1 text-[10px] font-bold ${p.checkin7_at ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-400"}`}>D7</span>
                    <span title="Day 30 call" className={`rounded px-1 text-[10px] font-bold ${p.checkin30_at ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-400"}`}>D30</span>
                  </span>
                </li>
              ))}
              {placed.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nothing confirmed in the last 75 days.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
