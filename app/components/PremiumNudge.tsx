// Premium reminder (owner, 2026-11-09): many tutors don't know Premium exists. A bottom sheet, never a full-screen
// pop-up, for signed-in tutors without a Premium term, while they look at a tuition. At most once every 3 days per
// phone; "Not now" or the close button counts as seen. Honest about rizq: best effort, no guarantee.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Crown, X } from "lucide-react";
import { primaryButton } from "~/components/admin";

const KEY = "htr-premium-nudge";
const GAP_MS = 3 * 86400 * 1000;
const DELAY_MS = 2500;

const POINTS = [
  { title: "Considered first", text: "আপনার শর্তে মেলে এমন টিউশনে, সমান যোগ্যদের মধ্যে আপনাকে আগে দেখা হবে।" },
  { title: "90 days of HTR's effort", text: "যাচাইয়ের দিন থেকে 90 দিন HTR সর্বাত্মক চেষ্টা করবে। না পেলে পুরো টাকা ফেরত।" },
  { title: "Not an extra charge", text: "Premium-এর টাকা মিডিয়া ফি-র অগ্রিম অংশ, টিউশন পেলে ফি থেকে বাদ যায়।" },
];

function seenRecently() {
  try {
    return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < GAP_MS;
  } catch {
    return true; // No storage (private window): don't risk showing it on every page.
  }
}

function markSeen() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {}
}

export function PremiumNudge({ show }: { show: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // `?premium-nudge` forces it, for trying the design.
    const forced = new URLSearchParams(location.search).has("premium-nudge");
    if (!show || (!forced && seenRecently())) return;
    const t = setTimeout(() => setOpen(true), forced ? 0 : DELAY_MS);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) {
      d?.showModal();
      markSeen();
    }
    if (!open && d?.open) d.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <dialog
      ref={ref}
      aria-labelledby="premium-nudge-title"
      onClose={close}
      onClick={(e) => e.target === ref.current && close()}
      className="m-0 mt-auto w-full max-w-none animate-sheet overflow-hidden rounded-t-3xl bg-cream p-0 backdrop:bg-forest/50 sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      <div className="relative overflow-hidden bg-forest px-5 pt-5 pb-6 text-cream">
        <span aria-hidden className="absolute -top-12 -right-10 size-36 rounded-full bg-forest-mid" />
        <button type="button" onClick={close} aria-label="Close" className="absolute top-3 right-3 grid size-11 place-items-center rounded-full text-brand-100 hover:bg-forest-mid">
          <X size={20} aria-hidden />
        </button>
        <span className="relative grid size-12 place-items-center rounded-2xl bg-mango text-forest"><Crown size={22} aria-hidden /></span>
        <h2 id="premium-nudge-title" className="relative mt-3 text-[1.7rem] leading-tight font-extrabold">
          Want HTR to work <span className="text-mango">for you</span>?
        </h2>
        <p className="relative mt-1.5 text-[15px] leading-relaxed text-brand-100">শুধু আবেদন নয়, HTR নিজে আপনার জন্য টিউশন খুঁজবে।</p>
      </div>

      <ul className="space-y-3 px-5 pt-5">
        {POINTS.map((p, i) => (
          <li key={p.title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-700">{i + 1}</span>
            <span className="min-w-0">
              <span className="block font-bold text-forest">{p.title}</span>
              <span className="block text-sm leading-relaxed text-slate-600">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mx-5 mt-4 rounded-xl bg-mango-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
        টিউশন রিযিকের ব্যাপার, তাই নিশ্চয়তা দেওয়া যায় না। HTR চেষ্টা করবে; ধৈর্য রাখুন, ইনশাআল্লাহ।
      </p>

      <div className="flex flex-col gap-2 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Link to="/me/premium" onClick={close} className={`${primaryButton} w-full`}>See Premium</Link>
        <button type="button" onClick={close} className="min-h-11 rounded-xl font-semibold text-slate-600 hover:bg-brand-50">Not now</button>
      </div>
    </dialog>
  );
}
