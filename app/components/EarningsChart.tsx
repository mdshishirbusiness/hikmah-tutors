// What the tutor keeps over six months (owner, 2026-11-05: brought back from the design lab's apply flow). The first
// bar is cut by the one-time media fee (hatched); a toggle compares the two fee options.
import { useState } from "react";
import { taka, type Fees } from "~/lib/tuition";

const HATCH = { backgroundImage: "repeating-linear-gradient(135deg, rgb(9 51 42 / 0.16) 0 3px, transparent 3px 7px)" };
type Plan = "standard" | "early";

/** Only for a fixed monthly salary; an example salary would make the total look like a promise. */
export function EarningsChart({ fees }: { fees: Fees }) {
  const [plan, setPlan] = useState<Plan>("standard");
  if (fees.is_example || (fees.custom && fees.custom.total === null)) return null;
  const salary = fees.basis;
  // A tuition with its own fee (owner, 2026-11-09) has one amount and no Early option.
  const fee = fees.custom ? fees.custom.total! : plan === "early" ? fees.early_total : fees.standard_total;
  const kept = 1 - fee / salary;
  return (
    <section className="rounded-2xl border border-brand-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-forest">Your pay over 6 months</h2>
          <p className="text-xs text-slate-600">উদাহরণ: টিউশন 6 মাস চললে</p>
        </div>
        <div role="radiogroup" aria-label="Fee option" className={`${fees.custom ? "hidden" : "flex"} shrink-0 rounded-full bg-brand-50 p-1 text-xs font-semibold`}>
          {(["standard", "early"] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={plan === p} onClick={() => setPlan(p)}
              className={`min-h-11 rounded-full px-3 transition-colors duration-150 ${plan === p ? "bg-forest text-cream" : "text-forest"}`}>
              {p === "early" ? "Early" : "Standard"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[34px] leading-none font-bold tracking-tight text-forest">{taka(salary * 6 - fee)}</p>
      <div aria-hidden className="mt-4">
        <div className="flex h-24 items-end gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex h-full flex-1 flex-col overflow-hidden rounded-md">
              {i === 0 && <div className="flex-1 bg-white ring-1 ring-brand-100 ring-inset" style={HATCH} />}
              <div className={`bg-mango transition-[height] duration-300 motion-reduce:transition-none ${i ? "flex-1" : ""}`} style={i ? undefined : { height: `${kept * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1.5 text-center text-[11px] text-slate-600">
          {[1, 2, 3, 4, 5, 6].map((m) => <span key={m} className="flex-1">Month {m}</span>)}
        </div>
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-slate-600">First month in hand</dt><dd className="font-semibold text-forest">{taka(salary - fee)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-slate-600">From month 2, each month</dt><dd className="font-semibold text-forest">{taka(salary)}</dd></div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">HTR fee, once</dt>
          <dd className="text-right font-semibold text-forest">{fees.custom ? `${taka(fee)} (on confirm)` : plan === "early" ? `${taka(fee)} (within 7 days)` : `${taka(fees.first)} + ${taka(fees.second)}`}</dd>
        </div>
      </dl>
    </section>
  );
}
