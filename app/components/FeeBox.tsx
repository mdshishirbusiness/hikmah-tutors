import { taka, type Fees } from "~/lib/tuition";

/** The media-fee terms with real numbers (detail page) or an example (fee page). */
export function FeeBox({ fees }: { fees: Fees }) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
      <h2 className="text-lg font-semibold text-forest">ফি-শর্ত (আবেদনের আগে জেনে নিন)</h2>
      <p className="mt-1 text-sm text-slate-700">HTR টিউটরের কাছ থেকে প্রথম মাসের বেতন থেকে এককালীন মিডিয়া ফি নেয়। দুটি অপশনের যেকোনো একটি, কখনো দুটো একসাথে নয়।</p>
      <p className="mt-3 text-sm font-semibold text-slate-700">{fees.is_example ? `উদাহরণ: বেতন ${taka(fees.basis)} হলে` : `বেতন ${taka(fees.basis)} ধরে`}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <p className="font-semibold text-forest">স্ট্যান্ডার্ড অপশন (৬০%)</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">কনফার্মেশনের পর</dt><dd className="font-semibold">{taka(fees.first)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">প্রথম স্যালারি পেয়ে</dt><dd className="font-semibold">{taka(fees.second)}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-brand-100 pt-2"><dt className="font-semibold text-forest">মোট</dt><dd className="text-xl font-semibold text-forest">{taka(fees.standard_total)}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border-2 border-brand-600 bg-white p-4">
          <p className="font-semibold text-forest">আর্লি পেমেন্ট অপশন (৫০%)</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">জয়েনের ৭ দিনের মধ্যে</dt><dd className="font-semibold">{taka(fees.early_total)}</dd></div>
            <div className="mt-2 flex items-baseline justify-between border-t border-brand-100 pt-2"><dt className="font-semibold text-forest">মোট</dt><dd className="text-xl font-semibold text-forest">{taka(fees.early_total)}</dd></div>
          </dl>
          <p className="mt-2 inline-block rounded-full bg-mango px-3 py-0.5 text-xs font-semibold text-forest">সাশ্রয় {taka(fees.saving)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">স্ট্যান্ডার্ড রুটে কোনো রেজিস্ট্রেশন বা আবেদন ফি নেই। দ্বিতীয় মাস থেকে পুরো বেতন আপনার।</p>
    </section>
  );
}
