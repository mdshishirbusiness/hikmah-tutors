// /api/push — admin alerts on the phone (owner, 2026-11-18). POST {endpoint} turns them on for this phone, DELETE turns
// them off; GET (from the service worker, signed in) returns the newest note this person may see. Pushes carry no text.
import type { Route } from "./+types/api.push";
import { requireStaff } from "~/lib/auth.server";
import { dropPushSub, latestNote, savePushSub } from "~/lib/alerts.server";

export async function loader({ request }: Route.LoaderArgs) {
  const viewer = await requireStaff(request, "any");
  const note = await latestNote(viewer);
  return Response.json(note ?? { title: "Hikmah", body: "Something new in the admin.", url: "/admin" }, { headers: { "Cache-Control": "no-store" } });
}

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireStaff(request, "any");
  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = String(body.endpoint ?? "");
  if (request.method === "DELETE") {
    await dropPushSub(endpoint);
    return Response.json({ ok: true });
  }
  if (!viewer) return Response.json({ error: "Sign in with Google to turn on alerts." }, { status: 400 }); // dev bypass has no user
  const error = await savePushSub(viewer.id, endpoint);
  return Response.json(error ? { error } : { ok: true }, { status: error ? 400 : 200 });
}
