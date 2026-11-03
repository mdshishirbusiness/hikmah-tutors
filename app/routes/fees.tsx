import type { Route } from "./+types/fees";
import { FeeBox } from "~/components/FeeBox";
import { PageShell } from "~/components/site";
import { feeDisplay, taka } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "ফি · Hikmah Tutors" },
    { name: "description", content: "টিউটর প্রথম মাসের বেতন থেকে এককালীন মিডিয়া ফি দেন: ৬০% দুই কিস্তিতে, অথবা ৭ দিনের মধ্যে ৫০%।" },
  ];
}

const monthly = (salary: number) => feeDisplay({ salary_kind: "fixed", salary_amount: salary, salary_period: "per_month" });

export default function Fees() {
  return (
    <PageShell title="ফি" sub="টিউটর HTR-কে প্রথম মাসের বেতন থেকে এককালীন মিডিয়া ফি দেন। দ্বিতীয় মাস থেকে পুরো বেতন টিউটরের।">
      <FeeBox fees={{ ...monthly(4000), is_example: true }} />
      <section className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="text-lg font-bold text-forest">উদাহরণ</h2>
        <ul className="mt-3 space-y-2 text-sm sm:text-base">
          {[3000, 4000, 5000, 8000].map((salary) => {
            const f = monthly(salary);
            return (
              <li key={salary} className="rounded-xl bg-brand-50 px-4 py-2">
                বেতন <b>{taka(salary)}</b> → স্ট্যান্ডার্ড {taka(f.first)} + {taka(f.second)} = {taka(f.standard_total)} · আর্লি {taka(f.early_total)} · সাশ্রয় {taka(f.saving)}
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-slate-700">অভিভাবকদের জন্য: আলাদা কোনো সার্ভিস চার্জ নেই।</p>
    </PageShell>
  );
}
