// Sheet rows the import held back. Fixed in the sheet for now, then the import runs again.
import { Form } from "react-router";
import type { Route } from "./+types/admin.review";
import { Badge, Card, Empty, PageHead, Pager, bn, inputClass, primaryButton } from "~/components/admin";
import { ADMIN_PAGE_SIZE, REVIEW_ISSUE } from "~/lib/admin-labels";
import { reviewList } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "রিভিউ · অ্যাডমিন" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const tab = ["registration", "admin", "old"].includes(sp.get("tab") ?? "") ? sp.get("tab")! : "";
  return { ...(await reviewList({ tab, page: Number(sp.get("page")) || 1 })), tab };
}

const TABS: Record<string, string> = { registration: "Registration", admin: "Admin Pannel 1", old: "Tuition Admin Panel" };

export default function AdminReview({ loaderData: { total, items, dependents, issueCounts, tab } }: Route.ComponentProps) {
  return (
    <>
      <PageHead title={`রিভিউ বাকি (${bn(total)})`} back={{ to: "/admin", label: "হোম" }} />
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <Card>
          <p className="text-sm text-slate-700">এই সারিগুলো শিট থেকে আসেনি। শিটে ঠিক করে ইমপোর্ট আবার চালালে চলে আসবে। এদের সাথে আরও {bn(dependents)}টি আবেদন ও বাছাই অপেক্ষায় আছে।</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k}><Badge>{REVIEW_ISSUE[k] ?? k}: {bn(n)}</Badge></li>)}
          </ul>
        </Card>
        <Form method="get" className="flex gap-2">
          <select name="tab" defaultValue={tab} aria-label="শিটের ট্যাব" className={inputClass}>
            <option value="">সব ট্যাব</option>
            {Object.entries(TABS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className={`${primaryButton} shrink-0`}>দেখাও</button>
        </Form>
        {items.length === 0 ? <Empty>রিভিউ করার কিছু নেই।</Empty> : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-brand-100 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-forest">{TABS[r.tab]} · সারি {bn(r.row_no)} · কোড {r.legacy_ref}</p>
                {r.title && <p className="mt-0.5 text-sm break-words text-slate-700">{r.title}</p>}
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {(r.issues ?? "").split(",").filter(Boolean).map((i) => <Badge key={i} tone={/repeated|missing|unknown|invalid/.test(i) ? "red" : "grey"}>{REVIEW_ISSUE[i] ?? i}</Badge>)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Pager total={total} pageSize={ADMIN_PAGE_SIZE} />
      </main>
    </>
  );
}
