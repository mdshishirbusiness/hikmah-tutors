// Every tuition, newest first. Laptop: a table with each tuition's applicant pipeline (new · review · shortlisted ·
// selected) so the busy ones stand out; phone: cards. Status tabs carry their counts.
import { Form, Link } from "react-router";
import { ClipboardList, Search } from "lucide-react";
import type { Route } from "./+types/admin.tuitions";
import { Badge, Empty, Money, PageHead, Pager, StageTabs, ago, num, TUITION_TONE } from "~/components/admin";
import { ADMIN_PAGE_SIZE, TUITION_STATUS } from "~/lib/admin-labels";
import { type AdminTuitionRow, listTuitions } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, SUBJECTS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tuitions · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const f = { q: sp.get("q")?.trim() ?? "", status: sp.get("status") ?? "", visibility: sp.get("visibility") ?? "", page: Number(sp.get("page")) || 1 };
  return { ...(await listTuitions(f)), f };
}

/** Four little counts in step colours; empty steps fade. */
function Pipeline({ t }: { t: AdminTuitionRow }) {
  const steps = [
    ["New", t.fresh ?? 0, "bg-mango text-forest"],
    ["Review", t.review ?? 0, "bg-amber-100 text-amber-900"],
    ["Short", t.short ?? 0, "bg-sky-100 text-sky-900"],
    ["Selected", t.selected ?? 0, "bg-teal-100 text-teal-900"],
  ] as const;
  return (
    <span className="flex items-center gap-1">
      {steps.map(([label, n, tone]) => (
        <span key={label} title={`${label}: ${n}`} className={`min-w-7 rounded-md px-1.5 py-0.5 text-center text-xs font-bold tabular-nums ${n ? tone : "bg-slate-50 text-slate-300"}`}>{n}</span>
      ))}
    </span>
  );
}

const subjectsOf = (t: AdminTuitionRow) => t.subjects.split(",").filter(Boolean).map((s) => labelOf(SUBJECTS, s)).join(", ") || "No subjects";

export default function AdminTuitions({ loaderData: { total, items, f, statuses } }: Route.ComponentProps) {
  const all = Object.values(statuses).reduce((a, b) => a + b, 0);
  const tabs = [
    { key: "", label: "All", n: all },
    ...["available", "processing", "draft", "booked", "closed", "cancelled"].map((k) => ({ key: k, label: TUITION_STATUS[k], n: statuses[k] ?? 0 })),
  ];
  return (
    <>
      <PageHead
        title="Tuitions"
        sub={`${num(total)} ${f.status ? TUITION_STATUS[f.status]?.toLowerCase() : "in all"}`}
        action={<Link to="/admin/tuitions/new" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-bold text-cream hover:bg-brand-700"><ClipboardList size={16} aria-hidden />New tuition</Link>}
      />
      <div className="space-y-3">
        <Form method="get" className="flex gap-2">
          {f.status && <input type="hidden" name="status" value={f.status} />}
          <label className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input name="q" defaultValue={f.q} aria-label="Search" placeholder="Code, area or guardian's number" className="min-h-12 w-full rounded-xl bg-white pr-3 pl-10 text-base shadow-ring outline-none focus:ring-2 focus:ring-brand-200" />
          </label>
          <select name="visibility" defaultValue={f.visibility} aria-label="Visibility" className="hidden min-h-12 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring sm:block">
            <option value="">Board and hidden</option>
            <option value="public">On the board</option>
            <option value="hidden">Hidden</option>
          </select>
          <button className="min-h-12 rounded-xl bg-forest px-5 text-sm font-bold text-cream">Search</button>
        </Form>
        <StageTabs tabs={tabs} active={f.status} param="status" />

        {items.length === 0 ? <Empty>No tuitions found.</Empty> : (
          <>
            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-ring lg:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 text-left text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Code</th><th className="px-2">Class · area</th><th className="px-2">Salary</th><th className="px-2">Subjects</th>
                    <th className="px-2" title="New · In review · Shortlisted · Selected">Applicants</th><th className="px-2">Posted</th><th className="px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {items.map((t) => (
                    <tr key={t.code} className="group relative transition-colors hover:bg-brand-50/50">
                      <td className="px-4 py-3 font-bold text-forest"><Link to={`/admin/tuitions/${t.code}`} className="after:absolute after:inset-0">HTR-{t.code}</Link></td>
                      <td className="px-2 py-3">
                        <span className="block font-semibold text-slate-900">{labelOf(CLASS_LEVELS, t.class_level)} · {labelOf(AREAS, t.area) || "No area"}</span>
                        {t.guardian && <span className="block text-xs text-slate-500">{t.guardian}</span>}
                      </td>
                      <td className="px-2 py-3"><Money amount={t.salary_amount} kind={t.salary_kind} className="text-base" /></td>
                      <td className="max-w-56 truncate px-2 py-3 text-slate-600">{subjectsOf(t)}</td>
                      <td className="px-2 py-3"><span className="flex items-center gap-2"><Pipeline t={t} /><span className="text-xs text-slate-400 tabular-nums">{num(t.applications)}</span></span></td>
                      <td className="px-2 py-3 text-xs whitespace-nowrap text-slate-500">{t.posted_at ? ago(t.posted_at) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1">
                          <Badge tone={TUITION_TONE[t.status]}>{TUITION_STATUS[t.status]}</Badge>
                          {t.is_public === 1 && <Badge tone="mango">{t.accepting_applications ? "Board" : "Paused"}</Badge>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2.5 lg:hidden">
              {items.map((t) => (
                <li key={t.code}>
                  <Link to={`/admin/tuitions/${t.code}`} className="block rounded-2xl bg-white p-4 shadow-ring transition-shadow hover:shadow-lift">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-500">HTR-{t.code}</span>
                      <span className="flex gap-1">
                        {t.is_public === 1 && <Badge tone="mango">{t.accepting_applications ? "Board" : "Paused"}</Badge>}
                        <Badge tone={TUITION_TONE[t.status]}>{TUITION_STATUS[t.status]}</Badge>
                      </span>
                    </div>
                    <p className="mt-1 flex items-baseline gap-2"><Money amount={t.salary_amount} kind={t.salary_kind} className="text-2xl" /><span className="truncate font-semibold text-forest">{labelOf(AREAS, t.area)}</span></p>
                    <p className="mt-0.5 truncate text-sm text-slate-600">{labelOf(CLASS_LEVELS, t.class_level)} · {subjectsOf(t)}</p>
                    <div className="mt-2.5 flex items-center justify-between gap-2"><Pipeline t={t} /><span className="text-xs text-slate-400">{t.posted_at ? ago(t.posted_at) : "not posted"}</span></div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pager total={total} pageSize={ADMIN_PAGE_SIZE} />
      </div>
    </>
  );
}
