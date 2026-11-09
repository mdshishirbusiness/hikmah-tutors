// One apply window (owner, 2026-11-09): a tap on a board card, its Apply, or a shared link opens this one view. The same
// ticket card as the board on top, the details the card leaves out as plain rows (with the fee), how the tutor fits, an
// optional note for HTR, and a fixed Apply button. Only a gender mismatch blocks; the rest warn. No limit on how many
// tuitions a tutor applies to. Visitors see the tuition and sign in to apply; `/tuitions/:code/apply` lands here too.
import { useState } from "react";
import { Form, Link, data, redirect, useNavigate, useNavigation } from "react-router";
import { AlertTriangle, ArrowLeft, Check, Share2, X } from "lucide-react";
import type { Route } from "./+types/tuitions.$code";
import { inputClass, primaryButton } from "~/components/admin";
import { EarningsChart } from "~/components/EarningsChart";
import { FeeBox } from "~/components/FeeBox";
import { Icon } from "~/components/Icon";
import { Toast, useShare } from "~/components/site";
import { SiteTutorBar, useTutorSignedIn } from "~/components/tutor";
import { TuitionCard, placeLabel, subjectList } from "~/components/TuitionCard";
import type { Fit } from "~/lib/fit";
import { atTime, timeOfDay, tutorFromLabel } from "~/lib/fit";
import { PremiumNudge } from "~/components/PremiumNudge";
import { applyTo, applyView, optionalTutor, requireTutor } from "~/lib/me.server";
import { premiumNudgeOk } from "~/lib/premium.server";
import { MEDIUMS, MODES, STUDENT_GENDERS, SUBJECTS, labelOf } from "~/lib/options";
import { classLabel, requirementLabels } from "~/lib/request";
import { APPLY_NOTE_MAX, type PublicTuition, feeDisplay, formatDate, scheduleNote, taka } from "~/lib/tuition";
import { visibleTuition } from "~/lib/tuitions.server";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Tuition not found · Hikmah Tutors" }];
  const { t } = loaderData;
  return [
    { title: `${classLabel(t.class_level, t.class_other)}, ${placeLabel(t)} · ${t.code_label} · Hikmah Tutors` },
    { name: "description", content: `${classLabel(t.class_level, t.class_other)}: ${subjectList(t)}. ${placeLabel(t)}, Rajshahi.` },
  ];
}

// The page shows the signed-in tutor's own fit, so no shared cache may keep it.
export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export const codeOf = (param: string) => Number(/^(?:HTR-)?(\d{1,9})$/i.exec(param)?.[1]) || -1;

// Public tuition fields for everyone; the fit and the apply state only for the signed-in tutor's own record.
export async function loader({ request, params }: Route.LoaderArgs) {
  const code = codeOf(params.code);
  const { viewer, me } = await optionalTutor(request);
  const ready = me?.setup_done_at ? me : null;
  const view = ready ? await applyView(ready, code) : null;
  const t = view?.t ?? (code > 0 ? await visibleTuition(code) : null);
  if (!t) throw data("Tuition not found", { status: 404 });
  const who = !viewer ? "visitor" : viewer.role === "owner" ? "owner" : !me ? "join" : !ready ? "setup" : "tutor";
  // The Premium reminder: checked tutors with no Premium term (the 3-day gap is kept on the phone).
  const nudge = who === "tutor" && ready?.review_status === "approved" ? await premiumNudgeOk(ready.id) : false;
  return {
    nudge,
    t, who, now: Math.floor(Date.now() / 1000), fit: view?.fit ?? null, applied: view?.applied ?? false,
    minSalary: ready?.min_salary ?? null, paused: ready?.availability_paused === 1, review: ready?.review_status ?? null,
  } as const;
}

export async function action({ request, params }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request);
  const code = codeOf(params.code);
  const form = await request.formData();
  const error = await applyTo(viewer, me, code, String(form.get("note") ?? "").trim());
  if (error) return { error };
  throw redirect(`/applied?new=${code}`);
}

type FitRow = { tone: "ok" | "warn" | "bad"; text: string };

/** The fit in the tutor's words. Rows the site can't judge yet (no classes picked, no university wish) are left out. */
function fitRows(t: PublicTuition, fit: Fit, minSalary: number | null): FitRow[] {
  const rows: FitRow[] = [];
  const wanted = t.tutor_gender_pref === "female" ? "a female tutor" : "a male tutor";
  if (t.tutor_gender_pref !== "any") rows.push(fit.gender === "ok" ? { tone: "ok", text: `Wants ${wanted}: you match` } : { tone: "bad", text: `This tuition needs ${wanted}` });
  const cls = classLabel(t.class_level, t.class_other);
  if (fit.class !== "unknown") rows.push(fit.class === "ok" ? { tone: "ok", text: `${cls} is in your classes` } : { tone: "warn", text: `${cls} isn't in your classes` });
  if (fit.subjectTotal) {
    const all = fit.subjects.length === fit.subjectTotal;
    rows.push({
      tone: all ? "ok" : "warn",
      text: fit.subjects.length
        ? `You teach ${all ? "all" : `${fit.subjects.length} of ${fit.subjectTotal}`} subjects: ${fit.subjects.map((s) => labelOf(SUBJECTS, s)).join(", ")}`
        : `You haven't listed ${subjectList(t)} for this level`,
    });
  }
  if (t.mode !== "online") {
    const area = placeLabel(t);
    rows.push(fit.area === "listed" ? { tone: "ok", text: `${area} is in your areas` } : fit.area === "nearby" ? { tone: "ok", text: `${area} is near where you live` } : { tone: "warn", text: `${area} isn't in your areas` });
  }
  if (fit.university) {
    rows.push(fit.university === "ok" ? { tone: "ok", text: `Guardian wants ${tutorFromLabel(t.tutor_from)}: you match` } : { tone: "warn", text: `Guardian prefers a tutor from ${tutorFromLabel(t.tutor_from)}` });
  }
  if (fit.salary === "low" && t.salary_amount && minSalary) rows.push({ tone: "warn", text: `${taka(t.salary_amount)} is below your minimum of ${taka(minSalary)}` });
  if (fit.time) {
    const when = atTime(timeOfDay(t));
    rows.push(fit.time === "ok" ? { tone: "ok", text: `You're free ${when}` } : { tone: "warn", text: `It's ${when}, which isn't in your free times` });
  }
  return rows;
}

// Brand tones for the fit; rose only for the one row that stops the tutor.
const FIT_ICON = {
  ok: { icon: Check, tone: "bg-brand-100 text-brand-700" },
  warn: { icon: AlertTriangle, tone: "bg-mango text-forest" },
  bad: { icon: X, tone: "bg-rose-100 text-rose-800" },
};

/**
 * Where the area is (owner, 2026-11-06: "13 Khadia, where exactly?"). The map opens on a tap and searches the area's
 * name only, never the house, road or landmark: those stay with the Selected tutor.
 */
function AreaMap({ place }: { place: string }) {
  const [open, setOpen] = useState(false);
  const q = encodeURIComponent(`${place}, Rajshahi`);
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-100">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon name="pin" className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-forest">{open ? "Hide map" : `Where is ${place}?`}</span>
          <span className="block text-sm text-slate-500">See the area on a map</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-brand-50">
          <iframe title={`Map of ${place}, Rajshahi`} src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer" className="block h-64 w-full sm:h-80" />
          <p className="px-4 py-3 text-sm text-slate-500">
            এলাকাটা দেখানো হচ্ছে, বাসার ঠিকানা নয়। ঠিকানা পাবেন Selected হলে।{" "}
            <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Open in Google Maps</a>
          </p>
        </div>
      )}
    </section>
  );
}

/** One plain row: what on the left, the value on the right. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-24 shrink-0 text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-semibold break-words text-forest">{children}</dd>
    </div>
  );
}

const sectionTitle = "mb-2 px-1 text-sm font-bold tracking-wide text-slate-500 uppercase";

export default function TuitionWindow({ loaderData: { t, who, now, fit, applied, minSalary, paused, review, nudge }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const navigate = useNavigate();
  const { share, toast } = useShare();
  const [note, setNote] = useState("");
  const withBar = useTutorSignedIn();
  const open = t.is_available && t.accepting_applications;
  const rows = fit ? fitRows(t, fit, minSalary) : [];
  const blocked = fit?.gender === "mismatch";
  const canApply = who === "tutor" && review === "approved" && open && !applied && !blocked;
  const here = `/tuitions/${t.code_label}`;
  const requirements = requirementLabels(t.requirement_keys);
  // Back keeps the board where the tutor left it; a shared link opened cold goes to the board.
  const back = (e: React.MouseEvent) => {
    if ((window.history.state?.idx ?? 0) > 0) { e.preventDefault(); navigate(-1); }
  };

  let action: React.ReactNode;
  if (who === "visitor") action = <Link to={`/login?next=${encodeURIComponent(here)}`} className={`${primaryButton} w-full`}>Sign in to apply</Link>;
  else if (who === "join") action = <Link to={`/me/join?next=${encodeURIComponent(here)}`} className={`${primaryButton} w-full`}>Join as a tutor to apply</Link>;
  else if (who === "setup") action = <Link to={`/me/setup?next=${encodeURIComponent(here)}`} className={`${primaryButton} w-full`}>Finish sign-up to apply</Link>;
  else if (who === "owner") action = <Link to={`/admin/tuitions/${t.code}`} className={`${primaryButton} w-full`}>Open in admin</Link>;
  else if (applied) action = <Link to="/applied" className={`${primaryButton} w-full`}>You've applied · See Applied</Link>;
  else if (review !== "approved") action = <Link to={review === "needs_fix" ? "/me/join" : "/me"} className={`${primaryButton} w-full`}>{review === "needs_fix" ? "Fix my profile" : "Go to My home"}</Link>;
  else if (!open) action = <Link to="/" className={`${primaryButton} w-full`}>See open tuitions</Link>;
  else if (blocked) action = <Link to="/" className={`${primaryButton} w-full`}>See other tuitions</Link>;
  else action = <button form="apply" disabled={busy} className={`${primaryButton} w-full`}>{busy ? "Applying…" : "Apply"}</button>;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-2">
          <Link to="/" onClick={back} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-semibold text-forest hover:bg-brand-50">
            <ArrowLeft size={20} aria-hidden />Board
          </Link>
          <p className="flex-1 text-center text-sm font-bold tracking-wide text-slate-500">{t.code_label}</p>
          <button type="button" onClick={() => share(here, `${t.code_label} · Hikmah Tutors`)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-semibold text-forest hover:bg-brand-50">
            <Share2 size={18} aria-hidden />Share
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 pt-4 pb-56 lg:pb-32">
        <h1 className="sr-only">{classLabel(t.class_level, t.class_other)}, {placeLabel(t)} · {t.code_label}</h1>
        {!t.is_available && (
          <p role="status" className="rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-800">This tuition is no longer open.</p>
        )}
        <TuitionCard t={t} now={now} linked={false} />

        <section aria-labelledby="details">
          <h2 id="details" className={sectionTitle}>Details</h2>
          <dl className="divide-y divide-brand-50 rounded-2xl bg-white px-4 ring-1 ring-brand-100">
            <Row label="Days">{t.days_per_week} days a week</Row>
            <Row label="Time">{scheduleNote(t) || "To be discussed"}</Row>
            <Row label="Where">{t.mode === "online" ? "Online" : `${placeLabel(t)}, Rajshahi · ${labelOf(MODES, t.mode)}`}</Row>
            {t.student_gender && <Row label="Student">{labelOf(STUDENT_GENDERS, t.student_gender)}</Row>}
            {t.medium && <Row label="Medium">{labelOf(MEDIUMS, t.medium)}</Row>}
            {t.tutor_from.length > 0 && <Row label="Tutor from">{tutorFromLabel(t.tutor_from)}</Row>}
            {(requirements.length > 0 || t.requirements_public) && (
              <Row label="Requirements">
                {requirements.length > 0 && <span className="block">{requirements.join(" · ")}</span>}
                {t.requirements_public && <span className="mt-1 block whitespace-pre-line">{t.requirements_public}</span>}
              </Row>
            )}
            {t.start_note && <Row label="Start">{t.start_note}</Row>}
            {t.posted_at && <Row label="Posted">{formatDate(t.posted_at)}</Row>}
          </dl>
        </section>
        {t.mode !== "online" && t.area !== "other" && <AreaMap place={placeLabel(t)} />}

        <EarningsChart fees={feeDisplay(t)} />
        <FeeBox fees={feeDisplay(t)} />

        {who === "tutor" && review !== "approved" && !applied && (
          // New tutors apply after the owner checks their registration (owner, 2026-11-04).
          <p className="rounded-2xl bg-mango px-4 py-3 text-forest">
            <span className="block font-extrabold">{review === "needs_fix" ? "HTR asked you to fix your profile" : "HTR is checking your profile"}</span>
            <span className="text-sm">{review === "needs_fix" ? "Fix it, and you can apply once it's checked." : "You can apply as soon as it's checked, usually within a day."}</span>
          </p>
        )}

        {rows.length > 0 && (
          <section aria-labelledby="fit">
            <h2 id="fit" className={sectionTitle}>Your fit</h2>
            <ul className="divide-y divide-brand-50 rounded-2xl bg-white px-4 ring-1 ring-brand-100">
              {rows.map((r) => {
                const I = FIT_ICON[r.tone];
                return (
                  <li key={r.text} className="flex items-start gap-3 py-3">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${I.tone}`}><I.icon size={15} strokeWidth={2.5} aria-hidden /></span>
                    <span className={`pt-0.5 text-[15px] leading-snug ${r.tone === "bad" ? "font-semibold text-rose-900" : "text-slate-800"}`}>{r.text}</span>
                  </li>
                );
              })}
            </ul>
            {!blocked && rows.some((r) => r.tone === "warn") && <p className="mt-2 px-1 text-sm text-slate-500">Warnings don't stop you. HTR sees them too.</p>}
            {blocked && <p className="mt-2 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">You can't apply to this one. Find others on the board.</p>}
          </section>
        )}

        {applied && who === "tutor" && (
          <p className="flex items-center gap-2 rounded-2xl bg-brand-100 px-4 py-3 font-semibold text-forest"><Check size={18} aria-hidden />HTR has your application. You'll see every step in Applied.</p>
        )}

        {canApply && (
          <Form id="apply" method="post" className="space-y-3">
            {actionData?.error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
            {paused && (
              <p className="flex items-start gap-3 rounded-xl bg-mango px-4 py-3 text-sm text-forest">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                <span><span className="font-semibold">You're paused.</span> Applying turns pause off, so HTR can send you tuitions again.</span>
              </p>
            )}
            <label className="block rounded-2xl bg-white p-4 ring-1 ring-brand-100">
              <span className="block text-lg leading-snug font-bold text-forest">Anything for HTR about this tuition? <span className="text-sm font-normal text-slate-500">Optional</span></span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-600">যেমন: এই ক্লাসে আগে কাদের পড়িয়েছেন, কাছেই থাকেন, কবে থেকে শুরু করতে পারবেন।</span>
              <textarea name="note" rows={4} maxLength={APPLY_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="নিজের মতো লিখুন…" className={`${inputClass} mt-3 py-3`} />
              <span className="mt-1 flex justify-between gap-3 text-sm text-slate-500">
                <span>ফোন নম্বর লিখবেন না; লিখলে কেটে দেওয়া হয়।</span>
                <span className={`shrink-0 tabular-nums ${note.length > APPLY_NOTE_MAX * 0.9 ? "font-semibold text-forest" : ""}`}>{note.length}/{APPLY_NOTE_MAX}</span>
              </span>
            </label>
          </Form>
        )}
      </main>

      {/* Sits on top of the tutor's bottom bar on phones (3.5 rem + its border), at the bottom otherwise. No transform
          on any parent: it would pin this bar to that box instead of the screen. */}
      <div className={`fixed inset-x-0 z-30 border-t border-brand-100 bg-white/95 px-4 py-3 backdrop-blur ${withBar ? "bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[calc(0.75rem+env(safe-area-inset-bottom))]" : "bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"}`}>
        <div className="mx-auto max-w-lg">{action}</div>
      </div>
      <SiteTutorBar />
      <PremiumNudge show={nudge} />
      <Toast message={toast} />
    </>
  );
}
