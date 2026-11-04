// Every tutor (owner, 2026-11-04: "tracking tutors"). Quick filters for who is active, set up, placed, paused or
// flagged; university, gender, subject, level and area below. Laptop: a table with photos; phone: rows.
import { Form, Link, useNavigation } from "react-router";
import { Flag, Megaphone, Search } from "lucide-react";
import type { Route } from "./+types/admin.tutors";
import { Avatar } from "~/components/Avatar";
import { Badge, Empty, PageHead, Pager, StageTabs, ago, num } from "~/components/admin";
import { ADMIN_PAGE_SIZE } from "~/lib/admin-labels";
import { type AdminTutorRow, currentNotice, endNotice, listTutors, setNotice } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, BANDS, SUBJECTS } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tutors · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const f = {
    q: sp.get("q")?.trim() ?? "", gender: sp.get("gender") ?? "", subject: sp.get("subject") ?? "", band: sp.get("band") ?? "", page: Number(sp.get("page")) || 1,
    university: sp.get("university") ?? "", state: sp.get("state") ?? "", area: sp.get("area") ?? "", sort: sp.get("sort") ?? "",
  };
  const [list, notice] = await Promise.all([listTutors(f), currentNotice()]);
  return { ...list, f, notice };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  if (form.get("intent") === "end") {
    await endNotice(viewer?.id ?? null);
    return { error: null };
  }
  return { error: await setNotice(String(form.get("body") ?? ""), Number(form.get("days")), viewer?.id ?? null) };
}

function NoticeCard({ notice, error }: { notice: { body: string; ends_at: number } | null; error?: string | null }) {
  const busy = useNavigation().state === "submitting";
  return (
    <details className="group rounded-2xl bg-white shadow-ring" open={!!error}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
        <Megaphone size={18} className="shrink-0 text-brand-600" aria-hidden />
        <span className="min-w-0 flex-1 text-sm">
          <b className="text-forest">Notice to tutors</b>
          <span className="block truncate text-slate-500">{notice ? `Showing: “${notice.body}” until ${new Date(notice.ends_at * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "None showing. Tap to write one for every tutor's Home."}</span>
        </span>
      </summary>
      <Form method="post" className="space-y-2 border-t border-brand-50 p-4">
        {error && <p role="alert" className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">{error}</p>}
        <textarea name="body" rows={2} maxLength={300} defaultValue={notice?.body ?? ""} placeholder="e.g. Eid break: tuitions resume on 15 June." className="w-full rounded-xl bg-cream px-3 py-2 text-base outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">Show for <select name="days" defaultValue="7" className="min-h-10 rounded-lg bg-white px-2 font-semibold shadow-ring">{[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>)}</select></label>
          <button disabled={busy} className="min-h-11 rounded-xl bg-forest px-4 text-sm font-bold text-cream disabled:opacity-60">{notice ? "Replace notice" : "Show notice"}</button>
          {notice && <button name="intent" value="end" disabled={busy} className="min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring">End now</button>}
        </div>
      </Form>
    </details>
  );
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
const select = "min-h-11 shrink-0 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring";

function Marks({ t }: { t: AdminTutorRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      {t.flag_reason && <span title={t.flag_reason} className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-900"><Flag size={11} aria-hidden />Flag</span>}
      {t.availability_paused ? <Badge tone="amber">Paused</Badge> : null}
      {t.review_status === "waiting" ? <Badge tone="amber">New · check</Badge> : t.review_status === "needs_fix" ? <Badge tone="grey">Asked to fix</Badge> : t.setup_done_at ? <Badge tone="green">On site</Badge> : null}
      {t.priority === "urgent" && <Badge tone="dark">Urgent</Badge>}
    </span>
  );
}

export default function AdminTutors({ loaderData: { total, items, f, notice }, actionData }: Route.ComponentProps) {
  const tabs = [
    { key: "", label: "All" }, { key: "new", label: "New" }, { key: "active", label: "Applied in 30 days" }, { key: "setup", label: "Signed in" },
    { key: "placed", label: "Placed" }, { key: "paused", label: "Paused" }, { key: "flagged", label: "Flagged" },
  ];
  return (
    <>
      <PageHead title="Tutors" sub={`${num(total)} tutors${f.state ? " in this list" : ""}`} />
      <div className="space-y-3">
        <NoticeCard notice={notice} error={actionData?.error} />
        <Form method="get" className="space-y-2">
          {f.state && <input type="hidden" name="state" value={f.state} />}
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input name="q" defaultValue={f.q} aria-label="Search" placeholder="Name, phone, email, code, department" className="min-h-12 w-full rounded-xl bg-white pr-3 pl-10 text-base shadow-ring outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
            <button className="min-h-12 rounded-xl bg-forest px-5 text-sm font-bold text-cream">Search</button>
          </div>
          <div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <select name="university" defaultValue={f.university} aria-label="University" className={select}>
                <option value="">Any university</option>
                {Object.entries(UNI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select name="gender" defaultValue={f.gender} aria-label="Gender" className={select}>
                <option value="">Male and female</option><option value="male">Male</option><option value="female">Female</option>
              </select>
              <select name="subject" defaultValue={f.subject} aria-label="Subject" className={select}>
                <option value="">Any subject</option>
                {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select name="band" defaultValue={f.band} aria-label="Level" className={select}>
                <option value="">Any level</option>
                {BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
              <select name="area" defaultValue={f.area} aria-label="Area" className={select}>
                <option value="">Any area</option>
                {AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
              <select name="sort" defaultValue={f.sort} aria-label="Sort" className={select}>
                <option value="">Newest code</option><option value="active">Last applied</option><option value="placed">Most placed</option>
              </select>
              <button className="min-h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring hover:bg-brand-50">Apply</button>
            </div>
          </div>
        </Form>
        <StageTabs tabs={tabs} active={f.state} param="state" />

        {items.length === 0 ? <Empty>No tutors found.</Empty> : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-ring">
            <div aria-hidden className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_6rem_6rem_7rem_minmax(0,1fr)] gap-3 border-b border-brand-50 bg-slate-50/70 px-4 py-2.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase lg:grid">
              <span>Tutor</span><span>Study</span><span>Applied</span><span>Placed</span><span>Last applied</span><span>Marks</span>
            </div>
            <ul className="divide-y divide-brand-50">
              {items.map((t) => (
                <li key={t.id}>
                  <Link to={`/admin/tutors/${t.code}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-50/50 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_6rem_6rem_7rem_minmax(0,1fr)]">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar code={t.code} name={t.full_name} hasPhoto={!!t.photo_key} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-forest">{t.full_name}</span>
                        <span className="block truncate text-xs text-slate-500">T-{t.code} · {t.gender === "female" ? "Female" : t.gender === "male" ? "Male" : "—"}{t.current_location ? ` · ${t.current_location}` : ""}</span>
                        <span className="block truncate text-xs text-slate-500 lg:hidden">{[t.university ? UNI[t.university] : t.institution, t.department].filter(Boolean).join(" · ")}</span>
                      </span>
                    </span>
                    <span className="hidden min-w-0 lg:block">
                      <span className="block truncate text-sm font-semibold text-slate-800">{t.university && t.university !== "other" ? UNI[t.university] : t.institution}</span>
                      <span className="block truncate text-xs text-slate-500">{[t.department, t.session_year].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="hidden text-sm font-semibold text-slate-800 tabular-nums lg:block">{num(t.applications)}</span>
                    <span className="hidden text-sm font-semibold tabular-nums lg:block">{t.placements ? <span className="text-brand-700">{num(t.placements)}</span> : <span className="text-slate-300">0</span>}</span>
                    <span className="hidden text-xs text-slate-500 lg:block">{t.last_applied ? ago(t.last_applied) : "—"}</span>
                    <span className="flex flex-col items-end gap-1 lg:items-start">
                      <Marks t={t} />
                      <span className="text-xs text-slate-500 tabular-nums lg:hidden">{num(t.applications)} applied · {num(t.placements)} placed</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Pager total={total} pageSize={ADMIN_PAGE_SIZE} />
      </div>
    </>
  );
}
