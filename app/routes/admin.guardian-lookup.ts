// A past guardian by phone or HTR code, asked by New tuition and Quick Pad as the owner types. Private: admin only.
import type { Route } from "./+types/admin.guardian-lookup";
import { findPastGuardian } from "~/lib/admin.server";
import { requireStaff } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireStaff(request, "leads");
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ guardian: await findPastGuardian(q.slice(0, 20)) }, { headers: { "Cache-Control": "private, no-store" } });
}
