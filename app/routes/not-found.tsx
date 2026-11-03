import { data, Link } from "react-router";
import type { Route } from "./+types/not-found";
import { SitePage, buttonClass } from "~/components/site";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Page not found · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export function loader(_: Route.LoaderArgs) {
  return data(null, { status: 404 });
}

export default function NotFound() {
  return (
    <SitePage>
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-forest">Page not found</h1>
        <p className="mt-3 text-slate-700">The link may be wrong.</p>
        <Link to="/" className={buttonClass("primary", "mt-8")}>Back to board</Link>
      </div>
    </SitePage>
  );
}
