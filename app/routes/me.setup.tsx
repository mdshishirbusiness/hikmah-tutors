// First sign-in (owner, 2026-11-04): check the locked details, then pick areas, a minimum salary and classes, confirm
// availability and accept the terms. These choices drive For You and the fit check. ?edit=1 reopens it later.
import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { BookOpen, MapPin, MessageCircle, ShieldCheck, UserRound, Wallet } from "lucide-react";
import type { Route } from "./+types/me.setup";
import { Facts, primaryButton } from "~/components/admin";
import { SiteHeader } from "~/components/site";
import { SalaryField } from "~/components/TeachingFields";
import { ChoiceChip, Step } from "~/components/tutor";
import { CONTACT, waLink } from "~/lib/contact";
import { safeNext } from "~/lib/google-auth";
import { bandOf } from "~/lib/fit";
import { requireTutor, saveSetup, setupChoices } from "~/lib/me.server";
import { AREAS, AREAS_TOP, CLASS_CHOICES, TUTOR_FROM, labelOf } from "~/lib/options";

import { firstName } from "~/lib/whatsapp";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Set up · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { me } = await requireTutor(request, { setupDone: false });
  const sp = new URL(request.url).searchParams;
  if (me.setup_done_at && sp.get("edit") !== "1") throw redirect(safeNext(sp.get("next")) ?? "/");
  return { me, choices: await setupChoices(me.id), first: !me.setup_done_at };
}

export async function action({ request }: Route.ActionArgs) {
  const { viewer, me } = await requireTutor(request, { setupDone: false });
  const error = await saveSetup(viewer, me, await request.formData());
  if (error) return { error };
  throw redirect(safeNext(new URL(request.url).searchParams.get("next")) ?? "/");
}

const GROUPS = [
  { band: "junior", label: "Play–Class 8" },
  { band: "ssc", label: "Class 9–10 · SSC" },
  { band: "hsc", label: "Class 11–12 · HSC · Admission" },
  { band: null, label: "Other" },
];

export default function Setup({ loaderData: { me, choices, first }, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [anywhere, setAnywhere] = useState(me.anywhere === 1);
  const [showAll, setShowAll] = useState(false);
  const university = me.university === "other" ? "Other" : labelOf(TUTOR_FROM, me.university);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-brand-700">{first ? "FIRST SIGN-IN" : "YOUR CHOICES"}</p>
        <h1 className="mt-1 text-3xl leading-tight font-bold text-forest">{first ? `Welcome, ${firstName(me.full_name)}` : "Edit your choices"}</h1>
        <p className="mt-2 text-slate-600">Set this once and we'll show the tuitions that fit you.</p>

        {actionData?.error && <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}

        <Form method="post" className="mt-6 space-y-4">
          <Step n={1} icon={UserRound} tone="sky" title="Your details" hint="Locked. If something is wrong, message HTR.">
            <Facts rows={[
              ["Name", me.full_name],
              ["Phone", me.phone],
              ["Gender", me.gender === "female" ? "Female" : me.gender === "male" ? "Male" : ""],
              ["University", [university, me.institution?.toLowerCase() === university.toLowerCase() ? null : me.institution].filter(Boolean).join(" · ")],
              ["Department", me.department],
              ["Session", me.session_year],
            ]} />
            <a href={waLink(CONTACT.whatsapp, `Assalamu alaikum, I'm tutor T-${me.code}. One of my details needs a fix: `)} target="_blank" rel="noreferrer"
              className="wa-text mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700">
              <MessageCircle size={16} aria-hidden />Message HTR
            </a>
          </Step>

          <Step n={2} icon={MapPin} tone="amber" title="Where can you teach?" hint="Pick every area you can reach. No limit.">
            <ChoiceChip name="anywhere" value="1" checked={anywhere} onChange={setAnywhere}>Anywhere in Rajshahi</ChoiceChip>
            <div className={`mt-3 flex flex-wrap gap-2 transition-opacity ${anywhere ? "pointer-events-none opacity-40" : ""}`} aria-disabled={anywhere}>
              {AREAS.map((a, i) => (
                <ChoiceChip key={a.key} name="areas" value={a.key} checked={choices.areas.includes(a.key)} hidden={!showAll && i >= AREAS_TOP && !choices.areas.includes(a.key)}>
                  {a.label}
                </ChoiceChip>
              ))}
            </div>
            {!anywhere && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 min-h-11 text-sm font-semibold text-brand-700">
                {showAll ? "Show fewer" : `Show all ${AREAS.length} areas`}
              </button>
            )}
          </Step>

          <Step n={3} icon={Wallet} tone="brand" title="Lowest salary you'll take" hint="Per month. Lower ones still show, with a warning.">
            <SalaryField value={me.min_salary} />
          </Step>

          <Step n={4} icon={BookOpen} tone="violet" title="Classes you want" hint={first ? "We picked the levels you teach on the old form. Change freely." : undefined}>
            <div className="space-y-3">
              {GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500">{g.label.toUpperCase()}</p>
                  <div className="flex flex-wrap gap-2">
                    {CLASS_CHOICES.filter((c) => bandOf(c.key) === g.band).map((c) => (
                      <ChoiceChip key={c.key} name="classes" value={c.key} checked={choices.classes.includes(c.key)}>{c.label}</ChoiceChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Step>

          <Step n={5} icon={ShieldCheck} tone="slate" title="Confirm">
            <label className="flex min-h-11 items-start gap-3 py-1 text-slate-800">
              <input type="checkbox" name="available" value="1" defaultChecked={!!me.availability_confirmed_at} className="mt-0.5 size-5 shrink-0 accent-forest" />
              I still want to take tuitions.
            </label>
            <label className="flex min-h-11 items-start gap-3 py-1 text-slate-800">
              <input type="checkbox" name="terms" value="1" defaultChecked={!!me.terms_accepted_at} className="mt-0.5 size-5 shrink-0 accent-forest" />
              <span>I accept the <Link to="/terms" target="_blank" className="font-semibold text-brand-700 underline">terms</Link>, including the one-time media fee when I get a tuition.</span>
            </label>
          </Step>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
            <button disabled={busy} className={`${primaryButton} mx-auto flex w-full max-w-2xl`}>{busy ? "Saving…" : first ? "Save and see tuitions" : "Save"}</button>
          </div>
        </Form>
      </main>
    </>
  );
}
