import { Link } from "react-router";
import type { Route } from "./+types/admin.home";
import { PageHead, bn } from "~/components/admin";
import { dashboard } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "অ্যাডমিন · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  requireAdmin(request);
  return dashboard();
}

export default function AdminHome({ loaderData: d }: Route.ComponentProps) {
  const cards = [
    { to: "/admin/applications?status=submitted&open=1", n: d.waiting, label: "নতুন আবেদন, খোলা টিউশনে", hot: d.waiting > 0 },
    { to: "/admin/leads", n: d.leads, label: "নতুন লিড", hot: d.leads > 0 },
    { to: "/admin/tuitions?status=available", n: d.open, label: "খোলা টিউশন", hot: false },
    { to: "/admin/tuitions?visibility=public", n: d.publicNow, label: "বোর্ডে পাবলিক", hot: false },
    { to: "/admin/tutors", n: d.tutors, label: "টিউটর", hot: false },
    { to: "/admin/review", n: d.held, label: "রিভিউ বাকি", hot: d.held > 0 },
  ];
  return (
    <>
      <PageHead title="অ্যাডমিন" action={<Link to="/admin/quick" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-mango px-4 text-sm font-semibold text-forest">+ নতুন লিড</Link>} />
      <main className="mx-auto grid max-w-3xl grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className={`rounded-2xl border p-4 transition-shadow duration-150 hover:shadow-card ${c.hot ? "border-forest bg-forest text-cream" : "border-brand-100 bg-white text-forest"}`}>
            <p className={`text-3xl font-semibold ${c.hot ? "text-mango" : ""}`}>{bn(c.n)}</p>
            <p className="mt-1 text-sm">{c.label}</p>
          </Link>
        ))}
      </main>
    </>
  );
}
