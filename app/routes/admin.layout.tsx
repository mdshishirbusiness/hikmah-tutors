import { Outlet } from "react-router";
import type { Route } from "./+types/admin.layout";
import { AdminNav } from "~/components/admin";
import { requireAdmin } from "~/lib/auth.server";

// Applies to every admin page below: private data must never sit in a shared cache.
export function headers(_: Route.HeadersArgs) {
  return { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
}

export function loader({ request }: Route.LoaderArgs) {
  requireAdmin(request);
  return null;
}

export default function AdminLayout() {
  return (
    <div className="min-h-dvh pb-20">
      <Outlet />
      <AdminNav />
    </div>
  );
}
