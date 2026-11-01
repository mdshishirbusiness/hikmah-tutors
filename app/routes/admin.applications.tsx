import { Form, Link } from "react-router";
import type { Route } from "./+types/admin.applications";
import { Badge, Empty, PageHead, Pager, bn, inputClass, primaryButton, when } from "~/components/admin";
import { ADMIN_PAGE_SIZE, APPLICATION_STATUS } from "~/lib/admin-labels";
import { listApplications } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "আবেদন · অ্যাডমিন" }, { name: "robots", content: "noindex" }];
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
      <PageHead title={`আবেদন (${bn(total)})`} />
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <Form method="get" className="grid grid-cols-2 gap-2">
          <select name="status" defaultValue={f.status} aria-label="স্ট্যাটাস" className={`${inputClass} col-span-2`}>
            <option value="">সব স্ট্যাটাস</option>
            {Object.entries(APPLICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex min-h-11 items-center gap-2 text-sm text-forest">
            <input type="checkbox" name="open" value="1" defaultChecked={f.open} className="size-5 accent-forest" />
            শুধু খোলা টিউশন
          </label>
          <button className={primaryButton}>দেখাও</button>
        </Form>
        {items.length === 0 ? <Empty>কোনো আবেদন নেই।</Empty> : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.id}>
                <Link to={`/admin/tuitions/${a.tuition_code}`} className="block rounded-xl border border-brand-100 bg-white px-3 py-3 transition-shadow duration-150 hover:shadow-card">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 font-semibold break-words text-forest">{a.name || "নাম নেই"}</span>
                    <Badge tone={a.status === "submitted" ? "mango" : "grey"}>{APPLICATION_STATUS[a.status]}</Badge>
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    HTR-{a.tuition_code} · {labelOf(CLASS_LEVELS, a.class_level)} · {labelOf(AREAS, a.area)} · {when(a.created_at)}
                    {!a.tutor_code && " · টিউটর মেলেনি"}
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
