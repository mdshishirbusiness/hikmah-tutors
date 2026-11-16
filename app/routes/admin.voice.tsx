// The owner's voice clips (owner, 2026-11-11): one per page. Record on the phone, upload here, and choose whether it
// starts by itself. Visitors get a floating button on that page (app/components/VoiceNote.tsx).
import { Form, useNavigation } from "react-router";
import { Mic, Trash2, Upload } from "lucide-react";
import type { Route } from "./+types/admin.voice";
import { PageHead, primaryButton } from "~/components/admin";
import { requireAdmin } from "~/lib/auth.server";
import { VOICE_SLOTS, VOICE_SPOTS } from "~/lib/voice";
import { removeVoice, saveVoice, voiceRows } from "~/lib/voice.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Voice notes · Admin" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { rows: await voiceRows() };
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const form = await request.formData();
  const slot = String(form.get("slot") ?? "");
  const error = form.get("intent") === "remove" ? await removeVoice(slot, viewer?.id ?? null) : await saveVoice(form, viewer?.id ?? null);
  return { error, slot };
}

export default function Voice({ loaderData: { rows }, actionData }: Route.ComponentProps) {
  const nav = useNavigation();
  const busySlot = nav.state !== "idle" ? String(nav.formData?.get("slot") ?? "") : "";
  return (
    <>
      <PageHead title="Voice notes" sub="প্রতিটি পেজ আর কঠিন অংশের জন্য আপনার গলায় ছোট clip। ফোনে record করে, বা ElevenLabs দিয়ে বানিয়ে (scripts/voice), এখানে upload করুন।" />
      <main className="max-w-2xl space-y-4">
        <div className="rounded-2xl bg-mango-50 p-4 text-sm leading-relaxed text-forest ring-1 ring-mango/50">
          <p className="font-extrabold">ভালো clip-এর জন্য</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>30 থেকে 60 সেকেন্ড। লম্বা হলে মানুষ বন্ধ করে দেয়।</li>
            <li>MP3 বা M4A file, 3 MB-এর নিচে। চুপচাপ ঘরে record করুন।</li>
            <li>Auto চালু থাকলে clip নিজে থেকে বাজবে, প্রতি মানুষের জন্য একবার। শুধু যেখানে সত্যিই দরকার সেখানে দিন।</li>
          </ul>
        </div>
        {[...VOICE_SLOTS.map((s) => ({ ...s, spot: false })), ...VOICE_SPOTS.map((s) => ({ ...s, auto: false, spot: true }))].map((s, i) => {
          const row = rows.find((r) => r.slot === s.key);
          const busy = busySlot === s.key;
          return (
            <section key={s.key} className="rounded-2xl bg-white p-4 shadow-ring sm:p-5">
              {s.spot && i === VOICE_SLOTS.length && <p className="-mt-1 mb-3 text-xs font-bold tracking-[0.12em] text-brand-700 uppercase">Parts of a page · "Listen" pill, never auto</p>}
              <div className="flex items-start gap-3">
                <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl ${row ? "bg-forest text-mango" : "bg-slate-100 text-slate-400"}`}><Mic size={19} /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-forest">{s.label}</h2>
                  <p className="text-sm text-slate-500">{s.path} · {s.hint}</p>
                </div>
                {row && <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">{row.autoplay ? "Auto" : "On tap"}</span>}
              </div>
              {row && <audio controls preload="none" src={`/voice/${s.key}?v=${row.updated_at}`} className="mt-3 w-full" />}
              <Form method="post" encType="multipart/form-data" className="mt-3 space-y-3">
                <input type="hidden" name="slot" value={s.key} />
                <input type="file" name="file" accept=".mp3,.m4a,.mp4,.aac,.ogg,.wav,audio/*" aria-label={`Audio file for ${s.label}`}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:text-sm file:font-bold file:text-forest" />
                {!s.spot && (
                  <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-800">
                    <input type="checkbox" name="autoplay" value="1" defaultChecked={row ? row.autoplay === 1 : s.auto} className="size-5 accent-forest" />Start by itself on this page
                  </label>
                )}
                {actionData?.error && actionData.slot === s.key && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} className={primaryButton}><Upload size={16} aria-hidden />{busy ? "Saving…" : row ? "Save" : "Upload"}</button>
                  {row && <button name="intent" value="remove" disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} aria-hidden />Remove</button>}
                </div>
              </Form>
            </section>
          );
        })}
      </main>
    </>
  );
}
