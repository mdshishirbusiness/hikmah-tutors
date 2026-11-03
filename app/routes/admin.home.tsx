import { Link } from "react-router";
import { ArrowUpRight, ClipboardList, FileText, Globe, Inbox, ListChecks, Users } from "lucide-react";
import type { Route } from "./+types/admin.home";
import { PageHead, bn } from "~/components/admin";
import { dashboard } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "অ্যাডমিন · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return dashboard();
}

export default function AdminHome({ loaderData: d }: Route.ComponentProps) {
  const stats = [
    { to: "/admin/applications?status=submitted&open=1", n: d.waiting, label: "নতুন আবেদন, খোলা টিউশনে", icon: FileText },
    { to: "/admin/leads", n: d.leads, label: "নতুন লিড", icon: Inbox },
    { to: "/admin/tuitions?status=available", n: d.open, label: "খোলা টিউশন", icon: ClipboardList },
    { to: "/admin/tuitions?visibility=public", n: d.publicNow, label: "বোর্ডে পাবলিক", icon: Globe },
    { to: "/admin/tutors", n: d.tutors, label: "টিউটর", icon: Users },
    { to: "/admin/review", n: d.held, label: "রিভিউ বাকি", icon: ListChecks },
  ];
  return (
    <>
      <PageHead
        title="আজকের কাজ, এক নজরে"
        sub="নতুন আবেদন দেখুন, অভিভাবকের সাথে কথা বলুন, পরের ধাপ ঠিক করুন।"
        action={<Link to="/admin/quick" className="inline-flex min-h-12 items-center rounded-xl bg-mango px-5 text-sm font-semibold text-forest transition-colors hover:bg-mango-deep">+ নতুন লিড</Link>}
      />
      <main className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s, i) => {
          const primary = i === 0;
          return (
            <Link
              key={s.to}
              to={s.to}
              className={`rounded-2xl border p-4 transition-[border-color,box-shadow] hover:shadow-md sm:p-5 ${primary ? "border-forest bg-forest text-cream" : "border-brand-100 bg-white text-forest hover:border-brand-200"}`}
            >
              <div className="flex items-center justify-between">
                <s.icon size={19} className={primary ? "text-brand-200" : "text-brand-600"} aria-hidden />
                <ArrowUpRight size={15} className={primary ? "text-brand-200" : "text-slate-400"} aria-hidden />
              </div>
              <p className={`mt-4 text-3xl font-bold tabular-nums ${primary && s.n > 0 ? "text-mango" : ""}`}>{bn(s.n)}</p>
              <p className={`mt-1 text-xs font-semibold ${primary ? "text-brand-200" : "text-slate-500"}`}>{s.label}</p>
            </Link>
          );
        })}
      </main>
    </>
  );
}
