import { Form, Link, data } from "react-router";
import { Flag } from "lucide-react";
import type { Route } from "./+types/admin.guardians.$id";
import { Badge, Card, ContactButtons, PageHead, inputClass, num, TUITION_TONE } from "~/components/admin";
import { TUITION_STATUS } from "~/lib/admin-labels";
import { getGuardian, setFlag } from "~/lib/admin.server";
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

export async function action({ request, params }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  return { error: await setFlag("guardian", Number(params.id) || -1, form.get("intent") === "clear" ? "" : String(form.get("reason") ?? ""), viewer?.id ?? null) };
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
        <Card className={g.flag_reason ? "ring-2 ring-rose-200" : ""}>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-forest"><Flag size={15} aria-hidden />Do-not-place flag</h2>
          <p className="mt-1 text-xs text-slate-500">Private. Leads from this number show a warning; nothing is blocked.</p>
          <Form method="post" className="mt-3 space-y-2">
            <textarea name="reason" rows={2} maxLength={300} defaultValue={g.flag_reason ?? ""} placeholder="Reason, e.g. didn't pay the tutor" className={`${inputClass} py-2 text-sm`} />
            <div className="flex gap-2">
              <button className="inline-flex min-h-11 items-center rounded-xl bg-forest px-4 text-sm font-bold text-cream">{g.flag_reason ? "Update" : "Flag"}</button>
              {g.flag_reason && <button name="intent" value="clear" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring">Clear flag</button>}
            </div>
          </Form>
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
