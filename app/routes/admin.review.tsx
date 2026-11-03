// The owner's review after an import (docs/DECISIONS.md, 2026-11-03): flagged tutors, open tuitions not yet on the
// board, and sheet rows still held back. Old tuitions and unmatched applications are left as the import guessed.
import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/admin.review";
import { Badge, Card, Empty, PageHead, Pager, bn, inputClass, primaryButton, when } from "~/components/admin";
import { ADMIN_PAGE_SIZE, REVIEW_ISSUE } from "~/lib/admin-labels";
import { flaggedTutors, resolveFlaggedTutor, reviewCounts, reviewList, tuitionsToReview } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "রিভিউ · অ্যাডমিন" }, { name: "robots", content: "noindex" }];
}

const LISTS = ["tutors", "tuitions", "held"] as const;
type List = (typeof LISTS)[number];

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const list: List = LISTS.find((l) => l === sp.get("list")) ?? "tutors";
  const page = Number(sp.get("page")) || 1;
  const counts = await reviewCounts();
  if (list === "tutors") return { list, counts, tutors: await flaggedTutors(page) };
  if (list === "tuitions") return { list, counts, tuitions: await tuitionsToReview(page) };
  return { list, counts, held: await reviewList({ tab: "", page }) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  const error = await resolveFlaggedTutor(Number(form.get("id")), String(form.get("email") ?? ""), viewer?.id ?? null);
  return { error, id: Number(form.get("id")) };
}

const TABS: { key: List; label: string; count: (c: { tutors: number; tuitions: number; held: number }) => number }[] = [
  { key: "tutors", label: "টিউটর", count: (c) => c.tutors },
  { key: "tuitions", label: "খোলা টিউশন", count: (c) => c.tuitions },
  { key: "held", label: "আটকে আছে", count: (c) => c.held },
];
const SHEET_TABS: Record<string, string> = { registration: "Registration", admin: "Admin Pannel 1", old: "Tuition Admin Panel" };

export default function AdminReview({ loaderData: d, actionData }: Route.ComponentProps) {
  const left = d.counts.tutors + d.counts.tuitions + d.counts.held;
  return (
    <>
      <PageHead title={left ? `রিভিউ বাকি (${bn(left)})` : "রিভিউ শেষ"} back={{ to: "/admin", label: "হোম" }} />
      <main className="space-y-3">
        <nav aria-label="রিভিউয়ের তালিকা" className="grid grid-cols-3 gap-2">
          {TABS.map((t) => {
            const n = t.count(d.counts);
            const on = d.list === t.key;
            return (
              <Link key={t.key} to={`?list=${t.key}`} aria-current={on ? "page" : undefined}
                className={`rounded-2xl border p-3 transition-colors duration-150 ${on ? "border-forest bg-forest text-cream" : "border-brand-100 bg-white text-forest hover:bg-brand-50"}`}>
                <span className={`block text-2xl font-semibold ${on && n ? "text-mango" : ""}`}>{bn(n)}</span>
                <span className="block text-sm">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        {d.list === "tutors" && d.tutors && (
          <>
            <p className="text-sm text-slate-600">সবাই ইমপোর্ট হয়েছে। এখানে যাদের কিছু দেখার আছে: একই নম্বর দুজনের (ঠিক থাকলে "ঠিক আছে"), বা ইমেইল ভুল (ঠিক ইমেইল না দিলে Google দিয়ে ঢুকতে পারবে না)।</p>
            {d.tutors.items.length === 0 ? <Empty>টিউটরের রিভিউ শেষ।</Empty> : (
              <ul className="space-y-2">
                {d.tutors.items.map((t) => <TutorRow key={t.id} t={t} error={actionData?.id === t.id ? actionData.error : null} />)}
              </ul>
            )}
            <Pager total={d.tutors.total} pageSize={ADMIN_PAGE_SIZE} />
          </>
        )}

        {d.list === "tuitions" && d.tuitions && (
          <>
            <p className="text-sm text-slate-600">খোলা কিন্তু বোর্ডে নেই। প্রতিটিতে ক্লাস, এলাকা, মাধ্যম, সময় আর অভিভাবকের চাওয়া ঠিক করে "বোর্ডে পাবলিক করো" দিন। আর খোলা না থাকলে স্ট্যাটাস বদলে দিন।</p>
            {d.tuitions.items.length === 0 ? <Empty>সব খোলা টিউশন বোর্ডে আছে।</Empty> : (
              <ul className="space-y-2">
                {d.tuitions.items.map((t) => (
                  <li key={t.code}>
                    <Link to={`/admin/tuitions/${t.code}`} className="block rounded-xl border border-brand-100 bg-white px-3 py-3 transition-colors duration-150 hover:bg-brand-50">
                      <p className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-forest">HTR-{t.code} · {labelOf(CLASS_LEVELS, t.class_level) || "ক্লাস নেই"} · {labelOf(AREAS, t.area) || "এলাকা নেই"}</span>
                        <span className="text-xs text-slate-600">{bn(t.applications)}টি আবেদন{t.posted_at ? ` · ${when(t.posted_at)}` : ""}</span>
                      </p>
                      <p className="mt-1.5 flex flex-wrap gap-1.5">
                        {t.gaps.length ? t.gaps.map((g) => <Badge key={g} tone="red">{g} বাকি</Badge>) : <Badge tone="green">সব আছে, পাবলিক করা যায়</Badge>}
                        {t.legacyClass && <Badge tone="grey">পুরোনো ক্লাস</Badge>}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Pager total={d.tuitions.total} pageSize={ADMIN_PAGE_SIZE} />
          </>
        )}

        {d.list === "held" && d.held && (
          <>
            <Card>
              <p className="text-sm text-slate-700">এই সারিগুলো শিট থেকে আসেনি। শিটে ঠিক করুন; পরের টপ-আপে নিজে থেকেই চলে আসবে। এদের সাথে আরও {bn(d.held.dependents)}টি আবেদন ও বাছাই অপেক্ষায় আছে।</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(d.held.issueCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k}><Badge>{REVIEW_ISSUE[k] ?? k}: {bn(n)}</Badge></li>)}
              </ul>
            </Card>
            {d.held.items.length === 0 ? <Empty>আটকে থাকা কিছু নেই।</Empty> : (
              <ul className="space-y-2">
                {d.held.items.map((r) => (
                  <li key={r.id} className="rounded-xl border border-brand-100 bg-white px-3 py-3">
                    <p className="text-sm font-semibold text-forest">{SHEET_TABS[r.tab] ?? r.tab} · সারি {bn(r.row_no)} · কোড {r.legacy_ref}</p>
                    {r.title && <p className="mt-0.5 text-sm break-words text-slate-700">{r.title}</p>}
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {(r.issues ?? "").split(",").filter(Boolean).map((i) => <Badge key={i} tone={/repeated|missing|unknown|invalid/.test(i) ? "red" : "grey"}>{REVIEW_ISSUE[i] ?? i}</Badge>)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Pager total={d.held.total} pageSize={ADMIN_PAGE_SIZE} />
          </>
        )}
      </main>
    </>
  );
}

function TutorRow({ t, error }: { t: { id: number; issues: string | null; code: number; full_name: string; email: string | null; phone: string }; error: string | null }) {
  const nav = useNavigation();
  const busy = nav.state !== "idle" && nav.formData?.get("id") === String(t.id);
  const issues = (t.issues ?? "").split(",").filter(Boolean);
  const needsEmail = issues.includes("email_invalid") && !t.email;
  return (
    <li className="rounded-xl border border-brand-100 bg-white px-3 py-3">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/admin/tutors/${t.code}`} className="font-semibold text-forest underline-offset-2 hover:underline">T-{t.code} · {t.full_name}</Link>
        <span className="text-sm text-slate-600">{t.phone}</span>
      </p>
      <p className="mt-1 flex flex-wrap gap-1.5">
        {issues.filter((i) => i !== "tutor_changed_fee_terms" && i !== "subject_unknown").map((i) => <Badge key={i} tone="red">{REVIEW_ISSUE[i] ?? i}</Badge>)}
      </p>
      <Form method="post" className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={t.id} />
        {needsEmail && (
          <input name="email" type="email" required inputMode="email" placeholder="সঠিক Gmail লিখুন" aria-label={`T-${t.code} এর ইমেইল`} className={`${inputClass} min-w-0 flex-1`} />
        )}
        <button disabled={busy} className={`${primaryButton} shrink-0`}>{needsEmail ? "ইমেইল সেভ" : "ঠিক আছে"}</button>
      </Form>
      {error && <p role="alert" className="mt-1 text-sm font-semibold text-rose-800">{error}</p>}
    </li>
  );
}
