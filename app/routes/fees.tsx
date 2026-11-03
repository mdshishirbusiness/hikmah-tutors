import type { Route } from "./+types/fees";
import { FeeBox } from "~/components/FeeBox";
import { PageShell } from "~/components/site";
import { feeDisplay, taka } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Fees · Hikmah Tutors" },
    { name: "description", content: "টিউটর প্রথম মাসের বেতন থেকে এককালীন মিডিয়া ফি দেন: 60% দুই কিস্তিতে, অথবা 7 দিনের মধ্যে 50%।" },
  ];
}

const monthly = (salary: number) => feeDisplay({ salary_kind: "fixed", salary_amount: salary, salary_period: "per_month" });

// Refund rule (DECISIONS 2026-11-04, Porao comparison): fee paid minus 25% of salary received, never below 0.
const refund = (paid: number, received: number) => Math.max(0, paid - Math.floor((received * 25) / 100));

function Refund() {
  const salary = 4000;
  const paid = monthly(salary).first;
  const cases = [0, salary / 2, salary];
  return (
    <section className="rounded-2xl border border-brand-100 bg-white p-5">
      <h2 className="text-lg font-bold text-forest">If the guardian stops the tuition</h2>
      <p className="mt-1 text-sm text-slate-700 sm:text-base">
        অভিভাবক নিজে টিউশন বন্ধ করলে এবং দোষ টিউটরের না হলে:
      </p>
      <ol className="mt-3 space-y-2 text-sm sm:text-base">
        {[
          "অভিভাবক জানানোর 24 ঘণ্টার মধ্যে HTR-কে জানান, আর কনফার্মেশনের 45 দিনের মধ্যে।",
          "HTR প্রথমে 30 দিনের মধ্যে আরেকটি টিউশন খুঁজে দেবে। দেওয়া ফি সেই টিউশনে জমা হবে।",
          "না পারলে টাকা ফেরত: দেওয়া ফি থেকে পাওয়া বেতনের 25% বাদ। ফেরত শূন্যের নিচে যায় না, বাড়তি কিছু দিতে হয় না।",
        ].map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest text-sm font-bold text-cream">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <h3 className="mt-5 font-bold text-forest">
        Example: salary {taka(salary)}, fee paid {taka(paid)}
      </h3>
      <ul className="mt-2 space-y-2 text-sm sm:text-base">
        {cases.map((received) => (
          <li key={received} className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-2">
            <span>{received ? `Got ${taka(received)} salary` : "No salary yet"}</span>
            <b className="text-forest">Refund {taka(refund(paid, received))}</b>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-600">
        দোষ কার, তা HTR কথা বলে ঠিক করে। টিউটরের দোষে (সময় না মানা, না জানিয়ে বন্ধ) বাতিল হলে টাকা ফেরত নেই।
      </p>
    </section>
  );
}

export default function Fees() {
  return (
    <PageShell title="Fees" sub="টিউটর HTR-কে প্রথম মাসের বেতন থেকে এককালীন মিডিয়া ফি দেন। দ্বিতীয় মাস থেকে পুরো বেতন টিউটরের।">
      <FeeBox fees={{ ...monthly(4000), is_example: true }} />
      <section className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="text-lg font-bold text-forest">Example</h2>
        <ul className="mt-3 space-y-2 text-sm sm:text-base">
          {[3000, 4000, 5000, 8000].map((salary) => {
            const f = monthly(salary);
            return (
              <li key={salary} className="rounded-xl bg-brand-50 px-4 py-2">
                Salary <b>{taka(salary)}</b> → Standard {taka(f.first)} + {taka(f.second)} = {taka(f.standard_total)} · Early {taka(f.early_total)} · Save {taka(f.saving)}
              </li>
            );
          })}
        </ul>
      </section>
      <Refund />
      <p className="text-slate-700">অভিভাবকদের জন্য: আলাদা কোনো সার্ভিস চার্জ নেই।</p>
    </PageShell>
  );
}
