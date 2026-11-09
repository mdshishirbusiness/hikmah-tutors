import { taka, type Fees } from "~/lib/tuition";

/** The media-fee terms with real numbers (detail page) or an example (fee page). A tuition with its own fee
 * (owner, 2026-11-09) shows that one amount instead of the two options. */
export function FeeBox({ fees }: { fees: Fees }) {
  if (fees.custom) {
    const c = fees.custom;
    return (
      <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
        <h2 className="text-lg font-semibold text-forest">Fee terms (read before applying)</h2>
        <p className="mt-1 text-sm text-slate-700">এই টিউশনের মিডিয়া ফি আলাদা করে ঠিক করা। কনফার্ম করার পর একবারেই দিতে হবে।</p>
        <div className="mt-3 rounded-xl border-2 border-brand-600 bg-white p-4">
          <p className="font-semibold text-forest">Media fee for this tuition</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-600">{c.label}</dt><dd className="font-semibold">{c.total === null ? "On the agreed salary" : "After confirmation"}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-brand-100 pt-2"><dt className="font-semibold text-forest">Total</dt><dd className="text-xl font-semibold text-forest">{c.total === null ? c.label.split(" ")[0] : taka(c.total)}</dd></div>
          </dl>
        </div>
        <p className="mt-3 text-sm text-slate-600">কোনো রেজিস্ট্রেশন বা আবেদন ফি নেই। পরের মাস থেকে পুরো বেতন আপনার।</p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
      <h2 className="text-lg font-semibold text-forest">Fee terms (read before applying)</h2>
      <p className="mt-1 text-sm text-slate-700">HTR টিউটরের কাছ থেকে প্রথম মাসের বেতন থেকে এককালীন মিডিয়া ফি নেয়। দুটি অপশনের যেকোনো একটি, কখনো দুটো একসাথে নয়।</p>
      <p className="mt-3 text-sm font-semibold text-slate-700">{fees.is_example ? `Example: salary ${taka(fees.basis)}` : `Salary ${taka(fees.basis)}`}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="font-semibold text-forest">Standard option (60%)</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">After confirmation</dt><dd className="font-semibold">{taka(fees.first)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">After the first salary</dt><dd className="font-semibold">{taka(fees.second)}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-brand-100 pt-2"><dt className="font-semibold text-forest">Total</dt><dd className="text-xl font-semibold text-forest">{taka(fees.standard_total)}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border-2 border-brand-600 bg-white p-4">
          <p className="font-semibold text-forest">Early payment option (50%)</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Within 7 days of joining</dt><dd className="font-semibold">{taka(fees.early_total)}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-brand-100 pt-2"><dt className="font-semibold text-forest">Total</dt><dd className="text-xl font-semibold text-forest">{taka(fees.early_total)}</dd></div>
          </dl>
          <p className="mt-2 inline-block rounded-full bg-mango px-3 py-0.5 text-xs font-semibold text-forest">Save {taka(fees.saving)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">স্ট্যান্ডার্ড রুটে কোনো রেজিস্ট্রেশন বা আবেদন ফি নেই। দ্বিতীয় মাস থেকে পুরো বেতন আপনার।</p>
    </section>
  );
}
