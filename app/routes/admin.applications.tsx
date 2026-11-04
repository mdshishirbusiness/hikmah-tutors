// Every application across tuitions, newest first, with step tabs. Each row opens the tuition's workspace with that
// applicant already picked.
import { Link } from "react-router";
import type { Route } from "./+types/admin.applications";
import { Avatar } from "~/components/Avatar";
import { APPLICATION_TONE, Badge, Empty, PageHead, Pager, StageTabs, ago, num } from "~/components/admin";
import { ADMIN_PAGE_SIZE, APPLICATION_STATUS } from "~/lib/admin-labels";
import { listApplications } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Applications · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const f = { status: sp.get("status") ?? "", open: sp.get("open") === "1", page: Number(sp.get("page")) || 1 };
  return { ...(await listApplications(f)), f };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical" };

export default function AdminApplications({ loaderData: { total, items, f } }: Route.ComponentProps) {
  const tabs = [{ key: "", label: "All" }, ...["submitted", "under_review", "shortlisted", "trial_arranged", "confirmed", "not_selected"].map((k) => ({ key: k, label: APPLICATION_STATUS[k] }))];
  return (
    <>
      <PageHead title="Applications" sub={`${num(total)}${f.open ? " on open tuitions" : ""}`}
        action={<Link to={f.open ? "?" : `?open=1${f.status ? `&status=${f.status}` : ""}`} className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold shadow-ring ${f.open ? "bg-forest text-cream" : "bg-white text-forest"}`}>Open tuitions only</Link>} />
      <div className="space-y-3">
        <StageTabs tabs={tabs} active={f.status} param="status" />
        {items.length === 0 ? <Empty>No applications.</Empty> : (
          <ul className="divide-y divide-brand-50 overflow-hidden rounded-2xl bg-white shadow-ring">
            {items.map((a) => (
              <li key={a.id}>
                <Link to={`/admin/tuitions/${a.tuition_code}?a=${a.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-50/50">
                  <Avatar code={a.tutor_code} name={a.name} hasPhoto={!!a.photo_key} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-forest">{a.name || "No name"}</span>
                    <span className="block truncate text-xs text-slate-500">{[a.tutor_code ? `T-${a.tutor_code}` : "No tutor match", a.university && UNI[a.university], a.department].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="hidden min-w-0 flex-1 sm:block">
                    <span className="block truncate text-sm font-semibold text-slate-800">HTR-{a.tuition_code} · {labelOf(CLASS_LEVELS, a.class_level)}</span>
                    <span className="block truncate text-xs text-slate-500">{labelOf(AREAS, a.area)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
                    <span className="text-xs text-slate-400">{ago(a.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pager total={total} pageSize={ADMIN_PAGE_SIZE} />
      </div>
    </>
  );
}
