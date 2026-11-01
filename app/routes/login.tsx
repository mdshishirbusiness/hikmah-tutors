import { Link, redirect, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { SiteHeader } from "~/components/site";
import { getViewer, googleConfigured, homeFor } from "~/lib/auth.server";
import { safeNext } from "~/lib/google-auth";

export function meta(_: Route.MetaArgs) {
  return [{ title: "লগইন · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
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
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-3xl font-semibold text-forest">লগইন</h1>
        <p className="mt-2 text-slate-700">আগে Hikmah Tutors-এর ফর্ম পূরণ করে থাকলে সেই Google অ্যাকাউন্ট দিয়ে লগইন করুন। আপনার প্রোফাইল নিজে থেকেই খুলে যাবে।</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-900">{error}</p>}
        {ready ? (
          // A plain link: this leaves the site for Google, so no client-side navigation.
          <a href={`/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-forest px-5 font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
            Google দিয়ে লগইন করুন
          </a>
        ) : !error && <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{ERRORS["2"]}</p>}
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700">← টিউশন বোর্ডে ফিরুন</Link>
      </main>
    </>
  );
}
