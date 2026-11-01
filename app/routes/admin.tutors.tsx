import { Form, Link } from "react-router";
import type { Route } from "./+types/admin.tutors";
import { Badge, Empty, PageHead, Pager, bn, inputClass, primaryButton } from "~/components/admin";
import { ADMIN_PAGE_SIZE } from "~/lib/admin-labels";
import { listTutors } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { SUBJECTS } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "টিউটর · অ্যাডমিন" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const f = { q: sp.get("q")?.trim() ?? "", gender: sp.get("gender") ?? "", subject: sp.get("subject") ?? "", band: sp.get("band") ?? "", page: Number(sp.get("page")) || 1 };
  return { ...(await listTutors(f)), f };
}

export default function AdminTutors({ loaderData: { total, items, f } }: Route.ComponentProps) {
  return (
    <>
      <PageHead title={`টিউটর (${bn(total)})`} />
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <Form method="get" className="grid grid-cols-2 gap-2">
          <input name="q" defaultValue={f.q} aria-label="খুঁজুন" placeholder="নাম, ফোন, ইমেইল, কোড, প্রতিষ্ঠান, বিভাগ" className={`${inputClass} col-span-2`} />
          <select name="subject" defaultValue={f.subject} aria-label="বিষয়" className={inputClass}>
            <option value="">সব বিষয়</option>
            {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select name="band" defaultValue={f.band} aria-label="স্তর" className={inputClass}>
            <option value="">সব স্তর</option>
            <option value="junior">১ম–৮ম</option>
            <option value="ssc">৯ম–১০ম</option>
            <option value="hsc">একাদশ–দ্বাদশ</option>
          </select>
          <select name="gender" defaultValue={f.gender} aria-label="জেন্ডার" className={inputClass}>
            <option value="">পুরুষ ও মহিলা</option>
            <option value="male">পুরুষ</option>
            <option value="female">মহিলা</option>
          </select>
          <button className={primaryButton}>খুঁজুন</button>
        </Form>
        {items.length === 0 ? <Empty>কোনো টিউটর পাওয়া যায়নি।</Empty> : (
          <ul className="space-y-3">
            {items.map((t) => (
              <li key={t.id}>
                <Link to={`/admin/tutors/${t.code}`} className="block rounded-2xl border border-brand-100 bg-white p-4 transition-shadow duration-150 hover:shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 font-semibold break-words text-forest">{t.full_name}</p>
                    <span className="flex gap-1.5">
                      {t.gender === "female" && <Badge tone="green">মহিলা</Badge>}
                      {t.priority === "urgent" && <Badge tone="dark">জরুরি</Badge>}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700">{[t.institution, t.department, t.session_year].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1 text-sm text-slate-600">কোড {t.code} · {t.current_location} · {bn(t.applications)}টি আবেদন{t.placements > 0 ? ` · ${bn(t.placements)}টি বাছাই` : ""}</p>
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
