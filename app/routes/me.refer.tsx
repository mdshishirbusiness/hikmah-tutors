// "Refer a tuition" (owner, 2026-11-04): a tutor passes on a guardian they know. It lands on the admin's Leads as
// "Referred by T-…", and the tutor sees how it went. No reward yet; that comes with the money features.
import { Form, Link, useNavigation } from "react-router";
import { ArrowLeft, Check } from "lucide-react";
import type { Route } from "./+types/me.refer";
import { Badge, ago, inputClass, primaryButton } from "~/components/admin";
import { SitePage } from "~/components/site";
import { TutorBar } from "~/components/tutor";
import { myReferrals, referTuition, requireTutor, tutorBadges } from "~/lib/me.server";
import { AREAS, CLASS_CHOICES, CLASS_LEVELS, STATUSES, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Refer a tuition · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { viewer, me } = await requireTutor(request);
  const [referrals, badges] = await Promise.all([myReferrals(me), tutorBadges(viewer, me)]);
  return { referrals, badges };
}

export async function action({ request }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request);
  const error = await referTuition(viewer, me, await request.formData());
  return { error, done: !error };
}

const TONE = { new: "mango", called: "sky", posted: "green", not_now: "grey" } as const;

export default function Refer({ loaderData: { referrals, badges }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <SitePage app>
      <div className="mx-auto max-w-lg px-4 pt-6 pb-28">
        <Link to="/me" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-500"><ArrowLeft size={16} aria-hidden />Home</Link>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-forest">Refer a tuition</h1>
        <p className="mt-1 text-slate-600">কোনো অভিভাবক টিউটর খুঁজছেন? তথ্য দিন, HTR ফোন করে কথা বলবে।</p>
        {actionData?.done && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900"><Check size={18} aria-hidden />Thanks! HTR will call them.</p>}
        {actionData?.error && <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
        <Form method="post" className="mt-5 space-y-3 rounded-2xl bg-white p-4 shadow-ring" key={referrals.length}>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Guardian's phone</span><input name="phone" required inputMode="tel" placeholder="01XXXXXXXXX" className={inputClass} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Guardian's name (optional)</span><input name="guardian_name" maxLength={80} className={inputClass} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Class</span>
              <select name="class_level" required defaultValue="" className={inputClass}><option value="" disabled>Pick</option>{CLASS_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
            </label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Area</span>
              <select name="area" required defaultValue="" className={inputClass}><option value="" disabled>Pick</option>{AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select>
            </label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Note (optional)</span><textarea name="note" rows={2} maxLength={300} placeholder="Subjects, salary, anything useful" className={`${inputClass} py-3`} /></label>
          <button disabled={busy} className={`${primaryButton} w-full`}>{busy ? "Sending…" : "Send to HTR"}</button>
        </Form>
        {referrals.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold text-slate-500">Your referrals</h2>
            <ul className="overflow-hidden rounded-2xl bg-white shadow-ring">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-brand-50 px-4 py-3 last:border-0">
                  <span className="min-w-0"><span className="block font-semibold text-slate-900">{labelOf(CLASS_LEVELS, r.class_level)} · {labelOf(AREAS, r.area)}</span><span className="block text-xs text-slate-500">{ago(r.created_at)}{r.tuition_code ? ` · posted as HTR-${r.tuition_code}` : ""}</span></span>
                  <Badge tone={TONE[r.status as keyof typeof TONE] ?? "grey"}>{labelOf(STATUSES, r.status)}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <TutorBar active="home" count={badges.applied} dot={badges.home} />
    </SitePage>
  );
}
