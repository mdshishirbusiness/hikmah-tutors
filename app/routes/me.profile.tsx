// The tutor's Profile tab (owner, 2026-11-04; rebuilt 2026-11-05, part B). Top to bottom: progress with the next step
// highlighted, the pause switch, then five sections with jump chips: Teaching, Experience (one block per level the
// tutor teaches: students and years, how they teach, habits, a student they helped), Academic and About and skills.
// Everything but the pause switch saves together from one sticky bar. Name, phone, gender and university are locked;
// SSC/HSC results stay the tutor's own until HTR checks a new registration.
import { useEffect, useState } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import {
  ArrowRight, Bike, BookOpen, Check, GraduationCap, Library, Lock, LogOut, MapPin, MessageCircle, NotebookPen, PauseCircle, PenLine, PlayCircle,
  Presentation, Sparkles, Wallet,
} from "lucide-react";
import type { Route } from "./+types/me.profile";
import { Avatar } from "~/components/Avatar";
import { inputClass } from "~/components/admin";
import { SectionCard, type SectionTone } from "~/components/SectionCard";
import { SitePage } from "~/components/site";
import { AreaField, ClassField, SalaryField, SubjectField } from "~/components/TeachingFields";
import { ChoiceChip, TutorBar } from "~/components/tutor";
import { CONTACT, waLink } from "~/lib/contact";
import { myChoices, myLevels, requireTutor, saveProfile, setPaused, tutorBadges } from "~/lib/me.server";
import { MEDIUMS, TRANSPORTS, labelOf } from "~/lib/options";
import { type Band, type Level, type ProgressStep, bandLabel, bandShort, profilePercent, profileSteps, stepGain, taughtBands } from "~/lib/profile";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Profile · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { viewer, me } = await requireTutor(request);
  const [choices, levels, badges] = await Promise.all([myChoices(me.id), myLevels(me.id), tutorBadges(viewer, me)]);
  return { me, choices, levels, badges };
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
  return { error, saved: error ? null : "Saved. Your profile and For You are up to date." };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
const BAND_TONE: Record<Band, SectionTone> = { junior: "amber", ssc: "sky", hsc: "violet" };
const HABITS = [
  ["notes", "makes_notes", "Makes notes / sheets"],
  ["tests", "takes_tests", "Takes regular tests"],
  ["homework", "gives_homework", "Gives homework"],
  ["reports", "reports_guardian", "Reports to the guardian"],
] as const;

/** A number that counts up once, and a bar that fills to it; both stay still when the phone asks for less motion. */
function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setValue(target);
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      setValue(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

/** Progress, the next step to do, and the true reason to do it: complete profiles come first in HTR's list (part C). */
function ProgressPanel({ steps, code }: { steps: ProgressStep[]; code: number }) {
  const percent = profilePercent(steps);
  const shown = useCountUp(percent);
  const left = steps.filter((s) => !s.done);
  const next = left[0];
  const href = (s: ProgressStep) => (s.key === "photo" ? waLink(CONTACT.whatsapp, `Assalamu alaikum, I'm tutor T-${code}. Here is my photo for my profile.`) : `#${s.section}`);
  return (
    <section aria-label="Profile progress" className="mt-5 overflow-hidden rounded-3xl bg-forest p-5 text-cream shadow-lift">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-brand-200 uppercase">Your profile</p>
          <p className="mt-1 text-5xl leading-none font-extrabold tabular-nums">{shown}<span className="text-2xl text-brand-200">%</span></p>
        </div>
        <p className="max-w-[12rem] text-right text-sm text-brand-100">{percent === 100 ? "Complete. HTR sees you first." : "Complete profiles are shown to HTR first."}</p>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mango transition-[width] duration-700 ease-out" style={{ width: `${shown}%` }} />
      </div>
      {next && (
        <a href={href(next)} {...(next.key === "photo" ? { target: "_blank", rel: "noreferrer" } : {})}
          className="group mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 transition-colors hover:bg-white/15">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mango text-forest"><Sparkles size={18} aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold tracking-wide text-brand-200 uppercase">Next step · +{stepGain(steps, next)}%</span>
            <span className="block font-extrabold">{next.label}</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-mango transition-transform group-hover:translate-x-0.5" aria-hidden />
        </a>
      )}
      {left.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {left.slice(1, 6).map((s) => <a key={s.key} href={href(s)} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-50 hover:bg-white/15">+ {s.label}</a>)}
          {left.length > 6 && <span className="px-1 py-1 text-xs text-brand-200">and {left.length - 6} more</span>}
        </div>
      )}
    </section>
  );
}

function Count({ value, max }: { value: string; max: number }) {
  return <p className={`mt-1 text-right text-xs tabular-nums ${value.length > max * 0.9 ? "text-amber-700" : "text-slate-400"}`}>{value.length}/{max}</p>;
}

/** One level's experience: what the owner reads first when picking a tutor for a tuition at this level. */
function LevelCard({ band, level }: { band: Band; level?: Level }) {
  const [approach, setApproach] = useState(level?.approach ?? "");
  const [story, setStory] = useState(level?.story ?? "");
  const p = (k: string) => `lv_${band}_${k}`;
  return (
    <SectionCard id={`exp-${band}`} icon={GraduationCap} tone={BAND_TONE[band]} title={`${bandShort(band)} experience`} hint={bandLabel(band)}>
      <input type="hidden" name={`lv_${band}`} value="1" />
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">Students taught</span>
          <input name={p("students")} type="number" inputMode="numeric" min={0} max={1000} defaultValue={level?.students ?? ""} placeholder="e.g. 6" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">Years teaching</span>
          <input name={p("years")} type="number" inputMode="decimal" min={0} max={40} step={0.5} defaultValue={level?.years ?? ""} placeholder="e.g. 1.5" className={inputClass} />
        </label>
      </div>
      <p className="mt-4 mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">Your habits</p>
      <div className="flex flex-wrap gap-2">
        {HABITS.map(([k, col, label]) => <ChoiceChip key={k} name={p(k)} value="1" checked={!!level?.[col]}>{label}</ChoiceChip>)}
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-bold text-slate-600">How you teach at this level</span>
        <textarea name={p("approach")} rows={4} maxLength={2000} value={approach} onChange={(e) => setApproach(e.target.value)}
          placeholder="যেমন: প্রতিটি অধ্যায় শেষে ছোট পরীক্ষা নিই, ভুলগুলো আলাদা খাতায় লিখে আবার করাই…" className={`${inputClass} py-3`} />
        <Count value={approach} max={2000} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-slate-600">A student you helped <span className="font-normal text-slate-400">(optional)</span></span>
        <textarea name={p("story")} rows={3} maxLength={2000} value={story} onChange={(e) => setStory(e.target.value)}
          placeholder="যেমন: অংকে দুর্বল একজনকে ৩ মাসে A+ পর্যন্ত নিয়ে গেছি। কীভাবে করেছিলেন লিখুন।" className={`${inputClass} py-3`} />
        <Count value={story} max={2000} />
      </label>
    </SectionCard>
  );
}

function GroupTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-28 pt-4 text-xs font-extrabold tracking-[0.16em] text-brand-700 uppercase">{children}</h2>;
}

export default function Profile({ loaderData: { me, choices, levels, badges } }: Route.ComponentProps) {
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
  const steps = profileSteps(me, choices, levels);
  const taught = taughtBands(choices.classes, choices.subjects, levels);
  const bands: Band[] = taught.length ? taught : ["junior", "ssc", "hsc"];
  const editableAcademic = me.review_status !== "approved";

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

        <ProgressPanel steps={steps} code={me.code} />

        {actionData?.error && <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}

        <Form method="post" id="availability" className={`mt-4 flex scroll-mt-24 items-center gap-4 rounded-2xl p-4 ${paused ? "bg-amber-100" : "bg-white shadow-ring"}`}>
          <input type="hidden" name="intent" value="pause" />
          <input type="hidden" name="paused" value={paused ? "0" : "1"} />
          {paused ? <PauseCircle size={28} className="shrink-0 text-amber-800" aria-hidden /> : <PlayCircle size={28} className="shrink-0 text-brand-600" aria-hidden />}
          <div className="min-w-0 flex-1">
            <p className={`font-extrabold ${paused ? "text-amber-900" : "text-forest"}`}>{paused ? "You're paused" : "Taking tuitions"}</p>
            <p className={`text-sm ${paused ? "text-amber-900/80" : "text-slate-500"}`}>{paused ? "No suggestions while paused. Applying turns it off." : "Busy for a while? Pause, and turn it back on any time."}</p>
          </div>
          <button role="switch" aria-checked={!paused} aria-label="Taking tuitions" disabled={busy}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${paused ? "bg-amber-300" : "bg-brand-600"}`}>
            <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] duration-200 ${paused ? "left-1" : "left-7"}`} />
          </button>
        </Form>

        <nav aria-label="Profile sections" className="sticky top-16 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-cream/90 px-4 py-2 backdrop-blur scroll-thin sm:mx-0 sm:px-0">
          {[["teaching", "Teaching"], ["experience", "Experience"], ["academic", "Academic"], ["about", "About & skills"]].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-white px-4 text-sm font-bold text-forest shadow-ring hover:bg-brand-50">{label}</a>
          ))}
        </nav>

        <Form method="post" className="space-y-4" onChange={() => setDirty(true)}>
          <input type="hidden" name="intent" value="save" />

          <GroupTitle id="teaching">Teaching</GroupTitle>
          <SectionCard id="areas" icon={MapPin} tone="amber" title="Where you teach" hint="Every area you can reach. No limit.">
            <AreaField picked={choices.areas} anywhere={me.anywhere === 1} />
          </SectionCard>
          <SectionCard id="classes" icon={BookOpen} tone="violet" title="Classes you want">
            <ClassField picked={choices.classes} />
          </SectionCard>
          <SectionCard id="subjects" icon={Library} tone="sky" title="Subjects you teach" hint="By level, so an SSC tuition only matches your SSC subjects.">
            <SubjectField picked={picked} />
          </SectionCard>
          <SectionCard id="min_salary" icon={Wallet} tone="brand" title="Lowest salary you'll take" hint="Per month. Lower ones still show, with a warning.">
            <SalaryField value={me.min_salary} />
          </SectionCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard id="transport" icon={Bike} tone="sky" title="How you travel">
              <div className="flex flex-wrap gap-2">
                {TRANSPORTS.map((t) => <ChoiceChip key={t.key} type="radio" name="transport" value={t.key} checked={me.transport === t.key}>{t.key === "none" ? "On foot / rickshaw" : t.label}</ChoiceChip>)}
              </div>
            </SectionCard>
            <SectionCard id="demo" icon={Presentation} tone="violet" title="Demo class" hint="Will you take a free trial class?">
              <div className="flex flex-wrap gap-2">
                <ChoiceChip type="radio" name="demo" value="yes" checked={me.demo_willing === 1}>Yes</ChoiceChip>
                <ChoiceChip type="radio" name="demo" value="no" checked={me.demo_willing === 0}>No</ChoiceChip>
              </div>
            </SectionCard>
          </div>

          <GroupTitle id="experience">Experience</GroupTitle>
          <p className="-mt-2 text-sm text-slate-600">HTR এই অংশটাই সবার আগে পড়ে। প্রতিটি লেভেলের জন্য সংক্ষেপে লিখুন।</p>
          {!taught.length && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Pick your classes above and save; the levels you teach will show here. Until then, all three are open.</p>}
          {bands.map((b) => <LevelCard key={b} band={b} level={levels.find((l) => l.band === b)} />)}

          <GroupTitle id="academic">Academic</GroupTitle>
          <SectionCard icon={NotebookPen} tone="slate" title="Study and results" hint={editableAcademic ? "You can change these until HTR checks your profile." : "Locked so guardians can trust them. Wrong? Message HTR."}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {([
                ["University", me.institution], ["Department", me.department], ["Session", me.session_year],
                ["Medium", (me.mediums ?? "").split(",").filter(Boolean).map((m) => labelOf(MEDIUMS, m)).join(", ")],
              ] as const).map(([k, v]) => (
                <div key={k} className="min-w-0"><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold break-words text-slate-900">{v || "—"}</dd></div>
              ))}
            </dl>
            {editableAcademic ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {([["ssc_group", "SSC group", me.ssc_group, "e.g. Science"], ["ssc_result", "SSC GPA", me.ssc_result, "e.g. 5.00"],
                  ["hsc_group", "HSC group", me.hsc_group, "e.g. Science"], ["hsc_result", "HSC GPA", me.hsc_result, "e.g. 5.00"]] as const).map(([name, label, value, hint]) => (
                  <label key={name} className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
                    <input name={name} defaultValue={value ?? ""} maxLength={40} placeholder={hint} className={inputClass} />
                  </label>
                ))}
              </div>
            ) : (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-brand-50 pt-3 text-sm">
                {([["SSC", [me.ssc_group, me.ssc_result && `GPA ${me.ssc_result}`]], ["HSC", [me.hsc_group, me.hsc_result && `GPA ${me.hsc_result}`]]] as const).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v.filter(Boolean).join(" · ") || "—"}</dd></div>
                ))}
              </dl>
            )}
          </SectionCard>

          <GroupTitle id="about">About & skills</GroupTitle>
          <SectionCard icon={PenLine} tone="brand" title="About you" hint="Two or three lines HTR can share with guardians: how you teach, what you're good at.">
            <textarea name="about" rows={4} maxLength={500} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="e.g. I explain with examples and give a short test every week." className={`${inputClass} py-3`} />
            <Count value={about} max={500} />
            <label className="mt-2 block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Special skills</span>
              <input name="skills" defaultValue={me.skills ?? ""} maxLength={500} placeholder="e.g. Spoken English, Olympiad math, Quran recitation" className={inputClass} />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Demo class video link <span className="font-normal text-slate-400">(optional)</span></span>
              <input name="demo_video_url" type="url" defaultValue={me.demo_video_url ?? ""} maxLength={300} placeholder="https://…" className={inputClass} />
            </label>
          </SectionCard>

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
          <p className="mt-0.5 text-sm text-slate-500">Phone {me.phone} · {me.gender === "female" ? "Female" : me.gender === "male" ? "Male" : "—"}. To change these, message HTR.</p>
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
