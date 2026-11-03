import { Form, Link } from "react-router";
import type { Route } from "./+types/admin.tutors";
import { Badge, Empty, PageHead, Pager, num, inputClass, primaryButton } from "~/components/admin";
import { ADMIN_PAGE_SIZE } from "~/lib/admin-labels";
import { listTutors } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { SUBJECTS } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tutors · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const f = { q: sp.get("q")?.trim() ?? "", gender: sp.get("gender") ?? "", subject: sp.get("subject") ?? "", band: sp.get("band") ?? "", page: Number(sp.get("page")) || 1 };
  return { ...(await listTutors(f)), f };
}

export default function AdminTutors({ loaderData: { total, items, f } }: Route.ComponentProps) {
  return (
    <>
      <PageHead title={`Tutors (${num(total)})`} />
      <main className="space-y-3">
        <Form method="get" className="grid grid-cols-2 gap-2">
          <input name="q" defaultValue={f.q} aria-label="Search" placeholder="Name, phone, email, code, institution, department" className={`${inputClass} col-span-2`} />
          <select name="subject" defaultValue={f.subject} aria-label="Subject" className={inputClass}>
            <option value="">All subjects</option>
            {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select name="band" defaultValue={f.band} aria-label="Level" className={inputClass}>
            <option value="">All levels</option>
            <option value="junior">Class 1–8</option>
            <option value="ssc">Class 9–10</option>
            <option value="hsc">Class 11–12</option>
          </select>
          <select name="gender" defaultValue={f.gender} aria-label="Gender" className={inputClass}>
            <option value="">Male and female</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <button className={primaryButton}>Search</button>
        </Form>
        {items.length === 0 ? <Empty>No tutors found.</Empty> : (
          <ul className="space-y-3">
            {items.map((t) => (
              <li key={t.id}>
                <Link to={`/admin/tutors/${t.code}`} className="block rounded-2xl border border-brand-100 bg-white p-5 shadow-card transition-[border-color,box-shadow] duration-150 hover:border-brand-200 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 font-semibold break-words text-forest">{t.full_name}</p>
                    <span className="flex gap-1.5">
                      {t.gender === "female" && <Badge tone="green">Female</Badge>}
                      {t.priority === "urgent" && <Badge tone="dark">Urgent</Badge>}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700">{[t.institution, t.department, t.session_year].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1 text-sm text-slate-600">Code {t.code} · {t.current_location} · {num(t.applications)} applications{t.placements > 0 ? ` · ${num(t.placements)} selected` : ""}</p>
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
