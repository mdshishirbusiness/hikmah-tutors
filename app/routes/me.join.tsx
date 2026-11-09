// Tutor registration (owner, 2026-11-04, review step 2; three screens 2026-11-09). A Google account with no tutor record lands here: photo and
// name, study, where and what they teach, then confirm. HTR checks it before the tutor can apply. Opened again while
// waiting or when HTR asks for a fix, it shows the saved answers and the owner's note.
import { useEffect, useRef, useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Camera, Check, FileText, GraduationCap, MapPin, MessageCircle, ShieldCheck, UserRound, Wallet } from "lucide-react";
import type { Route } from "./+types/me.join";
import { inputClass, primaryButton } from "~/components/admin";
import { JoinDocuments } from "~/components/JoinDocuments";
import { SiteHeader } from "~/components/site";
import { AreaField, ClassField, SalaryField, SubjectField, useClasses } from "~/components/TeachingFields";
import { ChoiceChip, Step } from "~/components/tutor";
import { requireUser } from "~/lib/auth.server";
import { CONTACT, waLink } from "~/lib/contact";
import { safeNext } from "~/lib/google-auth";
import { UNIVERSITIES, sessionYears } from "~/lib/join";
import { bdPhone } from "~/lib/lead";
import { type JoinErrors, myDocuments, saveJoin } from "~/lib/join.server";
import { myChoices, tutorForUser } from "~/lib/me.server";
import { checkRef, refFromCookie, referrerOf, setReferrer } from "~/lib/referral.server";
import { TRANSPORTS } from "~/lib/options";
import { squarePhoto } from "~/lib/images";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Join as a tutor · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await requireUser(request);
  if (viewer.role === "owner") throw redirect("/admin");
  const me = await tutorForUser(viewer.id);
  // Checked tutors (every tutor from the sheet, too) change details through HTR, not here.
  if (me && me.review_status === "approved") throw redirect(safeNext(new URL(request.url).searchParams.get("next")) ?? "/me");
  const choices = me ? await myChoices(me.id) : { areas: [], classes: [], subjects: [] };
  const documents = me ? (await myDocuments(me.id)).map(({ id, kind, label }) => ({ id, kind, label })) : [];
  // The referrer, once (owner, 2026-11-09): already saved, else the code a referral link left on this phone.
  const referredBy = me ? await referrerOf(me.id) : null;
  return { me, choices, documents, email: viewer.email, googleName: viewer.name, sessions: sessionYears(), referredBy, refCode: referredBy ? null : refFromCookie(request) };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireUser(request);
  if (viewer.role === "owner") throw redirect("/admin");
  const me = await tutorForUser(viewer.id);
  if (me && me.review_status === "approved") throw redirect("/me");
  const form = await request.formData();
  const canRefer = !me || !(await referrerOf(me.id));
  const ref = canRefer ? await checkRef(form.get("ref"), me?.code ?? null) : { id: null };
  const result = await saveJoin(viewer, me, form);
  if ("errors" in result || ref.error) return { errors: { ...("errors" in result ? result.errors : {}), ...(ref.error ? { ref: ref.error } : {}) } };
  if (ref.id) {
    const tutor = await tutorForUser(viewer.id);
    if (tutor) await setReferrer(tutor.id, ref.id);
  }
  throw redirect("/me?joined=1");
}

function PhotoField({ existing, error }: { existing: string | null; error?: string }) {
  const [preview, setPreview] = useState<string | null>(existing);
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget, file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const small = await squarePhoto(file);
      const dt = new DataTransfer();
      dt.items.add(small);
      input.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      setPreview(URL.createObjectURL(file)); // the server still checks type and size
    }
    setBusy(false);
  }
  return (
    <div className="flex items-center gap-4">
      <span className={`grid size-24 shrink-0 place-items-center overflow-hidden rounded-full ring-4 ${error ? "bg-rose-50 ring-rose-200" : "bg-brand-50 ring-brand-100"}`}>
        {preview ? <img src={preview} alt="Your photo" className="size-full object-cover" /> : <Camera size={30} className="text-brand-600" aria-hidden />}
      </span>
      <div className="min-w-0">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-cream has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600">
          <Camera size={16} aria-hidden />{busy ? "Preparing…" : preview ? "Change photo" : "Add photo"}
          <input type="file" name="photo" accept="image/*" onChange={pick} className="sr-only" />
        </label>
        <p className="mt-1.5 text-sm text-slate-500">আপনার মুখ পরিষ্কার দেখা যায় এমন ছবি। শুধু HTR দেখবে, গার্ডিয়ান বা অন্য কেউ নয়।</p>
      </div>
    </div>
  );
}

const Err = ({ children }: { children?: string }) => (children ? <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{children}</p> : null);
// Which error a changed field answers, so its message goes away as soon as the tutor fixes it.
const FIELD_ERROR: Record<string, keyof JoinErrors> = {
  photo: "photo", nid: "nid", full_name: "name", phone: "phone", gender: "gender", university: "university", institution: "institution", department: "department",
  session_year: "session", anywhere: "areas", areas: "areas", classes: "classes", subjects: "subjects", available: "confirm", terms: "confirm", ref: "ref",
};
const label = "mb-1 block text-sm font-bold text-forest";

// Three short screens (owner, 2026-11-09): You, Study, Teaching, with a progress bar. One form underneath, so the
// photo and documents picked on an earlier screen still go with Send. Next checks the screen's own fields; the server
// checks everything again, and a failed send opens the first screen with a problem.
const SCREENS = [
  { key: "you", label: "You", icon: UserRound },
  { key: "study", label: "Study", icon: GraduationCap },
  { key: "teaching", label: "Teaching", icon: BookOpen },
] as const;
const SCREEN_OF: Record<keyof JoinErrors, number> = {
  photo: 0, name: 0, phone: 0, gender: 0, university: 1, institution: 1, department: 1, session: 1, documents: 1, nid: 1,
  areas: 2, classes: 2, subjects: 2, confirm: 2, ref: 2, form: 2,
};

/** The screen's own required fields, read from the form; the server says the rest. */
function checkScreen(form: HTMLFormElement, screen: number): JoinErrors {
  const v = (name: string) => String(new FormData(form).get(name) ?? "").trim();
  const e: JoinErrors = {};
  if (screen === 0) {
    if (!v("full_name")) e.name = "Write your full name.";
    if (!bdPhone(v("phone"))) e.phone = "Write your mobile number, e.g. 01712345678.";
    if (!v("gender")) e.gender = "Pick one.";
  } else if (screen === 1) {
    if (!v("university")) e.university = "Pick where you study.";
    else if ((v("university") === "medical" || v("university") === "other") && !v("institution")) e.institution = "Write the name of your college.";
    if (!v("department")) e.department = "Write your department.";
    if (!v("session_year")) e.session = "Pick your session.";
  }
  return e;
}

export default function Join({ loaderData: { me, choices, documents, email, googleName, sessions, referredBy, refCode }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [fixed, setFixed] = useState<Set<string>>(new Set());
  const [local, setLocal] = useState<JoinErrors>({});
  useEffect(() => setFixed(new Set()), [actionData]);
  const errors: JoinErrors = { ...Object.fromEntries(Object.entries(actionData?.errors ?? {}).filter(([k]) => !fixed.has(k))), ...local };
  const count = Object.keys(actionData?.errors ?? {}).length;
  const [uni, setUni] = useState(me?.university ?? "");
  const picked = new Set(choices.subjects.map((s) => `${s.band}:${s.subject}`));
  const [classes, setClasses] = useClasses(choices.classes);
  const [screen, setScreen] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const top = useRef<HTMLDivElement>(null);

  const go = (n: number) => {
    setScreen(n);
    requestAnimationFrame(() => {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const y = (top.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 72;
      if (window.scrollY > y) window.scrollTo({ top: y, behavior: still ? "instant" : "smooth" });
    });
  };
  const next = () => {
    const e = form.current ? checkScreen(form.current, screen) : {};
    setLocal(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    go(screen + 1);
  };

  // After a failed send, open the first screen with a problem and bring it into view.
  useEffect(() => {
    if (!count) return;
    const first = Math.min(...Object.keys(actionData?.errors ?? {}).map((k) => SCREEN_OF[k as keyof JoinErrors] ?? 2));
    setScreen(first);
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('[data-screen]:not([hidden]) [role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" })));
  }, [actionData, count]);

  const screenProps = (n: number) => ({ "data-screen": n, hidden: screen !== n, className: "space-y-4 animate-rise motion-reduce:animate-none" });
  const back = screen > 0 && (
    <button type="button" onClick={() => go(screen - 1)} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl px-4 text-sm font-bold text-forest ring-1 ring-brand-100 hover:bg-brand-50">
      <ArrowLeft size={16} aria-hidden />Back
    </button>
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-6">
        <p className="text-sm font-bold tracking-[0.14em] text-brand-700 uppercase">{me ? `T-${me.code} · ${me.review_status === "needs_fix" ? "Asked to fix" : "Waiting for check"}` : "Join as a tutor"}</p>
        <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight text-forest">{me ? "Your registration" : "Tuitions near you, every day."}</h1>
        <p className="mt-2 text-slate-600">{me ? "Change anything, then send it again." : "Three short steps, about 3 minutes. HTR checks every profile before you apply."}</p>
        <p className="mt-1 text-sm text-slate-500">Signed in as {email}</p>

        {me?.review_status === "needs_fix" && me.review_note && (
          <div className="mt-4 rounded-2xl bg-mango px-4 py-3 text-forest">
            <p className="text-sm font-extrabold tracking-wide uppercase">HTR asks</p>
            <p className="mt-0.5 font-semibold">{me.review_note}</p>
          </div>
        )}
        {count > 0 && Object.keys(errors).length > 0 && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
            <AlertTriangle size={18} className="shrink-0" aria-hidden />{errors.form ?? (Object.keys(errors).length === 1 ? "One thing to fix." : `${Object.keys(errors).length} things to fix.`)}
          </p>
        )}

        {/* The progress bar: three segments, the step's name under each; a step already passed can be tapped. */}
        <div ref={top} className="sticky top-16 z-20 -mx-4 mt-5 bg-cream/95 px-4 pt-2 pb-3 backdrop-blur sm:mx-0 sm:px-0">
          <p className="text-sm font-bold text-forest">Step {screen + 1} of 3 · {SCREENS[screen].label}</p>
          <ol className="mt-2 grid grid-cols-3 gap-2">
            {SCREENS.map((s, i) => (
              <li key={s.key}>
                <button type="button" disabled={i >= screen} onClick={() => go(i)} aria-current={i === screen ? "step" : undefined} aria-label={`Step ${i + 1}: ${s.label}`}
                  className="block w-full py-1 text-left disabled:cursor-default">
                  <span className={`block h-2 rounded-full transition-colors duration-300 motion-reduce:transition-none ${i <= screen ? "bg-brand-600" : "bg-brand-100"}`} />
                  <span className={`mt-1.5 flex items-center gap-1 text-sm font-semibold ${i <= screen ? "text-forest" : "text-slate-500"}`}>
                    {i < screen && <Check size={14} strokeWidth={3} className="text-brand-600" aria-hidden />}{s.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <Form ref={form} method="post" encType="multipart/form-data" noValidate className="mt-2"
          onChange={(e) => {
            const field = (e.target as unknown as HTMLInputElement).name;
            const key = FIELD_ERROR[field] ?? (field.startsWith("doc_") ? "documents" : undefined);
            if (key && !fixed.has(key)) setFixed(new Set(fixed).add(key));
            if (key && local[key]) setLocal(({ [key]: _, ...rest }) => rest);
          }}>
          <div {...screenProps(0)}>
            <Step n={1} icon={UserRound} tone="brand" title="You" hint="Your photo and how HTR reaches you.">
              <PhotoField existing={me?.photo_key ? `/photos/tutor/${me.code}` : null} error={errors.photo} />
              <Err>{errors.photo}</Err>
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="j-name" className={label}>Full name</label>
                  <input id="j-name" name="full_name" defaultValue={me?.full_name ?? googleName ?? ""} autoComplete="name" maxLength={60} className={inputClass} aria-invalid={!!errors.name} />
                  <Err>{errors.name}</Err>
                </div>
                <div>
                  <label htmlFor="j-phone" className={label}>Mobile number</label>
                  <input id="j-phone" name="phone" defaultValue={me?.phone ?? ""} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className={inputClass} aria-invalid={!!errors.phone} />
                  <p className="mt-1 text-sm text-slate-500">গার্ডিয়ান বা পাবলিক কখনো দেখবে না।</p>
                  <Err>{errors.phone}</Err>
                  {errors.phone?.includes("already") && (
                    <a href={waLink(CONTACT.whatsapp, `Assalamu alaikum. I registered before with another Google account. Please link my profile to ${email}.`)} target="_blank" rel="noreferrer"
                      className="wa-text mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-700"><MessageCircle size={16} aria-hidden />Message HTR</a>
                  )}
                </div>
                <fieldset>
                  <legend className={label}>Gender</legend>
                  <div className="flex gap-2">
                    <ChoiceChip type="radio" name="gender" value="male" checked={me?.gender === "male"}>Male</ChoiceChip>
                    <ChoiceChip type="radio" name="gender" value="female" checked={me?.gender === "female"}>Female</ChoiceChip>
                  </div>
                  <Err>{errors.gender}</Err>
                </fieldset>
              </div>
            </Step>
          </div>

          <div {...screenProps(1)}>
            <Step n={2} icon={GraduationCap} tone="mango" title="Where you study">
              <fieldset>
                <legend className={label}>University</legend>
                <div className="flex flex-wrap gap-2">
                  {UNIVERSITIES.map((u) => <ChoiceChip key={u.key} type="radio" name="university" value={u.key} checked={uni === u.key} onChange={(on) => on && setUni(u.key)}>{u.label}</ChoiceChip>)}
                </div>
                <Err>{errors.university}</Err>
              </fieldset>
              {(uni === "medical" || uni === "other") && (
                <div className="mt-4">
                  <label htmlFor="j-inst" className={label}>{uni === "medical" ? "Medical college" : "College or university"}</label>
                  <input id="j-inst" name="institution" defaultValue={me?.university === uni ? me?.institution ?? "" : ""} maxLength={80}
                    placeholder={uni === "medical" ? "e.g. Rajshahi Medical College" : "e.g. Rajshahi College"} className={inputClass} aria-invalid={!!errors.institution} />
                  <Err>{errors.institution}</Err>
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="j-dept" className={label}>Department</label>
                  <input id="j-dept" name="department" defaultValue={me?.department ?? ""} maxLength={60} placeholder="e.g. Physics, CSE, MBBS" className={inputClass} aria-invalid={!!errors.department} />
                  <Err>{errors.department}</Err>
                </div>
                <div>
                  <label htmlFor="j-session" className={label}>Session</label>
                  <select id="j-session" name="session_year" defaultValue={me?.session_year ?? ""} className={inputClass} aria-invalid={!!errors.session}>
                    <option value="">Choose</option>
                    {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Err>{errors.session}</Err>
                </div>
              </div>
            </Step>
            <Step n={3} icon={FileText} tone="cream" title="Your documents" hint="Proof of your education. Only HTR sees it.">
              <JoinDocuments code={me?.code ?? null} existing={documents} error={errors.documents} nidError={errors.nid} />
            </Step>
          </div>

          <div {...screenProps(2)}>
            <Step n={4} icon={MapPin} tone="mango" title="Where you can teach" hint="Every area you can reach. No limit.">
              <AreaField picked={choices.areas} anywhere={me?.anywhere === 1} />
              <Err>{errors.areas}</Err>
            </Step>
            <Step n={5} icon={BookOpen} tone="brand" title="What you teach" hint="Classes first, then the subjects at each level you teach.">
              <ClassField value={classes} onChange={setClasses} />
              <Err>{errors.classes}</Err>
              <div className="mt-5 border-t border-brand-50 pt-4">
                <SubjectField picked={picked} classes={classes} onClasses={setClasses} />
                <Err>{errors.subjects}</Err>
              </div>
            </Step>
            <Step n={6} icon={Wallet} tone="cream" title="Salary and travel">
              <p className={label}>Lowest salary you'll take <span className="font-normal text-slate-500">(per month)</span></p>
              <SalaryField value={me?.min_salary ?? null} />
              <p className={`${label} mt-5`}>How you travel</p>
              <div className="flex flex-wrap gap-2">
                {TRANSPORTS.map((t) => <ChoiceChip key={t.key} type="radio" name="transport" value={t.key} checked={me?.transport === t.key}>{t.key === "none" ? "On foot / rickshaw" : t.label}</ChoiceChip>)}
              </div>
            </Step>
            <Step n={7} icon={ShieldCheck} tone="slate" title="Confirm">
              <label className="flex min-h-11 items-start gap-3 py-1 text-slate-800">
                <input type="checkbox" name="available" value="1" defaultChecked={!!me} className="mt-0.5 size-5 shrink-0 accent-forest" />
                I want to take tuitions now.
              </label>
              <label className="flex min-h-11 items-start gap-3 py-1 text-slate-800">
                <input type="checkbox" name="terms" value="1" defaultChecked={!!me} className="mt-0.5 size-5 shrink-0 accent-forest" />
                <span>I accept the <a href="/terms" target="_blank" className="font-semibold text-brand-700 underline">terms</a>, including the one-time media fee when I get a tuition.</span>
              </label>
              <Err>{errors.confirm}</Err>
              <div className="mt-4 border-t border-brand-50 pt-4">
                {referredBy ? (
                  <p className="text-sm text-slate-600">Referred by <b className="text-forest">T-{referredBy}</b></p>
                ) : (
                  <label className="block">
                    <span className={label}>Referred by a tutor? <span className="font-normal text-slate-500">(optional)</span></span>
                    <input name="ref" defaultValue={refCode ? String(refCode) : ""} inputMode="numeric" maxLength={8} placeholder="Their code, e.g. 2345"
                      aria-invalid={!!errors.ref} className={`${inputClass} max-w-48`} />
                    <span className="mt-1.5 block text-sm text-slate-500">যে টিউটর আপনাকে বলেছেন, তাঁর কোড। পরে আর বদলানো যাবে না।</span>
                    <Err>{errors.ref}</Err>
                  </label>
                )}
              </div>
            </Step>
          </div>

          {/* In the page's flow, under the last field: a fixed bar covered fields (Gender) on short phones. */}
          <div className="mt-5 flex gap-2">
            {back}
            {screen < 2 ? (
              <button type="button" onClick={next} className={`${primaryButton} flex-1`}>Next: {SCREENS[screen + 1].label}<ArrowRight size={16} aria-hidden /></button>
            ) : (
              <button disabled={busy} className={`${primaryButton} flex-1`}>{busy ? "Sending…" : me ? "Send again for check" : "Send for check"}</button>
            )}
          </div>
        </Form>
      </main>
    </>
  );
}
