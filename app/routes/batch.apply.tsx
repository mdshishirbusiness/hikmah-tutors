// Apply to teach Hikmah's admission batches (owner, 2026-11-09). Anyone signs in with Google and applies once; a
// registered tutor finds their details filled in. Answers can be changed until HTR moves the application on from New.
import { useState } from "react";
import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { BookOpen, CalendarClock, CheckCircle2, GraduationCap, Laptop, MessageCircle, PlayCircle, UserRound } from "lucide-react";
import type { Route } from "./+types/batch.apply";
import { inputClass, primaryButton } from "~/components/admin";
import { MultiSelect } from "~/components/MultiSelect";
import { SiteHeader, SitePage, buttonClass } from "~/components/site";
import { ChoiceChip, Step } from "~/components/tutor";
import { getViewer } from "~/lib/auth.server";
import {
  BATCH_APPLY, BATCH_DAYS, BATCH_INTERNET, BATCH_MODES, BATCH_SETUP, BATCH_STATUSES, BATCH_SUBJECTS, BATCH_TIMES, BATCH_TOOLS, BATCH_TRACKS, splitKeys,
} from "~/lib/batch";
import { myBatchApplication, saveBatchApplication } from "~/lib/batch.server";
import { CONTACT, waLink } from "~/lib/contact";
import { labelOf } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Teach an admission batch · Hikmah Tutors" },
    { name: "description", content: "Apply to teach English, Bangla, GK, science or engineering admission batches with Hikmah Tutors." },
  ];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await getViewer(request);
  if (!viewer) return { signedIn: false as const };
  if (viewer.role !== "tutor") throw redirect("/admin/batches");
  return { signedIn: true as const, ...(await myBatchApplication(viewer)) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await getViewer(request);
  if (!viewer || viewer.role !== "tutor") throw new Response("Sign-in needed", { status: 401 });
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) throw new Response("Not allowed", { status: 403 });
  const error = await saveBatchApplication(viewer, await request.formData());
  if (error) return { error };
  throw redirect(BATCH_APPLY);
}

function Hero() {
  return (
    <div className="bg-forest text-cream">
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-12 sm:px-6">
        <p className="inline-flex rounded-full bg-mango px-3 py-1 text-xs font-extrabold tracking-wide text-forest">ADMISSION 2026–27</p>
        <h1 className="mt-4 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">Teach an admission batch</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-brand-100">
          Hikmah Tutors অল্প কয়েকজন expert শিক্ষক নিয়ে admission batch চালু করছে: বিভাগ পরিবর্তন, science, engineering। মূলত online, রাজশাহীতে offline-ও।
          আবেদন করুন; HTR ফোনে কথা বলবে, তারপর একটা ছোট demo class।
        </p>
      </div>
    </div>
  );
}

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-800">{label}</span>
    {hint && <span className="mt-0.5 block text-sm text-slate-500">{hint}</span>}
    <span className="mt-1.5 block">{children}</span>
  </label>
);

const Chips = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div>
    {label && <p className="mb-1.5 text-sm font-semibold text-slate-800">{label}</p>}
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export default function BatchApply({ loaderData, actionData }: Route.ComponentProps) {
  const [sp] = useSearchParams();
  if (!loaderData.signedIn) {
    return (
      <SitePage>
        <Hero />
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <ol className="space-y-2 text-sm text-slate-700">
            {["Google দিয়ে ঢুকুন (HTR-এ আগে register করা থাকলে সেই account)।", "ফর্ম পূরণ করুন, প্রায় 5 মিনিট।", "HTR ফোনে কথা বলবে, তারপর demo class।"].map((s, i) => (
              <li key={s} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-ring">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-extrabold text-forest">{i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <Link to={`/login?next=${encodeURIComponent(BATCH_APPLY)}`} className={buttonClass("forest", "mt-6 w-full")}>Continue with Google</Link>
        </div>
      </SitePage>
    );
  }

  const { mine, prefill, tutorCode } = loaderData;
  if (mine && sp.get("edit") !== "1") return <Received status={mine.status} canEdit={mine.status === "new"} />;
  return <ApplyForm mine={mine} prefill={prefill} tutorCode={tutorCode} error={actionData?.error} />;
}

function Received({ status, canEdit }: { status: string; canEdit: boolean }) {
  return (
    <SitePage>
      <Hero />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <section className="rounded-2xl bg-white p-6 shadow-ring">
          <CheckCircle2 size={32} className="text-brand-600" aria-hidden />
          <h2 className="mt-3 text-2xl font-extrabold text-forest">Application received</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">Step: <span className="rounded-full bg-mango px-2.5 py-0.5 text-forest">{labelOf(BATCH_STATUSES, status)}</span></p>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            ধন্যবাদ। HTR আবেদনগুলো দেখে ফোন করবে। বাছাই হলে একটা ছোট demo class নেওয়া হবে। কিছু যোগ করতে চাইলে HTR-কে WhatsApp করুন।
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {canEdit && <Link to="?edit=1" className={buttonClass("secondary")}>Edit answers</Link>}
            <a href={waLink(CONTACT.whatsapp, "Assalamu alaikum, I applied for the admission batch. ")} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <MessageCircle size={17} aria-hidden />WhatsApp HTR
            </a>
          </div>
        </section>
      </div>
    </SitePage>
  );
}

type Loaded = Extract<Route.ComponentProps["loaderData"], { signedIn: true }>;

function ApplyForm({ mine, prefill, tutorCode, error }: Pick<Loaded, "mine" | "prefill" | "tutorCode"> & { error?: string }) {
  const busy = useNavigation().state !== "idle";
  const v = mine ?? { ...prefill, tracks: "", subjects: "", subject_other: null, experience_years: null, admission_students: null, experience: null,
    mode: "", setup: "", internet: null, tools: "", days: "", times: "", pay_per_class: null, demo_url: null, note: null };
  const [mode, setMode] = useState(v.mode);
  const [subjects, setSubjects] = useState(splitKeys(v.subjects));
  const online = mode === "online" || mode === "both";
  const has = (list: string | null, key: string) => splitKeys(list).includes(key);

  return (
    <>
      <SiteHeader />
      <Hero />
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:px-6">
        {tutorCode && <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-forest">Signed in as tutor <b>T-{tutorCode}</b>. আপনার profile থেকে কিছু তথ্য বসানো আছে; দরকার হলে বদলান।</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{error}</p>}

        <Form method="post" className="space-y-4">
          <Step n={1} icon={UserRound} tone="cream" title="About you">
            <div className="space-y-4">
              <Field label="Full name"><input name="full_name" required maxLength={80} defaultValue={v.full_name} autoComplete="name" className={inputClass} /></Field>
              <Field label="Phone" hint="HTR এই নম্বরে ফোন করবে।"><input name="phone" required inputMode="tel" maxLength={14} defaultValue={v.phone} autoComplete="tel" placeholder="01XXXXXXXXX" className={inputClass} /></Field>
              <Field label="University"><input name="university" maxLength={80} defaultValue={v.university ?? ""} placeholder="RUET, RU, Medical…" className={inputClass} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department"><input name="department" maxLength={80} defaultValue={v.department ?? ""} className={inputClass} /></Field>
                <Field label="Session"><input name="session_year" maxLength={20} defaultValue={v.session_year ?? ""} placeholder="2022-23" className={inputClass} /></Field>
              </div>
            </div>
          </Step>

          <Step n={2} icon={BookOpen} tone="mango" title="What you'll teach">
            <div className="space-y-4">
              <Chips label="Admission track">
                {BATCH_TRACKS.map((t) => <ChoiceChip key={t.key} name="tracks" value={t.key} checked={has(v.tracks, t.key)}>{t.label}</ChoiceChip>)}
              </Chips>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-800">Subjects</p>
                <MultiSelect name="subjects" options={BATCH_SUBJECTS} value={subjects} onChange={setSubjects} title="Subjects you can teach" placeholder="Pick subjects" />
              </div>
              {subjects.includes("other") && (
                <Field label="Other subject"><input name="subject_other" maxLength={80} defaultValue={v.subject_other ?? ""} className={inputClass} /></Field>
              )}
            </div>
          </Step>

          <Step n={3} icon={GraduationCap} tone="brand" title="Your experience">
            <div className="space-y-4">
              <Field label="Your own admission result" hint="যেমন: RUET merit 412, DU Kha unit 230"><input name="admission_result" maxLength={200} defaultValue={v.admission_result ?? ""} className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Years teaching"><input name="experience_years" inputMode="numeric" defaultValue={v.experience_years ?? ""} className={inputClass} /></Field>
                <Field label="Admission students"><input name="admission_students" inputMode="numeric" defaultValue={v.admission_students ?? ""} placeholder="total" className={inputClass} /></Field>
              </div>
              <Field label="Coaching or batches you taught" hint="কোথায়, কোন বিষয়, কত দিন।">
                <textarea name="experience" rows={3} maxLength={600} defaultValue={v.experience ?? ""} className={`${inputClass} py-3`} />
              </Field>
            </div>
          </Step>

          <Step n={4} icon={Laptop} tone="cream" title="How you'll teach">
            <div className="space-y-4">
              <Chips>
                {BATCH_MODES.map((m) => (
                  <ChoiceChip key={m.key} type="radio" name="mode" value={m.key} checked={mode === m.key} onChange={(on) => on && setMode(m.key)}>{m.label}</ChoiceChip>
                ))}
              </Chips>
              {online && (
                <div className="animate-rise space-y-4 rounded-xl bg-brand-50/60 p-4">
                  <Chips label="Your setup">
                    {BATCH_SETUP.map((s) => <ChoiceChip key={s.key} name="setup" value={s.key} checked={has(v.setup, s.key)}>{s.label}</ChoiceChip>)}
                  </Chips>
                  <Chips label="Internet">
                    {BATCH_INTERNET.map((s) => <ChoiceChip key={s.key} type="radio" name="internet" value={s.key} checked={v.internet === s.key}>{s.label}</ChoiceChip>)}
                  </Chips>
                  <Chips label="Tools you can use">
                    {BATCH_TOOLS.map((s) => <ChoiceChip key={s.key} name="tools" value={s.key} checked={has(v.tools, s.key)}>{s.label}</ChoiceChip>)}
                  </Chips>
                </div>
              )}
            </div>
          </Step>

          <Step n={5} icon={CalendarClock} tone="mango" title="Time and pay">
            <div className="space-y-4">
              <Chips label="Days">{BATCH_DAYS.map((d) => <ChoiceChip key={d.key} name="days" value={d.key} checked={has(v.days, d.key)}>{d.label}</ChoiceChip>)}</Chips>
              <Chips label="Time">{BATCH_TIMES.map((d) => <ChoiceChip key={d.key} name="times" value={d.key} checked={has(v.times, d.key)}>{d.label}</ChoiceChip>)}</Chips>
              <Field label="Pay you expect per class (৳)" hint="একটা ক্লাস, প্রায় 1–1.5 ঘণ্টা।">
                <input name="pay_per_class" inputMode="numeric" defaultValue={v.pay_per_class ?? ""} placeholder="500" className={inputClass} />
              </Field>
            </div>
          </Step>

          <Step n={6} icon={PlayCircle} tone="brand" title="Demo and note" hint="Optional">
            <div className="space-y-4">
              <Field label="Demo class link" hint="10 মিনিটের একটা নমুনা ক্লাস: YouTube (unlisted) বা Google Drive link। শুধু HTR দেখবে।">
                <input name="demo_url" type="url" inputMode="url" maxLength={300} defaultValue={v.demo_url ?? ""} placeholder="https://" className={inputClass} />
              </Field>
              <Field label="Anything else"><textarea name="note" rows={3} maxLength={600} defaultValue={v.note ?? ""} className={`${inputClass} py-3`} /></Field>
            </div>
          </Step>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
            <button disabled={busy} className={`${primaryButton} mx-auto flex w-full max-w-2xl`}>{busy ? "Sending…" : mine ? "Save changes" : "Send application"}</button>
          </div>
        </Form>
      </div>
    </>
  );
}
