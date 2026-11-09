// Admission batch teacher applications (owner, 2026-11-09): filter, call, demo, shortlist, finalise. Each card has the
// applicant's answers, their phone (admin only), and the owner's step, 1–5 rating and private note.
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { ArrowUpRight, Copy, Laptop, PlayCircle } from "lucide-react";
import type { Route } from "./+types/admin.batches";
import { Badge, ContactButtons, Empty, PageHead, StageTabs, ago, inputClass, num, primaryButton, safeUrl, secondaryButton, type Tone } from "~/components/admin";
import { Toast, useShare } from "~/components/site";
import { requireAdmin } from "~/lib/auth.server";
import {
  BATCH_APPLY, BATCH_DAYS, BATCH_INTERNET, BATCH_MODES, BATCH_SETUP, BATCH_STATUSES, BATCH_SUBJECTS, BATCH_TIMES, BATCH_TOOLS, BATCH_TRACKS, onlineReady, splitKeys,
} from "~/lib/batch";
import { listBatchApplications, updateBatchApplication } from "~/lib/batch.server";
import { type Option, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Batch teachers · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const pick = (name: string, list: Option[]) => (list.some((o) => o.key === sp.get(name)) ? sp.get(name)! : "");
  const filters = {
    status: sp.get("status") === "all" ? "" : pick("status", BATCH_STATUSES) || "new",
    subject: pick("subject", BATCH_SUBJECTS),
    track: pick("track", BATCH_TRACKS),
    mode: sp.get("mode") === "online" || sp.get("mode") === "offline" ? sp.get("mode")! : "",
    ready: sp.get("ready") === "1",
  };
  return { filters, ...(await listBatchApplications(filters)) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  return { error: await updateBatchApplication(Number(form.get("id")), form, viewer?.id ?? null), id: Number(form.get("id")) };
}

const TONE: Record<string, Tone> = { new: "mango", called: "sky", demo: "teal", shortlisted: "amber", final: "brand", not_now: "grey" };
const labels = (list: Option[], keys: string | null) => splitKeys(keys).map((k) => labelOf(list, k));
const selectClass = `${inputClass} min-h-11 w-auto pr-8 text-sm`;

export default function Batches({ loaderData: { filters, counts, items }, actionData }: Route.ComponentProps) {
  const [sp, setSp] = useSearchParams();
  const busy = useNavigation().state !== "idle";
  const { share, toast } = useShare();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(name, value); else next.delete(name);
    setSp(next, { preventScrollReset: true });
  };

  return (
    <>
      <PageHead
        title="Batch teachers"
        sub="Admission batch-এ পড়াতে যারা আবেদন করেছেন। ফোন করুন, demo নিন, তারপর shortlist ও final করুন।"
        action={<button type="button" onClick={() => share(BATCH_APPLY, "Teach an admission batch · Hikmah Tutors")} className={secondaryButton}><Copy size={16} aria-hidden />Share apply link</button>}
      />
      <main className="space-y-4">
        <StageTabs param="status" active={sp.get("status") === "all" ? "all" : filters.status}
          tabs={[...BATCH_STATUSES.map((s) => ({ key: s.key, label: s.label, n: counts[s.key] ?? 0 })), { key: "all", label: "All", n: total }]} />

        <div className="flex flex-wrap gap-2">
          <select aria-label="Subject" value={filters.subject} onChange={(e) => set("subject", e.target.value)} className={selectClass}>
            <option value="">All subjects</option>
            {BATCH_SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select aria-label="Track" value={filters.track} onChange={(e) => set("track", e.target.value)} className={selectClass}>
            <option value="">All tracks</option>
            {BATCH_TRACKS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select aria-label="Mode" value={filters.mode} onChange={(e) => set("mode", e.target.value)} className={selectClass}>
            <option value="">Online or offline</option>
            <option value="online">Teaches online</option>
            <option value="offline">Teaches offline</option>
          </select>
          <button type="button" aria-pressed={filters.ready} onClick={() => set("ready", filters.ready ? "" : "1")}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors ${filters.ready ? "border-forest bg-forest text-cream" : "border-brand-100 bg-white text-forest hover:border-brand-500"}`}>
            <Laptop size={16} aria-hidden />Laptop + pen tablet
          </button>
        </div>

        {items.length === 0 ? <Empty>No applications here yet.</Empty> : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {items.map((b) => {
              const setup = splitKeys(b.setup);
              const subjects = labels(BATCH_SUBJECTS, b.subjects).map((s) => (s === "Other" && b.subject_other ? b.subject_other : s));
              const online = b.mode !== "offline";
              const demo = safeUrl(b.demo_url);
              return (
                <li key={b.id} className="rounded-2xl bg-white p-4 shadow-ring sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg leading-snug font-bold text-forest">{b.full_name}</p>
                      <p className="text-sm text-slate-600">{[b.university, b.department, b.session_year].filter(Boolean).join(" · ") || "University not given"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={TONE[b.status]}>{labelOf(BATCH_STATUSES, b.status)}</Badge>
                      {b.rating && <span className="text-sm font-extrabold text-forest tabular-nums" aria-label={`Rating ${b.rating} of 5`}>{b.rating}/5</span>}
                    </div>
                  </div>

                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {subjects.map((s) => <span key={s} className="rounded-full bg-forest px-2.5 py-0.5 text-xs font-bold text-cream">{s}</span>)}
                    {labels(BATCH_TRACKS, b.tracks).map((s) => <span key={s} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-forest">{s}</span>)}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {labelOf(BATCH_MODES, b.mode)}
                    {b.pay_per_class != null && ` · ৳${num(b.pay_per_class)}/class`}
                    {b.experience_years != null && ` · ${b.experience_years} yr teaching`}
                    {b.admission_students != null && ` · ${num(b.admission_students)} admission students`}
                  </p>

                  {online && (
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {onlineReady(setup) && <span className="rounded-full bg-mango px-2.5 py-0.5 text-xs font-extrabold text-forest">Online ready</span>}
                      {[...labels(BATCH_SETUP, b.setup), b.internet && labelOf(BATCH_INTERNET, b.internet), ...labels(BATCH_TOOLS, b.tools)].filter(Boolean).map((s) => (
                        <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{s}</span>
                      ))}
                    </p>
                  )}

                  <dl className="mt-3 space-y-1.5 text-sm">
                    {b.admission_result && <div><dt className="inline font-semibold text-slate-500">Admission: </dt><dd className="inline text-slate-800">{b.admission_result}</dd></div>}
                    {(b.days || b.times) && (
                      <div><dt className="inline font-semibold text-slate-500">Free: </dt><dd className="inline text-slate-800">{[labels(BATCH_DAYS, b.days).join(" "), labels(BATCH_TIMES, b.times).join(", ")].filter(Boolean).join(" · ")}</dd></div>
                    )}
                    {b.experience && <div><dt className="font-semibold text-slate-500">Taught</dt><dd className="whitespace-pre-line text-slate-800">{b.experience}</dd></div>}
                    {b.note && <div><dt className="font-semibold text-slate-500">Note</dt><dd className="whitespace-pre-line text-slate-800">{b.note}</dd></div>}
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ContactButtons phone={b.phone} />
                    {demo && <a href={demo} target="_blank" rel="noreferrer" className={secondaryButton}><PlayCircle size={16} aria-hidden />Demo</a>}
                    {b.tutor_code && <Link to={`/admin/tutors/${b.tutor_code}`} className={secondaryButton}>T-{b.tutor_code}<ArrowUpRight size={15} aria-hidden /></Link>}
                  </div>

                  <Form method="post" className="mt-3 space-y-2 border-t border-brand-50 pt-3">
                    <input type="hidden" name="id" value={b.id} />
                    <div className="flex flex-wrap gap-2">
                      <select name="status" aria-label="Step" defaultValue={b.status} className={selectClass}>
                        {BATCH_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <select name="rating" aria-label="Rating" defaultValue={b.rating ?? ""} className={selectClass}>
                        <option value="">No rating</option>
                        {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} / 5</option>)}
                      </select>
                    </div>
                    <textarea name="admin_note" rows={2} maxLength={1000} defaultValue={b.admin_note ?? ""} placeholder="Private note: viva, demo, pay talk…" aria-label="Private note" className={`${inputClass} py-2.5 text-sm`} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">Applied {ago(b.created_at)}</span>
                      <button disabled={busy} className={primaryButton}>Save</button>
                    </div>
                    {actionData?.error && actionData.id === b.id && <p role="alert" className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">{actionData.error}</p>}
                  </Form>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Toast message={toast} />
    </>
  );
}
