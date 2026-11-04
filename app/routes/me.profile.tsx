// The tutor's Profile tab (owner, 2026-11-04). The pause switch saves on its own tap; everything a tutor may change
// (areas, classes, subjects, lowest salary, transport, demo class, About) saves together from one sticky bar. Name,
// phone, gender, university and results are locked and change through HTR.
import { useEffect, useState } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { Check, Lock, LogOut, MessageCircle, PauseCircle, PlayCircle } from "lucide-react";
import type { Route } from "./+types/me.profile";
import { Avatar } from "~/components/Avatar";
import { inputClass } from "~/components/admin";
import { SitePage } from "~/components/site";
import { AreaField, ClassField, SalaryField, SubjectField } from "~/components/TeachingFields";
import { ChoiceChip, TutorBar } from "~/components/tutor";
import { CONTACT, waLink } from "~/lib/contact";
import { myChoices, requireTutor, saveProfile, setPaused, tutorBadges } from "~/lib/me.server";
import { MEDIUMS, TRANSPORTS, labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Profile · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { viewer, me } = await requireTutor(request);
  const [choices, badges] = await Promise.all([myChoices(me.id), tutorBadges(viewer, me)]);
  return { me, choices, badges };
}

export async function action({ request }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request);
  const form = await request.formData();
  if (form.get("intent") === "pause") {
    await setPaused(viewer, me, form.get("paused") === "1");
    return { error: null, saved: form.get("paused") === "1" ? "Paused. HTR won't suggest tuitions until you turn it back on." : "You're taking tuitions again." };
  }
  form.set("paused", me.availability_paused ? "1" : "0");
  const error = await saveProfile(viewer, me, form);
  return { error, saved: error ? null : "Saved. For You now uses your new choices." };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-ring sm:p-5 target:ring-2 target:ring-brand-500">
      <h2 className="font-extrabold text-forest">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Profile({ loaderData: { me, choices, badges } }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const [about, setAbout] = useState(me.about ?? "");
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!actionData?.saved) return;
    setDirty(false);
    setToast(actionData.saved);
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [actionData]);
  const picked = new Set(choices.subjects.map((s) => `${s.band}:${s.subject}`));
  const paused = me.availability_paused === 1;

  return (
    <SitePage app>
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-40 sm:px-6">
        <header className="flex items-center gap-4">
          <Avatar code={me.code} name={me.full_name} hasPhoto={!!me.photo_key} size="xl" className="shadow-card" />
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.12em] text-brand-700 uppercase">T-{me.code}</p>
            <h1 className="text-[26px] leading-tight font-extrabold tracking-tight break-words text-forest">{me.full_name}</h1>
            <p className="text-sm text-slate-600">{[me.university && UNI[me.university], me.department, me.session_year && `Session ${me.session_year}`].filter(Boolean).join(" · ")}</p>
          </div>
        </header>

        {actionData?.error && <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}

        <Form method="post" id="availability" className={`mt-5 flex scroll-mt-24 items-center gap-4 rounded-2xl p-4 ${paused ? "bg-amber-100" : "bg-forest text-cream"}`}>
          <input type="hidden" name="intent" value="pause" />
          <input type="hidden" name="paused" value={paused ? "0" : "1"} />
          {paused ? <PauseCircle size={28} className="shrink-0 text-amber-800" aria-hidden /> : <PlayCircle size={28} className="shrink-0 text-mango" aria-hidden />}
          <div className="min-w-0 flex-1">
            <p className={`font-extrabold ${paused ? "text-amber-900" : ""}`}>{paused ? "You're paused" : "Taking tuitions"}</p>
            <p className={`text-sm ${paused ? "text-amber-900/80" : "text-brand-200"}`}>{paused ? "No suggestions while paused. Applying turns it off." : "Busy for a while? Pause, and turn it back on any time."}</p>
          </div>
          <button role="switch" aria-checked={!paused} aria-label="Taking tuitions" disabled={busy}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${paused ? "bg-amber-300" : "bg-mango"}`}>
            <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] duration-200 ${paused ? "left-1" : "left-7"}`} />
          </button>
        </Form>

        <Form method="post" className="mt-5 space-y-4" onChange={() => setDirty(true)}>
          <input type="hidden" name="intent" value="save" />

          <Section id="areas" title="Where you teach" hint="Every area you can reach. No limit.">
            <AreaField picked={choices.areas} anywhere={me.anywhere === 1} />
          </Section>

          <Section id="classes" title="Classes you want">
            <ClassField picked={choices.classes} />
          </Section>

          <Section id="subjects" title="Subjects you teach" hint="By level, so an SSC tuition only matches your SSC subjects.">
            <SubjectField picked={picked} />
          </Section>

          <Section id="min_salary" title="Lowest salary you'll take" hint="Per month. Lower ones still show, with a warning.">
            <SalaryField value={me.min_salary} />
          </Section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Section id="transport" title="How you travel">
              <div className="flex flex-wrap gap-2">
                {TRANSPORTS.map((t) => <ChoiceChip key={t.key} type="radio" name="transport" value={t.key} checked={me.transport === t.key}>{t.key === "none" ? "On foot / rickshaw" : t.label}</ChoiceChip>)}
              </div>
            </Section>
            <Section id="demo" title="Demo class" hint="Will you take a free trial class?">
              <div className="flex flex-wrap gap-2">
                <ChoiceChip type="radio" name="demo" value="yes" checked={me.demo_willing === 1}>Yes</ChoiceChip>
                <ChoiceChip type="radio" name="demo" value="no" checked={me.demo_willing === 0}>No</ChoiceChip>
              </div>
            </Section>
          </div>

          <Section id="about" title="About you" hint="Two or three lines HTR can share with guardians: how you teach, what you're good at.">
            <textarea name="about" rows={4} maxLength={500} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="e.g. I explain with examples and give a short test every week." className={`${inputClass} py-3`} />
            <p className={`mt-1 text-right text-xs tabular-nums ${about.length > 450 ? "text-amber-700" : "text-slate-400"}`}>{about.length}/500</p>
          </Section>

          <div aria-live="polite" className={`fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 transition-transform duration-200 lg:bottom-4 ${dirty || toast ? "translate-y-0" : "translate-y-[200%]"}`}>
            {dirty ? (
              <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-forest p-2 pl-4 text-cream shadow-lift">
                <span className="flex-1 text-sm font-semibold">You have unsaved changes</span>
                <button disabled={busy} className="min-h-11 rounded-xl bg-mango px-5 text-sm font-extrabold text-forest disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
              </div>
            ) : toast ? (
              <p role="status" className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-lift"><Check size={18} aria-hidden />{toast}</p>
            ) : null}
          </div>
        </Form>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-ring sm:p-5">
          <h2 className="flex items-center gap-2 font-extrabold text-forest"><Lock size={16} aria-hidden />Details HTR keeps</h2>
          <p className="mt-0.5 text-sm text-slate-500">Locked so guardians can trust them. Wrong? Message HTR.</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {([
              ["Phone", me.phone], ["Gender", me.gender === "female" ? "Female" : me.gender === "male" ? "Male" : "—"],
              ["University", me.institution], ["Department", me.department],
              ["SSC", [me.ssc_group, me.ssc_result && `GPA ${me.ssc_result}`].filter(Boolean).join(" · ")],
              ["HSC", [me.hsc_group, me.hsc_result && `GPA ${me.hsc_result}`].filter(Boolean).join(" · ")],
              ["Medium", (me.mediums ?? "").split(",").filter(Boolean).map((m) => labelOf(MEDIUMS, m)).join(", ")], ["Lives in", me.current_location],
            ] as const).map(([k, v]) => (
              <div key={k} className="min-w-0"><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold break-words text-slate-900">{v || "—"}</dd></div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={waLink(CONTACT.whatsapp, `Assalamu alaikum, I'm tutor T-${me.code}. One of my details needs a fix: `)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring"><MessageCircle size={16} aria-hidden />Message HTR</a>
            <Link to="/terms" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-brand-700">Terms</Link>
            <Form method="post" action="/logout" className="ml-auto">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:text-rose-700"><LogOut size={16} aria-hidden />Log out</button>
            </Form>
          </div>
        </section>
      </div>
      <TutorBar active="profile" count={badges.applied} dot={badges.home} />
    </SitePage>
  );
}
