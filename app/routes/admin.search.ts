// The admin's search box (command palette) asks here as you type. Private: admin only.
import type { Route } from "./+types/admin.search";
import { globalSearch } from "~/lib/admin.server";
import { requireStaff, scopeOf } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await requireStaff(request, "any");
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ hits: await globalSearch(q.slice(0, 60), scopeOf(viewer)) }, { headers: { "Cache-Control": "private, no-store" } });
}
