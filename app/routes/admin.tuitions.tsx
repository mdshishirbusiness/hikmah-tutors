import { Form, Link } from "react-router";
import type { Route } from "./+types/admin.tuitions";
import { Badge, Empty, PageHead, Pager, bn, inputClass, primaryButton, TUITION_TONE } from "~/components/admin";
import { ADMIN_PAGE_SIZE, TUITION_STATUS } from "~/lib/admin-labels";
import { listTuitions } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, SUBJECTS, TUTOR_GENDERS, labelOf } from "~/lib/options";
import { taka } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [{ title: "টিউশন · অ্যাডমিন" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const f = { q: sp.get("q")?.trim() ?? "", status: sp.get("status") ?? "", visibility: sp.get("visibility") ?? "", page: Number(sp.get("page")) || 1 };
  return { ...(await listTuitions(f)), f };
}

export default function AdminTuitions({ loaderData: { total, items, f } }: Route.ComponentProps) {
  return (
    <>
      <PageHead title={`টিউশন (${bn(total)})`} />
      <main className="space-y-3">
        <Form method="get" className="grid grid-cols-2 gap-2">
          <input name="q" defaultValue={f.q} aria-label="খুঁজুন" placeholder="কোড, এলাকা বা গার্ডিয়ানের নম্বর" className={`${inputClass} col-span-2`} />
          <select name="status" defaultValue={f.status} aria-label="স্ট্যাটাস" className={inputClass}>
            <option value="">সব স্ট্যাটাস</option>
            {Object.entries(TUITION_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="visibility" defaultValue={f.visibility} aria-label="দেখা যায় কি না" className={inputClass}>
            <option value="">পাবলিক ও গোপন</option>
            <option value="public">পাবলিক</option>
            <option value="hidden">গোপন</option>
          </select>
          <button className={`${primaryButton} col-span-2`}>খুঁজুন</button>
        </Form>
        {items.length === 0 ? <Empty>কোনো টিউশন পাওয়া যায়নি।</Empty> : (
          <ul className="space-y-3">
            {items.map((t) => (
              <li key={t.code}>
                <Link to={`/admin/tuitions/${t.code}`} className="block rounded-2xl border border-brand-100 bg-white p-5 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-brand-200 hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-600">HTR-{t.code}</span>
                    <span className="flex gap-1.5">
                      {t.is_public === 1 && <Badge tone="mango">পাবলিক</Badge>}
                      <Badge tone={TUITION_TONE[t.status]}>{TUITION_STATUS[t.status]}</Badge>
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-semibold text-forest">
                    {t.salary_amount ? taka(t.salary_amount) : t.salary_kind === "negotiable" ? "আলোচনা সাপেক্ষে" : "বেতন নেই"} · {labelOf(AREAS, t.area)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {labelOf(CLASS_LEVELS, t.class_level)} · {t.subjects.split(",").filter(Boolean).map((s) => labelOf(SUBJECTS, s)).join(", ") || "বিষয় নেই"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">টিউটর: {labelOf(TUTOR_GENDERS, t.tutor_gender_pref)} · {bn(t.applications)}টি আবেদন</p>
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
