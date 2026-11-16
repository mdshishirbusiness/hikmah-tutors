// The applicant pack for an AI chat, made when the owner taps "Copy for AI" on a tuition. Private: admin only.
import type { Route } from "./+types/admin.tuitions.$code.ai";
import { aiPack } from "~/lib/ai-pack.server";
import { inScope } from "~/lib/admin.server";
import { requireStaff, scopeOf } from "~/lib/auth.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const viewer = await requireStaff(request, "ai");
  if (!(await inScope(Number(params.code) || -1, scopeOf(viewer)))) return Response.json({ error: "Tuition not found" }, { status: 404 });
  const pack = await aiPack(Number(params.code) || -1);
  if (!pack) return Response.json({ error: "Tuition not found" }, { status: 404 });
  return Response.json(pack, { headers: { "Cache-Control": "private, no-store" } });
}
