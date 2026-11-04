// One tuition for the admin (owner, 2026-11-04): what it is and who the guardian is on top, one-tap Publish / Pause /
// Close, then three tabs: the applicant workspace (table or board, best fit first), the details form and the history.
import { useState } from "react";
import { Form, Link, type ShouldRevalidateFunctionArgs, data, useNavigation, useSearchParams } from "react-router";
import {
  ArrowUpRight, CircleAlert, Copy, Check, Eye, EyeOff, MessageCircle, MoreHorizontal, Pause, Phone, Play, Rocket, RotateCcw,
} from "lucide-react";
import type { Route } from "./+types/admin.tuitions.$code";
import { ApplicantWorkspace } from "~/components/Applicants";
import { Badge, Money, PageHead, ago, num, primaryButton, when, TUITION_TONE } from "~/components/admin";
import { TuitionFields } from "~/components/TuitionFields";
import { APPLICATION_STATUS, TUITION_STATUS, publishGaps } from "~/lib/admin-labels";
import { getTuition, moveApplication, setTuitionState, updateTuition } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";
import { waLink } from "~/lib/contact";
import { tutorFromLabel } from "~/lib/fit";
import { AREAS, CLASS_LEVELS, LEAD_SOURCES, MEDIUMS, STUDENT_GENDERS, SUBJECTS, labelOf } from "~/lib/options";
import { GENDER_CHIP, SUBJECT_TONE, SUBJECT_TONE_OTHER, needText, scheduleNote } from "~/lib/tuition";
import { classLabel, requirementKeys, subjectLabel } from "~/lib/request";
import { FollowUpButton } from "~/components/FollowUps";
import { facebookPost, whatsappPost } from "~/lib/whatsapp";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `HTR-${params.code} · Admin` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const found = await getTuition(Number(params.code) || -1);
  if (!found) throw data("Tuition not found", { status: 404 });
  return { ...found, origin: new URL(request.url).origin };
}

// Picking an applicant, a tab or a sort only changes the address; the data is already here.
export function shouldRevalidate({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (!formMethod && currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

export async function action({ request, params }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const code = Number(params.code) || -1;
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "move") {
    const error = await moveApplication(Number(form.get("id")), String(form.get("to")), String(form.get("reason") ?? ""), viewer?.id ?? null);
    return { error, saved: false, note: "" };
  }
  if (intent === "state") {
    const op = String(form.get("op"));
    const error = await setTuitionState(code, op, viewer?.id ?? null);
    return { error, saved: !error, note: error ? "" : OP_DONE[op] ?? "Saved." };
  }
  const error = await updateTuition(code, form, viewer?.id ?? null);
  return { error, saved: !error, note: error ? "" : "Details saved." };
}

const OP_DONE: Record<string, string> = {
  publish: "Published. It's on the board now.", pause: "Applications paused.", resume: "Taking applications again.", hide: "Hidden from the board.",
  close: "Tuition closed.", cancel: "Tuition cancelled.", reopen: "Re-opened.",
};

const Chip = ({ tone, children }: { tone: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>
);

function StateButton({ op, children, primary, busy }: { op: string; children: React.ReactNode; primary?: boolean; busy: boolean }) {
  return (
    <Form method="post" preventScrollReset>
      <input type="hidden" name="intent" value="state" />
      <button name="op" value={op} disabled={busy}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-60 ${primary ? "bg-mango text-forest hover:bg-mango-deep" : "bg-white text-forest shadow-ring hover:bg-brand-50"}`}>
        {children}
      </button>
    </Form>
  );
}

function CopyPost({ text, label, title }: { text: string; label: string; title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title={title}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { window.prompt("Copy this:", text); }
      }}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring hover:bg-brand-50">
      {done ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{done ? "Copied" : label}
    </button>
  );
}

const HISTORY_WORD: Record<string, string> = {
  tuition_updated: "Details edited", tuition_created: "Tuition created", tuition_from_lead: "Posted from a lead", tuition_publish: "Published to the board",
  tuition_pause: "Applications paused", tuition_resume: "Applications resumed", tuition_hide: "Hidden from the board", tuition_close: "Closed",
  tuition_cancel: "Cancelled", tuition_reopen: "Re-opened",
};

export default function AdminTuition({ loaderData: { tuition: t, priv, applicants, placements, history, origin }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [sp] = useSearchParams();
  const tab = sp.get("tab") ?? (t.status === "draft" ? "details" : "applicants");
  const subjects = t.subjects.split(",").filter(Boolean);
  const tutorFrom = (t.tutor_from ?? "").split(",").filter(Boolean);
  const gender = GENDER_CHIP[t.tutor_gender_pref as keyof typeof GENDER_CHIP] ?? GENDER_CHIP.any;
  const open = t.status === "available" || t.status === "processing";
  const gaps = publishGaps(t);
  const live = applicants.filter((a) => ["submitted", "under_review", "shortlisted", "trial_arranged", "confirmed"].includes(a.status)).length;
  const fresh = applicants.filter((a) => a.status === "submitted").length;
  const guardianPhone = priv?.guardian_phone ?? null;
  const tabHref = (k: string) => {
    const next = new URLSearchParams();
    if (k !== "applicants") next.set("tab", k);
    return `?${next}`;
  };

  return (
    <>
      <PageHead
        back={{ to: "/admin/tuitions", label: "Tuitions" }}
        eyebrow={<>HTR-{t.code}{t.posted_at ? ` · posted ${ago(t.posted_at)}` : " · not posted yet"}</>}
        title={<>{classLabel(t.class_level, t.class_other) || "No class"}<span className="text-slate-300"> · </span>{t.mode === "online" ? "Online" : labelOf(AREAS, t.area) || "No area"}</>}
        action={
          <>
            <Badge tone={TUITION_TONE[t.status]}>{TUITION_STATUS[t.status]}</Badge>
            {t.is_public === 1 && <Badge tone="mango">{t.accepting_applications ? "On the board" : "On the board · paused"}</Badge>}
          </>
        }
      />

      <div className="space-y-5">
        {actionData?.error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900"><CircleAlert size={18} aria-hidden />{actionData.error}</p>}
        {actionData?.saved && actionData.note && <p role="status" className="animate-rise rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">{actionData.note}</p>}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-2xl bg-white p-5 shadow-ring sm:p-6">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <Money amount={t.salary_amount} kind={t.salary_kind} className="text-4xl" />
              {t.salary_kind === "fixed" && t.salary_amount ? <span className="pb-1 text-sm font-semibold text-slate-500">/month</span> : null}
              <span className="pb-1 text-sm text-slate-600">· {t.days_per_week} days/week{scheduleNote(t) && ` · ${scheduleNote(t)}`}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone={gender.tone}>{gender.label}</Chip>
              {tutorFrom.length > 0 && <Chip tone="bg-brand-50 text-brand-700 ring-1 ring-brand-100">From {tutorFromLabel(tutorFrom)}</Chip>}
              {subjects.map((s) => <Chip key={s} tone={`ring-1 ${SUBJECT_TONE[s] ?? SUBJECT_TONE_OTHER}`}>{subjectLabel(s, t.subject_other)}</Chip>)}
              {t.student_gender && <Chip tone="bg-slate-50 text-slate-700 ring-1 ring-slate-200">{labelOf(STUDENT_GENDERS, t.student_gender)}</Chip>}
              {t.medium && <Chip tone="bg-slate-50 text-slate-700 ring-1 ring-slate-200">{labelOf(MEDIUMS, t.medium)}</Chip>}
            </div>
            {needText({ ...t, requirement_keys: requirementKeys(t.requirement_keys) }) && <p className="mt-3 border-l-[3px] border-brand-600 pl-2.5 text-sm font-semibold text-forest">{needText({ ...t, requirement_keys: requirementKeys(t.requirement_keys) })}</p>}

            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-brand-50 pt-4 text-center">
              {[["Applied", applicants.length], ["Open", live], ["New", fresh]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cream py-2"><dt className="text-xs text-slate-500">{k}</dt><dd className="text-xl font-extrabold text-forest tabular-nums">{num(Number(v))}</dd></div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {t.status === "draft" || (open && t.is_public === 0) ? (
                <StateButton op="publish" primary busy={busy}><Rocket size={16} aria-hidden />Publish to board</StateButton>
              ) : null}
              {open && t.is_public === 1 && t.accepting_applications === 1 && <StateButton op="pause" busy={busy}><Pause size={16} aria-hidden />Pause applications</StateButton>}
              {open && t.is_public === 1 && t.accepting_applications === 0 && <StateButton op="resume" primary busy={busy}><Play size={16} aria-hidden />Take applications</StateButton>}
              {(t.status === "booked" || t.status === "processing") && <StateButton op="reopen" busy={busy}><RotateCcw size={16} aria-hidden />Re-open</StateButton>}
              {t.is_public === 1 && (
                <>
                  <CopyPost label="Facebook post" title="Facebook গ্রুপের জন্য, লিংক ছাড়া" text={facebookPost(t)} />
                  <CopyPost label="WhatsApp post" title="WhatsApp-এর জন্য, আবেদনের লিংকসহ" text={whatsappPost(t, origin)} />
                </>
              )}
              <FollowUpButton kind="tuition" refId={t.code} />
              {t.is_public === 1 && <Link to={`/tuitions/HTR-${t.code}`} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">View<ArrowUpRight size={15} aria-hidden /></Link>}
              {t.status !== "closed" && t.status !== "cancelled" && (
                <details className="relative">
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl px-3 text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden" aria-label="More actions"><MoreHorizontal size={18} aria-hidden /></summary>
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-2xl bg-white p-1.5 shadow-lift">
                    {t.is_public === 1 && (
                      <Form method="post"><input type="hidden" name="intent" value="state" /><button name="op" value="hide" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-brand-50"><EyeOff size={16} aria-hidden />Hide from board</button></Form>
                    )}
                    {t.is_public === 0 && open && gaps.length === 0 && (
                      <Form method="post"><input type="hidden" name="intent" value="state" /><button name="op" value="publish" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-brand-50"><Eye size={16} aria-hidden />Show on board</button></Form>
                    )}
                    <Form method="post"><input type="hidden" name="intent" value="state" /><button name="op" value="close" className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-semibold text-forest hover:bg-brand-50">Close (done or old)</button></Form>
                    {t.status !== "booked" && <Form method="post"><input type="hidden" name="intent" value="state" /><button name="op" value="cancel" className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50">Cancel (guardian dropped)</button></Form>}
                  </div>
                </details>
              )}
            </div>
            {(t.status === "draft" || (open && t.is_public === 0)) && gaps.length > 0 && (
              <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900"><b>Before publishing:</b> {gaps.join(", ")}. <Link to={tabHref("details")} className="font-bold underline">Fill in</Link></p>
            )}
          </div>

          <aside className="rounded-2xl bg-rose-50/70 p-5 ring-1 ring-rose-100">
            <p className="text-[11px] font-bold tracking-[0.14em] text-rose-800 uppercase">Guardian · private</p>
            <p className="mt-2 text-lg font-bold text-forest">{priv?.guardian_label || "Guardian"}</p>
            {priv?.exact_address && <p className="mt-0.5 text-sm text-slate-700">{priv.exact_address}</p>}
            <p className="mt-1 text-xs text-slate-500">{[labelOf(LEAD_SOURCES, priv?.lead_source), priv?.tutor_qualification].filter(Boolean).join(" · ")}</p>
            {priv?.private_notes && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm whitespace-pre-line text-slate-700">{priv.private_notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {guardianPhone && (
                <>
                  <a href={`tel:${guardianPhone}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-3 text-sm font-bold text-cream hover:bg-brand-700"><Phone size={16} aria-hidden />{guardianPhone}</a>
                  <a href={waLink(guardianPhone, "")} target="_blank" rel="noreferrer" className="wa-btn inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-forest shadow-ring"><MessageCircle size={16} aria-hidden />WhatsApp</a>
                </>
              )}
            </div>
            {priv?.guardian_id && <Link to={`/admin/guardians/${priv.guardian_id}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand-700">Their other tuitions →</Link>}
            {placements.length > 0 && (
              <div className="mt-3 border-t border-rose-100 pt-3">
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Placed tutor</p>
                {placements.map((p) => (
                  <p key={p.id} className="mt-1 flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                    {p.tutor_name || p.legacy_tutor_name || p.legacy_tutor_phone}<Badge tone={p.status === "confirmed" ? "brand" : p.status === "cancelled" ? "grey" : "green"}>{p.status === "selected" ? "Selected" : p.status[0].toUpperCase() + p.status.slice(1)}</Badge>
                  </p>
                ))}
              </div>
            )}
          </aside>
        </section>

        <nav aria-label="Tuition" className="flex gap-1 border-b border-brand-100">
          {[["applicants", `Applicants ${applicants.length ? `(${applicants.length})` : ""}`], ["details", "Details"], ["history", "History"]].map(([k, label]) => (
            <Link key={k} to={tabHref(k)} preventScrollReset replace aria-current={tab === k ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-bold transition-colors ${tab === k ? "border-forest text-forest" : "border-transparent text-slate-500 hover:text-forest"}`}>
              {label}
            </Link>
          ))}
        </nav>

        {tab === "applicants" && <ApplicantWorkspace t={t} applicants={applicants} guardianPhone={guardianPhone} />}

        {tab === "details" && (
          <Form method="post" className="space-y-4" key={`${t.status}-${t.is_public}-${t.accepting_applications}`}>
            <input type="hidden" name="intent" value="edit" />
            <input type="hidden" name="status" value={t.status} />
            {t.is_public === 1 && <input type="hidden" name="is_public" value="1" />}
            {t.accepting_applications === 1 && <input type="hidden" name="accepting" value="1" />}
            <TuitionFields t={t} address={priv?.exact_address} />
            <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex justify-end lg:bottom-4">
              <button disabled={busy} className={`${primaryButton} w-full shadow-lift sm:w-auto`}>{busy ? "Saving…" : "Save details"}</button>
            </div>
          </Form>
        )}

        {tab === "history" && (
          <ol className="relative space-y-3 border-l-2 border-brand-100 pl-5">
            {history.length === 0 && <li className="text-sm text-slate-500">Nothing yet.</li>}
            {history.map((h, i) => (
              <li key={i} className="relative">
                <span aria-hidden className={`absolute top-1.5 -left-[27px] size-3 rounded-full ring-4 ring-[#f7f8f4] ${h.kind === "step" ? (h.to_status === "confirmed" ? "bg-brand-600" : h.to_status === "trial_arranged" ? "bg-mango-deep" : "bg-slate-300") : "bg-forest"}`} />
                <p className="text-sm text-slate-900">
                  {h.kind === "step" ? (
                    <>
                      {h.tutor_code ? <Link to={`/admin/tutors/${h.tutor_code}`} className="font-bold text-forest hover:underline">{h.who}</Link> : <b>{h.who || "Applicant"}</b>}
                      {" → "}<b>{APPLICATION_STATUS[h.to_status ?? ""] ?? h.to_status}</b>
                      {h.by_tutor ? <span className="ml-1.5 rounded bg-sky-100 px-1.5 text-xs font-semibold text-sky-900">by tutor</span> : null}
                      {h.reason && <span className="text-slate-500"> · {h.reason}</span>}
                    </>
                  ) : <b>{HISTORY_WORD[h.kind] ?? h.kind}</b>}
                </p>
                <p className="text-xs text-slate-500">{when(h.at)} · {ago(h.at)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
