import { Link, data } from "react-router";
import type { Route } from "./+types/admin.guardians.$id";
import { Badge, Card, ContactButtons, PageHead, num, TUITION_TONE } from "~/components/admin";
import { TUITION_STATUS } from "~/lib/admin-labels";
import { getGuardian } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Guardian · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const found = await getGuardian(Number(params.id) || -1);
  if (!found) throw data("Guardian not found", { status: 404 });
  return found;
}

export default function AdminGuardian({ loaderData: { guardian: g, tuitions } }: Route.ComponentProps) {
  return (
    <>
      <PageHead title={g.name || tuitions[0]?.label || g.phone} back={{ to: "/admin/guardians", label: "All guardians" }} />
      <main className="space-y-4">
        <Card>
          <ContactButtons phone={g.phone} />
          {g.notes && <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{g.notes}</p>}
        </Card>
        <section>
          <h2 className="mb-2 font-semibold text-forest">Tuitions ({num(tuitions.length)})</h2>
          <ul className="space-y-2">
            {tuitions.map((t) => (
              <li key={t.code}>
                <Link to={`/admin/tuitions/${t.code}`} className="block rounded-xl border border-brand-100 bg-white px-3 py-3 text-sm">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-forest">HTR-{t.code} · {labelOf(CLASS_LEVELS, t.class_level)} · {labelOf(AREAS, t.area)}</span>
                    <Badge tone={TUITION_TONE[t.status]}>{TUITION_STATUS[t.status]}</Badge>
                  </span>
                  {t.exact_address && <span className="mt-1 block break-words text-slate-600">{t.exact_address}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
