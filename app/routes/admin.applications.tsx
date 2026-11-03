import { Form, Link } from "react-router";
import type { Route } from "./+types/admin.applications";
import { Badge, Empty, PageHead, Pager, num, inputClass, primaryButton, when, APPLICATION_TONE } from "~/components/admin";
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

export default function AdminApplications({ loaderData: { total, items, f } }: Route.ComponentProps) {
  return (
    <>
      <PageHead title={`Applications (${num(total)})`} />
      <main className="space-y-3">
        <Form method="get" className="grid grid-cols-2 gap-2">
          <select name="status" defaultValue={f.status} aria-label="Status" className={`${inputClass} col-span-2`}>
            <option value="">All statuses</option>
            {Object.entries(APPLICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex min-h-11 items-center gap-2 text-sm text-forest">
            <input type="checkbox" name="open" value="1" defaultChecked={f.open} className="size-5 accent-forest" />
            Open tuitions only
          </label>
          <button className={primaryButton}>Show</button>
        </Form>
        {items.length === 0 ? <Empty>No applications.</Empty> : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.id}>
                <Link to={`/admin/tuitions/${a.tuition_code}`} className="block rounded-xl border border-brand-100 bg-white px-3 py-3 transition-shadow duration-150 hover:shadow-card">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 font-semibold break-words text-forest">{a.name || "No name"}</span>
                    <Badge tone={APPLICATION_TONE[a.status]}>{APPLICATION_STATUS[a.status]}</Badge>
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    HTR-{a.tuition_code} · {labelOf(CLASS_LEVELS, a.class_level)} · {labelOf(AREAS, a.area)} · {when(a.created_at)}
                    {!a.tutor_code && " · no tutor match"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pager total={total} pageSize={ADMIN_PAGE_SIZE} />
      </main>
    </>
  );
}
