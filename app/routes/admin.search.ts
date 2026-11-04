// The admin's search box (command palette) asks here as you type. Private: admin only.
import type { Route } from "./+types/admin.search";
import { globalSearch } from "~/lib/admin.server";
import { requireAdmin } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ hits: await globalSearch(q.slice(0, 60)) }, { headers: { "Cache-Control": "private, no-store" } });
}
