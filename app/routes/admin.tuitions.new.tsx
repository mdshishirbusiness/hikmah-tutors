// A tuition typed straight in (owner, 2026-11-04: "when a new guardian comes, I post the tuition and track it"). The
// guardian is found or added by phone; Publish puts it on the board at once, Save keeps it as a hidden draft.
// Quick Pad stays the fastest way during a call; this is the laptop way.
import { useState } from "react";
import { Form, data, redirect, useNavigation } from "react-router";
import { Rocket } from "lucide-react";
import type { Route } from "./+types/admin.tuitions.new";
import { PageHead, inputClass } from "~/components/admin";
import { PastGuardianFind, draftFrom } from "~/components/PastGuardian";
import { Group, Label, TuitionFields, type TuitionDraft } from "~/components/TuitionFields";
import { createTuition } from "~/lib/admin.server";
import { requireStaff, scopeOf } from "~/lib/auth.server";
import { LEAD_SOURCES } from "~/lib/options";

export function meta(_: Route.MetaArgs) {
  return [{ title: "New tuition · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireStaff(request, "tuitions");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireStaff(request, "tuitions");
  const form = await request.formData();
  const { code, error } = await createTuition(form, viewer?.id ?? null, scopeOf(viewer));
  if (code && !error) throw redirect(`/admin/tuitions/${code}${form.get("publish") === "1" ? "" : "?tab=details"}`);
  if (code) throw redirect(`/admin/tuitions/${code}?tab=details`);
  return data({ error }, { status: 400 });
}

type Seed = { phone?: string; name?: string | null; source?: string | null; address?: string | null; t?: TuitionDraft };
const FRESH: TuitionDraft = { days_per_week: 4, salary_kind: "fixed", tutor_gender_pref: "any", medium: "bangla" };

export default function NewTuition({ actionData }: Route.ComponentProps) {
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const publishing = nav.formData?.get("publish") === "1";
  // Picking a past guardian's tuition starts the fields over from it (a new key remounts them with those values).
  const [seed, setSeed] = useState<Seed>({});
  const [key, setKey] = useState(0); // the tuition fields
  const [guardianKey, setGuardianKey] = useState(0); // phone, name and source only, so a typed-in tuition stays
  const fill = (next: Seed, fields = true) => { setSeed(next); setGuardianKey((k) => k + 1); if (fields) setKey((k) => k + 1); };
  return (
    <>
      <PageHead back={{ to: "/admin/tuitions", label: "Tuitions" }} eyebrow="New" title="Post a tuition" sub="গার্ডিয়ানের তথ্য গোপন থাকে; বোর্ডে শুধু ক্লাস, এলাকা, বেতন ও চাহিদা দেখায়।" />
      <Form method="post" className="space-y-4">
        {actionData?.error && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
        <Group title="Guardian (private)">
          <PastGuardianFind
            onUse={(g, t) => fill({ phone: g.phone, name: g.name, source: t?.lead_source, address: t?.exact_address, t: t ? draftFrom(t) : seed.t })}
            onNewPhone={(phone) => fill({ ...seed, phone }, false)} />
          <div key={guardianKey} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Label text="Phone"><input name="guardian_phone" required inputMode="tel" autoComplete="off" defaultValue={seed.phone} placeholder="01XXXXXXXXX" className={`${inputClass} font-semibold`} /></Label>
            <Label text="Name or how to call them"><input name="guardian_name" defaultValue={seed.name ?? ""} placeholder="e.g. Mrs. Rahman" className={inputClass} /></Label>

            <Label text="Came through">
              <select name="lead_source" defaultValue={seed.source ?? "call"} className={inputClass}>
                {LEAD_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Label>
          </div>
          <Label text="Private note"><textarea name="private_notes" rows={2} placeholder="Anything only HTR should know" className={`${inputClass} py-3`} /></Label>
        </Group>
        <TuitionFields key={key} t={seed.t ?? FRESH} address={seed.address} />
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex flex-col-reverse gap-2 rounded-2xl bg-white/90 p-2 shadow-lift backdrop-blur sm:flex-row sm:justify-end lg:bottom-4">
          <button disabled={busy} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-forest shadow-ring hover:bg-brand-50 disabled:opacity-60">
            {busy && !publishing ? "Saving…" : "Save as draft"}
          </button>
          <button name="publish" value="1" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-mango px-6 text-sm font-extrabold text-forest hover:bg-mango-deep disabled:opacity-60">
            <Rocket size={17} aria-hidden />{busy && publishing ? "Publishing…" : "Publish to board"}
          </button>
        </div>
      </Form>
    </>
  );
}
