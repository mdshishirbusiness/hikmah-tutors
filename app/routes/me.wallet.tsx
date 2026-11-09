// Wallet and Refer a tutor (owner, 2026-11-09, step 5). The balance is credit for media fees, never cash: referral
// credit, taken off a fee by HTR. A Premium deposit is shown as it is today: it is already the advance on the fee of
// the tuition HTR gives. The referral link and code, the rates, and the tutors this tutor referred (code only).
import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Check, Copy, Crown, Share2, UserPlus, Wallet } from "lucide-react";
import type { Route } from "./+types/me.wallet";
import { SitePage } from "~/components/site";
import { TutorBar } from "~/components/tutor";
import { requireTutor, tutorBadges } from "~/lib/me.server";
import { premiumStatus } from "~/lib/premium.server";
import { REFERRAL_PERCENT, REFERRAL_RATES, referralLink } from "~/lib/referral";
import { myReferredTutors, walletBalance, walletEntries } from "~/lib/referral.server";
import { taka } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Wallet · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { viewer, me } = await requireTutor(request);
  const [balance, entries, referred, premium, badges] = await Promise.all([
    walletBalance(me.id), walletEntries(me.id), myReferredTutors(me.id), premiumStatus(me.id), tutorBadges(viewer, me),
  ]);
  return { code: me.code, balance, entries, referred, premium, badges, link: referralLink(new URL(request.url).origin, me.code) };
}

const STATUS = {
  credited: { text: "Credited", tone: "bg-emerald-100 text-emerald-900" },
  needs_check: { text: "Waiting for HTR's call", tone: "bg-cream-200 text-forest" },
  needs_profile: { text: `Profile under ${REFERRAL_PERCENT}%`, tone: "bg-mango-50 text-forest" },
} as const;

function CopyLine({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* the text is on screen to copy by hand */ } }}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-white/10 px-3 text-left ring-1 ring-white/20">
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-cream/70">{label}</span><span className="block truncate font-bold">{value}</span></span>
      {done ? <Check size={18} className="shrink-0 text-mango" aria-label="Copied" /> : <Copy size={18} className="shrink-0" aria-label={`Copy ${label}`} />}
    </button>
  );
}

export default function WalletPage({ loaderData: { code, balance, entries, referred, premium, badges, link } }: Route.ComponentProps) {
  const message = `Hikmah Tutors-এ টিউটর হিসেবে যোগ দাও, রাজশাহীতে প্রতিদিন টিউশন আসে। এই link দিয়ে রেজিস্ট্রেশন করো: ${link}\nআমার কোড: ${code}`;
  const share = async () => {
    try { await navigator.share({ text: message }); } catch { window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank"); }
  };
  return (
    <SitePage app>
      <div className="mx-auto max-w-xl px-4 pt-6 pb-28">
        <Link to="/me" className="-ml-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-slate-500 hover:text-brand-700"><ArrowLeft size={16} aria-hidden />Home</Link>

        <section aria-label="Wallet" className="mt-2 rounded-3xl bg-forest p-5 text-cream">
          <p className="flex items-center gap-2 text-sm font-semibold text-cream/80"><Wallet size={18} aria-hidden />Wallet</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums">{taka(balance)}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-cream/85">এই টাকা আপনার মিডিয়া ফি থেকে কাটা যাবে। নগদ তোলা যায় না।</p>
        </section>

        {premium && (premium.status === "paid" || premium.status === "active") && (
          <section className="mt-3 flex items-start gap-3 rounded-2xl bg-mango p-4 text-forest">
            <Crown size={20} className="mt-0.5 shrink-0" aria-hidden />
            <p className="text-[15px]"><b>Premium deposit {taka(premium.price)}</b><span className="block text-sm">HTR যে টিউশন দেবে, তার মিডিয়া ফি থেকে এটা কাটা হবে।</span></p>
          </section>
        )}

        <section aria-label="Refer a tutor" className="mt-4 overflow-hidden rounded-3xl bg-brand-700 p-5 text-cream">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold"><UserPlus size={22} aria-hidden />Refer a tutor</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-cream/85">বন্ধুকে link পাঠান, অথবা রেজিস্ট্রেশনের সময় আপনার কোড দিতে বলুন। তাঁর profile {REFERRAL_PERCENT}% পূরণ হলে আর HTR কথা বলে check করলে আপনার wallet-এ টাকা আসবে।</p>
          <div className="mt-4 space-y-2">
            <CopyLine label="Your link" value={link} />
            <CopyLine label="Your code" value={String(code)} />
          </div>
          <button type="button" onClick={share} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-mango text-base font-extrabold text-forest">
            <Share2 size={18} aria-hidden />Share on WhatsApp
          </button>
          <table className="mt-4 w-full text-left text-sm">
            <thead><tr className="text-cream/70"><th className="py-1.5 font-semibold">Per tutor</th><th className="py-1.5 text-right font-semibold">Male</th><th className="py-1.5 text-right font-semibold">Female</th></tr></thead>
            <tbody>
              {REFERRAL_RATES.map((r) => (
                <tr key={r.from} className="border-t border-white/15"><td className="py-2 font-semibold">{r.from}</td><td className="py-2 text-right tabular-nums">{taka(r.male)}</td><td className="py-2 text-right font-bold text-mango tabular-nums">{taka(r.female)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-ring">
          <h2 className="font-extrabold text-forest">Tutors you referred <span className="text-slate-500 tabular-nums">{referred.length}</span></h2>
          {referred.length === 0 ? <p className="mt-2 text-[15px] text-slate-600">এখনো কেউ নেই। উপরের link শেয়ার করুন।</p> : (
            <ul className="mt-2 divide-y divide-brand-50">
              {referred.map((r) => (
                <li key={r.code} className="flex min-h-12 items-center justify-between gap-3 py-2">
                  <span className="font-bold text-forest">T-{r.code}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${STATUS[r.status].tone}`}>{r.status === "credited" && r.amount ? `+${taka(r.amount)}` : STATUS[r.status].text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {entries.length > 0 && (
          <section className="mt-4 rounded-2xl bg-white p-4 shadow-ring">
            <h2 className="font-extrabold text-forest">History</h2>
            <ul className="mt-2 divide-y divide-brand-50">
              {entries.map((e) => (
                <li key={e.id} className={`flex items-baseline justify-between gap-3 py-2.5 text-[15px] ${e.reversed || e.kind === "reversal" ? "text-slate-500" : "text-slate-800"}`}>
                  <span className="min-w-0">
                    {e.kind === "referral" ? `Referral · T-${e.referred_code}` : e.kind === "spend" ? `Media fee · HTR-${e.tuition_code}` : "Reversed"}
                    <span className="block text-[13px] text-slate-500">{new Date(e.created_at * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{e.delta > 0 ? "+" : "−"}{taka(Math.abs(e.delta))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <TutorBar active="home" count={badges.applied} dot={badges.home} />
    </SitePage>
  );
}
