// Team (owner, 2026-11-16): the owner adds moderators by Gmail, picks what each may do, gives them tuitions, and sees
// what they did. Owner only. Rules in app/lib/staff.ts, saves in staff.server.ts, decisions in docs/DECISIONS.md.
import { Form, Link, useNavigation } from "react-router";
import { Check, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import type { Route } from "./+types/admin.team";
import { Card, PageHead, ago, inputClass, primaryButton } from "~/components/admin";
import { assignTuitions } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { PERMS, type Perm } from "~/lib/staff";
import { addStaff, codesFrom, listStaff, removeStaff, setStaffPerms, staffActivity } from "~/lib/staff.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Team · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [team, activity] = await Promise.all([listStaff(), staffActivity(60)]);
  return { team, activity };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const actor = viewer?.id ?? null;
  const form = await request.formData();
  const intent = form.get("intent");
  const id = Number(form.get("id")) || 0;
  if (intent === "add") return { error: await addStaff(form, actor), id: 0, done: "Added. They sign in with Google using that Gmail." };
  if (intent === "perms") return { error: await setStaffPerms(id, form, actor), id, done: "Access saved." };
  if (intent === "remove") return { error: await removeStaff(id, actor), id: 0, done: "Removed. They are signed out, and their tuitions are back with you." };
  if (intent === "give" || intent === "take") {
    const codes = codesFrom(String(form.get("codes") ?? ""));
    if (!codes.length) return { error: "Write the tuition codes, e.g. 1362, 1370.", id, done: "" };
    const n = await assignTuitions(codes, intent === "give" ? id : null, actor);
    return { error: n ? null : "None of those codes were found.", id, done: intent === "give" ? `${n} tuition${n === 1 ? "" : "s"} given.` : `${n} back with you.` };
  }
  return { error: "Unknown step.", id, done: "" };
}

const ACTION_LABEL: Record<string, string> = {
  staff_viewed: "Opened", signed_in: "Signed in", lead_moved: "Moved a lead", tuition_created: "Made a tuition", tuition_from_lead: "Posted a lead",
  tuition_updated: "Edited a tuition", application_moved: "Moved an applicant", followup_set: "Set a follow-up", checkin_7: "Day-7 check-in", checkin_30: "Day-30 check-in",
};
const actionLabel = (a: string) => ACTION_LABEL[a] ?? a.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function PermBoxes({ on }: { on: Perm[] }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="sr-only">What they may do</legend>
      {PERMS.map((p) => (
        <label key={p.key} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-cream px-3 py-2.5 has-[:checked]:bg-brand-50 has-[:checked]:ring-1 has-[:checked]:ring-brand-200">
          <input type="checkbox" name={`perm_${p.key}`} value="1" defaultChecked={on.includes(p.key)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-forest)]" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-forest">{p.label}</span>
            <span className="block text-xs text-slate-600">{p.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export default function Team({ loaderData: { team, activity }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const msg = (forId: number) =>
    actionData && actionData.id === forId ? (
      actionData.error ? <p role="alert" className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">{actionData.error}</p>
        : actionData.done ? <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900"><Check size={16} aria-hidden />{actionData.done}</p> : null
    ) : null;
  return (
    <>
      <PageHead title="Team" back={{ to: "/admin", label: "Today" }} />
      <main className="space-y-5">
        <section className="rounded-2xl bg-forest p-5 text-cream sm:p-6">
          <p className="flex items-center gap-2 text-lg font-extrabold"><ShieldCheck size={20} className="text-mango" aria-hidden />Moderators</p>
          <p className="mt-1 max-w-2xl text-sm text-brand-100">
            Moderator শুধু নিজের বানানো আর আপনার দেওয়া tuition দেখেন। টাকা, Premium, Insights আর Confirm সবসময় আপনার হাতে। তাঁর প্রতিটা কাজ আর guardian-এর নম্বর দেখা নিচের Activity-তে থাকে।
          </p>
        </section>

        {team.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold break-words text-forest">{m.name || m.email}</h2>
                <p className="text-sm break-all text-slate-600">{m.email}</p>
                <p className="mt-0.5 text-xs text-slate-500">{m.last_login_at ? `Last signed in ${ago(m.last_login_at)}` : "Not signed in yet"} · {m.open} open tuition{m.open === 1 ? "" : "s"}</p>
              </div>
              <Form method="post" onSubmit={(e) => { if (!confirm(`Remove ${m.name || m.email}? They are signed out at once.`)) e.preventDefault(); }}>
                <input type="hidden" name="id" value={m.id} />
                <button name="intent" value="remove" disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-60"><UserMinus size={16} aria-hidden />Remove</button>
              </Form>
            </div>
            <div className="mt-3 space-y-3">
              {msg(m.id)}
              <div>
                <p className="mb-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Their tuitions</p>
                {m.codes ? (
                  <p className="flex flex-wrap gap-1.5">
                    {m.codes.split(",").map((c) => <Link key={c} to={`/admin/tuitions/${c}`} className="inline-flex min-h-9 items-center rounded-lg bg-brand-50 px-2.5 text-sm font-bold text-brand-800 tabular-nums hover:bg-brand-100">HTR-{c}</Link>)}
                  </p>
                ) : <p className="text-sm text-slate-500">None open yet.</p>}
                <Form method="post" className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="id" value={m.id} />
                  <input name="codes" inputMode="numeric" placeholder="Tuition codes, e.g. 1362, 1370, 1401" aria-label={`Tuition codes for ${m.name || m.email}`} className={`${inputClass} min-h-11 flex-1 text-sm`} />
                  <div className="flex gap-2">
                    <button name="intent" value="give" disabled={busy} className={`${primaryButton} flex-1 sm:flex-none`}>Give</button>
                    <button name="intent" value="take" disabled={busy} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-brand-100 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-brand-50 disabled:opacity-60 sm:flex-none">Take back</button>
                  </div>
                </Form>
              </div>
              <details>
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold text-brand-700">What they may do ({m.perms.length} of {PERMS.length})</summary>
                <Form method="post" className="mt-2 space-y-3">
                  <input type="hidden" name="id" value={m.id} />
                  <PermBoxes on={m.perms} />
                  <button name="intent" value="perms" disabled={busy} className={primaryButton}>Save access</button>
                </Form>
              </details>
            </div>
          </Card>
        ))}

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-forest"><UserPlus size={19} aria-hidden />Add a moderator</h2>
          <p className="mt-1 text-sm text-slate-600">তাঁর Gmail দিন। তিনি ওই Gmail দিয়ে Google login করলেই Admin খুলবে। কোনো tutor-এর Gmail এখানে চলবে না।</p>
          <Form method="post" className="mt-3 space-y-3" key={team.length}>
            {msg(0)}
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="email" type="email" required autoComplete="off" placeholder="name@gmail.com" aria-label="Moderator's Gmail" className={`${inputClass} min-h-11 text-sm`} />
              <input name="name" maxLength={80} placeholder="Name (for you)" aria-label="Moderator's name" className={`${inputClass} min-h-11 text-sm`} />
            </div>
            <PermBoxes on={PERMS.filter((p) => p.byDefault).map((p) => p.key)} />
            <button name="intent" value="add" disabled={busy} className={primaryButton}>Add moderator</button>
          </Form>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-forest">Activity</h2>
          {activity.length ? (
            <ul className="mt-2 divide-y divide-brand-50">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                  <span className="min-w-0 break-words"><b className="text-forest">{a.who}</b> · {actionLabel(a.action)}{a.entity_id ? <span className="text-slate-500"> {a.entity_type === "page" ? a.entity_id : `${a.entity_type} ${a.entity_id}`}</span> : null}</span>
                  <span className="shrink-0 text-xs text-slate-500">{ago(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-1 text-sm text-slate-500">Nothing yet.</p>}
        </Card>
      </main>
    </>
  );
}
