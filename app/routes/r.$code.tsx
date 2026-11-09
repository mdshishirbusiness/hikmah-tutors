// A tutor's referral link (owner, 2026-11-09): /r/<code>. Keeps the code on this phone for 30 days so Join fills it
// in, and invites the visitor to join. Shows the code only, never the referrer's name or contact.
import { data } from "react-router";
import { ArrowRight, BadgeCheck, MapPin, Wallet } from "lucide-react";
import type { Route } from "./+types/r.$code";
import { SitePage } from "~/components/site";
import { codeFrom } from "~/lib/referral";
import { refCookie, referrerByCode } from "~/lib/referral.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Join Hikmah Tutors" }, { name: "description", content: "রাজশাহীর হোম টিউশন: টিউটর হিসেবে যোগ দিন।" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const who = await referrerByCode(codeFrom(params.code));
  if (!who) return data({ code: null }, { headers: { "Cache-Control": "no-store" } });
  return data({ code: who.code }, { headers: { "Set-Cookie": refCookie(request, who.code), "Cache-Control": "no-store" } });
}

export default function ReferralLanding({ loaderData: { code } }: Route.ComponentProps) {
  return (
    <SitePage>
      <div className="mx-auto max-w-xl px-4 pt-8 pb-16">
        <section className="overflow-hidden rounded-3xl bg-forest p-6 text-cream">
          {code && <p className="inline-flex rounded-full bg-mango px-3 py-1 text-sm font-extrabold text-forest">Invited by T-{code}</p>}
          <h1 className="mt-4 text-[32px] leading-tight font-extrabold tracking-tight">Teach in Rajshahi with Hikmah Tutors.</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-cream/85">রাজশাহীর অভিভাবকেরা প্রতিদিন Hikmah Tutors-এ টিউটর খোঁজেন। একবার রেজিস্ট্রেশন করুন, তারপর পছন্দের টিউশনে আবেদন করুন।</p>
          <a href="/login?next=/me/join" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-mango px-5 text-base font-extrabold text-forest">
            Join as a tutor<ArrowRight size={18} aria-hidden />
          </a>
          {code && <p className="mt-3 text-sm text-cream/80">Code T-{code} is filled in for you when you join.</p>}
        </section>
        <ul className="mt-4 space-y-2">
          {[
            [MapPin, "Tuitions by area, class and subject, with the salary shown."],
            [BadgeCheck, "HTR checks every tutor, so guardians trust the ones it sends."],
            [Wallet, "No registration fee. A one-time media fee only when you get a tuition."],
          ].map(([Icon, text]) => {
            const I = Icon as typeof MapPin;
            return (
              <li key={text as string} className="flex items-start gap-3 rounded-2xl bg-white p-4 text-[15px] text-slate-700 shadow-ring">
                <I size={20} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />{text as string}
              </li>
            );
          })}
        </ul>
      </div>
    </SitePage>
  );
}
