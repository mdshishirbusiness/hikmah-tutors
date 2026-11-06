// The tutor's Profile tab (owner, 2026-11-04; rebuilt 2026-11-05, part B). Top to bottom: progress with the next step
// highlighted, the pause switch, then three tabs, one shown at a time (owner, 2026-11-05): Teaching, Experience (the
// students they taught, then one block per level they teach: students and years, how they teach, habits, a student
// they helped) and About you (study and results, about and skills). All three stay in one form, so everything but the
// pause switch saves together from one sticky bar; a link to a section in another tab opens that tab first. Name, phone, gender and university are locked;
// SSC/HSC results stay the tutor's own until HTR checks a new registration.
import { useEffect, useRef, useState } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import {
  ArrowRight, Bike, BookOpen, Check, Clock, Eye, GraduationCap, Library, Lock, LogOut, MapPin, MessageCircle, NotebookPen, PauseCircle, PenLine,
  PlayCircle, Presentation, Wallet,
} from "lucide-react";
import type { Route } from "./+types/me.profile";
import { Avatar } from "~/components/Avatar";
import { inputClass } from "~/components/admin";
import { FoldOnSave, SectionCard, type SectionTone } from "~/components/SectionCard";
import { SitePage } from "~/components/site";
import { AreaField, ClassField, SalaryField, SubjectField, useClasses } from "~/components/TeachingFields";
import { ChoiceChip, Sheet, TutorBar } from "~/components/tutor";
import { CONTACT, waLink } from "~/lib/contact";
import { FREE_TIMES, freeLabel } from "~/lib/fit";
import { guardianSummary } from "~/lib/whatsapp";
import { addStudent, deleteStudent, myChoices, myLevels, myStudents, mySubjectMarks, requireTutor, saveProfile, setPaused, tutorBadges } from "~/lib/me.server";
import { AREAS, MEDIUMS, TRANSPORTS, classNames, labelOf } from "~/lib/options";
import {
  type Band, type Level, PROFILE_TABS, type ProfileTab, type ProgressStep, TAB_OF, bandLabel, bandShort, habitsDone, hasHabits, profilePercent, profileSteps, taughtBands,
} from "~/lib/profile";
import { ProfileChecklist } from "~/components/ProfileChecklist";
import { ProfileTabs, panelId, tabId } from "~/components/ProfileTabs";
import { StudentsCard } from "~/components/StudentsCard";
import { ProfileUploads } from "~/components/ProfileUploads";
import { myDocumentList, myUploads, sendUpload, withdrawUpload } from "~/lib/uploads.server";
import { ExperienceChart, GuidedText, HabitQuestions } from "~/components/ExperienceParts";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Profile · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { viewer, me } = await requireTutor(request);
  const [choices, levels, students, badges, marks, documents, uploads] = await Promise.all([
    myChoices(me.id), myLevels(me.id), myStudents(me.id), tutorBadges(viewer, me), mySubjectMarks(me.id), myDocumentList(me.id), myUploads(me.id),
  ]);
  return { me, choices, levels, students, badges, marks, documents, uploads };
}

export async function action({ request }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request);
  const form = await request.formData();
  if (form.get("intent") === "send_upload") {
    const error = await sendUpload(viewer, me, form);
    return { error: null, saved: null, uploadError: error, uploadSent: !error };
  }
  if (form.get("intent") === "withdraw_upload") {
    await withdrawUpload(viewer, me, Number(form.get("id")) || 0);
    return { error: null, saved: null };
  }
  if (form.get("intent") === "add_student") {
    const error = await addStudent(viewer, me, form);
    return { error: null, saved: null, studentSaved: !error, studentError: error };
  }
  if (form.get("intent") === "delete_student") {
    await deleteStudent(viewer, me, Number(form.get("id")) || 0);
    return { error: null, saved: null };
  }
  if (form.get("intent") === "pause") {
    await setPaused(viewer, me, form.get("paused") === "1");
    return { error: null, saved: form.get("paused") === "1" ? "Paused. HTR won't suggest tuitions until you turn it back on." : "You're taking tuitions again." };
  }
  form.set("paused", me.availability_paused ? "1" : "0");
  const error = await saveProfile(viewer, me, form);
  return { error, saved: error ? null : "Saved. Your profile and For You are up to date.", profileSaved: !error };
}

const UNI: Record<string, string> = { ru: "RU", ruet: "RUET", medical: "Medical", other: "Other" };
const BAND_TONE: Record<Band, SectionTone> = { junior: "amber", ssc: "sky", hsc: "violet" };
function Count({ value, max }: { value: string; max: number }) {
  return <p className={`mt-1 text-right text-xs tabular-nums ${value.length > max * 0.9 ? "text-amber-700" : "text-slate-400"}`}>{value.length}/{max}</p>;
}

/** One level's experience: what the owner reads first when picking a tutor for a tuition at this level. */
function LevelCard({ band, level, done }: { band: Band; level?: Level; done: boolean }) {
  const p = (k: string) => `lv_${band}_${k}`;
  const summary = level && [level.students && `${level.students} students`, level.years !== null && `${level.years} yrs`, hasHabits(level) && `${habitsDone(level)} of 4 habits`].filter(Boolean).join(" · ");
  return (
    <SectionCard id={`exp-${band}`} icon={GraduationCap} tone={BAND_TONE[band]} title={`${bandShort(band)} experience`} hint={bandLabel(band)} done={done} summary={summary || undefined}>
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
      <GuidedText name={p("approach")} kind="approach" band={band} label="How you teach at this level" initial={level?.approach ?? ""} />
      <GuidedText name={p("story")} kind="story" band={band} label="A student you helped" optional initial={level?.story ?? ""} rows={3} />
      <HabitQuestions band={band} level={level} />
    </SectionCard>
  );
}

/** When the tutor is free (owner, 2026-11-05). Any time stands alone: picking it clears the times, and back. */
function FreeTimes({ value }: { value: string | null }) {
  const [picked, setPicked] = useState(() => new Set((value ?? "").split(",").filter(Boolean)));
  const toggle = (key: string, on: boolean) => setPicked((prev) => {
    if (key === "any") return new Set(on ? ["any"] : []);
    const next = new Set(prev);
    next.delete("any");
    if (on) next.add(key); else next.delete(key);
    return next;
  });
  return (
    <div className="flex flex-wrap gap-2">
      {FREE_TIMES.map((o) => <ChoiceChip key={o.key} name="free_times" value={o.key} checked={picked.has(o.key)} onChange={(on) => toggle(o.key, on)}>{o.label}</ChoiceChip>)}
      <ChoiceChip name="free_times" value="any" checked={picked.has("any")} onChange={(on) => toggle("any", on)}>Any time</ChoiceChip>
    </div>
  );
}

type PreviewTutor = Route.ComponentProps["loaderData"]["me"];

/**
 * How guardians see you (owner, 2026-11-05): the very text HTR sends a guardian, one level at a time, and what is
 * missing from it. The tutor's phone, photo, Facebook and address never go in it (the phone only once Selected).
 */
function GuardianPreview({ me, choices, levels, bands }: { me: PreviewTutor; choices: Route.ComponentProps["loaderData"]["choices"]; levels: Level[]; bands: Band[] }) {
  const [open, setOpen] = useState(false);
  const [band, setBand] = useState<Band>(bands[0]);
  const level = levels.find((l) => l.band === band);
  const subjects = [...new Set(choices.subjects.filter((s) => s.band === band).map((s) => s.subject))];
  const experience = level?.story ?? level?.approach ?? null;
  const text = guardianSummary(null, { ...me, tutor_code: me.code, name: me.full_name, experience }, subjects, false);
  const gaps = [
    !(me.ssc_result || me.hsc_result) && { label: "SSC and HSC results", href: "#academic" },
    !subjects.length && { label: `${bandShort(band)} subjects`, href: "#subjects" },
    !experience && { label: `How you teach ${bandShort(band)}`, href: `#exp-${band}` },
  ].filter(Boolean) as { label: string; href: string }[];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-forest p-4 text-left text-cream shadow-lift">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mango text-forest"><Eye size={22} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">How guardians see you</span>
          <span className="block text-sm text-brand-100">The summary HTR sends when you're shortlisted.</span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-mango" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="How guardians see you">
        {bands.length > 1 && (
          <div className="mb-3 flex gap-2" role="group" aria-label="Level">
            {bands.map((b) => (
              <button key={b} type="button" aria-pressed={band === b} onClick={() => setBand(b)}
                className={`min-h-10 rounded-full px-4 text-sm font-bold ${band === b ? "bg-forest text-cream" : "bg-white text-forest shadow-ring"}`}>{bandShort(b)}</button>
            ))}
          </div>
        )}
        <div className="rounded-2xl rounded-tl-sm bg-[#e7f8dc] p-4 text-sm leading-relaxed whitespace-pre-line text-slate-900 shadow-ring">{text}</div>
        {gaps.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-bold text-forest">Missing from your summary</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {gaps.map((g) => <a key={g.label} href={g.href} onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center rounded-full bg-mango px-3 text-sm font-bold text-forest">+ {g.label}</a>)}
            </div>
          </div>
        ) : <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-emerald-800"><Check size={16} aria-hidden />Nothing missing at this level.</p>}
        <p className="mt-4 text-xs leading-relaxed text-slate-500">গার্ডিয়ান আপনার ফোন নম্বর, ছবি, Facebook বা ঠিকানা পান না। আপনি Selected হলে শুধু তখন HTR আপনার নম্বর দেয়।</p>
      </Sheet>
    </>
  );
}

/** A section is done when every checklist step pointing at it is. */
const sectionDone = (steps: ProgressStep[], id: string) => steps.some((s) => s.section === id) && steps.filter((s) => s.section === id).every((s) => s.done);

/** "Kazla, Binodpur +3". */
const firstFew = (labels: string[], n = 2) => labels.length ? `${labels.slice(0, n).join(", ")}${labels.length > n ? ` +${labels.length - n}` : ""}` : undefined;

export default function Profile({ loaderData: { me, choices, levels, students, badges, marks, documents, uploads } }: Route.ComponentProps) {
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
  const [classes, setClasses] = useClasses(choices.classes);
  const paused = me.availability_paused === 1;
  const steps = profileSteps(me, choices, levels, students.length);
  const taught = taughtBands(choices.classes, choices.subjects, levels);
  const bands: Band[] = taught.length ? taught : ["junior", "ssc", "hsc"];
  const editableAcademic = me.review_status !== "approved";
  const done = (id: string) => sectionDone(steps, id);
  const academicDone = !editableAcademic || !!(me.ssc_result && me.hsc_result);
  const subjectCounts = (["junior", "ssc", "hsc"] as Band[]).map((b) => [b, choices.subjects.filter((s) => s.band === b).length] as const).filter(([, n]) => n);
  // Each tab's own percent; About you also counts the study and results card, which the overall score leaves out.
  const tabSteps = (t: ProfileTab): ProgressStep[] => [
    ...steps.filter((s) => TAB_OF[s.group] === t),
    ...(t === "you" ? [{ key: "academic", label: "Study and results", section: "academic", group: "you" as const, weight: 1, done: academicDone }] : []),
  ];
  const percents = Object.fromEntries(PROFILE_TABS.map((t) => [t.key, profilePercent(tabSteps(t.key))])) as Record<ProfileTab, number>;
  // Open on the tab that holds the next step, so the tutor lands where there is something to do.
  const next = steps.find((s) => !s.done);
  const [tab, setTab] = useState<ProfileTab>(next ? TAB_OF[next.group] : "teaching");
  const bar = useRef<HTMLDivElement>(null);
  const panels = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // Just under the sticky bar, so a section never hides behind it.
  const under = () => 64 + (bar.current?.offsetHeight ?? 0) + 12;
  const choose = (t: ProfileTab) => {
    if (t === tab) return;
    setTab(t);
    // The bar stays put: if the page was scrolled into the old tab, the new one starts at its top.
    const top = (panels.current?.getBoundingClientRect().top ?? 0) + window.scrollY - under();
    if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
  };
  // Links to a section (the checklist, Next, the guardian preview) open its tab, then glide to it. The browser's own
  // jump can't reach a section in a hidden tab, and it jumped without easing, which read as a glitch.
  useEffect(() => {
    const go = (id: string, smooth: boolean) => {
      const el = document.getElementById(id);
      const t = el?.closest<HTMLElement>("[data-tab]")?.dataset.tab as ProfileTab | undefined;
      if (!el || !t) return false;
      setTab(t);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - under(), behavior: smooth && !still ? "smooth" : "instant" });
      }));
      return true;
    };
    if (location.hash) go(decodeURIComponent(location.hash.slice(1)), false);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      if (a && go(a.getAttribute("href")!.slice(1), true)) e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  const panel = (t: ProfileTab) => ({
    id: panelId(t), role: "tabpanel", "aria-labelledby": tabId(t), "data-tab": t, hidden: tab !== t,
    className: "space-y-4 animate-rise motion-reduce:animate-none",
  });

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

        <ProfileChecklist steps={steps} code={me.code} />
        <GuardianPreview me={me} choices={choices} levels={levels} bands={bands} />

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

        <div ref={bar} className="sticky top-16 z-20 -mx-4 mt-4 bg-cream/90 px-4 pt-2 pb-1 backdrop-blur sm:mx-0 sm:px-0">
          <ProfileTabs tab={tab} onTab={choose} percents={percents} steps={steps} code={me.code} />
        </div>

        <FoldOnSave.Provider value={actionData && "profileSaved" in actionData && actionData.profileSaved ? actionData : null}>
        <Form ref={form} method="post" className="mt-3" onChange={() => setDirty(true)}>
          <input type="hidden" name="intent" value="save" />

          <div ref={panels}>
          <div {...panel("teaching")}>
          <SectionCard id="areas" icon={MapPin} tone="amber" title="Where you teach" hint="Every area you can reach. No limit." done={done("areas")}
            summary={me.anywhere === 1 ? "Anywhere in Rajshahi" : firstFew(choices.areas.map((a) => labelOf(AREAS, a)))}>
            <AreaField picked={choices.areas} anywhere={me.anywhere === 1} />
          </SectionCard>
          <SectionCard id="classes" icon={BookOpen} tone="violet" title="Classes you want" done={done("classes")} summary={firstFew(classNames(choices.classes), 3)}>
            <ClassField value={classes} onChange={setClasses} />
          </SectionCard>
          <SectionCard id="subjects" icon={Library} tone="sky" title="Subjects you teach" hint="Yes or No for each level, then its subjects. An SSC tuition only matches your SSC subjects." done={done("subjects")}
            summary={subjectCounts.map(([b, n]) => `${bandShort(b)} ${n}`).join(" · ") || undefined}>
            <SubjectField picked={picked} classes={classes} onClasses={setClasses} marks={marks} />
          </SectionCard>
          <SectionCard id="min_salary" icon={Wallet} tone="brand" title="Lowest salary you'll take" hint="Per month. Lower ones still show, with a warning." done={done("min_salary")}
            summary={me.min_salary !== null ? `৳${me.min_salary.toLocaleString("en-IN")} or more` : undefined}>
            <SalaryField value={me.min_salary} />
          </SectionCard>
          <SectionCard id="free_times" icon={Clock} tone="amber" title="When you're free" hint="Pick every time you can teach. Tuitions at other times won't show in For You." done={done("free_times")} summary={freeLabel(me.free_times)}>
            <FreeTimes value={me.free_times} />
          </SectionCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard id="transport" icon={Bike} tone="sky" title="How you travel" done={done("transport")}
              summary={me.transport === "none" ? "On foot / rickshaw" : me.transport ? labelOf(TRANSPORTS, me.transport) : undefined}>
              <div className="flex flex-wrap gap-2">
                {TRANSPORTS.map((t) => <ChoiceChip key={t.key} type="radio" name="transport" value={t.key} checked={me.transport === t.key}>{t.key === "none" ? "On foot / rickshaw" : t.label}</ChoiceChip>)}
              </div>
            </SectionCard>
            <SectionCard id="demo" icon={Presentation} tone="violet" title="Demo class" hint="Will you take a free trial class?" done={done("demo")} summary={me.demo_willing === 1 ? "Yes" : me.demo_willing === 0 ? "No" : undefined}>
              <div className="flex flex-wrap gap-2">
                <ChoiceChip type="radio" name="demo" value="yes" checked={me.demo_willing === 1}>Yes</ChoiceChip>
                <ChoiceChip type="radio" name="demo" value="no" checked={me.demo_willing === 0}>No</ChoiceChip>
              </div>
            </SectionCard>
          </div>
          </div>

          <div {...panel("experience")}>
          <p className="text-sm text-slate-600">HTR এই অংশটাই সবার আগে পড়ে। যাদের পড়িয়েছেন তাদের কথা, আর প্রতিটি লেভেলে কীভাবে পড়ান।</p>
          <ExperienceChart form={form} bands={bands} added={students.length} />
          <StudentsCard students={students} />
          {!taught.length && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Pick your classes in Teaching and save; the levels you teach will show here. Until then, all three are open.</p>}
          {bands.map((b) => <LevelCard key={b} band={b} level={levels.find((l) => l.band === b)} done={done(`exp-${b}`)} />)}
          </div>

          <div {...panel("you")}>
          <SectionCard id="academic" icon={NotebookPen} tone="slate" title="Study and results" done={academicDone}
            summary={[me.ssc_result && `SSC ${me.ssc_result}`, me.hsc_result && `HSC ${me.hsc_result}`, !editableAcademic && "Checked by HTR"].filter(Boolean).join(" · ") || undefined} hint={editableAcademic ? "You can change these until HTR checks your profile." : "Locked so guardians can trust them. Wrong? Message HTR."}>
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
            {/* Optional numbers many tutors wrote in the sheet anyway (owner, 2026-11-05); editable after HTR's check too. */}
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-bold text-forest">More results <span className="font-normal text-slate-500">· optional</span></p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {([["ssc_marks", "SSC total marks", me.ssc_marks], ["hsc_marks", "HSC total marks", me.hsc_marks]] as const).map(([name, label, value]) => (
                  <label key={name} className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
                    <input name={name} defaultValue={value ?? ""} maxLength={20} placeholder="e.g. 1180/1300" className={inputClass} />
                  </label>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Admission result</span>
                <input name="admission_result" defaultValue={me.admission_result ?? ""} maxLength={300} placeholder="e.g. RU A unit merit 640, RUET waiting" className={inputClass} />
              </label>
              <p className="mt-2 text-xs text-slate-500">বিষয়ভিত্তিক মার্ক Teaching ট্যাবে, প্রতিটি লেভেলের বিষয়ের নিচে দিতে পারবেন।</p>
            </div>
          </SectionCard>

          <SectionCard id="about" icon={PenLine} tone="brand" title="About you" done={done("about")} summary={me.about?.trim() || undefined} hint="Two or three lines HTR can share with guardians: how you teach, what you're good at.">
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
          </div>
          </div>

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
        </FoldOnSave.Provider>

        {me.review_status === "approved" && <ProfileUploads code={me.code} name={me.full_name} hasPhoto={!!me.photo_key} documents={documents} uploads={uploads} />}

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-ring sm:p-5">
          <h2 className="flex items-center gap-2 font-extrabold text-forest"><Lock size={16} aria-hidden />Details HTR keeps</h2>
          <p className="mt-0.5 text-sm text-slate-500">Phone {me.phone} · {me.gender === "female" ? "Female" : me.gender === "male" ? "Male" : "—"}{me.email ? ` · ${me.email}` : ""}. To change these, message HTR.</p>
          <p className="mt-1 text-sm text-slate-500">Gmail বদলাতে চাইলে নতুন Gmail লিখে HTR-কে পাঠান। বদলের পর নতুন Gmail দিয়ে log in করলে সব তথ্য আগের মতোই থাকবে।</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={waLink(CONTACT.whatsapp, `Assalamu alaikum, I'm tutor T-${me.code}. One of my details needs a fix: `)} target="_blank" rel="noreferrer" className="wa-btn inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring"><MessageCircle size={16} aria-hidden />Message HTR</a>
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
