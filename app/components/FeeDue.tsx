// What the tutor owes HTR in media fees, on Home (owner, 2026-11-09: media fee ledger). Hidden when nothing is owed and
// nothing was paid lately. The owner records payments; the tutor sends the money and tells HTR on WhatsApp.
import { MessageCircle, Wallet } from "lucide-react";
import { when } from "~/components/admin";
import { CONTACT, waLink } from "~/lib/contact";
import { FEE_METHODS, chargeTermsLabel } from "~/lib/fee";
import type { MyFee } from "~/lib/fee.server";
import { AREAS, CLASS_LEVELS, labelOf } from "~/lib/options";
import { taka } from "~/lib/tuition";

export function FeeDue({ fees, code }: { fees: MyFee[]; code: number }) {
  if (!fees.length) return null;
  const due = fees.reduce((s, f) => s + f.due_now, 0);
  const later = fees.reduce((s, f) => s + Math.max(f.owed - f.due_now, 0), 0);
  const text = `Assalamu alaikum. Tutor T-${code}. I sent the media fee for ${fees.filter((f) => f.due_now > 0).map((f) => `HTR-${f.tuition_code}`).join(", ") || "my tuition"}: amount ৳, from number , transaction ID .`;
  return (
    <section aria-labelledby="fee-due" className="overflow-hidden rounded-2xl bg-white shadow-ring">
      <div className={`flex items-center gap-3 px-4 py-3 ${due > 0 ? "bg-mango text-forest" : "bg-brand-50 text-forest"}`}>
        <Wallet size={20} className="shrink-0" aria-hidden />
        <h2 id="fee-due" className="flex-1 font-extrabold">Media fee</h2>
        <span className="text-right">
          <span className="block text-2xl leading-none font-extrabold tabular-nums">{due > 0 ? taka(due) : "Paid up"}</span>
          {due > 0 && <span className="text-xs font-bold">due now</span>}
        </span>
      </div>
      <ul className="divide-y divide-brand-50 px-4">
        {fees.map((f) => (
          <li key={f.placement_id} className="py-3 text-sm">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-forest">HTR-{f.tuition_code} · {labelOf(CLASS_LEVELS, f.class_level)} · {labelOf(AREAS, f.area)}</span>
              {!f.waiting && <span className="shrink-0 text-xs text-slate-500">{f.terms && chargeTermsLabel(f.terms)}</span>}
            </p>
            {f.waiting ? <p className="mt-1 text-slate-600">HTR will set the fee from the agreed salary.</p> : (
              <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-cream py-1.5"><dt className="text-xs text-slate-500">Fee</dt><dd className="font-bold text-forest tabular-nums">{taka(f.charged - f.reduced)}</dd></div>
                <div className="rounded-lg bg-cream py-1.5"><dt className="text-xs text-slate-500">Paid</dt><dd className="font-bold text-forest tabular-nums">{taka(f.paid + f.credited)}</dd></div>
                <div className="rounded-lg bg-cream py-1.5"><dt className="text-xs text-slate-500">Left</dt><dd className="font-bold text-forest tabular-nums">{taka(Math.max(f.owed, 0))}</dd></div>
              </dl>
            )}
            {f.owed > f.due_now && <p className="mt-1.5 text-xs text-slate-600">{taka(f.owed - f.due_now)} after your first salary.</p>}
            {f.payments.length > 0 && (
              <p className="mt-1.5 text-xs text-slate-500">{f.payments.map((p) => `${taka(p.amount)} by ${FEE_METHODS[p.method] ?? p.method} on ${when(p.paid_at)}`).join(" · ")}</p>
            )}
          </li>
        ))}
      </ul>
      {due > 0 && (
        <div className="border-t border-brand-50 px-4 py-3">
          <p className="text-sm text-slate-700">bKash, Nagad বা Rocket-এ <b className="tabular-nums">{CONTACT.pay}</b> নম্বরে Send Money করুন, তারপর HTR-কে WhatsApp-এ জানান। HTR মিলিয়ে দেখে এখানে জমা দেখাবে।</p>
          <a href={waLink(CONTACT.whatsapp, text)} target="_blank" rel="noreferrer" className="wa-btn mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest text-sm font-bold text-cream">
            <MessageCircle size={16} aria-hidden />Tell HTR I paid
          </a>
        </div>
      )}
      {due === 0 && later > 0 && <p className="border-t border-brand-50 px-4 py-3 text-sm text-slate-600">The rest is due after your first salary.</p>}
    </section>
  );
}
