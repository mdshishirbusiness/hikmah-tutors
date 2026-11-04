// Tutor registration (owner, 2026-11-04, review step 2). A Google account with no tutor record lands here: photo and
// name, study, where and what they teach, then confirm. HTR checks it before the tutor can apply. Opened again while
// waiting or when HTR asks for a fix, it shows the saved answers and the owner's note.
import { useEffect, useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import { AlertTriangle, BookOpen, Camera, FileText, GraduationCap, MapPin, MessageCircle, ShieldCheck, UserRound, Wallet } from "lucide-react";
import type { Route } from "./+types/me.join";
import { inputClass, primaryButton } from "~/components/admin";
import { JoinDocuments } from "~/components/JoinDocuments";
import { SiteHeader } from "~/components/site";
import { AreaField, ClassField, SalaryField, SubjectField } from "~/components/TeachingFields";
import { ChoiceChip, Step } from "~/components/tutor";
import { requireUser } from "~/lib/auth.server";
import { CONTACT, waLink } from "~/lib/contact";
import { safeNext } from "~/lib/google-auth";
import { UNIVERSITIES, sessionYears } from "~/lib/join";
import { type JoinErrors, myDocuments, saveJoin } from "~/lib/join.server";
import { myChoices, tutorForUser } from "~/lib/me.server";
import { TRANSPORTS } from "~/lib/options";

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
  return { me, choices, documents, email: viewer.email, googleName: viewer.name, sessions: sessionYears() };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireUser(request);
  if (viewer.role === "owner") throw redirect("/admin");
  const me = await tutorForUser(viewer.id);
  if (me && me.review_status === "approved") throw redirect("/me");
  const result = await saveJoin(viewer, me, await request.formData());
  if ("errors" in result) return { errors: result.errors };
  throw redirect("/me?joined=1");
}

/**
 * A square 512 px photo from whatever the phone gives. Drawing it again also drops the photo's hidden details, such as
 * where it was taken. Portraits are cropped a little above the middle, where faces usually are.
 */
async function squarePhoto(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) * 0.3, side, side, 0, 0, 512, 512);
  const encode = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await encode("image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88); // Safari can't write WebP
  if (!blob) throw new Error("encode");
  return new File([blob], blob.type === "image/webp" ? "photo.webp" : "photo.jpg", { type: blob.type });
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
        <p className="mt-1.5 text-xs text-slate-500">আপনার মুখ পরিষ্কার দেখা যায় এমন ছবি। শুধু HTR দেখবে, গার্ডিয়ান বা অন্য কেউ নয়।</p>
      </div>
    </div>
  );
}

const Err = ({ children }: { children?: string }) => (children ? <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{children}</p> : null);
// Which error a changed field answers, so its message goes away as soon as the tutor fixes it.
const FIELD_ERROR: Record<string, keyof JoinErrors> = {
  photo: "photo", nid: "nid", full_name: "name", phone: "phone", gender: "gender", university: "university", institution: "institution", department: "department",
  session_year: "session", anywhere: "areas", areas: "areas", classes: "classes", subjects: "subjects", available: "confirm", terms: "confirm",
};
const label = "mb-1 block text-sm font-bold text-forest";

export default function Join({ loaderData: { me, choices, documents, email, googleName, sessions }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [fixed, setFixed] = useState<Set<string>>(new Set());
  useEffect(() => setFixed(new Set()), [actionData]);
  const errors: JoinErrors = Object.fromEntries(Object.entries(actionData?.errors ?? {}).filter(([k]) => !fixed.has(k)));
  const count = Object.keys(actionData?.errors ?? {}).length;
  const [uni, setUni] = useState(me?.university ?? "");
  const picked = new Set(choices.subjects.map((s) => `${s.band}:${s.subject}`));

  // After a failed send, bring the first problem into view.
  useEffect(() => {
    if (!count) return;
    document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [actionData, count]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:px-6">
        <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">{me ? `T-${me.code} · ${me.review_status === "needs_fix" ? "Asked to fix" : "Waiting for check"}` : "Join as a tutor"}</p>
        <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight text-forest">{me ? "Your registration" : "Tuitions near you, every day."}</h1>
        <p className="mt-2 text-slate-600">{me ? "Change anything, then send it again." : "One form, about 3 minutes. HTR checks every profile before you apply."}</p>
        <p className="mt-1 text-xs text-slate-500">Signed in as {email}</p>

        {me?.review_status === "needs_fix" && me.review_note && (
          <div className="mt-4 rounded-2xl bg-mango px-4 py-3 text-forest">
            <p className="text-xs font-extrabold tracking-wide uppercase">HTR asks</p>
            <p className="mt-0.5 font-semibold">{me.review_note}</p>
          </div>
        )}
        {count > 0 && Object.keys(errors).length > 0 && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">
            <AlertTriangle size={18} className="shrink-0" aria-hidden />{errors.form ?? (Object.keys(errors).length === 1 ? "One thing to fix below." : `${Object.keys(errors).length} things to fix below.`)}
          </p>
        )}

        <Form method="post" encType="multipart/form-data" noValidate className="mt-6 space-y-4"
          onChange={(e) => {
            const field = (e.target as unknown as HTMLInputElement).name;
            const key = FIELD_ERROR[field] ?? (field.startsWith("doc_") ? "documents" : undefined);
            if (key && !fixed.has(key)) setFixed(new Set(fixed).add(key));
          }}>
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
                <p className="mt-1 text-xs text-slate-500">গার্ডিয়ান বা পাবলিক কখনো দেখবে না।</p>
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

          <Step n={2} icon={GraduationCap} tone="sky" title="Where you study">
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

          <Step n={3} icon={FileText} tone="slate" title="Your documents" hint="Proof of your education. Only HTR sees it.">
            <JoinDocuments code={me?.code ?? null} existing={documents} error={errors.documents} nidError={errors.nid} />
          </Step>

          <Step n={4} icon={MapPin} tone="amber" title="Where you can teach" hint="Every area you can reach. No limit.">
            <AreaField picked={choices.areas} anywhere={me?.anywhere === 1} />
            <Err>{errors.areas}</Err>
          </Step>

          <Step n={5} icon={BookOpen} tone="violet" title="What you teach" hint="Classes first, then subjects for each level.">
            <ClassField picked={choices.classes} />
            <Err>{errors.classes}</Err>
            <div className="mt-5 border-t border-brand-50 pt-4">
              <SubjectField picked={picked} />
              <Err>{errors.subjects}</Err>
            </div>
          </Step>

          <Step n={6} icon={Wallet} tone="brand" title="Salary and travel">
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
          </Step>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
            <button disabled={busy} className={`${primaryButton} mx-auto flex w-full max-w-2xl`}>{busy ? "Sending…" : me ? "Send again for check" : "Send for check"}</button>
          </div>
        </Form>
      </main>
    </>
  );
}
