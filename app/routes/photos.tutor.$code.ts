import { env } from "cloudflare:workers";
import type { Route } from "./+types/photos.tutor.$code";
import { getViewer, requireAdmin } from "~/lib/auth.server";

// A tutor's photo from the private bucket. Only the admin and the tutor themself may see it (owner, 2026-11-03);
// guardians and the public never do.
export async function loader({ request, params }: Route.LoaderArgs) {
  const code = Number(params.code);
  const viewer = await getViewer(request);
  const tutor = Number.isInteger(code)
    ? await env.DB.prepare(`SELECT photo_key, user_id FROM tutors WHERE code = ? AND deleted_at IS NULL`).bind(code).first<{ photo_key: string | null; user_id: number | null }>()
    : null;
  const ownPhoto = viewer?.role === "tutor" && tutor?.user_id === viewer.id;
  if (!ownPhoto) await requireAdmin(request);
  // Checked on every view (no-cache + ETag), so a photo the admin approves shows at once; unchanged ones answer 304.
  const object = tutor?.photo_key ? await env.PHOTOS.get(tutor.photo_key, { onlyIf: request.headers }) : null;
  if (!object) throw new Response("No photo", { status: 404 });
  const headers = { "Cache-Control": "private, no-cache", ETag: object.httpEtag, "X-Content-Type-Options": "nosniff" };
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response((object as R2ObjectBody).body, { headers: { ...headers, "Content-Type": object.httpMetadata?.contentType ?? "image/webp" } });
}
