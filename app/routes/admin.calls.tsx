// The Call list (owner, 2026-11-09): tutors to phone and rate, shortlisted by level, subject, gender, university and
// department; no fixed order. A second tab keeps the question bank the owner asks from, editable here.
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { ChevronRight, Phone, Plus, Search, Trash2 } from "lucide-react";
import type { Route } from "./+types/admin.calls";
import { Avatar } from "~/components/Avatar";
import { Badge, Empty, PageHead, StageTabs, ago, num } from "~/components/admin";
import { ADMIN_PAGE_SIZE } from "~/lib/admin-labels";
import { requireAdmin } from "~/lib/auth.server";
import { type CallRow, type Question, callList, checkedCount, editQuestion, questions } from "~/lib/calls.server";
import { telLink } from "~/lib/contact";
import { BANDS, SUBJECTS, labelOf } from "~/lib/options";
import { bandShort } from "~/lib/profile";
import { RATED_SUBJECTS, RECHECK_AFTER } from "~/lib/rating";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Call list · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const tab = sp.get("tab") === "questions" ? "questions" : "list";
  if (tab === "questions") return { tab, qs: await questions(), list: null, f: null, checked: 0 };
  const f = {
    q: sp.get("q")?.trim() ?? "", subject: sp.get("subject") ?? "", band: sp.get("band") ?? "", gender: sp.get("gender") ?? "",
    university: sp.get("university") ?? "", department: sp.get("department")?.trim() ?? "", state: sp.get("state") ?? "todo", sort: sp.get("sort") ?? "",
    limit: Number(sp.get("limit")) || ADMIN_PAGE_SIZE,
  };
  const [list, checked] = await Promise.all([callList(f), checkedCount()]);
  return { tab, qs: null, list, f, checked };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  return { error: await editQuestion(await request.formData()) };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
const select = "min-h-11 shrink-0 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring";

/** What happened last with this tutor, in a word. */
function State({ t, now }: { t: CallRow; now: number }) {
  if (t.asked_at) return <Badge tone="sky">Asked {ago(t.asked_at)}</Badge>;
  if (t.checked_at) return now - t.checked_at > RECHECK_AFTER ? <Badge tone="amber">Re-check</Badge> : <Badge tone="green">Checked {ago(t.checked_at)}</Badge>;
  if (t.call_outcome === "no_answer") return <Badge tone="grey">No answer {ago(t.call_at)}</Badge>;
  if (t.call_outcome === "later") return <Badge tone="sky">Call later</Badge>;
  return null;
}

/** The subjects at the filtered level (or all levels), short. */
function subjectsLine(t: CallRow, band: string) {
  const pairs = (t.subjects ?? "").split(",").filter(Boolean).map((p) => p.split(":") as [string, string]);
  const keys = [...new Set(pairs.filter(([b]) => !band || b === band).map(([, s]) => s))];
  const levels = [...new Set(pairs.map(([b]) => b))].sort((a, b) => BANDS.findIndex((x) => x.key === a) - BANDS.findIndex((x) => x.key === b));
  return [levels.map((b) => bandShort(b as "junior" | "ssc" | "hsc")).join(" · "), keys.map((k) => labelOf(SUBJECTS, k)).join(", ")].filter(Boolean).join(" — ");
}

function CallListTab({ list, f, checked }: { list: { total: number; items: CallRow[] }; f: NonNullable<Route.ComponentProps["loaderData"]["f"]>; checked: number }) {
  const [sp] = useSearchParams();
  const now = Math.floor(Date.now() / 1000);
  const more = new URLSearchParams(sp);
  more.set("limit", String(list.items.length + ADMIN_PAGE_SIZE));
  const back = encodeURIComponent(`/admin/calls?${sp}`);
  const tabs = [
    { key: "todo", label: "To call" }, { key: "retry", label: "Try again" }, { key: "asked", label: "Asked to update" },
    { key: "recheck", label: "Re-check" }, { key: "checked", label: "Checked" }, { key: "all", label: "All" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600"><b className="text-forest tabular-nums">{num(checked)}</b> tutors checked so far.</p>
      <Form method="get" className="space-y-2">
        <input type="hidden" name="state" value={f.state} />
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input name="q" defaultValue={f.q} aria-label="Search" placeholder="Name, phone, code" className="min-h-12 w-full rounded-xl bg-white pr-3 pl-10 text-base shadow-ring outline-none focus:ring-2 focus:ring-brand-200" />
          </label>
          <button className="min-h-12 rounded-xl bg-forest px-5 text-sm font-bold text-cream">Search</button>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <select name="band" defaultValue={f.band} aria-label="Level" className={select}>
            <option value="">Any level</option>
            {BANDS.map((b) => <option key={b.key} value={b.key}>{bandShort(b.key as "junior" | "ssc" | "hsc")}</option>)}
          </select>
          <select name="subject" defaultValue={f.subject} aria-label="Subject" className={select}>
            <option value="">Any subject</option>
            {SUBJECTS.filter((s) => s.key !== "other").map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select name="gender" defaultValue={f.gender} aria-label="Gender" className={select}>
            <option value="">Male and female</option><option value="female">Female</option><option value="male">Male</option>
          </select>
          <select name="university" defaultValue={f.university} aria-label="University" className={select}>
            <option value="">Any university</option>
            {Object.entries(UNI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input name="department" defaultValue={f.department} aria-label="Department" placeholder="Department, e.g. Physics" className={`${select} w-48 font-normal`} />
          <select name="sort" defaultValue={f.sort} aria-label="Sort" className={select}>
            <option value="">Most active</option><option value="placed">Most placed</option><option value="new">Newest</option>
          </select>
          <button className="min-h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring hover:bg-brand-50">Apply</button>
        </div>
      </Form>
      <StageTabs tabs={tabs} active={f.state} param="state" />

      {list.items.length === 0 ? <Empty>No tutors in this list.</Empty> : (
        <ul className="divide-y divide-brand-50 overflow-hidden rounded-2xl bg-white shadow-ring">
          {list.items.map((t) => (
            <li key={t.id} className="flex items-center gap-2 pr-2">
              <Link to={`/admin/calls/${t.code}?back=${back}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-50/50">
                <Avatar code={t.code} name={t.full_name} hasPhoto={!!t.photo_key} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="truncate font-bold text-forest">{t.full_name}</span><State t={t} now={now} /></span>
                  <span className="block truncate text-[13px] text-slate-600">T-{t.code} · {[t.gender === "female" ? "Female" : t.gender === "male" ? "Male" : null, t.university ? UNI[t.university] : t.institution, t.department].filter(Boolean).join(" · ")}</span>
                  <span className="block truncate text-[13px] text-slate-500">{subjectsLine(t, f.band) || "No subjects listed"}</span>
                  <span className="block text-[13px] text-slate-500 tabular-nums">{num(t.apps90)} applied in 90 days · {num(t.placed)} placed</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-slate-300" aria-hidden />
              </Link>
              {t.phone && <a href={telLink(t.phone)} aria-label={`Call ${t.full_name}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"><Phone size={18} aria-hidden /></a>}
            </li>
          ))}
        </ul>
      )}
      {list.items.length > 0 && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <p className="text-sm text-slate-500 tabular-nums">Showing {num(list.items.length)} of {num(list.total)}</p>
          {list.items.length < list.total && list.items.length < 300 && (
            <Link to={`?${more}`} preventScrollReset className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-forest shadow-ring hover:bg-brand-50">
              Load {num(Math.min(ADMIN_PAGE_SIZE, list.total - list.items.length))} more
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const forWho = (q: Pick<Question, "band" | "subject">) =>
  [q.band === "any" ? null : bandShort(q.band as "junior" | "ssc" | "hsc"), q.subject ? labelOf(SUBJECTS, q.subject) : null].filter(Boolean).join(" · ") || "Everyone";

function QuestionsTab({ qs, error }: { qs: Question[]; error?: string | null }) {
  const busy = useNavigation().state === "submitting";
  const groups = [...new Set(qs.map(forWho))];
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed text-slate-600">কলের সময় এই প্রশ্নগুলো tutor-এর level আর subject অনুযায়ী দেখাবে। যেকোনো প্রশ্ন বদলান, মুছুন বা নতুন যোগ করুন।</p>
      {error && <p role="alert" className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">{error}</p>}
      <Form method="post" className="space-y-2 rounded-2xl bg-white p-4 shadow-ring">
        <input type="hidden" name="intent" value="q_add" />
        <p className="font-bold text-forest">New question</p>
        <textarea name="body" rows={2} maxLength={300} required placeholder="যেমন: Organic Chemistry কীভাবে শুরু করান?" className="w-full rounded-xl bg-cream px-3 py-2 text-base outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
        <div className="flex flex-wrap gap-2">
          <select name="band" aria-label="Level" className={select}>
            <option value="any">Any level</option>
            {BANDS.map((b) => <option key={b.key} value={b.key}>{bandShort(b.key as "junior" | "ssc" | "hsc")}</option>)}
          </select>
          <select name="subject" aria-label="Subject" className={select}>
            <option value="">Any subject</option>
            {RATED_SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button disabled={busy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-bold text-cream disabled:opacity-60"><Plus size={16} aria-hidden />Add</button>
        </div>
      </Form>
      {groups.map((g) => (
        <section key={g} className="overflow-hidden rounded-2xl bg-white shadow-ring">
          <h2 className="border-b border-brand-50 bg-brand-50/60 px-4 py-2.5 text-sm font-bold text-forest">{g}</h2>
          <ul className="divide-y divide-brand-50">
            {qs.filter((q) => forWho(q) === g).map((q) => (
              <li key={q.id} className="p-3">
                <Form method="post" className="flex items-start gap-2">
                  <input type="hidden" name="id" value={q.id} />
                  <textarea name="body" defaultValue={q.body} rows={2} maxLength={300} aria-label="Question" className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-[15px] leading-relaxed outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-200" />
                  <span className="flex shrink-0 flex-col gap-1.5">
                    <button name="intent" value="q_edit" disabled={busy} className="min-h-11 rounded-xl bg-brand-50 px-3 text-sm font-bold text-forest hover:bg-brand-100 disabled:opacity-60">Save</button>
                    <button name="intent" value="q_remove" disabled={busy} aria-label="Remove question" className="grid min-h-11 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"><Trash2 size={17} aria-hidden /></button>
                  </span>
                </Form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function AdminCalls({ loaderData, actionData }: Route.ComponentProps) {
  const { tab } = loaderData;
  return (
    <>
      <PageHead title="Call list" sub="Phone tutors, rate them and fill in their experience. Ratings are private; tutors only see “HTR checked”." />
      <nav aria-label="Call list" className="mb-4 flex gap-1.5">
        {([["list", "Tutors"], ["questions", "Questions"]] as const).map(([k, label]) => (
          <Link key={k} to={k === "list" ? "/admin/calls" : "/admin/calls?tab=questions"} aria-current={tab === k ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${tab === k ? "bg-forest text-cream" : "bg-white text-slate-600 shadow-ring hover:text-forest"}`}>{label}</Link>
        ))}
      </nav>
      {loaderData.list && loaderData.f ? <CallListTab list={loaderData.list} f={loaderData.f} checked={loaderData.checked} /> : <QuestionsTab qs={loaderData.qs ?? []} error={actionData?.error} />}
    </>
  );
}
