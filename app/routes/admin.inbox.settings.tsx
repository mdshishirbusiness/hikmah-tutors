// The owner's WhatsApp settings (owner, 2026-11-18): alert number, AI on or off, AI budget, this month's use.
// A full screen on a phone, the right pane on a computer, like WhatsApp's own Settings.
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { Route } from "./+types/admin.inbox.settings";
import { WA } from "~/components/wa-ui";
import { requireAdmin } from "~/lib/auth.server";
import { bdPhone } from "~/lib/lead";
import { DEFAULT_AI_BUDGET_USD, getSettings, monthUsage, setSetting } from "~/lib/wa.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const s = await getSettings();
  return {
    alert_phone: s.alert_phone ?? "", ai_on: s.ai_on !== "0", budget: Number(s.ai_budget_usd) || DEFAULT_AI_BUDGET_USD,
    connected: s.business_number ?? null, usage: await monthUsage(),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const form = await request.formData();
  const raw = String(form.get("alert_phone") ?? "").trim();
  const phone = bdPhone(raw);
  if (raw && !phone) return { error: "Write the alert number as 01XXXXXXXXX." };
  const budget = Number(form.get("budget"));
  if (!Number.isFinite(budget) || budget < 0 || budget > 100) return { error: "The AI budget is in US dollars, 0–100 a month." };
  await setSetting("alert_phone", phone);
  await setSetting("ai_on", form.get("ai_on") === "1" ? "1" : "0");
  await setSetting("ai_budget_usd", String(budget));
  return { saved: true };
}

const field = "mt-1 min-h-12 w-full border-b-2 bg-transparent text-[16px] text-[#111b21] outline-none transition-colors focus:border-[#00a884] border-[#e9edef]";

export default function WaSettings({ loaderData: d, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const [sp] = useSearchParams();
  const u = d.usage;
  return (
    <section className="fixed inset-0 z-50 flex flex-col overflow-y-auto lg:static lg:z-auto" style={{ background: WA.bar }}>
      <header className="sticky top-0 z-10 flex min-h-14 items-center gap-2 bg-white px-2 shadow-sm">
        <Link to={`/admin/inbox${sp.toString() ? `?${sp}` : ""}`} aria-label="Back to chats" className="grid size-11 place-items-center rounded-full text-[#54656f] hover:bg-[#f0f2f5]"><ArrowLeft size={22} /></Link>
        <h2 className="text-[19px] font-semibold text-[#111b21]">Settings</h2>
      </header>

      <div className="mx-auto w-full max-w-xl space-y-3 p-3 pb-10">
        <div className="rounded-xl bg-white p-4">
          <p className="text-sm font-semibold" style={{ color: WA.teal }}>Connection</p>
          <p className="mt-1 text-[15px] text-[#111b21]">{d.connected ? `Connected: ${d.connected}` : "Waiting for the first message from YCloud"}</p>
          <p className="mt-3 text-sm font-semibold" style={{ color: WA.teal }}>This month</p>
          <p className="mt-1 text-[15px] text-[#111b21]">AI ${(u.cost_micro_usd / 1e6).toFixed(2)} of ${d.budget} · {u.ai_calls} AI replies</p>
          <p className="text-[15px] text-[#111b21]">{u.sent} messages sent{u.sent > 1000 ? " (over Meta's 1,000 free)" : ` (Meta's first 1,000 are free)`}</p>
        </div>

        {actionData && "error" in actionData && <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{actionData.error}</p>}
        {actionData && "saved" in actionData && <p className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: WA.chipOn, color: WA.chipOnText }}>Saved.</p>}

        <Form method="post" className="space-y-3">
          <label className="flex min-h-16 items-center justify-between gap-4 rounded-xl bg-white p-4">
            <span>
              <span className="block text-[16px] text-[#111b21]">AI replies</span>
              <span className="block text-sm text-[#667781]">বন্ধ করলে সব চ্যাট সরাসরি মানুষের কাছে আসবে।</span>
            </span>
            <input type="checkbox" name="ai_on" value="1" defaultChecked={d.ai_on} className="size-6 shrink-0 accent-[#00a884]" />
          </label>
          <div className="rounded-xl bg-white p-4">
            <label className="block">
              <span className="text-sm font-semibold" style={{ color: WA.teal }}>Your WhatsApp for urgent alerts</span>
              <input name="alert_phone" inputMode="tel" defaultValue={d.alert_phone} placeholder="01XXXXXXXXX" className={field} />
              <span className="mt-1.5 block text-sm text-[#667781]">কল চাওয়া, অভিযোগ, বা ৩০ মিনিটে উত্তর না হলে এখানে মেসেজ যাবে (রাতে নয়)।</span>
            </label>
            <label className="mt-5 block">
              <span className="text-sm font-semibold" style={{ color: WA.teal }}>AI budget per month (US$)</span>
              <input name="budget" type="number" min={0} max={100} step={1} defaultValue={d.budget} className={field} />
              <span className="mt-1.5 block text-sm text-[#667781]">শেষ হলে AI থামে, সব চ্যাট মানুষের কাছে যায়। $8 ≈ ৳1,000।</span>
            </label>
          </div>
          <button disabled={busy} className="min-h-12 w-full rounded-full text-[15px] font-semibold text-white transition-opacity disabled:opacity-60" style={{ background: WA.teal }}>Save</button>
        </Form>
      </div>
    </section>
  );
}
