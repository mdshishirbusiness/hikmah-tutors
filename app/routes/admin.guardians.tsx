import { Form, Link } from "react-router";
import type { Route } from "./+types/admin.guardians";
import { Badge, Empty, PageHead, Pager, bn, inputClass, primaryButton } from "~/components/admin";
import { ADMIN_PAGE_SIZE } from "~/lib/admin-labels";
import { listGuardians } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "গার্ডিয়ান · অ্যাডমিন" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const f = { q: sp.get("q")?.trim() ?? "", page: Number(sp.get("page")) || 1 };
  return { ...(await listGuardians(f)), f };
}

export default function AdminGuardians({ loaderData: { total, items, f } }: Route.ComponentProps) {
  return (
    <>
      <PageHead title={`গার্ডিয়ান (${bn(total)})`} />
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <Form method="get" className="flex gap-2">
          <input name="q" defaultValue={f.q} aria-label="খুঁজুন" placeholder="ফোন নম্বর" inputMode="tel" className={inputClass} />
          <button className={`${primaryButton} shrink-0`}>খুঁজুন</button>
        </Form>
        {items.length === 0 ? <Empty>কোনো গার্ডিয়ান পাওয়া যায়নি।</Empty> : (
          <ul className="space-y-3">
            {items.map((g) => (
              <li key={g.id}>
                <Link to={`/admin/guardians/${g.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-4 transition-shadow duration-150 hover:shadow-card">
                  <span className="min-w-0">
                    <span className="block font-semibold text-forest">{g.phone}</span>
                    <span className="block text-sm break-words text-slate-600">{g.name || g.label}</span>
                  </span>
                  {g.tuitions > 1 ? <Badge tone="mango">{bn(g.tuitions)}টি টিউশন</Badge> : <Badge>{bn(g.tuitions)}টি টিউশন</Badge>}
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
