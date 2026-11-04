import { Link, redirect, useSearchParams } from "react-router";
import { LogIn } from "lucide-react";
import type { Route } from "./+types/login";
import { SitePage, buttonClass } from "~/components/site";
import { getViewer, googleConfigured, homeFor } from "~/lib/auth.server";
import { safeNext } from "~/lib/google-auth";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Log in · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await getViewer(request);
  if (viewer) throw redirect(homeFor(viewer));
  return { ready: googleConfigured() };
}

const ERRORS: Record<string, string> = {
  "1": "লগইন শেষ করা যায়নি। আবার চেষ্টা করুন।",
  "2": "Google লগইন এখনো চালু হয়নি।",
};

export default function Login({ loaderData: { ready } }: Route.ComponentProps) {
  const [sp] = useSearchParams();
  const next = safeNext(sp.get("next"));
  const error = ERRORS[sp.get("error") ?? ""];
  const join = sp.get("join") === "1";
  return (
    <SitePage>
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <LogIn size={28} aria-hidden />
        </div>
        <h1 className="mt-6 text-4xl font-bold text-forest">{join ? "Join as a tutor" : "Log in"}</h1>
        {/* One button for both: a known Google account opens Home, a new one goes on to the short registration form. */}
        <ul className="mt-5 space-y-2 text-left text-sm text-slate-700">
          <li className="rounded-xl bg-white px-4 py-3 shadow-ring"><b className="text-forest">New tutor?</b> Google দিয়ে ঢুকুন, তারপর ছোট একটি ফর্ম (প্রায় 3 মিনিট)। HTR যাচাই করলে আবেদন করতে পারবেন।</li>
          <li className="rounded-xl bg-white px-4 py-3 shadow-ring"><b className="text-forest">Registered before?</b> আগে যে Google অ্যাকাউন্ট দিয়ে ফর্ম পূরণ করেছিলেন, সেটি দিয়ে ঢুকুন। প্রোফাইল নিজে থেকেই খুলবে।</li>
        </ul>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{error}</p>}
        {ready ? (
          // A plain link: this leaves the site for Google, so no client-side navigation.
          <a href={`/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`} className={buttonClass("forest", "mt-8 w-full")}>
            Continue with Google
          </a>
        ) : !error && <p className="mt-6 inline-block rounded-full bg-mango px-4 py-1 text-sm font-bold text-forest">{ERRORS["2"]}</p>}
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700">← Back to board</Link>
      </div>
    </SitePage>
  );
}
